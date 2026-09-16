import { expect, test, type Page } from '@playwright/test'
import ts from 'typescript'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

async function fixture(page:Page, fail=false) {
  const modules:Record<string,string>={},seen=new Map<string,string>()
  const stub=(code:string)=>{const id=String(Object.keys(modules).length);modules[id]=code;return id}
  const router=stub('exports.useRouter=()=>({refresh(){}})')
  const actions=stub(`window.calls=[];window.saved=[];window.recognized=[];
    function save(input){window.calls.push(input);const edit=input.edit||input;const item={id:input.itemId,name:edit.name,quantity:edit.quantity,unit:edit.unit,department:'Lumber',metadata:{ai_organized:true,source_text:window.props.products.find(p=>p.item.id===input.itemId)?.item.metadata.source_text||edit.recognitionText,recognition_text:edit.recognitionText,request_details:edit.details,request_item_fields:edit.fields,recognition_questions:edit.recognitionQuestions},qualification_status:'not_required'};const version={item,source:null,revision:'saved-'+window.calls.length};window.saved=window.saved.filter(p=>p.item.id!==item.id).concat(version);return{ok:true,...version}}
    exports.saveReviewedRequestItemAction=async(input)=>save(input);
    exports.addSpreadsheetMaterialRow=async(input)=>save(input);
    exports.recognizeRequestProductLine=async(input)=>{window.recognized.push(input);if(${fail})return{ok:false,error:'Recognition unavailable. Your draft is still here.'};return{ok:true,row:{id:input.itemId,name:'TJI 230 I-joist',quantity:22,unit:'pieces',width:'',depth:'10 in',length:'16 ft',model:'TJI 230',details:'',questions:['Confirm depth.']}}};`)
  function bundle(file:string):string {
    if(seen.has(file))return seen.get(file)!
    const id=stub('');seen.set(file,id)
    let code=readFileSync(file,'utf8')
    if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
    const resolver=createRequire(file)
    code=code.replace(/require\(["']([^"']+)["']\)/g,(_all,name:string)=>{
      if(name==='next/navigation')return`require(${JSON.stringify(router)})`
      if(/requests\/(item-edit|spreadsheet-row|row-recognition)-actions$/.test(name))return`require(${JSON.stringify(actions)})`
      const base=name.startsWith('@/')?resolve(process.cwd(),name.slice(2)):''
      const target=base?[base+'.ts',base+'.tsx'].find(existsSync)!:resolver.resolve(name)
      return`require(${JSON.stringify(bundle(target))})`
    });modules[id]=code;return id
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/request-material-spreadsheet.tsx'))
  const props={requestId:'11111111-1111-4111-8111-111111111111',products:[{revision:'original',source:null,item:{id:'22222222-2222-4222-8222-222222222222',name:'TJI 230 I-joist',quantity:12,unit:'pieces',department:'Lumber',qualification_status:'not_required',metadata:{ai_organized:true,source_text:'12 pc 10 inch TJI 230 — 26 ft',request_item_fields:[{id:'dimensions',label:'Dimensions',value:'10 in × 26 ft'},{id:'delivery_address',label:'Address',value:'28 Woodmere'}]}}}]}
  await page.route('http://127.0.0.1:3197/spreadsheet-fixture',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}))
  await page.goto('http://127.0.0.1:3197/spreadsheet-fixture')
  await page.addScriptTag({content:`(()=>{window.props=${JSON.stringify(props)};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text)=>window.copied=text}});const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(',')}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const root=require(${JSON.stringify(dom)}).createRoot(document.getElementById('root'));window.render=()=>root.render(require(${JSON.stringify(react)}).createElement(require(${JSON.stringify(component)}).RequestMaterialSpreadsheet,window.props));window.remount=()=>{root.render(null);setTimeout(window.render,10)};window.render()})()`})
  await expect(page.getByTestId('material-spreadsheet-row')).toHaveCount(1)
}

