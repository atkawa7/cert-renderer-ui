import type { Template } from "./TemplateEditor";

export type DesignDefinition = {
    id: string;
    name: string;
    previewUrl: string;
    description: string;
    template: Template;
};

function cloneTemplate(template: Template): Template {
    return JSON.parse(JSON.stringify(template)) as Template;
}

export const DESIGN_CATALOG: DesignDefinition[] = [
];

export type DesignCreateDraft = {
    name: string;
    description: string;
    thumbnailUrl: string;
    template: Template;
};

function isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function joinUrl(base: string, path: string): string {
    if (!base) return path;
    const safeBase = base.endsWith("/") ? base : `${base}/`;
    const safePath = path.startsWith("/") ? path.slice(1) : path;
    return `${safeBase}${safePath}`;
}

function resolveThumbnailUrl(template: Template, assetBaseUrl?: string): string {
    const bg = (template.pages?.[0]?.background ?? template.background) as any;
    const raw = (bg?.type === "image" ? bg.url : "").trim();
    if (!raw) return "";
    return isAbsoluteUrl(raw) ? raw : joinUrl(assetBaseUrl ?? "", raw);
}

export function convertTemplateToDesignDraft(
    template: Template,
    options?: { assetBaseUrl?: string; description?: string; name?: string }
): DesignCreateDraft {
    const copy = cloneTemplate(template);
    return {
        name: (options?.name ?? copy.name ?? "Untitled Design").trim() || "Untitled Design",
        description: (options?.description ?? "").trim(),
        thumbnailUrl: resolveThumbnailUrl(copy, options?.assetBaseUrl),
        template: copy,
    };
}

export function getDesignById(designId?: string | null): DesignDefinition | undefined {
    if (!designId) return undefined;
    return DESIGN_CATALOG.find((d) => d.id === designId);
}

export function getDesignTemplateById(designId?: string | null): Template | null {
    const design = getDesignById(designId);
    if (!design) return null;
    return cloneTemplate(design.template);
}
