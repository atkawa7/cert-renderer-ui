import type { Template } from "./TemplateEditor";
import { appConfig } from "./appConfig";

export type TemplateSummary = {
    id: string;
    name: string;
    sourceDesignId?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type TemplateDetail = {
    id: string;
    name: string;
    sourceDesignId?: string | null;
    template: Template;
    createdAt: string;
    updatedAt: string;
};

type PageResponse<T> = {
    content: T[];
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type PagedResult<T> = {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export type DesignSummary = {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl: string;
    defaultDesign: boolean;
    createdAt: string;
    updatedAt: string;
};

export type DesignDetail = {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl: string;
    defaultDesign: boolean;
    template: Template;
    createdAt: string;
    updatedAt: string;
};

export type CertificateSummary = {
    id: string;
    templateId?: string | null;
    templateName: string;
    recipientFirstName?: string | null;
    recipientLastName?: string | null;
    certificateReference?: string | null;
    certificateDate?: string | null;
    programName?: string | null;
    programCode?: string | null;
    organizationName?: string | null;
    institutionId?: string | null;
    institutionDomain?: string | null;
    issueUrl?: string | null;
    fileName: string;
    createdAt: string;
    updatedAt: string;
};

export type CertificateDetail = CertificateSummary & {
    data: unknown;
};

export type CertificateCredential = {
    "@context"?: string[];
    type?: string[];
    id?: string;
    issuer?: string;
    issuanceDate?: string;
    credentialSubject?: Record<string, unknown>;
    proof?: {
        type?: string;
        proofPurpose?: string;
        verificationMethod?: string;
        created?: string;
        jwt?: string;
    };
};

export type InstitutionSummary = {
    id: string;
    name: string;
    domain: string;
    issuePath: string;
    issueUrl: string;
    verified: boolean;
    verifiedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type InstitutionDetail = InstitutionSummary & {
    verificationHost: string;
    verificationRecordName: string;
    verificationRecordValue: string;
};

const API_BASE = appConfig.rendererApiBase;

export type DownloadedFile = {
    blob: Blob;
    fileName: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

function parseDownloadFileName(headerValue: string | null, fallbackBaseName: string, extension: string): string {
    const base = (fallbackBaseName.trim() || "template").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const fallback = `${base}.${extension}`;
    if (!headerValue) return fallback;

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]).replace(/[/\\]/g, "_");
    }

    const asciiMatch = /filename="([^"]+)"/i.exec(headerValue) ?? /filename=([^;]+)/i.exec(headerValue);
    if (!asciiMatch?.[1]) return fallback;
    return asciiMatch[1].trim().replace(/^"+|"+$/g, "").replace(/[/\\]/g, "_") || fallback;
}

export async function listTemplates(query = "", page = 0, size = 50): Promise<TemplateSummary[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    const data = await apiFetch<PageResponse<TemplateSummary>>(`/templates?${params.toString()}`);
    return data.content ?? [];
}

export async function listDesigns(query = "", page = 0, size = 12): Promise<PagedResult<DesignSummary>> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    const data = await apiFetch<PageResponse<DesignSummary>>(`/designs?${params.toString()}`);
    return {
        items: data.content ?? [],
        page: data.number ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
    };
}

export async function getDesignById(id: string): Promise<DesignDetail> {
    return await apiFetch<DesignDetail>(`/designs/${id}`);
}

