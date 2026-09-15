import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"
import { normalizePhoneNumber } from "../lib/auth-phone"
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

async function mount(page: Page, initialPhone = "+15165550100", hydrate = false) {
  const modules: string[] = [], seen = new Map<string, number>()
  const action = modules.push(`exports.saveAccountPhone=input=>new Promise(resolve=>{window.calls.push(input);window.resolveSave=result=>resolve(result)})`)-1
  function bundle(file: string): number {
    if (seen.has(file)) return seen.get(file)!
    const id=modules.length;seen.set(file,id);modules.push("")
    let code=readFileSync(file,"utf8")
    if (/\.tsx?$/.test(file)) code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,phone)=>`require(${phone==='@/app/account/phone-action'?action:bundle(resolver.resolve(phone))})`)
    return id
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/account-phone-autosave.tsx'))
  let serverHtml = ''
  if (hydrate) {
    const compiled = ts.transpileModule(readFileSync('components/buildflow/account-phone-autosave.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
    const exports: {AccountPhoneAutosave?: import('react').ComponentType<{actorId:string;initialPhone:string;inputClass:string}>} = {}
    const nodeRequire = createRequire(resolve('package.json'))
    new Function('require','exports',compiled)((id:string)=>id==='@/app/account/phone-action'?{}:nodeRequire(id),exports)
    serverHtml = renderToString(createElement(exports.AccountPhoneAutosave!,{actorId:'actor-a',initialPhone,inputClass:''}))
  }
  await page.route('http://phone.test/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<meta charset="utf-8"><meta name="viewport" content="width=device-width"><div id="root">${serverHtml}</div>`}))
  await page.goto('http://phone.test/')
  await page.addScriptTag({content:`(()=>{window.calls=[];const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${component});let root;const element=(actor='actor-a')=>R.createElement(C.AccountPhoneAutosave,{key:actor,actorId:actor,initialPhone:actor==='actor-a'?${JSON.stringify(initialPhone)}:'+15165550200',inputClass:''});window.showActor=(actor='actor-a')=>root.render(element(actor));window.startHydration=()=>{root=require(${dom}).hydrateRoot(document.getElementById('root'),element())};${hydrate ? '' : `root=require(${dom}).createRoot(document.getElementById('root'));window.showActor()`}})()`})
}
async function finish(page:Page,result:unknown){await page.evaluate(result=>(window as unknown as {resolveSave:(result:unknown)=>void}).resolveSave(result),result)}
const calls=(page:Page)=>page.evaluate(()=>(window as unknown as {calls:Array<{actorId:string;phone:string;expectedPhone:string|null}>}).calls)

test('server-rendered phone stays disabled until hydration and draft recovery finish',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await mount(page,'+15165550100',true)
  const input=page.getByLabel('Primary phone',{exact:true})
  await expect(input).toBeDisabled();await expect(page.getByRole('status')).toHaveText('Loading phone…')
  expect(await input.evaluate(element=>(element as HTMLInputElement).matches(':disabled'))).toBe(true)
  await page.evaluate(()=>sessionStorage.setItem('avantia:account-phone-draft:actor-a',JSON.stringify({draft:'+15165550109',expectedPhone:'+15165550100'})))
  await page.evaluate(()=>(window as unknown as {startHydration:()=>void}).startHydration())
  await expect(input).toBeEnabled();await expect(input).toHaveValue('+15165550109')
  await expect(page.getByRole('status')).toContainText('restored');expect((await calls(page)).length).toBe(0)
  await page.getByRole('button',{name:'Retry',exact:true}).click()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  expect((await calls(page))[0].expectedPhone).toBe('+15165550100')
  await finish(page,{ok:true,phone:'+15165550109'});await expect(page.getByRole('status')).toHaveText('Saved')
  expect(errors).toEqual([])
})

test('debounce and blur save without Save button; late acknowledgement preserves and serializes newer typing',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('+15165550101')
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await expect(page.getByRole('status')).toHaveText('Saving…')
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550102');await page.getByLabel('Primary phone',{exact:true}).blur()
  expect((await calls(page)).length).toBe(1)
  await finish(page,{ok:true,phone:'+15165550101'})
  await expect.poll(async()=>(await calls(page)).length).toBe(2)
  expect((await calls(page))[1]).toEqual({actorId:'actor-a',phone:'+15165550102',expectedPhone:'+15165550101'})
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550102')
  await finish(page,{ok:true,phone:'+15165550102'});await expect(page.getByRole('status')).toHaveText('Saved')
  await expect(page.getByRole('button',{name:'Save',exact:true})).toHaveCount(0)
})

