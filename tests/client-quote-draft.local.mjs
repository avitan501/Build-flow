// Own disposable database only; reuse the captured full schema, grants and triggers.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const container = `avantia-client-draft-${process.pid}`;
const run = (args, input) => spawnSync('docker', args, { input, encoding: 'utf8' });
assert.equal(run(['run','--detach','--name',container,'--network','none','-e','POSTGRES_PASSWORD=disposable-fixture-only','postgres:17-alpine']).status,0);
try {
  for(let i=0;i<100;i++) {
    if(run(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']).status===0) break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  let script=readFileSync(new URL('./ai-request-migrations-combined.local.mjs',import.meta.url),'utf8');
  script=script.replace("from './ai-source-publication-locks.local.mjs'",`from '${new URL('./ai-source-publication-locks.local.mjs',import.meta.url).href}'`)
    .replace("new URL('../', import.meta.url)",`new URL('${root.href}')`)
    .replace("const container = 'avantia-ai-current-20260915'",`const container = '${container}'`)
    .replace("await runAiCombined(sql,container,database);", "// AI concurrency belongs to the existing independent suite; no rerun here.")
    .replace("PASS current actor permissions + real payroll schema + AI service-only grants and contention", "PASS current actor permissions + real payroll schema + AI service-only grants (AI contention not rerun in this draft suite)")
    .replace("console.log('PASS: mixed A/B allocation, displayed client CAS, claim and bypass guards');", `sql(\`set role service_role; do $$$$ begin assert (staff_load_client_quote_draft('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000002')->>'locked')::boolean,'Claimed mixed quote editable';end $$$$;reset role;\`);console.log('PASS: mixed A/B allocation, displayed client CAS, claim and bypass guards, locked draft');`)
    .replace("sql(read('tests/request-migrations-combined.local.sql'));", `sql(read('tests/request-migrations-combined.local.sql'));
      console.log('Installed client RPC source MD5 '+sql(\`select jsonb_object_agg(proname,md5(prosrc)) from pg_proc where oid in ('public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb)'::regprocedure,'public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb)'::regprocedure,'public.staff_save_quote_comparison_client_quote(uuid,uuid,text,date,text,numeric,numeric,jsonb)'::regprocedure)\`));
      sql(read('supabase/migrations/20260915024232_client_quote_incomplete_drafts.sql'));
      sql(read('supabase/migrations/20260915032659_client_draft_legacy_capability_guard.sql'));`)
    .replace("} finally {", `
      const draftChecks=read('tests/client-quote-draft.local.sql').split('-- Remove only synthetic records');
      sql(draftChecks[0]);
      await (await import('${new URL('./client-quote-draft-concurrency.local.mjs',import.meta.url).href}')).runClientDraftConcurrency(sql,container,database);
      sql(read('tests/client-draft-legacy-capability.local.sql'));
      console.log('PASS legacy capability-only staff prepare, revoked/null fail-closed, mixed named actors unchanged');
      console.log('PASS client draft roles, raw text, source changes, CAS, immutable financial rows');
    } finally {`);
  const result=spawnSync(process.execPath,['--input-type=module','-',fileURLToPath(new URL('supabase/migrations/20260914230638_quote_comparison_finalized_routes.sql',root))],{input:script,encoding:'utf8',maxBuffer:4*1024*1024});
  process.stdout.write(result.stdout); process.stderr.write(result.stderr);
  assert.equal(result.status,0,'Draft/full-schema rehearsal failed');
} finally {
  const removed=run(['rm','--force',container]);
  assert.equal(removed.status,0,'Could not remove owned disposable container');
}
