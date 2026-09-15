import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

for (const [slug,names] of [['aura-messaging-broker',['sql','fastPollControlSql']],['aura-communication-outbox-worker',['sql']]]) {
  test(`${slug}: bounded independent clients, unchanged business logic`, () => {
    const path=`supabase/functions/${slug}/index.ts`;
    const source=readFileSync(path,'utf8');
    const baseline=execFileSync('git',['show',`19ca5fac:${path}`],{encoding:'utf8'});
    assert.equal(source.replaceAll('  idle_timeout: 5,\n  max_lifetime: 60,\n',''),baseline);
    const constructors=[...source.matchAll(/const (sql|fastPollControlSql) = postgres\([\s\S]*?\n\}\);/g)];
    assert.deepEqual(constructors.map(x=>x[1]),names);
    const calls=[];
    vm.runInNewContext(constructors.map(x=>x[0].replace('Deno.env.get("SUPABASE_DB_URL")!', 'Deno.env.get("SUPABASE_DB_URL")')).join('\n'),{Deno:{env:{get:()=> 'local-test-only'}},postgres:(url,options)=>{calls.push({url,...options});return {};}});
    assert.equal(calls.length,names.length);
    for(const options of calls)assert.deepEqual(JSON.parse(JSON.stringify(options)),{url:'local-test-only',max:1,prepare:false,idle_timeout:5,max_lifetime:60});
    assert.equal(/statement_timeout|connect_timeout|\.end\(/.test(constructors.map(x=>x[0]).join('')),false);
  });
}
