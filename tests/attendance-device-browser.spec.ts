import { test, expect } from "@playwright/test"
import { createRequire } from "node:module"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"

let bundle = ""
test.beforeAll(() => {
  const modules: string[] = [], seen = new Map<string,number>()
  const stub=(code:string)=>{modules.push(code);return modules.length-1}
  const empty=stub('module.exports=new Proxy({},{get:()=>()=>null})')
  const navigation=stub('exports.useRouter=()=>({refresh(){}})')
  const actions=stub('module.exports=new Proxy({},{get:()=>()=>{window.attendanceCalls=(window.attendanceCalls||0)+1;return {ok:true}}})')
  function add(file:string):number {
    if(seen.has(file))return seen.get(file)!
    const id=stub('');seen.set(file,id)
    let code=readFileSync(file,'utf8')
    if(/\.tsx?$/.test(file))code=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
    const resolver=createRequire(file)
    modules[id]=code.replace(/require\(["']([^"']+)["']\)/g,(_,name:string)=>{
      if(name==='next/navigation')return `require(${navigation})`
      if(name.endsWith('/daily-summary/actions'))return `require(${actions})`
      if(['lucide-react','@/lib/analytics/posthog-client'].includes(name))return `require(${empty})`
      const base=name.startsWith('@/')?resolve(name.slice(2)):''
      return `require(${add(base?[base+'.ts',base+'.tsx'].find(existsSync)!:resolver.resolve(name))})`
    });return id
  }
  const resolver=createRequire(`${process.cwd()}/package.json`)
  const react=add(resolver.resolve('react')),dom=add(resolver.resolve('react-dom/client')),component=add(resolve('components/buildflow/daily-work-summary.tsx'))
  bundle=`(()=>{const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code=>`function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}
    const row={id:'old',date:'2026-09-11',completed:'Reviewed work',open:'',problems:'',checkInAt:'2026-09-11T13:29:58.412Z',checkOutAt:null,pauseStartedAt:'2026-09-11T15:00:00Z',pausedMilliseconds:0,problemAttachments:[],paidAt:null};
    require(${dom}).createRoot(document.getElementById('root')).render(require(${react}).createElement(require(${component}).DailyWorkSummaryForm,{summaries:[row],canMarkPaid:false}));})()`
})

for (const device of ['desktop','iphone','android','ipad-desktop']) for (const started of [false,true]) test(`${device} ${started?'checkout':'checkin'} device policy`,async({page})=>{
 const ua=device==='desktop'?'Mozilla/5.0 (Windows NT 10.0; Win64; x64)':device==='iphone'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18) Mobile':device==='android'?'Mozilla/5.0 (Linux; Android 15) Mobile':'Mozilla/5.0 (Macintosh; Intel Mac OS X)';
 await page.clock.install({time:new Date('2026-09-11T16:00:00Z')});
 await page.setViewportSize({width:device==='desktop'?390:1024,height:900});
 await page.setContent('<div id="root"></div>');
 await page.evaluate(({ua,device})=>{Object.defineProperty(navigator,'userAgent',{value:ua,configurable:true});Object.defineProperty(navigator,'maxTouchPoints',{value:device==='desktop'?0:5,configurable:true});Object.defineProperty(navigator,'userAgentData',{value:{mobile:device==='iphone'||device==='android'},configurable:true});},{ua,device});
 await page.addScriptTag({content:started?bundle:bundle.replace('summaries:[row]','summaries:[]')});
 const button=page.getByRole('button',{name:started?'Check out':'Check in',exact:true});
 if(device==='desktop'){await expect(button).toBeEnabled();await button.click();expect(await page.evaluate(()=>(window as unknown as {attendanceCalls:number}).attendanceCalls)).toBe(1)}
 else{await expect(button).toBeDisabled();await expect(page.getByText('Clock in and clock out are available on a computer only.',{exact:false})).toBeVisible();expect(await page.evaluate(()=>(window as unknown as {attendanceCalls?:number}).attendanceCalls||0)).toBe(0)}
 await expect(page.getByPlaceholder('Calls made, leads contacted, supplier pricing received, orders handled...')).toBeEditable();
});
