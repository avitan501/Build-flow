import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js"
import { recognizeMaterialRows } from "./material-row-recognition.ts"

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 5, max_lifetime: 60 })
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })
Deno.serve(async(request:Request)=>{
  if (request.method !== "POST") return reply({error:"Method not allowed"},405)
  const expected=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return reply({error:"Server authorization required"},401)
  try {
    const raw=await request.text()
    if(raw.length>240000)return reply({error:"Too many source characters"},413)
    const body=JSON.parse(raw)
    if(!Array.isArray(body.rows)||typeof body.sharedAnswers!=="string")return reply({error:"Invalid input"},400)
    const query=sql<{decrypted_secret:string}[]>`select decrypted_secret from vault.decrypted_secrets where name='openai_supplier_quote_api_key' limit 1`
    let timer:ReturnType<typeof setTimeout>|undefined
    let key:string|undefined
    try { key=(await Promise.race([query,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{void query.cancel().catch(()=>{});reject(Error("Key lookup unavailable"))},8000)})]))[0]?.decrypted_secret } finally {clearTimeout(timer)}
    if(!key)return reply({error:"Recognition unavailable; source unchanged"},503)
    const conventions={tjiTenIsNineHalf:body.conventions?.tjiTenIsNineHalf===true,lvlTenIsNineHalf:body.conventions?.lvlTenIsNineHalf===true}
    const result=await recognizeMaterialRows(body.rows,body.sharedAnswers,{apiKey:key,conventions})
    return reply({ok:true,rows:result.rows})
  }catch{return reply({error:"Recognition could not finish or validate every source row. Your source is unchanged."},502)}
})
