function isAbsoluteAssetUrl(value: string): boolean {
    const v = value.trim();
    if (!v) return false;
    return /^(https?:)?\/\//i.test(v)
        || /^data:/i.test(v)
        || /^blob:/i.test(v)
        || /^file:/i.test(v);
}

function joinUrl(base: string, path: string): string {
    if (!base) return path;
    const safeBase = base.endsWith("/") ? base : `${base}/`;
    const safePath = path.startsWith("/") ? path.slice(1) : path;
    return `${safeBase}${safePath}`;
}

export function resolveAssetUrl(value: string | null | undefined, assetBaseUrl = ""): string {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (isAbsoluteAssetUrl(raw)) return raw;
    return joinUrl(assetBaseUrl, encodeURI(raw));
}

