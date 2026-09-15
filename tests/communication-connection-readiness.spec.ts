import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"

async function mount(page: Page) {
  const modules: string[] = [], seen = new Map<string, number>()
  function bundle(file: string): number {
    if(seen.has(file))return seen.get(file)!
    const id=modules.length;seen.set(file,id);modules.push("")
    let code=readFileSync(file,"utf8")
    if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>`require(${bundle(resolver.resolve(name))})`)
    return id
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),hook=bundle(resolve('components/buildflow/use-communication-connections.ts'))
  await page.route('http://connections.test/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<div id="root"></div>'}))
  await page.goto('http://connections.test/')
  await page.addScriptTag({content:`(()=>{window.requests=[];window.fetch=(url,options)=>new Promise((resolve,reject)=>{window.requests.push({url,options});window.reply=(status,data)=>resolve({ok:status===200,json:async()=>data});window.fail=()=>reject(Error('Network'))});const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),h=R.createElement,useConnections=require(${hook}).useCommunicationConnections;function App(){const[scope,S]=R.useState('actor-a');window.changeActor=S;const {connections,state,refresh}=useConnections({quo:{send:false,receive:false},whatsapp:{send:false,receive:false},email:{send:false,receive:false}},scope);return h('main',null,h('output',null,state),h('p',null,connections.email.send?'Known ready':'Known false'),h('input',{'aria-label':'Draft',defaultValue:'Keep my draft'}),h('button',{disabled:state!=='verified'||!connections.email.send},'Send'),h('button',{onClick:refresh},'Retry'))}require(${dom}).createRoot(document.getElementById('root')).render(h(App))})()`})
  await page.waitForFunction(()=>typeof (window as unknown as {reply:unknown}).reply==='function')
}
const ready=(email=true)=>({verified:true,connections:{quo:{send:true,receive:true},whatsapp:{send:true,receive:true},email:{send:email,receive:email}}})
async function reply(page:Page,status:number,data:unknown){await page.evaluate(({status,data})=>(window as unknown as {reply:(status:number,data:unknown)=>void}).reply(status,data),{status,data})}
const requestCount=(page:Page)=>page.evaluate(()=>(window as unknown as {requests:unknown[]}).requests.length)

test('checking and unavailable never enable Send; retry verifies genuine ready vs disconnected',async({page})=>{
  await mount(page);await expect(page.getByRole('status')).toHaveText('checking');await expect(page.getByRole('button',{name:'Send',exact:true})).toBeDisabled()
  await reply(page,503,{verified:false});await expect(page.getByRole('status')).toHaveText('unavailable')
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(()=>requestCount(page)).toBe(2)
  await reply(page,200,ready());await expect(page.getByRole('status')).toHaveText('verified');await expect(page.getByRole('button',{name:'Send',exact:true})).toBeEnabled()
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(()=>requestCount(page)).toBe(3)
  await reply(page,200,ready(false));await expect(page.getByRole('status')).toHaveText('verified');await expect(page.getByRole('button',{name:'Send',exact:true})).toBeDisabled()
  await expect(page.getByRole('textbox',{name:'Draft'})).toHaveValue('Keep my draft')
})

test('transient errors preserve known capabilities but disable sending; automatic retries are bounded',async({page})=>{
  await mount(page);await reply(page,200,ready());await expect(page.getByRole('status')).toHaveText('verified')
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(()=>requestCount(page)).toBe(2)
  await page.evaluate(()=>(window as unknown as {fail:()=>void}).fail());await expect(page.getByRole('status')).toHaveText('unavailable')
  await expect(page.getByText('Known ready',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Send',exact:true})).toBeDisabled()
  await expect.poll(()=>requestCount(page)).toBe(3);await reply(page,200,{connections:ready().connections})
  await expect.poll(()=>requestCount(page),{timeout:7000}).toBe(4);await reply(page,503,{verified:false})
  await page.waitForTimeout(4500);expect(await requestCount(page)).toBe(4)
  await expect(page.getByRole('status')).toHaveText('unavailable')
})

test('cancelled check cannot replace a newer verified response',async({page})=>{
  await mount(page)
  await page.evaluate(()=>{const w=window as unknown as {reply:unknown;oldReply:unknown};w.oldReply=w.reply})
  await page.getByRole('button',{name:'Retry'}).click();await expect.poll(()=>requestCount(page)).toBe(2)
  await reply(page,200,ready());await expect(page.getByRole('status')).toHaveText('verified')
  await page.evaluate(data=>(window as unknown as {oldReply:(status:number,data:unknown)=>void}).oldReply(200,data),ready(false))
  await expect(page.getByText('Known ready')).toBeVisible();await expect(page.getByRole('button',{name:'Send',exact:true})).toBeEnabled()
})

test('server readiness never reports disconnected for a failed broker and returns verified false separately',async()=>{
  const source=readFileSync('lib/aura/dashboard.ts','utf8')
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const exports:Record<string,(client:unknown)=>Promise<unknown>>={}
  new Function('require','exports',code)((name:string)=>name==='server-only'?{}:{canSendAuraEmail:()=>false,canSendAuraQuoText:()=>false,canSendAuraWhatsApp:()=>false,canUseTwilioWhatsApp:()=>false},exports)
  for(const invoke of[async()=>({data:null,error:{message:'private provider error'}}),async()=>({data:{ok:false}}),async()=>({data:{ok:true}}),async()=>{throw Error('Network')}]){
    expect(await exports.loadAuraConnectionStatus({functions:{invoke}})).toBeNull()
  }
  const result=await exports.loadAuraConnectionStatus({functions:{invoke:async()=>({data:{ok:true,email:true,emailReceive:true,sms:true,smsReceive:true,whatsapp:true}})}})
  expect(result).toMatchObject({email:{send:true,receive:true}})
  const disconnected=await exports.loadAuraConnectionStatus({functions:{invoke:async()=>({data:{ok:true,email:false,emailReceive:false,sms:false,smsReceive:false,whatsapp:false}})}})
  expect(disconnected).toMatchObject({email:{send:false}})
  const route=readFileSync('app/api/admin/communications/status/route.ts','utf8')
  expect(route).toContain('if (!connections)');expect(route).toContain('status: 503');expect(route).toContain('verified: true, connections')
  const inbox=readFileSync('components/buildflow/unified-communication-inbox.tsx','utf8')
  expect(inbox).toContain('connectionCheck === "verified" &&');expect(inbox.match(/if \(!selectedChannelReady\) return/g)).toHaveLength(2)
  expect(inbox).toContain('Connection check unavailable. Your draft is safe.');expect(inbox).toContain('This channel is not connected.')
})

test('account changes discard prior account readiness even when the new check fails',async({page})=>{
  await mount(page);await reply(page,200,ready());await expect(page.getByRole('status')).toHaveText('verified')
  await page.evaluate(()=>(window as unknown as {changeActor:(actor:string)=>void}).changeActor('actor-b'))
  await expect(page.getByRole('status')).toHaveText('checking');await expect.poll(()=>requestCount(page)).toBe(2)
  await expect(page.getByText('Known false',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Send',exact:true})).toBeDisabled()
  await reply(page,503,{verified:false});await expect(page.getByRole('status')).toHaveText('unavailable');await expect(page.getByText('Known false',{exact:true})).toBeVisible()
})
