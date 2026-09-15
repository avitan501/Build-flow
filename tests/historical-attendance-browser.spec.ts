import { test, expect } from "@playwright/test"
import { createRequire } from "node:module"
const { build } = createRequire(`${process.cwd()}/package.json`)(process.env.ESBUILD_MODULE || "esbuild")

let bundle = ""
test.beforeAll(async () => {
  const result=await build({bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {DailyWorkSummaryForm} from './components/buildflow/daily-work-summary';
    const row={id:'old',date:'2026-09-11',completed:'Reviewed work',open:'',problems:'',checkInAt:'2026-09-11T13:29:58.412Z',checkOutAt:null,pauseStartedAt:null,pausedMilliseconds:0,problemAttachments:[],paidAt:null};
    createRoot(document.getElementById('root')!).render(<DailyWorkSummaryForm summaries={[row]} canMarkPaid={false}/>);
  `},plugins:[{name:"readonly-fixture",setup(b: {onResolve: (filter: {filter: RegExp}, callback: (args: {path: string}) => unknown) => void; onLoad: (filter: {filter: RegExp; namespace: string}, callback: () => unknown) => void}){
    b.onResolve({filter:/next\/navigation|@\/app\/admin\/daily-summary\/actions|@\/lib\/analytics\/posthog-client/},args=>({path:args.path,namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:`export const useRouter=()=>({refresh(){}}); export const captureAvantiaEvent=()=>{}; export const markDailySummaryPaidAction=()=>{throw Error('No actions')}; export const recordDailyAttendanceAction=markDailySummaryPaidAction; export const saveDailyWorkSummaryAction=markDailySummaryPaidAction; export const uploadDailyProblemPhotoAction=markDailySummaryPaidAction;`,loader:"js"}));
  }}]});bundle=result.outputFiles[0].text
})
test("historical list and selected details show review, not elapsed work", async({page})=>{
 await page.clock.install({time:new Date('2026-09-15T03:00:00Z')})
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle})
 const historical=page.getByRole('button',{name:/Sep 11, 2026/})
 await expect(historical).toContainText('Missing checkout · excluded from pay')
 await expect(page.getByText('Needs review',{exact:true})).toBeVisible()
 await historical.click()
 await expect(page.getByText('Missing checkout · needs review.',{exact:false})).toBeVisible()
 await expect(page.getByRole('button',{name:'Check out',exact:true})).toBeDisabled()
 await expect(page.locator('body')).not.toContainText('85 hr')
 await expect(page.locator('body')).not.toContainText('Working')
})
