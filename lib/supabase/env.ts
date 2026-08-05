const previewSupabaseUrl = "https://nprfhspwdflpqlopydmp.supabase.co";
const previewSupabasePublishableKey = "sb_publishable_1leeIlUTTFX6eZhGA0qHkw_qrTbNmvD";
const useIsolatedPreview = process.env.VERCEL_ENV === "preview";
const supabaseUrl = useIsolatedPreview ? previewSupabaseUrl : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = useIsolatedPreview ? previewSupabasePublishableKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey),
  };
}

export function hasSupabasePublicEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
