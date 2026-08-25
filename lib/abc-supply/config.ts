import "server-only";

export type AbcEnvironment = "sandbox" | "production";

export type AbcSupplyConfig = {
  environment: AbcEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
};

const ABC_USER_SCOPES = [
  "account.read",
  "product.read",
  "pricing.read",
  "location.read",
  "offline_access",
] as const;

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

export function getAbcSupplyConfig(): AbcSupplyConfig {
  const environment = (process.env.ABC_SUPPLY_ENVIRONMENT || "sandbox").trim().toLowerCase();
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("ABC_SUPPLY_ENVIRONMENT must be sandbox or production.");
  }

  const authBase = environment === "sandbox"
    ? "https://sandbox.auth.partners.abcsupply.com/oauth2/aus1vp07knpuqf6Xz0h8"
    : "https://auth.partners.abcsupply.com/oauth2/ausvvp0xuwGKLenYy357";

  return {
    environment,
    clientId: requireEnv("ABC_SUPPLY_CLIENT_ID"),
    clientSecret: requireEnv("ABC_SUPPLY_CLIENT_SECRET"),
    redirectUri: requireEnv("ABC_SUPPLY_REDIRECT_URI"),
    authorizationUrl: `${authBase}/v1/authorize`,
    tokenUrl: `${authBase}/v1/token`,
    apiBaseUrl: environment === "sandbox" ? "https://partners-sb.abcsupply.com" : "https://partners.abcsupply.com",
  };
}

export function getAbcUserScope() {
  return ABC_USER_SCOPES.join(" ");
}
