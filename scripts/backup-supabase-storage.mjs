import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

const EXPECTED_PROJECT_REF = "nprfhspwdflpqlopydmp"
const [destination] = process.argv.slice(2)
const supabaseUrl = process.env.SUPABASE_URL?.trim() || ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ""

if (!destination || !path.isAbsolute(destination)) throw new Error("Pass an absolute storage-backup destination.")
if (!supabaseUrl.includes(`${EXPECTED_PROJECT_REF}.supabase.co`)) {
  throw new Error(`Refusing backup: SUPABASE_URL is not production project ${EXPECTED_PROJECT_REF}.`)
}
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.")

function safeSegment(value) {
  if (!value || value === "." || value === ".." || value.includes("/") || value.includes("\\")) {
    throw new Error(`Unsafe storage path segment: ${JSON.stringify(value)}`)
  }
  return value
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const manifest = { projectRef: EXPECTED_PROJECT_REF, createdAt: new Date().toISOString(), objects: [] }

async function backupFolder(bucketName, folder = "") {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucketName).list(folder, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw error
    if (!data?.length) break

    for (const item of data) {
      const name = safeSegment(item.name)
      const objectPath = folder ? `${folder}/${name}` : name
      if (item.id === null) {
        await backupFolder(bucketName, objectPath)
        continue
      }

      const { data: blob, error: downloadError } = await supabase.storage.from(bucketName).download(objectPath)
      if (downloadError) throw downloadError
      const bytes = Buffer.from(await blob.arrayBuffer())
      const filePath = path.join(destination, safeSegment(bucketName), ...objectPath.split("/").map(safeSegment))
      await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
      await writeFile(filePath, bytes, { mode: 0o600 })
      manifest.objects.push({
        bucket: bucketName,
        path: objectPath,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        updatedAt: item.updated_at || null,
      })
    }

    if (data.length < 1000) break
  }
}

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
if (bucketsError) throw bucketsError
for (const bucket of buckets || []) await backupFolder(safeSegment(bucket.name))

await writeFile(path.join(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
console.log(`Backed up ${manifest.objects.length} storage objects from ${EXPECTED_PROJECT_REF}.`)
