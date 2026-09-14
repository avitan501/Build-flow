import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

async function fixture(page: Page, stale = false) {
  page.on('pageerror',error=>console.error('Mixed fixture browser error:',error.message));
  const modules: Record<string,string> = {}, seen = new Map<string,string>();
  const stub = (code: string) => { const id=String(Object.keys(modules).length); modules[id]=code; return id; };
  const actions=stub("window.calls=[];exports.saveClientQuoteAction=async(input)=>{window.calls.push({kind:'save',input});return {ok:true,data:{clientSnapshot:{ack:window.calls.length}}}};exports.sendClientQuoteAction=async(id,snapshot)=>{window.calls.push({kind:'send',snapshot});return {ok:true,data:{recipient:'client@example.invalid'}}}");
  const storage=stub("exports.createClient=()=>{throw Error('No network allowed in this fixture')}");
  function bundle(file:string):string {
    if(seen.has(file))return seen.get(file)!;
    const id=stub("");seen.set(file,id);
    let code=readFileSync(file,"utf8");
    if(/\.[cm]?[jt]sx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true,allowJs:true}}).outputText;
    const resolver=createRequire(file);
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_all,name:string)=>{
      if(name.endsWith('/quote-comparison/actions'))return `require(${JSON.stringify(actions)})`;
      if(name==='@/lib/supabase/client')return `require(${JSON.stringify(storage)})`;
      const base=name.startsWith('@/')?resolve(process.cwd(),name.slice(2)):'';
      const target=base?[base+'.ts',base+'.tsx'].find(existsSync)!:resolver.resolve(name);
      return `require(${JSON.stringify(bundle(target))})`;
    });return id;
  }
  const react=bundle(require.resolve('react')),dom=bundle(require.resolve('react-dom/client')),component=bundle(resolve('components/buildflow/client-quote-builder.tsx'));
  const comparison={id:'comparison',active_route_id:'route',client_id:'client',client_name_snapshot:'Test client',client_email_snapshot:'client@example.invalid',quote_number:'MIX-001',client_message:'',client_delivery_charge:10,client_tax_percent:10,client_quote_status:'draft',job_address:'Test address'};
  const items=[{id:'a',description:'Valve',specification:'',quantity:2,unit:'each',markup_percent:50,client_unit_price:30},{id:'b',description:'Pipe',specification:'',quantity:1,unit:'each',markup_percent:100,client_unit_price:60}];
  const route={id:'route',items:[{item_id:'a',unit_cost:20,supplier_id:'supplier-a'},{item_id:'b',unit_cost:30,supplier_id:'supplier-b'}],suppliers:[{supplier_id:'supplier-a',supplier_name:'Supplier A'},{supplier_id:'supplier-b',supplier_name:'Supplier B'}],material_subtotal:70,delivery_total:30,supplier_tax_total:7.5,landed_total:107.5};
  await page.setContent('<div id="root"></div>');
  if (existsSync('.next/static/css')) for (const name of readdirSync('.next/static/css').filter(name=>name.endsWith('.css'))) await page.addStyleTag({content:readFileSync(resolve('.next/static/css',name),'utf8')});
  await page.addScriptTag({content:`(()=>{const process={env:{NODE_ENV:'production'}},cache={},modules={${Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:function(module,exports,require){${code}}`).join(',')}};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(require(${JSON.stringify(react)}).createElement(require(${JSON.stringify(component)}).ClientQuoteBuilder,${JSON.stringify({comparison,items,selectedBid:null,procurementRoute:route,routeError:stale?'Supplier source changed. Review again.':null,clients:[{id:'client',name:'Test client',email:'client@example.invalid',companyName:'',phone:''}],initialAttachments:[],previewMode:false})}));})()`});
}

for (const width of [390,1440]) test(`real mixed client builder uses A/B allocations and saved acknowledgment at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:950});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await fixture(page);
  await expect(page.getByText('Pricing from Supplier A + Supplier B')).toBeVisible();
  await expect(page.getByRole('button',{name:'Save quote',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Preview client copy',exact:true}).click();
  const preview=page.getByRole('dialog');
  await expect(preview).toContainText('$143.00');
  await expect(preview).toContainText('Valve');await expect(preview).toContainText('Pipe');
  await page.getByRole('button',{name:'Close quote preview'}).click();
  await page.getByRole('button',{name:'Save quote',exact:true}).click();
  await expect(page.getByText('Client quote saved. Profit remains visible only to your team.')).toBeVisible();
  await page.getByRole('button',{name:/Send.*quote|Send to client/i}).click();
  await expect(page.getByText(/Quote sent to client@example.invalid/)).toBeVisible();
  const calls=await page.evaluate(()=>(window as unknown as {calls:Array<{kind:string,input?:{expectedClientSnapshot:unknown,expectedRouteId:string},snapshot?:unknown}>}).calls);
  expect(calls.map(c=>c.kind)).toEqual(['save','save','send']);
  expect(calls[0].input?.expectedRouteId).toBe('route');
  expect(calls[1].input?.expectedClientSnapshot).toEqual({ack:1});
  expect(calls[2].snapshot).toEqual({ack:2});
  expect(errors).toEqual([]);
  await page.screenshot({path:`/tmp/mixed-client-actual-${width}.png`,fullPage:true});
});
test('stale route never enables client save or send',async({page})=>{
  await fixture(page,true);
  await expect(page.getByText('Supplier source changed. Review again.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Save quote',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls)).toEqual([]);
});