test('saved canonical contact is restored from fresh server props after reload',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('(516) 555-0199');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1);await finish(page,{ok:true,phone:'+15165550199'})
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550199')
  await mount(page,'+15165550199');await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550199');expect((await calls(page)).length).toBe(0)
})

test('failure retains edit and requires Retry; conflict cannot silently overwrite',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('+15165550103');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await finish(page,{ok:false,error:'Phone was not saved. Try again.'})
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550103')
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await calls(page)).length).toBe(2)
  await finish(page,{ok:false,error:'Changed elsewhere',conflict:{phone:'+15165550104'}})
  await expect(page.getByText('Saved phone:')).toContainText('+15165550104')
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550107');await page.getByLabel('Primary phone',{exact:true}).blur()
  expect((await calls(page)).length).toBe(2)
  await page.getByRole('button',{name:'Use saved phone'}).click();await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550104')
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550105');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(3);expect((await calls(page))[2].expectedPhone).toBe('+15165550104')
})

test('invalid phones never submit; actor remount ignores another account late response',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('A');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect(page.getByRole('status')).toContainText('7–15');expect((await calls(page)).length).toBe(0)
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550106');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await page.evaluate(()=>(window as unknown as {showActor:(id:string)=>void}).showActor('actor-b'))
  await finish(page,{ok:true,phone:'+15165550106'});await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550200')
  await expect(page.getByRole('status')).toHaveText('Saves automatically')
})

function actionHarness(options: {signedIn?:boolean;expectedActor?:string;stored?:string|null;dbError?:boolean}={}) {
  let stored=options.stored===undefined?'+15165550100':options.stored, writes=0, adminCalls=0
  const filters: Array<[string,unknown]>=[]
  const admin={from:()=>{
    let update: {phone:string}|null=null
    const query={update(value:{phone:string}){update=value;return query},eq(field:string,value:unknown){filters.push([field,value]);return query},is(field:string,value:unknown){filters.push([field,value]);return query},select(){return query},async maybeSingle(){
      if(options.dbError)return {data:null,error:{message:'private failure'}}
      if(!update)return {data:{phone:stored},error:null}
      const expected=filters.find(([field])=>field==='phone')?.[1]
      if(expected!==stored)return {data:null,error:null}
      stored=update.phone;writes++;return {data:{phone:stored},error:null}
    }};return query
  }}
  const compiled=ts.transpileModule(readFileSync('app/account/phone-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const exports:{saveAccountPhone?:(input:unknown)=>Promise<unknown>}={}
  new Function('require','exports',compiled)((id:string)=>id==='@/lib/auth-phone'?{normalizePhoneNumber}:id==='next/cache'?{revalidatePath:()=>{}}:id==='@/lib/auth'?{getSessionWithProfile:async()=>({user:options.signedIn===false?null:{id:'actor-a'},profile:{id:'actor-a'}})}:{createAdminClient:()=>{adminCalls++;return admin}},exports)
  return {save:exports.saveAccountPhone!,state:()=>({stored,writes,adminCalls,filters})}
}

test('server action validates session, actor and phone before admin access and never accepts arbitrary target',async()=>{
  for(const input of[{actorId:'other',phone:'+15165550108',expectedPhone:'+15165550100'},{actorId:'actor-a',phone:'A',expectedPhone:'+15165550100'},null]){
    const h=actionHarness();expect(await h.save(input)).toMatchObject({ok:false});expect(h.state().adminCalls).toBe(0)
  }
  const h=actionHarness({signedIn:false});expect(await h.save({actorId:'actor-a',phone:'+15165550108',expectedPhone:'+15165550100'})).toMatchObject({ok:false});expect(h.state().adminCalls).toBe(0)
})

test('server normalizes contact formatting and rejects invalid/oversized input without auth mutations',async()=>{
  const h=actionHarness();expect(await h.save({actorId:'actor-a',phone:'(516) 555-0199',expectedPhone:'+15165550100'})).toEqual({ok:true,phone:'+15165550199'})
  for(const phone of ['', 'abc5165550199', '+123456', '516+5550199', '++15165550199', '+1234567890123456', ' '.repeat(50)+'5165550199']) {
    const h=actionHarness();expect(await h.save({actorId:'actor-a',phone,expectedPhone:'+15165550100'})).toMatchObject({ok:false});expect(h.state().adminCalls).toBe(0)
  }
  const source=readFileSync('app/account/phone-action.ts','utf8');expect(source).not.toContain('auth.updateUser');expect(source).not.toContain('admin.updateUserById');expect(source).toContain('.eq("id", user.id)')
})

test('unmount cancels debounce and prevents queued continuation after in-flight acknowledgement',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('+15165550101')
  await page.evaluate(()=>(window as unknown as {showActor:(id:string)=>void}).showActor('actor-b'))
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550200')
  await page.waitForTimeout(750);expect((await calls(page)).length).toBe(0)
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550201');await page.getByLabel('Primary phone',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await page.getByLabel('Primary phone',{exact:true}).fill('+15165550202')
  await page.evaluate(()=>(window as unknown as {showActor:(id:string)=>void}).showActor('actor-a'))
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550101')
  await finish(page,{ok:true,phone:'+15165550201'});await page.waitForTimeout(750)
  expect((await calls(page)).length).toBe(1);await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550101')
  await page.evaluate(()=>(window as unknown as {showActor:(id:string)=>void}).showActor('actor-b'))
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550202')
  await page.getByRole('button',{name:'Retry',exact:true}).click()
  await expect.poll(async()=>(await calls(page)).length).toBe(2)
  expect((await calls(page))[1]).toEqual({actorId:'actor-b',phone:'+15165550202',expectedPhone:'+15165550200'})
})

test('recovered phone retains original CAS baseline despite changed fresh props; explicit conflict review',async({page})=>{
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('+15165550109')
  await mount(page,'+15165550999')
  await expect(page.getByLabel('Primary phone',{exact:true})).toHaveValue('+15165550109')
  await expect(page.getByRole('status')).toContainText('restored');expect((await calls(page)).length).toBe(0)
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await calls(page)).length).toBe(1)
  expect((await calls(page))[0].expectedPhone).toBe('+15165550100')
  await finish(page,{ok:false,error:'Changed elsewhere',conflict:{phone:'+15165550999'}})
  await page.getByRole('button',{name:'Use saved phone'}).click()
  expect(await page.evaluate(()=>sessionStorage.getItem('avantia:account-phone-draft:actor-a'))).toBeNull()
})

