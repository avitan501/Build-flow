import "server-only";

export type AbcEnvironment = "sandbox" | "production";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getAbcInternalConfig() {
  const environment = (process.env.ABC_SUPPLY_IB_ENVIRONMENT || "sandbox").trim().toLowerCase();
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("ABC_SUPPLY_IB_ENVIRONMENT must be sandbox or production.");
  }

  const authBase = environment === "sandbox"
    ? "https://sandbox.auth.partners.abcsupply.com/oauth2/aus1vp07knpuqf6Xz0h8"
    : "https://auth.partners.abcsupply.com/oauth2/ausvvp0xuwGKLenYy357";

  return {
    environment: environment as AbcEnvironment,
    clientId: requireEnv("ABC_SUPPLY_IB_CLIENT_ID"),
    clientSecret: requireEnv("ABC_SUPPLY_IB_CLIENT_SECRET"),
    tokenUrl: `${authBase}/v1/token`,
    apiBaseUrl: environment === "sandbox" ? "https://partners-sb.abcsupply.com" : "https://partners.abcsupply.com",
  };
}
