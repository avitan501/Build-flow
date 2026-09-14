// Run only against the named network-none disposable fixture container.
import { spawn } from "node:child_process"
import assert from "node:assert/strict"
const container = "avantia-source-attachment-fence-20260914"
function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", statement])
    let output = ""; let errors = ""
    child.stdout.on("data", (chunk) => { output += chunk })
    child.stderr.on("data", (chunk) => { errors += chunk })
    child.on("close", (code) => code ? reject(new Error(errors)) : resolve(output))
  })
}
const item = "00000000-0000-4000-8000-000000000020"
const request = "00000000-0000-4000-8000-000000000010"
// Uploader owns the same ordered item lock before edit executes. The edit must
// wait for upload and reject its old snapshot instead of writing through it.
const upload = sql(`begin; insert into public.quote_request_attachments values ('00000000-0000-4000-8000-000000000042','${request}',null,'concurrent.pdf','private/path','application/pdf',100,'client'); select pg_sleep(1); commit;`)
await new Promise((resolve) => setTimeout(resolve, 150))
const save = sql(`select public.staff_apply_request_item_edit('${request}','${item}','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000032',(select snapshot from public.test_snapshots where id=1),null,null,'{"quantity":99}',false);`)
await upload
assert.equal(JSON.parse((await save).trim()).ok, false)
assert.equal((await sql(`select quantity from public.quote_request_items where id='${item}'`)).trim(), "61")
console.log("PASS concurrent upload fences stale edit without overwriting quantity")
