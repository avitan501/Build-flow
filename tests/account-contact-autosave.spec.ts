import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { normalizePhoneNumber } from "../lib/auth-phone"

async function mount(page: Page, revision=0, hydrate=false) {
  const modules:string[]=[],seen=new Map<string,number>()
  const action=modules.push('exports.saveAccountContacts=input=>new Promise(resolve=>{window.calls.push(input);window.finish=resolve})')-1
  function bundle(file:string):number { if(seen.has(file))return seen.get(file)!;const id=modules.length;seen.set(file,id);modules.push('');let code=readFileSync(file,'utf8');if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const req=createRequire(file);modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>`require(${name==='@/app/account/contact-settings-action'?action:bundle(req.resolve(name))})`);return id }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/account-contact-autosave.tsx'))
  const initial={email:'old@example.invalid',phone:'+15165550100',revision}
  let html=''
  if(hydrate){const out:{AccountContactAutosave?:React.ComponentType<{actorId:string;initial:typeof initial;inputClass:string}>}={};const compiled=ts.transpileModule(readFileSync('components/buildflow/account-contact-autosave.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;const req=createRequire(resolve('package.json'));new Function('require','exports',compiled)((id:string)=>id==='@/app/account/contact-settings-action'?{}:req(id),out);html=renderToString(createElement(out.AccountContactAutosave!,{actorId:'actor-a',initial,inputClass:''}))}
  await page.route('http://contacts.test/',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:`<meta charset="utf-8"><div id="root">${html}</div>`}));await page.goto('http://contacts.test/')
  await page.addScriptTag({content:`(()=>{window.calls=[];const process={env:{NODE_ENV:'production'}},modules=[${modules.map(s=>`function(module,exports,require){${s}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${component});let root;const element=(actor='actor-a')=>R.createElement(C.AccountContactAutosave,{key:actor,actorId:actor,initial:actor==='actor-a'?${JSON.stringify(initial)}:{email:'other@example.invalid',phone:null,revision:0},inputClass:''});window.show=(actor='actor-a')=>root.render(element(actor));window.hydrate=()=>{root=require(${dom}).hydrateRoot(document.getElementById('root'),element())};${hydrate?'':`root=require(${dom}).createRoot(document.getElementById('root'));window.show()`}})()`})
}
const calls=(p:Page)=>p.evaluate(()=>(window as unknown as {calls:Array<{actorId:string;email:string;phone:string;expectedRevision:number}>}).calls)
const finish=(p:Page,r:unknown)=>p.evaluate(r=>(window as unknown as {finish:(r:unknown)=>void}).finish(r),r)

test('actual SSR waits for recovery before editing, then uses retained revision',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await mount(page,4,true);await expect(page.getByLabel('Alternate email')).toBeDisabled()
  await page.evaluate(()=>sessionStorage.setItem('avantia:alternate-contacts:v1:actor-a',JSON.stringify({draft:{email:'new@example.invalid',phone:''},revision:1})))
  await page.evaluate(()=>(window as unknown as {hydrate:()=>void}).hydrate());await expect(page.getByLabel('Alternate email')).toBeEnabled();await expect(page.getByLabel('Alternate email')).toHaveValue('new@example.invalid')
  expect((await calls(page)).length).toBe(0);await page.getByRole('button',{name:'Retry'}).click();await expect.poll(async()=>(await calls(page)).length).toBe(1);expect((await calls(page))[0].expectedRevision).toBe(1)
  await finish(page,{ok:false,error:'Changed elsewhere',conflict:{email:'saved@example.invalid',phone:null,revision:4}});await page.getByRole('button',{name:'Use saved contacts'}).click();await expect(page.getByLabel('Alternate email')).toHaveValue('saved@example.invalid');expect(errors).toEqual([])
})
test('serializes both fields without losing newer typing and clears blank contacts',async({page})=>{
  await mount(page);await page.getByLabel('Alternate email').fill('new@example.invalid');await page.getByLabel('Alternate email').blur();await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await page.getByLabel('Alternate phone').fill('');await finish(page,{ok:true,snapshot:{email:'new@example.invalid',phone:'+15165550100',revision:1}});await expect.poll(async()=>(await calls(page)).length).toBe(2);expect((await calls(page))[1]).toMatchObject({email:'new@example.invalid',phone:'',expectedRevision:1})
  await finish(page,{ok:true,snapshot:{email:'new@example.invalid',phone:null,revision:2}});await expect(page.getByRole('status')).toHaveText('Saved');expect(await page.evaluate(()=>sessionStorage.getItem('avantia:alternate-contacts:v1:actor-a'))).toBeNull()
})
test('SPA remount retains draft and baseline; actor switch blocks late continuation',async({page})=>{
  await mount(page);await page.getByLabel('Alternate email').fill('pending@example.invalid');await page.getByLabel('Alternate email').blur();await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await page.getByLabel('Alternate phone').fill('+15165550199');await page.evaluate(()=>(window as unknown as {show:(a:string)=>void}).show('actor-b'));await expect(page.getByLabel('Alternate email')).toHaveValue('other@example.invalid');await finish(page,{ok:true,snapshot:{email:'pending@example.invalid',phone:'+15165550100',revision:1}});await page.waitForTimeout(700);expect((await calls(page)).length).toBe(1)
  await page.evaluate(()=>(window as unknown as {show:(a:string)=>void}).show('actor-a'));await expect(page.getByLabel('Alternate phone')).toHaveValue('+15165550199');await expect(page.getByRole('status')).toContainText('restored');await page.getByRole('button',{name:'Retry'}).click();await expect.poll(async()=>(await calls(page)).length).toBe(2);expect((await calls(page))[1].expectedRevision).toBe(0)
})
test('network error retains draft and retry; malformed storage warns',async({page})=>{
  await mount(page);await page.getByLabel('Alternate phone').fill('+15165550199');await page.getByLabel('Alternate phone').blur();await expect.poll(async()=>(await calls(page)).length).toBe(1);await finish(page,{ok:false,error:'Not saved'});await expect(page.getByLabel('Alternate phone')).toHaveValue('+15165550199');await page.getByRole('button',{name:'Retry'}).click();await expect.poll(async()=>(await calls(page)).length).toBe(2)
  await page.evaluate(()=>sessionStorage.setItem('avantia:alternate-contacts:v1:actor-a','invalid'));await mount(page);await expect(page.getByRole('alert')).toContainText('recovery is unavailable');await expect(page.getByLabel('Alternate phone')).toBeEnabled()
})

test('server self-checks, validates, normalizes and forwards exact revision without auth writes',async()=>{
  let calls=0,last:unknown;const compiled=ts.transpileModule(readFileSync('app/account/contact-settings-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const out:{saveAccountContacts?:(i:unknown)=>Promise<unknown>}={}
  new Function('require','exports',compiled)((id:string)=>id==='next/cache'?{revalidatePath:()=>{}}:id==='@/lib/auth-phone'?{normalizePhoneNumber}:{requireSignedInProfile:async()=>({user:{id:'actor-a'},supabase:{rpc:async(_name:string,args:unknown)=>{calls++;last=args;return{data:{ok:true,email:null,phone:null,revision:3},error:null}}}})},out)
  for(const bad of [null,{actorId:'actor-b',email:'',phone:'',expectedRevision:0},{actorId:'actor-a',email:'bad',phone:'',expectedRevision:0},{actorId:'actor-a',email:'',phone:'++15165550100',expectedRevision:0},{actorId:'actor-a',email:'',phone:'',expectedRevision:-1}])expect(await out.saveAccountContacts!(bad)).toMatchObject({ok:false})
  expect(calls).toBe(0);expect(await out.saveAccountContacts!({actorId:'actor-a',email:' NEW@EXAMPLE.INVALID ',phone:'(516)555-0199',expectedRevision:2})).toMatchObject({ok:true});expect(last).toEqual({p_email:'new@example.invalid',p_phone:'+15165550199',p_expected_revision:2})
  await out.saveAccountContacts!({actorId:'actor-a',email:' ',phone:' ',expectedRevision:3});expect(last).toEqual({p_email:null,p_phone:null,p_expected_revision:3})
})
