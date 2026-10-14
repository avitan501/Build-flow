// Local-only Supabase HTTP fixture. Never connects to a production service.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
const port = Number(process.env.DASHBOARD_FIXTURE_PORT || 3117);
const ownerId = '11111111-1111-4111-8111-111111111111';
let tasks, goals, failNext = false;
function reset() {
  tasks = ['Framing supplier review', 'First profitable offer', 'Roofing quote review', 'Supplier partnership', 'Customer interviews', 'Material delivery plan'].map((title,i)=>({
    id:`11111111-1111-4111-8111-${String(i+2).padStart(12,'0')}`,task_key:`david-task-fixture-${i}`,
    title,category:'suppliers_pricing',status:'open',assigned_agent:'David',progress_percent:0,
    summary:'Local test fixture only.',next_step:'Review the next step.',updated_at:`2026-10-14T10:00:0${i}.000Z`,
    source_chat_title:'David Dashboard',item_kind:'task',published_to_carlos:false,resolution_cost:null,priority:1,sort_order:i,
  }));goals=[];failNext=false;
}
reset();
function matches(row,params) {
  for(const [key,value] of params){
    if(['select','order','limit','offset'].includes(key))continue;
    if(value.startsWith('eq.')&&String(row[key])!==value.slice(3))return false;
    if(value.startsWith('neq.')&&String(row[key])===value.slice(4))return false;
    if(value.startsWith('not.in.')&&value.slice(7).replace(/[()]/g,'').split(',').includes(String(row[key])))return false;
    if(value.startsWith('not.like.')&&String(row[key]).startsWith(value.slice(9).replace(/%|\*/g,'')))return false;
    if(value.startsWith('like.')&&!String(row[key]).startsWith(value.slice(5).replace(/%|\*/g,'')))return false;
  }return true;
}
http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const respond=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  let raw='';for await(const chunk of req)raw+=chunk;
  let body={};try{body=JSON.parse(raw||'{}')}catch{}
  if(url.pathname==='/__qa/reset'){reset();return respond({ok:true});}
  if(url.pathname==='/__qa/state')return respond({tasks,goals});
  if(url.pathname==='/__qa/fail-next'){failNext=true;return respond({ok:true});}
  let claims={};try{claims=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1]||'','base64url').toString())}catch{}
  const isStaff=claims.testRole==='staff',isClient=claims.testRole==='client';
  const profile={id:ownerId,email:isStaff?'buildavantiap@gmail.com':isClient?'client@example.test':'avitanneto@gmail.com',full_name:'QA Owner',company_name:'Avantia QA',phone:null,role:isStaff?'staff':isClient?'client':'admin',approval_status:'approved',is_active:true};
  if(url.pathname==='/auth/v1/user')return respond({id:ownerId,email:profile.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
  if(url.pathname.includes('/.well-known/'))return respond({keys:[]});
  const table=url.pathname.split('/rest/v1/')[1];
  let rows=table==='profiles'?[profile]:table==='website_work_items'?tasks:table==='manager_goals'?goals:[];
  if(['POST','PATCH','DELETE'].includes(req.method)&&failNext){failNext=false;return respond({message:'Simulated persistence failure',code:'QA_FAILURE'},500);}
  let result=rows.filter(row=>matches(row,url.searchParams));
  if(req.method==='POST'&&['website_work_items','manager_goals'].includes(table)){
    result=(Array.isArray(body)?body:[body]).map(row=>({id:randomUUID(),updated_at:new Date().toISOString(),priority:1,sort_order:0,...row}));rows.push(...result);
  }
  if(req.method==='PATCH'){result.forEach(row=>Object.assign(row,body,{updated_at:new Date().toISOString()}));}
  if(req.method==='DELETE'&&table==='website_work_items'){tasks=tasks.filter(row=>!result.includes(row));}
  if(req.method==='HEAD'){res.writeHead(200,{'Content-Range':`0-${Math.max(0,result.length-1)}/${result.length}`});res.end();return;}
  if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return result.length===1?respond(result[0]):respond({code:'PGRST116',details:'0 rows',message:'No row'},406);
  return respond(result);
}).listen(port,'127.0.0.1',()=>console.log(`Local dashboard data fixture on ${port}`));
