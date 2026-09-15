import { expect, test } from '@playwright/test';
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { initialCarlosGoals, validCarlosGoals } from '../lib/carlos-five-goals';

test('ten options, max five, outcome and five receipts required for completion',()=>{
 const g=initialCarlosGoals();expect(g).toHaveLength(10);expect(validCarlosGoals(g)).toBe(true);
 g.slice(0,6).forEach(x=>x.selected=true);expect(validCarlosGoals(g)).toBe(false);g[5].selected=false;
 g[0].status='done';expect(validCarlosGoals(g)).toBe(false);g[0].note='Received';g[0].link='https://example.invalid';g[0].count=5;expect(validCarlosGoals(g)).toBe(true);
 g[1].link='draft incomplete URL';expect(validCarlosGoals(g)).toBe(true);
 g[1].status='blocked';expect(validCarlosGoals(g)).toBe(false);g[1].note='Waiting for David';expect(validCarlosGoals(g)).toBe(true);
});
for(const width of [390,1440])test(`goals auto-save, selection limit, completion, retry and recovery ${width}`,async({page})=>{
 const modules:Record<string,string>={},seen=new Map<string,string>();
 const stub=(v:string)=>{const id=String(Object.keys(modules).length);modules[id]=v;return id};
 const action=stub(`exports.saveCarlosGoals=async(revision,goals)=>{window.calls=(window.calls||0)+1;await new Promise(r=>setTimeout(r,150));if(window.fail)return{ok:false,error:'Not saved. Retry.'};const b=JSON.parse(localStorage.getItem('board')||'{"revision":0,"goals":[]}');if(b.revision!==revision)return{ok:false,error:'This board changed in another tab.',conflict:true};const board={revision:revision+1,goals};localStorage.setItem('board',JSON.stringify(board));return{ok:true,board}}`);
 function bundle(file:string):string{if(seen.has(file))return seen.get(file)!;const id=stub('');seen.set(file,id);let code=readFileSync(file,'utf8');if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;const req=createRequire(file);modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name:string)=>'require('+JSON.stringify(name.endsWith('/goals-actions')?action:bundle(name.startsWith('@/')?resolve(name.slice(2))+'.ts':req.resolve(name)))+')');return id;}
 const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/carlos-five-goals.tsx'));
 const script=`(()=>{const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id,code])=>JSON.stringify(id)+':function(module,exports,require){'+code+'}').join(',')}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(require(${JSON.stringify(react)}).createElement(require(${JSON.stringify(component)}).CarlosFiveGoals,{board:JSON.parse(localStorage.getItem('board')||'{"revision":0,"goals":[]}'),actorId:'test-carlos'}));})()`;
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1:3117/goals-fixture',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><main style="max-width:1024px;margin:auto;padding:16px"><div id="root"></div></main>'}));
 async function mount(){await page.goto('http://127.0.0.1:3117/goals-fixture');for(const f of readdirSync('.next/static/css').filter(f=>f.endsWith('.css')))await page.addStyleTag({content:readFileSync('.next/static/css/'+f,'utf8')});await page.addScriptTag({content:script});await expect(page.getByRole('heading',{name:'My 5 Goals'})).toBeVisible();}
 await mount();for(let i=0;i<5;i++)await page.getByRole('checkbox').nth(i).check();await expect(page.getByRole('checkbox').nth(5)).toBeDisabled();await expect(page.getByRole('status')).toHaveText('Saved');
  const card=page.locator('details').filter({has:page.locator('summary').filter({hasText:/^Collect 5 supplier quotes/})}).last();
 await card.locator('summary').click();await card.getByLabel('What I did / what I need').fill('Received five quotes for request QA');await card.getByLabel('Related request / quote link').fill('https://example.invalid/qa');await card.getByLabel('Quotes received').selectOption('5');await card.getByLabel('Status',{exact:true}).selectOption('done');await expect(page.getByRole('status')).toHaveText('Saved');await expect(page.getByText('1/5 done',{exact:true})).toBeVisible();
 await mount();await expect(page.getByText('1/5 done',{exact:true})).toBeVisible();await page.locator('summary').filter({hasText:/Collect 5 supplier quotes.*5\/5/}).click();
 await page.evaluate(()=>Object.assign(window,{fail:true}));await page.getByLabel('What I did / what I need').first().fill('Unsaved follow-up QA');await expect(page.getByRole('status')).toContainText('Not saved');
 page.on('dialog',d=>d.accept());await mount();await expect(page.getByRole('status')).toContainText('Recovered unsaved edits');await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'calls')||0)).toBe(0);
 await page.getByRole('button',{name:'Retry saving'}).click();await expect(page.getByRole('status')).toHaveText('Saved');
 await page.evaluate(()=>{const b=JSON.parse(localStorage.getItem('board')!);b.revision++;b.goals[0].note='Other editor saved this';localStorage.setItem('board',JSON.stringify(b));});
 await page.locator('summary').filter({hasText:/^Collect 5 supplier quotes/}).click();
 await page.getByLabel('What I did / what I need').first().fill('My concurrent unsaved edit');
 await expect(page.getByRole('status')).toContainText('changed in another tab');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('board')!).goals[0].note)).toBe('Other editor saved this');
 await expect(page.getByLabel('What I did / what I need').first()).toHaveValue('My concurrent unsaved edit');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.evaluate(()=>innerWidth)).toBe(width);
 await page.screenshot({path:`/tmp/carlos-five-goals-${width}.png`,fullPage:true});expect(errors).toEqual([]);
});
