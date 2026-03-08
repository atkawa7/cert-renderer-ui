export type AppEnv = "local" | "dev" | "staging" | "prod";

type EnvConfig = {
    rendererApiBaseUrl: string;
};

const ENV_URLS: Record<AppEnv, EnvConfig> = {
    local: { rendererApiBaseUrl: "/api",  },
    dev: { rendererApiBaseUrl: "https://dev.example.com" },
    staging: { rendererApiBaseUrl: "https://staging.example.com" },
    prod: { rendererApiBaseUrl: "https://api.example.com" },
};

const ASSETS_BASE_URL: Record<any, any> = {
    local: "http://localhost:3000/public/",
    dev: "https://cert-dev.s3.eu-west-1.amazonaws.com/public/",
    staging:  "https://cert-dev.s3.eu-west-1.amazonaws.com/public/",
    prod: "https://cert-dev.s3.eu-west-1.amazonaws.com/public/",
};

function toEnv(value?: string): AppEnv {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "local" || v === "dev" || v === "staging" || v === "prod") return v;
    return "local";
}

const selectedEnv = toEnv(import.meta.env.VITE_APP_ENV);

const overrideRendererApiBase = (import.meta.env.VITE_RENDERER_API_BASE as string | undefined)?.trim();
const overrideAssetBaseUrl = (import.meta.env.VITE_ASSET_BASE_URL as string | undefined)?.trim();

export const appConfig = {
    env: selectedEnv,
    rendererApiBase: overrideRendererApiBase || ENV_URLS[selectedEnv].rendererApiBaseUrl,
    assetBaseUrl: overrideAssetBaseUrl || ASSETS_BASE_URL[selectedEnv],
    environments: ENV_URLS,
};

