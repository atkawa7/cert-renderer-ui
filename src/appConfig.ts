export type AppEnv = "local" | "dev" | "staging" | "prod";

type EnvConfig = {
    rendererApiBaseUrl: string;
};

// Update these URLs for your environments.
const ENV_URLS: Record<AppEnv, EnvConfig> = {
    local: { rendererApiBaseUrl: "/api" },
    dev: { rendererApiBaseUrl: "https://dev.example.com" },
    staging: { rendererApiBaseUrl: "https://staging.example.com" },
    prod: { rendererApiBaseUrl: "https://api.example.com" },
};

function toEnv(value?: string): AppEnv {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "local" || v === "dev" || v === "staging" || v === "prod") return v;
    return "local";
}

const selectedEnv = toEnv(import.meta.env.VITE_APP_ENV);

// Highest priority override for quick testing without touching the map.
const overrideRendererApiBase = (import.meta.env.VITE_RENDERER_API_BASE as string | undefined)?.trim();

export const appConfig = {
    env: selectedEnv,
    rendererApiBase: overrideRendererApiBase || ENV_URLS[selectedEnv].rendererApiBaseUrl,
    environments: ENV_URLS,
};