test('restored text equal to its old baseline still verifies changed server state',async({page})=>{
  await mount(page)
  await page.evaluate(()=>sessionStorage.setItem('avantia:account-phone-draft:actor-a',JSON.stringify({draft:'+15165550100',expectedPhone:'+15165550100'})))
  await mount(page,'+15165550999')
  await expect(page.getByRole('status')).toContainText('restored')
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await finish(page,{ok:false,error:'Changed elsewhere',conflict:{phone:'+15165550999'}})
  await expect(page.getByText('Saved phone:')).toContainText('+15165550999')
})

test('unavailable recovery storage warns while ordinary save remains usable',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('unavailable')}})
  await mount(page);await page.getByLabel('Primary phone',{exact:true}).fill('+15165550109')
  await expect(page.getByRole('alert')).toContainText('Stay on this page')
  await page.getByLabel('Primary phone',{exact:true}).blur();await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await finish(page,{ok:true,phone:'+15165550109'});await expect(page.getByRole('status')).toHaveText('Saved')
})

test('server action uses atomic self-only CAS including null and recovers a lost acknowledgment without overwrite',async()=>{
  for(const old of['+15165550100',null,'']){const h=actionHarness({stored:old});expect(await h.save({actorId:'actor-a',phone:' +15165550108 ',expectedPhone:old})).toEqual({ok:true,phone:'+15165550108'});expect(h.state().filters).toEqual([['id','actor-a'],['phone',old]]);expect(h.state().writes).toBe(1)}
  const conflict=actionHarness({stored:'+15165550300'});expect(await conflict.save({actorId:'actor-a',phone:'+15165550108',expectedPhone:'+15165550100'})).toMatchObject({ok:false,conflict:{phone:'+15165550300'}});expect(conflict.state().writes).toBe(0)
  const lost=actionHarness({stored:'+15165550108'});expect(await lost.save({actorId:'actor-a',phone:'+15165550108',expectedPhone:'+15165550100'})).toEqual({ok:true,phone:'+15165550108'});expect(lost.state().writes).toBe(0)
  const fail=actionHarness({dbError:true});expect(await fail.save({actorId:'actor-a',phone:'+15165550108',expectedPhone:'+15165550100'})).toMatchObject({ok:false,error:'Phone was not saved. Try again.'})
})
