import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

export async function runClientDraftConcurrency(sql, container, database) {
  assert.match(container,/^avantia-client-draft-\d+$/);
  const c='00000000-0000-4000-8000-000000000100',a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
  sql(`update quote_comparisons set client_quote_status='draft' where id='${c}';`);
  const literal=value=>"'"+value.replaceAll("'","''")+"'";
  const source=()=>sql(`select client_quote_draft_source('${c}')`);
  const revision=()=>sql(`select revision from quote_comparison_client_drafts where comparison_id='${c}'`);
  const draft=sql(`select draft from quote_comparison_client_drafts where comparison_id='${c}'`);
  const routeId=sql(`select active_route_id from quote_comparisons where id='${c}'`);
  const resetSource=()=>sql(`update quote_comparison_prices set unit_price=12 where item_id='00000000-0000-4000-8000-000000000101';update quote_comparison_items set description='Draft material' where id='00000000-0000-4000-8000-000000000101';update quote_comparisons set awarded_bid_id=null,active_route_id='${routeId}' where id='${c}';`);
  const save=(s,r,actor=a)=>`select staff_save_client_quote_draft('${c}','${actor}',${r},${literal(s)}::jsonb,${literal(draft)}::jsonb);`;
  function query(text,onData) {
    return new Promise((resolve,reject)=>{
      const p=spawn('docker',['exec','-i',container,'psql','-X','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']);
      let output='';p.stdout.on('data',d=>{output+=d;onData?.(String(d));});p.stderr.on('data',d=>output+=d);
      p.on('error',reject);p.on('close',code=>resolve({code,output}));
      p.stdin.end(`set statement_timeout='6s';set deadlock_timeout='200ms';set role service_role;`+text);
    });
  }
  async function held(text, other) {
    let announce;const ready=new Promise(resolve=>announce=resolve);
    const first=query(`begin;${text}select 'LOCK_READY';select pg_sleep(.4);commit;`,output=>{if(output.includes('LOCK_READY'))announce();});
    await Promise.race([ready,first.then(result=>{throw Error('No lock marker '+JSON.stringify(result));})]);
    const second=query(other);const results=await Promise.all([first,second]);
    assert.ok(!results.some(r=>/deadlock detected/.test(r.output)),JSON.stringify(results));
    assert.equal(results[0].code,0,results[0].output);return results[1];
  }
  const edits=[
    `update quote_comparison_prices set unit_price=unit_price+1 where item_id='00000000-0000-4000-8000-000000000101';`,
    `update quote_comparison_items set description=description||' changed' where id='00000000-0000-4000-8000-000000000101';`,
    `update quote_comparisons set client_message=client_message||' changed' where id='${c}';`,
    `update quote_comparisons set awarded_bid_id=case when awarded_bid_id is null then '00000000-0000-4000-8000-000000000102'::uuid else null end where id='${c}';`,
  ];
  for(const edit of edits) {
    resetSource();
    let s=source(),r=revision();
    const rejected=await held(edit,save(s,r));
    assert.notEqual(rejected.code,0);assert.match(rejected.output,/55P03/);
    const stale=await query(save(s,r));assert.notEqual(stale.code,0);assert.match(stale.output,/40001/);
    resetSource();s=source();r=revision();
    const changed=await held(save(s,r),edit);
    if(changed.code!==0) {
      assert.match(changed.output,/55P03/,'Only an explicit safe retry may reject the contending child');
      assert.equal(sql(`select (staff_load_client_quote_draft('${c}','${a}')->'source') = (staff_load_client_quote_draft('${c}','${a}')->'draftSource')`),'t','Rejected child must not partially mutate source');
      const retried=await query(edit);assert.equal(retried.code,0,retried.output);
    }
    assert.equal(sql(`select (staff_load_client_quote_draft('${c}','${a}')->'source') is distinct from (staff_load_client_quote_draft('${c}','${a}')->'draftSource')`),'t','Later source edit must make stored draft visibly stale');
  }
  resetSource();
  const s=source(),r=revision();
  const second=await held(save(s,r,a),save(s,r,b));assert.notEqual(second.code,0);assert.match(second.output,/55P03/);
  const retry=await query(save(s,r,b));assert.notEqual(retry.code,0);assert.match(retry.output,/40001/);
  assert.equal(Number(revision()),Number(r)+1,'Two actors overwrote shared draft');
  console.log('PASS draft concurrency: real legacy price/item/client/award writers in both orders, later-source stale-on-load, two-actor CAS; no financial atomicity claim');

  // Atomic finalization tests: drafts never stand in for acknowledged financial data.
  const client='00000000-0000-4000-8000-000000000105';
  sql(`insert into auth.users values('${client}','draft-client@example.invalid');insert into profiles(id,email,role,approval_status,full_name) values('${client}','draft-client@example.invalid','client','approved','Draft client');`);
  const complete={version:1,clientId:client,quoteNumber:'DRAFT-READY',clientMessage:'Exact prepared message',delivery:'0',tax:'8.875',bulkMarkup:'',prices:{'00000000-0000-4000-8000-000000000101':{markupPercent:'25',clientUnitPrice:'15'}}};
  const rawSave=(s,r,d)=>`select staff_save_client_quote_draft('${c}','${a}',${r},${literal(s)}::jsonb,${literal(JSON.stringify(d))}::jsonb);`;
  const financial=()=>sql(`select finalized_route_client_snapshot('${c}')`);
  const prepare=(s,r,d,f=financial())=>`select staff_prepare_mixed_client_quote_draft('${c}','${routeId}','${a}',${literal(f)}::jsonb,${r},${literal(s)}::jsonb,${literal(JSON.stringify(d))}::jsonb);`;
  const manifest=JSON.stringify([{filename:'synthetic.pdf',sha256:'a'.repeat(64),bytes:10}]);
  const claim=(r,f=financial(),old=false)=>`select ${old?'staff_claim_finalized_route_send':'staff_claim_mixed_client_draft_send'}('${c}','${routeId}','${a}',${literal(f)}::jsonb,'00000000-0000-4000-8000-000000000106',${literal(f)}::jsonb,${literal(manifest)}::jsonb${old?'':','+r});`;
  let write=await query(rawSave(source(),revision(),complete));assert.equal(write.code,0,write.output);
  let oldSource=source(),oldRevision=revision(),oldFinancial=financial();
  const newer={...complete,quoteNumber:'NEWER-TEAM-DRAFT'};
  // B's clean queue has no write: A changes only the draft, not final data.
  write=await query(rawSave(oldSource,oldRevision,newer));assert.equal(write.code,0,write.output);
  const cleanStale=await query(prepare(oldSource,oldRevision,complete,oldFinancial));assert.notEqual(cleanStale.code,0);assert.match(cleanStale.output,/40001/);
  assert.equal(financial(),oldFinancial,'Clean stale Prepare changed final quote');
  // Another write wins after the caller's flush but before Prepare obtains lock.
  oldSource=source();oldRevision=revision();oldFinancial=financial();
  const latest={...complete,quoteNumber:'LATEST-TEAM-DRAFT'};
  const afterFlush=await held(rawSave(oldSource,oldRevision,latest),prepare(oldSource,oldRevision,newer,oldFinancial));
  assert.notEqual(afterFlush.code,0);assert.match(afterFlush.output,/40001/);assert.equal(financial(),oldFinancial);
  // Prepare wins first: contending old draft gets a safe retry, then source CAS failure.
  oldSource=source();oldRevision=revision();
  const afterPrepare=await held(prepare(oldSource,oldRevision,latest),rawSave(oldSource,oldRevision,newer));
  assert.notEqual(afterPrepare.code,0);assert.match(afterPrepare.output,/55P03/);
  const staleRetry=await query(rawSave(oldSource,oldRevision,newer));assert.notEqual(staleRetry.code,0);assert.match(staleRetry.output,/40001/);
  assert.equal(sql(`select prepared_revision=revision and prepared_snapshot=finalized_route_client_snapshot('${c}') from quote_comparison_client_drafts where comparison_id='${c}'`),'t');
  const preparedFinancial=financial();
  const oldSave=await query(`select staff_save_finalized_route_client_quote('${c}','${routeId}','${a}','${client}','BYPASS',null,'Bypass',0,0,'[]',${literal(preparedFinancial)}::jsonb);`);
  assert.notEqual(oldSave.code,0);assert.match(oldSave.output,/40001/);
  const oldClaim=await query(claim(revision(),preparedFinancial,true));assert.notEqual(oldClaim.code,0);assert.match(oldClaim.output,/40001/);
  const legacyBypass=await query(`reset role;set test.actor='${a}';set role authenticated;select staff_save_quote_comparison_client_quote('${c}','${client}','BYPASS',null,'Bypass',0,0,'[]');`);
  assert.notEqual(legacyBypass.code,0);assert.match(legacyBypass.output,/40001/);
  assert.equal(financial(),preparedFinancial);
  // Draft-first vs claim: unprepared revision cannot authorize an older final quote,
  // even if a direct caller supplies the NEW current raw-draft revision.
  oldSource=source();oldRevision=revision();
  const claimAfterEdit=await held(rawSave(oldSource,oldRevision,newer),claim(oldRevision));
  assert.notEqual(claimAfterEdit.code,0);assert.match(claimAfterEdit.output,/40001/);
  const forgedCurrent=await query(claim(revision()));assert.notEqual(forgedCurrent.code,0);assert.match(forgedCurrent.output,/40001/);
  assert.equal(sql(`select client_send_token is null from quote_comparison_routes where id='${routeId}'`),'t');
  // Prepare latest, then claim-first rejects a racing draft and retains exact ack.
  write=await query(prepare(source(),revision(),newer));assert.equal(write.code,0,write.output);
  oldSource=source();oldRevision=revision();
  const afterClaim=await held(claim(oldRevision),rawSave(oldSource,oldRevision,complete));
  assert.notEqual(afterClaim.code,0);assert.match(afterClaim.output,/55P03/);
  const lockedRetry=await query(rawSave(oldSource,oldRevision,complete));assert.notEqual(lockedRetry.code,0);assert.match(lockedRetry.output,/40001|locked/);
  assert.equal(sql(`select r.client_send_snapshot=d.prepared_snapshot and d.revision=d.prepared_revision from quote_comparison_routes r join quote_comparison_client_drafts d on d.comparison_id=r.comparison_id where r.id='${routeId}'`),'t');
  console.log('PASS atomic Prepare/Send: clean stale draft, post-flush race both orders, old-entry bypass, forged unprepared revision, draft/claim races; synthetic claim only, no provider call');
}
