import type { Template } from "./TemplateEditor";
import { appConfig } from "./appConfig";

export type TemplateSummary = {
    id: string;
    workspaceId?: string | null;
    name: string;
    sourceDesignId?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type TemplateDetail = {
    id: string;
    workspaceId?: string | null;
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
    workspaceId?: string | null;
    name: string;
    description?: string;
    thumbnailUrl: string;
    defaultDesign: boolean;
    globalDesign?: boolean;
    createdAt: string;
    updatedAt: string;
};

export type DesignDetail = {
    id: string;
    workspaceId?: string | null;
    name: string;
    description?: string;
    thumbnailUrl: string;
    defaultDesign: boolean;
    globalDesign?: boolean;
    template: Template;
    createdAt: string;
    updatedAt: string;
};

export type CertificateSummary = {
    id: string;
    workspaceId?: string | null;
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
    workspaceId?: string | null;
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

export type WorkspaceSummary = {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceMembership = {
    id: string;
    workspaceId: string;
    userId: string;
    role: "OWNER" | "MEMBER";
    createdAt: string;
    updatedAt: string;
};

export type AuthResponse = {
    userId: string;
    username: string;
    admin: boolean;
    apiKey: string;
    tokenType: string;
};

export type AuthUser = {
    userId: string;
    username: string;
    admin: boolean;
    createdAt: string;
};

export type AppSetupStatus = {
    setupEnabled: boolean;
    setupCompleted: boolean;
    registrationMode: "self" | "invitation" | string;
};

const API_BASE = appConfig.rendererApiBase;
const USER_ID_KEY = "renderer:userId";
const WORKSPACE_ID_KEY = "renderer:workspaceId";
const API_KEY_KEY = "renderer:apiKey";
const SESSION_EVENT = "renderer:session-changed";

export type DownloadedFile = {
    blob: Blob;
    fileName: string;
};

export function getCurrentUserId(): string {
    const raw = window.localStorage.getItem(USER_ID_KEY)?.trim();
    return raw || "demo-user";
}

export function setCurrentUserId(userId: string): void {
    window.localStorage.setItem(USER_ID_KEY, userId.trim() || "demo-user");
    emitSessionChanged();
}

export function getCurrentWorkspaceId(): string | null {
    const raw = window.localStorage.getItem(WORKSPACE_ID_KEY)?.trim();
    return raw || null;
}

export function getCurrentApiKey(): string | null {
    const raw = window.localStorage.getItem(API_KEY_KEY)?.trim();
    return raw || null;
}

export function setCurrentApiKey(apiKey: string | null): void {
    if (apiKey && apiKey.trim()) {
        window.localStorage.setItem(API_KEY_KEY, apiKey.trim());
    } else {
        window.localStorage.removeItem(API_KEY_KEY);
    }
    emitSessionChanged();
}

export function setCurrentWorkspaceId(workspaceId: string | null): void {
    if (workspaceId && workspaceId.trim()) {
        window.localStorage.setItem(WORKSPACE_ID_KEY, workspaceId.trim());
    } else {
        window.localStorage.removeItem(WORKSPACE_ID_KEY);
    }
    emitSessionChanged();
}

function emitSessionChanged() {
    window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeSessionChange(listener: () => void): () => void {
    const handler = () => listener();
    window.addEventListener(SESSION_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener(SESSION_EVENT, handler);
        window.removeEventListener("storage", handler);
    };
}

function workspaceHeaders(requireWorkspace = true): Record<string, string> {
    const headers: Record<string, string> = {
        "X-User-Id": getCurrentUserId(),
    };
    const apiKey = getCurrentApiKey();
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
        headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const workspaceId = getCurrentWorkspaceId();
    if (workspaceId) {
        headers["X-Workspace-Id"] = workspaceId;
    } else if (requireWorkspace) {
        throw new Error("Select an org workspace first in the Workspaces page.");
    }
    return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const requireWorkspace = !path.startsWith("/workspaces");
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...workspaceHeaders(requireWorkspace), ...(init?.headers ?? {}) },
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
        headers: workspaceHeaders(),
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
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
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
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
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
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
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
    const params = new URLSearchParams();
    params.set("userId", getCurrentUserId());
    const workspaceId = getCurrentWorkspaceId();
    if (workspaceId) {
        params.set("workspaceId", workspaceId);
    }
    return `${API_BASE}/certificates/${id}/view?${params.toString()}`;
}

export async function downloadCertificateById(id: string, fallbackName = "certificate"): Promise<DownloadedFile> {
    const res = await fetch(`${API_BASE}/certificates/${id}/download`, {
        method: "GET",
        headers: workspaceHeaders(),
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
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
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

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
    return await apiFetch<WorkspaceSummary[]>("/workspaces");
}

export async function register(payload: { username: string; password: string; invitationToken?: string }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Register failed (${response.status})`);
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function login(payload: { username: string; password: string }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Login failed (${response.status})`);
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function logout(): Promise<void> {
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;
    const response = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Logout failed (${response.status})`);
    }
    setCurrentApiKey(null);
    setCurrentWorkspaceId(null);
}

export async function ensureActiveWorkspace(): Promise<string> {
    const workspaces = await listWorkspaces();
    if (workspaces.length === 0) {
        const created = await createWorkspace({ name: "My Workspace" });
        setCurrentWorkspaceId(created.id);
        return created.id;
    }
    const currentWorkspaceId = getCurrentWorkspaceId();
    if (currentWorkspaceId && workspaces.some((workspace) => workspace.id === currentWorkspaceId)) {
        return currentWorkspaceId;
    }
    setCurrentWorkspaceId(workspaces[0].id);
    return workspaces[0].id;
}

export async function currentUser(): Promise<AuthUser> {
    const apiKey = getCurrentApiKey();
    if (!apiKey) throw new Error("No API key set");
    const response = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        headers: { "X-API-Key": apiKey, Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Auth check failed (${response.status})`);
    }
    return (await response.json()) as AuthUser;
}

export async function appSetupStatus(): Promise<AppSetupStatus> {
    const response = await fetch(`${API_BASE}/app/setup/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Setup status failed (${response.status})`);
    }
    return (await response.json()) as AppSetupStatus;
}

export async function initializeAppSetup(payload: {
    username: string;
    password: string;
    registrationMode: "self" | "invitation";
}): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/app/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Setup initialization failed (${response.status})`);
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function createInvitation(username: string): Promise<{ username: string; invitationToken: string }> {
    const apiKey = getCurrentApiKey();
    if (!apiKey) throw new Error("No API key set");
    const response = await fetch(`${API_BASE}/auth/invitations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ username }),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Invitation failed (${response.status})`);
    }
    return (await response.json()) as { username: string; invitationToken: string };
}

export async function createWorkspace(payload: { name: string }): Promise<WorkspaceSummary> {
    return await apiFetch<WorkspaceSummary>("/workspaces", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMembership[]> {
    return await apiFetch<WorkspaceMembership[]>(`/workspaces/${workspaceId}/members`);
}

export async function addWorkspaceMember(
    workspaceId: string,
    payload: { userId: string; role?: "OWNER" | "MEMBER" }
): Promise<WorkspaceMembership> {
    return await apiFetch<WorkspaceMembership>(`/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await apiFetch<void>(`/workspaces/${workspaceId}/members/${encodeURIComponent(userId)}`, {
        method: "DELETE",
    });
}
