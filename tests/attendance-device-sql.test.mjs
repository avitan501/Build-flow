// Disposable, network-disabled PostgreSQL only. Never queries production.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const container='avantia-desktop-attendance-test-20260916';
function sql(input){return execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-XAtq','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8'}).trim()}
test('actual migration, attendance RPC and payroll authority preserve correct paths',()=>{
 sql('create role anon; create role authenticated;');
 sql(readFileSync('tests/fixtures/carlos-payroll-db.sql','utf8'));
 sql(readFileSync('supabase/migrations/20260914185259_carlos_payroll_authority.sql','utf8'));
 sql(readFileSync('supabase/migrations/20260916163023_desktop_attendance_device_guard.sql','utf8'));
 const role="set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';";
 for(const h of [{},{'user-agent':'iPhone Mobile'},{'user-agent':'Mozilla/5.0 (Linux; Android 15)'},{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X)','x-avantia-attendance-touch':'5'},{'user-agent':'Mozilla/5.0 (Windows NT 10.0)','sec-ch-ua-mobile':'?1'}]){
  for(const action of ['check_in','check_out']){
   const query=role+`set request.headers='${JSON.stringify(h)}';do $$begin begin perform public.record_carlos_attendance((now() at time zone 'America/New_York')::date,'${action}');raise exception 'device bypass';exception when insufficient_privilege then if sqlerrm<>'attendance_computer_required' then raise;end if;end;end $$;`;
   sql(query);
  }
 }
 assert.equal(sql("select count(*) from manager_goals where title='Daily summary - '||(now() at time zone 'America/New_York')::date::text"),'0');
 const headers=`set request.headers='{"x-avantia-attendance-user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)","x-avantia-attendance-mobile":"?0","x-avantia-attendance-touch":"10"}';`;
 // Existing regression fixture proves desktop clock in, retry, owner-only Paid and CAS.
 sql(headers+readFileSync('tests/fixtures/carlos-payroll-assertions.sql','utf8'));
 sql(role+`set request.headers='{"user-agent":"iPhone Mobile"}';select public.record_carlos_attendance((now() at time zone 'America/New_York')::date,'pause');select public.record_carlos_attendance((now() at time zone 'America/New_York')::date,'resume');`);
 sql(role+headers+"select public.record_carlos_attendance((now() at time zone 'America/New_York')::date,'check_out','Completed local QA');");
 assert.equal(sql("select (private.daily_summary_json(details)->>'checkOutAt') is not null from manager_goals where title='Daily summary - '||(now() at time zone 'America/New_York')::date::text"),'t');
 assert.equal(sql("select has_function_privilege('anon','public.record_carlos_attendance(date,text,text,text,text)','execute')"),'f');
 assert.equal(sql("select has_function_privilege('authenticated','private.attendance_computer_request(jsonb)','execute')"),'f');
});
