import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"

async function mount(page: Page) {
  const modules: string[] = [], seen = new Map<string, number>()
  const action = modules.push(`exports.saveAccountName=input=>new Promise(resolve=>{window.calls.push(input);window.resolveSave=result=>resolve(result)})`)-1
  function bundle(file: string): number {
    if (seen.has(file)) return seen.get(file)!
    const id=modules.length;seen.set(file,id);modules.push("")
    let code=readFileSync(file,"utf8")
    if (/\.tsx?$/.test(file)) code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>`require(${name==='@/app/account/name-action'?action:bundle(resolver.resolve(name))})`)
    return id
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/account-name-autosave.tsx'))
  await page.route('http://name.test/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta name="viewport" content="width=device-width"><div id="root"></div>'}))
  await page.goto('http://name.test/')
  await page.addScriptTag({content:`(()=>{window.calls=[];const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${component}),root=require(${dom}).createRoot(document.getElementById('root'));window.showActor=(actor='actor-a')=>root.render(R.createElement(C.AccountNameAutosave,{key:actor,actorId:actor,initialName:actor==='actor-a'?'Carlos':'David',inputClass:''}));window.showActor()})()`})
}
async function finish(page:Page,result:unknown){await page.evaluate(result=>(window as unknown as {resolveSave:(result:unknown)=>void}).resolveSave(result),result)}
const calls=(page:Page)=>page.evaluate(()=>(window as unknown as {calls:Array<{actorId:string;name:string;expectedName:string|null}>}).calls)

test('debounce and blur save without Save button; late acknowledgement preserves and serializes newer typing',async({page})=>{
  await mount(page);await page.getByLabel('Name',{exact:true}).fill('Carlos First')
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await expect(page.getByRole('status')).toHaveText('Saving…')
  await page.getByLabel('Name',{exact:true}).fill('Carlos Second');await page.getByLabel('Name',{exact:true}).blur()
  expect((await calls(page)).length).toBe(1)
  await finish(page,{ok:true,name:'Carlos First'})
  await expect.poll(async()=>(await calls(page)).length).toBe(2)
  expect((await calls(page))[1]).toEqual({actorId:'actor-a',name:'Carlos Second',expectedName:'Carlos First'})
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Carlos Second')
  await finish(page,{ok:true,name:'Carlos Second'});await expect(page.getByRole('status')).toHaveText('Saved')
  await expect(page.getByRole('button',{name:'Save',exact:true})).toHaveCount(0)
})

test('failure retains edit and requires Retry; conflict cannot silently overwrite',async({page})=>{
  await mount(page);await page.getByLabel('Name',{exact:true}).fill('Carlos Changed');await page.getByLabel('Name',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await finish(page,{ok:false,error:'Name was not saved. Try again.'})
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Carlos Changed')
  await page.getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(async()=>(await calls(page)).length).toBe(2)
  await finish(page,{ok:false,error:'Changed elsewhere',conflict:{name:'Carlos Remote'}})
  await expect(page.getByText('Saved name:')).toContainText('Carlos Remote')
  await page.getByLabel('Name',{exact:true}).fill('Still my draft');await page.getByLabel('Name',{exact:true}).blur()
  expect((await calls(page)).length).toBe(2)
  await page.getByRole('button',{name:'Use saved name'}).click();await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Carlos Remote')
  await page.getByLabel('Name',{exact:true}).fill('Carlos Reviewed');await page.getByLabel('Name',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(3);expect((await calls(page))[2].expectedName).toBe('Carlos Remote')
})

test('invalid names never submit; actor remount ignores another account late response',async({page})=>{
  await mount(page);await page.getByLabel('Name',{exact:true}).fill('A');await page.getByLabel('Name',{exact:true}).blur()
  await expect(page.getByRole('status')).toContainText('2–200');expect((await calls(page)).length).toBe(0)
  await page.getByLabel('Name',{exact:true}).fill('Carlos Edited');await page.getByLabel('Name',{exact:true}).blur()
  await expect.poll(async()=>(await calls(page)).length).toBe(1)
  await page.evaluate(()=>(window as unknown as {showActor:(id:string)=>void}).showActor('actor-b'))
  await finish(page,{ok:true,name:'Carlos Edited'});await expect(page.getByLabel('Name',{exact:true})).toHaveValue('David')
  await expect(page.getByRole('status')).toHaveText('Saves automatically')
})

function actionHarness(options: {signedIn?:boolean;expectedActor?:string;stored?:string|null;dbError?:boolean}={}) {
  let stored=options.stored===undefined?'Carlos':options.stored, writes=0, adminCalls=0
  const filters: Array<[string,unknown]>=[]
  const admin={from:()=>{
    let update: {full_name:string}|null=null
    const query={update(value:{full_name:string}){update=value;return query},eq(field:string,value:unknown){filters.push([field,value]);return query},is(field:string,value:unknown){filters.push([field,value]);return query},select(){return query},async maybeSingle(){
      if(options.dbError)return {data:null,error:{message:'private failure'}}
      if(!update)return {data:{full_name:stored},error:null}
      const expected=filters.find(([field])=>field==='full_name')?.[1]
      if(expected!==stored)return {data:null,error:null}
      stored=update.full_name;writes++;return {data:{full_name:stored},error:null}
    }};return query
  }}
  const compiled=ts.transpileModule(readFileSync('app/account/name-action.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const exports:{saveAccountName?:(input:unknown)=>Promise<unknown>}={}
  new Function('require','exports',compiled)((id:string)=>id==='next/cache'?{revalidatePath:()=>{}}:id==='@/lib/auth'?{getSessionWithProfile:async()=>({user:options.signedIn===false?null:{id:'actor-a'},profile:{id:'actor-a'}})}:{createAdminClient:()=>{adminCalls++;return admin}},exports)
  return {save:exports.saveAccountName!,state:()=>({stored,writes,adminCalls,filters})}
}

test('server action validates session, actor and name before admin access and never accepts arbitrary target',async()=>{
  for(const input of[{actorId:'other',name:'New Name',expectedName:'Carlos'},{actorId:'actor-a',name:'A',expectedName:'Carlos'},null]){
    const h=actionHarness();expect(await h.save(input)).toMatchObject({ok:false});expect(h.state().adminCalls).toBe(0)
  }
  const h=actionHarness({signedIn:false});expect(await h.save({actorId:'actor-a',name:'New Name',expectedName:'Carlos'})).toMatchObject({ok:false});expect(h.state().adminCalls).toBe(0)
})

test('server action uses atomic self-only CAS including null and recovers a lost acknowledgment without overwrite',async()=>{
  for(const old of['Carlos',null]){const h=actionHarness({stored:old});expect(await h.save({actorId:'actor-a',name:' New Name ',expectedName:old})).toEqual({ok:true,name:'New Name'});expect(h.state().filters).toEqual([['id','actor-a'],['full_name',old]]);expect(h.state().writes).toBe(1)}
  const conflict=actionHarness({stored:'Remote'});expect(await conflict.save({actorId:'actor-a',name:'New Name',expectedName:'Carlos'})).toMatchObject({ok:false,conflict:{name:'Remote'}});expect(conflict.state().writes).toBe(0)
  const lost=actionHarness({stored:'New Name'});expect(await lost.save({actorId:'actor-a',name:'New Name',expectedName:'Carlos'})).toEqual({ok:true,name:'New Name'});expect(lost.state().writes).toBe(0)
  const fail=actionHarness({dbError:true});expect(await fail.save({actorId:'actor-a',name:'New Name',expectedName:'Carlos'})).toMatchObject({ok:false,error:'Name was not saved. Try again.'})
})
