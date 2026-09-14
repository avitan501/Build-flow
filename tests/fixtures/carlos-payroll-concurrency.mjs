import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
// Isolated Docker only, with fixtures already loaded and the day marked unpaid.
function request(id){return new Promise((resolve,reject)=>{
 const p=spawn('docker',['exec','-i','avantia-ai01-sql-20260914','psql','-d','payroll02','-h','/tmp','-U','postgres','-At','-v','ON_ERROR_STOP=1'])
 let output='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>output+=d);p.on('error',reject);p.on('close',code=>resolve({code,output}))
 p.stdin.end(`set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';select request_carlos_payroll(array['2026-09-12'::date],'${id}');`)
})}
const results=await Promise.all([request('00000000-0000-0000-0000-000000000021'),request('00000000-0000-0000-0000-000000000022')])
assert.equal(results.filter(r=>r.code===0).length,1)
assert.match(results.find(r=>r.code!==0).output,/day_already_requested/)
console.log('Concurrent overlapping requests: exactly one accepted; second rejected without duplicate pay.')
