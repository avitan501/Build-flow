const EXPECTED_PRODUCTION_SUPABASE_REF = "nprfhspwdflpqlopydmp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supabaseRefFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    const suffix = ".supabase.co";
    return host.endsWith(suffix) ? host.slice(0, -suffix.length) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const environment =
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    "unknown";
  const release =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    null;
  const supabaseRef = supabaseRefFromUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const ok =
    environment === "production" &&
    Boolean(release && /^[a-f0-9]{40}$/i.test(release)) &&
    supabaseRef === EXPECTED_PRODUCTION_SUPABASE_REF;

  return Response.json(
    {
      status: ok ? "ok" : "misconfigured",
      environment,
      release,
      supabaseRef,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
