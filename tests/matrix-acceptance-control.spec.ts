import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import ts from 'typescript'
test('native packaging consent applies quoted total once and undo restores review',async({page})=>{
 const modules:string[]=[],seen=new Map<string,number>()
 function bundle(file:string):number{
  if(seen.has(file))return seen.get(file)!
  const id=modules.length;seen.set(file,id);modules.push('')
  let code=readFileSync(file,'utf8')
  if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const resolver=createRequire(file)
  modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name)=>{let path:string;if(name.startsWith('@/')){const base=resolve(name.slice(2));try{path=resolver.resolve(base)}catch{try{path=resolver.resolve(base+'.ts')}catch{path=resolver.resolve(base+'.tsx')}}}else path=resolver.resolve(name);return `require(${bundle(path)})`})
  return id
 }
 const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),control=bundle(resolve('components/buildflow/matrix-acceptance-control.tsx'))
 await page.setContent('<div id="root"></div>')
 await page.addScriptTag({content:`(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${control});window.acceptCalls=[];function Fixture(){const [acceptances,setAcceptances]=R.useState([]);return R.createElement(C.MatrixAcceptanceControl,{item:{id:'item',description:'Construction adhesive',specification:'28 oz',quantity:2,unit:'box'},quote:{id:'quote',fileName:'quote.pdf',sourceItems:[{line_number:1,description:'Construction adhesive',specification:'28 oz',quantity:24,unit:'each',unit_price:5,line_total:120}]},acceptances,onAccept:(v)=>{window.acceptCalls.push(v);setAcceptances(v?[v]:[])}})}require(${dom}).createRoot(document.getElementById('root')).render(R.createElement(Fixture))})()`})
 const approve=page.getByRole('button',{name:'Accept difference for this item'})
 await expect(approve).toBeDisabled()
 await expect(page.getByTestId('accept-difference-control')).toContainText('$120.00')
 await page.getByRole('checkbox').check()
 await expect(approve).toBeEnabled()
 await approve.click()
 await expect(page.getByTestId('accept-difference-control')).toContainText('Difference accepted for this item')
 expect(await page.evaluate(()=>(window as unknown as {acceptCalls:unknown[]}).acceptCalls)).toEqual([{itemId:'item',quoteId:'quote',lineNumber:1,basis:'quoted-line'}])
 await page.getByRole('button',{name:'Undo acceptance'}).click()
 await expect(approve).toBeDisabled()
});