export async function createDesign(payload: {
    name: string;
    description?: string;
    thumbnailUrl: string;
    template: Template;
}): Promise<DesignDetail> {
    return await apiFetch<DesignDetail>("/designs", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function deleteDesignById(id: string): Promise<void> {
    await apiFetch<void>(`/designs/${id}`, {
        method: "DELETE",
    });
}

export async function getTemplateById(id: string): Promise<TemplateDetail> {
    return await apiFetch<TemplateDetail>(`/templates/${id}`);
}

export async function listCertificates(query = "", page = 0, size = 50): Promise<CertificateSummary[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    const data = await apiFetch<PageResponse<CertificateSummary>>(`/certificates?${params.toString()}`);
    return data.content ?? [];
}

export async function getCertificateById(id: string): Promise<CertificateDetail> {
    return await apiFetch<CertificateDetail>(`/certificates/${id}`);
}

export async function getCertificateCredential(id: string): Promise<CertificateCredential> {
    return await apiFetch<CertificateCredential>(`/certificates/${id}/credential`);
}

export async function listInstitutions(query = "", page = 0, size = 50): Promise<InstitutionSummary[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    const data = await apiFetch<PageResponse<InstitutionSummary>>(`/institutions?${params.toString()}`);
    return data.content ?? [];
}

export async function createInstitution(payload: {
    name: string;
    domain: string;
    issuePath: string;
}): Promise<InstitutionDetail> {
    return await apiFetch<InstitutionDetail>("/institutions", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateInstitutionById(
    id: string,
    payload: {
        name: string;
        domain: string;
        issuePath: string;
    }
): Promise<InstitutionDetail> {
    return await apiFetch<InstitutionDetail>(`/institutions/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function verifyInstitutionById(id: string): Promise<InstitutionDetail> {
    return await apiFetch<InstitutionDetail>(`/institutions/${id}/verify`, {
        method: "POST",
    });
}

export async function createTemplate(payload: {
    name: string;
    template: Template;
    sourceDesignId?: string | null;
}): Promise<TemplateDetail> {
    return await apiFetch<TemplateDetail>("/templates", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateTemplateById(
    id: string,
    payload: {
        name: string;
        template: Template;
        sourceDesignId?: string | null;
    }
): Promise<TemplateDetail> {
    return await apiFetch<TemplateDetail>(`/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function deleteTemplateById(id: string): Promise<void> {
    await apiFetch<void>(`/templates/${id}`, {
        method: "DELETE",
    });
}

export async function downloadTemplateById(id: string, fallbackName = "template"): Promise<DownloadedFile> {
    const res = await fetch(`${API_BASE}/templates/${id}/download`, {
        method: "GET",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(res.headers.get("Content-Disposition"), fallbackName, "fo.ftl"),
    };
}

export async function downloadTemplate(payload: {
    template: Template;
    fileName?: string;
}): Promise<DownloadedFile> {
    const res = await fetch(`${API_BASE}/templates/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(
            res.headers.get("Content-Disposition"),
            payload.fileName || payload.template?.name || "template",
            "fo.ftl"
        ),
    };
}

export async function generateCertificatePdf(payload: {
    template: Template;
    data?: unknown;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<Blob> {
    const res = await fetch(`${API_BASE}/templates/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Render failed (${res.status})`);
    }
    return await res.blob();
}

export async function generateCertificateBatch(payload: {
    template: Template;
    certificates: Array<unknown | { data?: unknown; fileName?: string }>;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<DownloadedFile> {
    const certificates = payload.certificates.map((item) => {
        if (item && typeof item === "object" && ("data" in item || "fileName" in item)) {
            const typed = item as { data?: unknown; fileName?: string };
            return { data: typed.data ?? {}, fileName: typed.fileName };
        }
        return { data: item ?? {} };
    });

    const res = await fetch(`${API_BASE}/templates/certificates/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            template: payload.template,
            certificates,
            assetBaseUrl: payload.assetBaseUrl,
            fileName: payload.fileName,
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Batch render failed (${res.status})`);
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(
            res.headers.get("Content-Disposition"),
            payload.fileName || payload.template?.name || "certificates",
            "zip"
        ),
    };
}

export async function storeCertificate(payload: {
    template: Template;
    data?: unknown;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<CertificateDetail> {
    return await apiFetch<CertificateDetail>("/templates/certificates/store", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function storeCertificateBatch(payload: {
    template: Template;
    certificates: Array<unknown | { data?: unknown; fileName?: string }>;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<CertificateSummary[]> {
    const certificates = payload.certificates.map((item) => {
        if (item && typeof item === "object" && ("data" in item || "fileName" in item)) {
            const typed = item as { data?: unknown; fileName?: string };
            return { data: typed.data ?? {}, fileName: typed.fileName };
        }
        return { data: item ?? {} };
    });

    return await apiFetch<CertificateSummary[]>("/templates/certificates/batch/store", {
        method: "POST",
        body: JSON.stringify({
            template: payload.template,
            certificates,
            assetBaseUrl: payload.assetBaseUrl,
            fileName: payload.fileName,
        }),
    });
}

export function certificateViewUrl(id: string): string {
    return `${API_BASE}/certificates/${id}/view`;
}

export async function downloadCertificateById(id: string, fallbackName = "certificate"): Promise<DownloadedFile> {
    const res = await fetch(`${API_BASE}/certificates/${id}/download`, {
        method: "GET",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(res.headers.get("Content-Disposition"), fallbackName, "pdf"),
    };
}

export async function renderTemplateFo(payload: {
    template: Template;
    data?: unknown;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<DownloadedFile> {
    const res = await fetch(`${API_BASE}/templates/render/fo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Render failed (${res.status})`);
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(
            res.headers.get("Content-Disposition"),
            payload.fileName || payload.template?.name || "template",
            "fo.xml"
        ),
    };
}
