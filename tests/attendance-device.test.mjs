import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function load(file, require) {
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require});return exports;
}
const policy=load('lib/attendance-device.ts',()=>({}));
const desktop='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/145.0';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148';
test('computer classes allowed, mobile/unknown denied; touch Windows remains allowed',()=>{
 for(const ua of [desktop,'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)','Mozilla/5.0 (X11; Linux x86_64)','Mozilla/5.0 (X11; CrOS x86_64)'])assert.equal(policy.isAttendanceComputer(ua),true,ua);
 for(const ua of [iphone,'Mozilla/5.0 (Linux; Android 15) Chrome/145','Mozilla/5.0 (iPad; CPU OS 18)','Kindle Silk','',null,'node'])assert.equal(policy.isAttendanceComputer(ua),false,ua);
 assert.equal(policy.isAttendanceComputer(desktop,'?1'),false);
 assert.equal(policy.isAttendanceComputer(desktop,false,10),true);
 assert.equal(policy.isAttendanceComputer('Mozilla/5.0 (Macintosh; Intel Mac OS X)',false,5),false);
 assert.equal(policy.attendanceNeedsComputer('pause'),false);
 assert.equal(policy.attendanceNeedsComputer('resume'),false);
});
function actionFixture(ua,mobile='?0',dbError=null){
 const calls=[],forwarded={};
 const action=load('app/admin/daily-summary/actions.ts',(name)=>{
  if(name==='next/headers')return {headers:async()=>new Map([['user-agent',ua],['sec-ch-ua-mobile',mobile]])};
  if(name==='next/cache')return {revalidatePath(){}};
  if(name==='@/lib/attendance-device')return policy;
  if(name==='@/lib/auth')return {requireManagerPortalProfile:async()=>({supabase:{rpc:(...args)=>{calls.push(args);const result={setHeader:(k,v)=>{forwarded[k]=v;return result},then:r=>r({error:dbError})};return result}}})};
  if(name==='@/lib/daily-work-summary')return {normalizeDailyWorkSummarySections:x=>x,isValidDailyWorkDateKey:()=>true};
  return {};
 });return {action,calls,forwarded};
}
for(const action of ['check_in','check_out'])test(`server rejects mobile ${action} before RPC`,async()=>{
 const f=actionFixture(iphone);assert.equal((await f.action.recordDailyAttendanceAction({date:'2026-09-16',action})).ok,false);assert.equal(f.calls.length,0);
});
test('desktop action preserves user-authenticated RPC and forwards actual request UA',async()=>{
 const f=actionFixture(desktop);assert.equal((await f.action.recordDailyAttendanceAction({date:'2026-09-16',action:'check_in',maxTouchPoints:10})).ok,true);assert.equal(f.calls.length,1);assert.equal(f.forwarded['x-avantia-attendance-user-agent'],desktop);assert.equal(f.forwarded['x-avantia-attendance-touch'],'10');
});
test('iPad desktop mode blocked, missing UA blocked, mobile pause preserved',async()=>{
 for(const [ua,touch] of [['',0],['Mozilla/5.0 (Macintosh; Intel Mac OS X)',5]]){
 const f=actionFixture(ua);assert.equal((await f.action.recordDailyAttendanceAction({date:'2026-09-16',action:'check_in',maxTouchPoints:touch})).ok,false);assert.equal(f.calls.length,0);
 }
 const f=actionFixture(iphone);assert.equal((await f.action.recordDailyAttendanceAction({date:'2026-09-16',action:'pause'})).ok,true);
});
test('database rejection returns clear device message',async()=>{
 const f=actionFixture(desktop,'?0',{message:'attendance_computer_required'});assert.equal((await f.action.recordDailyAttendanceAction({date:'2026-09-16',action:'check_out'})).error,policy.DESKTOP_ATTENDANCE_MESSAGE);
});
