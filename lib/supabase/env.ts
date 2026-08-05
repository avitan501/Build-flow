const previewSupabaseUrl = "https://nprfhspwdflpqlopydmp.supabase.co";
const previewSupabasePublishableKey = "sb_publishable_1leeIlUTTFX6eZhGA0qHkw_qrTbNmvD";
const useIsolatedPreview = process.env.VERCEL_ENV === "preview";
const supabaseUrl = useIsolatedPreview ? previewSupabaseUrl : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = useIsolatedPreview ? previewSupabasePublishableKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseBrowserConfig = {
  url: string;
  anonKey: string;
};

declare global {
  interface Window {
    __AVANTIA_SUPABASE__?: SupabaseBrowserConfig;
  }
}

function browserConfig() {
  return typeof window !== "undefined" ? window.__AVANTIA_SUPABASE__ : undefined;
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  const browser = browserConfig();
  if (browser?.url && browser.anonKey) return browser;

  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey),
  };
}

export function hasSupabasePublicEnv() {
  const browser = browserConfig();
  return Boolean((browser?.url && browser.anonKey) || (supabaseUrl && supabaseAnonKey));
}