test('recognition immediately fills fields, Undo restores old draft, save/copy/reload agree',async({page})=>{
  await fixture(page)
  const row=page.getByTestId('material-spreadsheet-row')
  expect(await row.locator('td:nth-child(2) > div > label').evaluateAll(labels=>labels.map(label=>label.firstChild?.textContent))).toEqual(['Quantity','Unit','Product','Width','Depth / thickness','Length','Model / SKU'])
  await expect(row.getByLabel('Depth / thickness',{exact:true})).toHaveValue('10 in')
  await row.getByRole('button',{name:'Recognize line',exact:true}).click()
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('22')
  await expect(row.getByLabel('Width',{exact:true})).toHaveValue('')
  await expect(row.getByLabel('Length',{exact:true})).toHaveValue('16 ft')
  await expect(page.getByRole('button',{name:'Copy saved list'})).toBeDisabled()
  await expect(page.getByRole('button',{name:/Apply proposal|Use recognized line/})).toHaveCount(0)
  await row.getByRole('button',{name:'Undo change'}).click()
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('12')
  await expect(row.getByLabel('Length',{exact:true})).toHaveValue('26 ft')
  await row.getByRole('button',{name:'Recognize line',exact:true}).click()
  await row.getByRole('button',{name:'Save row'}).click()
  await expect(row.getByRole('status')).toHaveText('Saved.')
  await page.getByRole('button',{name:'Copy saved list'}).click()
  const copied=await page.evaluate(()=>(window as unknown as {copied:string}).copied)
  expect(copied).toContain('22 pieces');expect(copied).toContain('16 ft');expect(copied).not.toContain('26 ft');expect(copied).not.toContain('Woodmere')
  await page.evaluate(()=>{const w=window as unknown as {props:{products:unknown[]};saved:unknown[];remount:()=>void};w.props.products=w.saved;w.remount()})
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('22')
  await expect(row.getByTestId('clean-material-line')).toHaveText(copied)
})
test('item numbering and total include new drafts and update after removal',async({page})=>{
 await fixture(page)
 await expect(page.getByTestId('material-item-number')).toHaveText('1')
 await expect(page.getByTestId('material-item-total')).toHaveText('Total items: 1')
 await page.getByRole('button',{name:'+ Add line'}).click()
 await expect(page.getByTestId('material-item-number')).toHaveText(['1','2'])
 await expect(page.getByTestId('material-item-total')).toHaveText('Total items: 2(1 saved · 1 new unsaved)')
 await page.getByRole('button',{name:'Remove draft'}).click()
 await expect(page.getByTestId('material-item-number')).toHaveText('1')
 await expect(page.getByTestId('material-item-total')).toHaveText('Total items: 1')
})

test('new source line is editable inline, recognizable, saved once and survives reload',async({page})=>{
  await fixture(page);await page.getByRole('button',{name:'+ Add line'}).click()
  const row=page.getByTestId('material-spreadsheet-row').nth(1)
  await row.getByLabel('Source line',{exact:false}).fill('22 pc 10 inch TJI 230 — 16 ft')
  await row.getByRole('button',{name:'Recognize line',exact:true}).click()
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('22')
  expect(await page.evaluate(()=>(window as unknown as {recognized:{newRow:boolean}[]}).recognized[0].newRow)).toBe(true)
  await row.getByRole('button',{name:'Save row'}).click();await expect(row.getByRole('status')).toHaveText('Saved.')
  await row.getByRole('button',{name:'Edit line',exact:true}).click()
  await row.getByLabel('Source line',{exact:false}).fill('Edited source — 22 pc 10 inch TJI 230 — 16 ft')
  await row.getByRole('button',{name:'Save row'}).click();await expect(row.getByRole('status')).toHaveText('Saved.')
  expect(await page.evaluate(()=>(window as unknown as {calls:{revision?:string}[]}).calls.map(c=>c.revision))).toEqual([undefined,'saved-1'])
  await page.evaluate(()=>{const w=window as unknown as {props:{products:unknown[]};saved:unknown[];remount:()=>void};w.props.products=w.props.products.concat(w.saved);w.remount()})
  await expect(page.getByTestId('material-spreadsheet-row')).toHaveCount(2)
  await expect(page.getByTestId('material-spreadsheet-row').nth(1)).toContainText('Edited source')
})

test('recognition failure retains source and fields; unsaved new row can be removed',async({page})=>{
  await fixture(page,true)
  const row=page.getByTestId('material-spreadsheet-row')
  await row.getByRole('button',{name:'Edit line',exact:true}).click();await row.getByLabel('Source line',{exact:false}).fill('My edited source')
  await row.getByRole('button',{name:'Recognize line',exact:true}).click()
  await expect(row.getByRole('status')).toContainText('Recognition unavailable')
  await expect(row.getByLabel('Source line',{exact:false})).toHaveValue('My edited source')
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('12')
  await page.getByRole('button',{name:'+ Add line'}).click();await page.getByRole('button',{name:'Remove draft'}).click()
  await expect(page.getByTestId('material-spreadsheet-row')).toHaveCount(1)
})

test('newer server revision blocks overwrite and retains typed draft',async({page})=>{
  await fixture(page);const row=page.getByTestId('material-spreadsheet-row')
  await row.getByLabel('Quantity',{exact:true}).fill('15')
  await page.evaluate(()=>{const w=window as unknown as {props:{products:{revision:string}[]};render:()=>void};w.props.products=[{...w.props.products[0],revision:'other-editor'}];w.render()})
  await expect(row.getByRole('alert')).toContainText('newer version')
  await expect(row.getByRole('button',{name:'Save row'})).toBeDisabled()
  await expect(row.getByLabel('Quantity',{exact:true})).toHaveValue('15')
})
