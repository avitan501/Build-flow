// Local-only Supabase HTTP adapter. All persistence uses the disposable PostgreSQL container.
import http from 'node:http';
import {execFileSync} from 'node:child_process';
const db=process.env.QUESTIONNAIRE_CONTAINER||'avantia-client-questionnaire-20261019';
const database=process.env.QUESTIONNAIRE_DATABASE||'postgres',port=Number(process.env.QUESTIONNAIRE_FIXTURE_PORT||3119);
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
function sql(text){return execFileSync('docker',['exec','-i',db,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'}).trim()}
function query(text){const out=sql('set role service_role; '+text);return out.replace(/^SET\n/,'')}
const user={id:'11111111-1111-4111-8111-111111111111',email:'avitanneto@gmail.com',aud:'authenticated',role:'authenticated',created_at:'2026-10-19T00:00:00Z'};
let failNext=false;
http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');const url=new URL(req.url,'http://127.0.0.1:3119');const send=(value,status=200)=>{res.statusCode=status;res.end(JSON.stringify(value))};try{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
 if(url.pathname==='/__qa/reset'){sql('truncate public.client_questionnaire_followups, public.client_questionnaire_submissions');failNext=false;return send({ok:true})}
 if(url.pathname==='/__qa/fail'){failNext=true;return send({ok:true})}
 if(url.pathname==='/__qa/count')return send({count:Number(sql('select count(*) from public.client_questionnaire_submissions'))});
 let staff=false;try{staff=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url').toString()).testRole==='staff'}catch{}
 if(url.pathname==='/auth/v1/user')return send({...user,email:staff?'buildavantiap@gmail.com':user.email});
 if(url.pathname==='/auth/v1/.well-known/jwks.json')return send({keys:[]});
 if(url.pathname==='/rest/v1/profiles')return send({id:user.id,email:staff?'buildavantiap@gmail.com':user.email,full_name:'Local Test Owner',role:staff?'staff':'admin',approval_status:'approved',is_active:true,company_name:'Example',phone:null});
 if(req.headers.apikey!=='local-questionnaire-only')return send({error:'Fixture key required'},403);
 if(url.pathname==='/rest/v1/rpc/submit_client_questionnaire'){
  if(failNext){failNext=false;return send({message:'Synthetic outage'},503)}
  const result=query(`select public.submit_client_questionnaire(${quote(body.p_id)}::uuid,${quote(JSON.stringify(body.p_state))}::jsonb,${quote(body.p_content_hash)},${quote(body.p_bucket)})`);return send(result);
 }
 if(url.pathname==='/rest/v1/client_questionnaire_followups'){
  if(req.method==='POST'){
   if(failNext){failNext=false;return send({message:'Synthetic outage'},503)}
   query(`insert into public.client_questionnaire_followups(submission_id,location,timing,needed_date,updated_at) values(${quote(body.submission_id)}::uuid,${quote(body.location)},${quote(body.timing)},${body.needed_date?quote(body.needed_date)+'::date':'null'},${quote(body.updated_at)}::timestamptz) on conflict(submission_id) do update set location=excluded.location,timing=excluded.timing,needed_date=excluded.needed_date,updated_at=excluded.updated_at`);return send(null);
  }
  const id=url.searchParams.get('submission_id')?.replace(/^eq\./,'');
  const raw=query(`select row_to_json(t) from (select location,timing,needed_date,updated_at from public.client_questionnaire_followups where submission_id=${quote(id)}::uuid)t`);return send(raw?JSON.parse(raw):null);
 }
 if(url.pathname==='/rest/v1/client_questionnaire_submissions'){
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  if(id){const raw=query(`select row_to_json(t) from (select id,created_at,state from public.client_questionnaire_submissions where id=${quote(id)}::uuid)t`);return send(raw?JSON.parse(raw):null)}
  const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||50);
  const raw=query(`select coalesce(json_agg(t),'[]') from (select id,created_at,state->'profile'->>'name' as name,state->'profile'->>'company' as company from public.client_questionnaire_submissions order by created_at desc,id offset ${offset} limit ${limit})t`);return send(JSON.parse(raw));
 }
 send({error:'Unknown local fixture route'},404);
}catch{send({error:'Local fixture request failed'},500)}}).listen(port,'127.0.0.1',()=>console.log('Disposable questionnaire fixture ready on '+port));
