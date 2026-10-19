export const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders });
}
export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin), target = new URL(request.url);
    // Next's local server may normalize request.url to localhost while the browser
    // uses 127.0.0.1. The actual Host header still identifies the requested origin.
    return origin === source.origin && source.protocol === target.protocol &&
      (source.host === target.host || source.host === request.headers.get("host"));
  } catch { return false; }
}
export async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 100000) { await reader.cancel(); throw new Error("size"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
