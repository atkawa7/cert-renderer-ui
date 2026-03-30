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
    hasNext: boolean;
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
    batchId?: string | null;
    templateName: string;
    recipientFirstName?: string | null;
    recipientLastName?: string | null;
    recipientEmail?: string | null;
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

export type CertificateBatchFailure = {
    rowIndex: number;
    fileName?: string | null;
    message: string;
};

export type CertificateBatchSummary = {
    id: string;
    workspaceId: string;
    requestedByUserId?: string | null;
    templateId?: string | null;
    templateName: string;
    requestedFileName: string;
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
    requestedCount: number;
    processedCount: number;
    successCount: number;
    failureCount: number;
    startedAt?: string | null;
    completedAt?: string | null;
    errorMessage?: string | null;
    zipFileName?: string | null;
    failures: CertificateBatchFailure[];
    createdAt: string;
    updatedAt: string;
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

export type WorkspaceMemberCandidate = {
    userId: string;
    username: string;
    email?: string | null;
    alreadyMember: boolean;
    role?: "OWNER" | "MEMBER" | null;
};

export type AuditEventSummary = {
    id: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    actorUserId?: string | null;
    workspaceId?: string | null;
    requestPath: string;
    statusCode: number;
    createdById?: string | null;
    modifiedById?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type AuthResponse = {
    userId: string;
    username: string;
    admin: boolean;
    subscriptionTier: "FREE" | "PRO" | string;
    apiKey: string;
    tokenType: string;
};

export type AuthUser = {
    userId: string;
    username: string;
    email?: string | null;
    verifiedEmail?: boolean;
    admin: boolean;
    subscriptionTier: "FREE" | "PRO" | string;
    createdAt: string;
};

export type AuthEmailStatus = {
    email?: string | null;
    verifiedEmail: boolean;
};

export type AuthInvitation = {
    username: string;
    invitationToken: string;
    invitationLink?: string;
};

export type CreateInvitationPayload = {
    username: string;
    inviteeEmail?: string;
    sendEmail?: boolean;
};

export type AppSetupStatus = {
    setupEnabled: boolean;
    setupCompleted: boolean;
    registrationMode: "self" | "invitation" | string;
};

export type AuthUserPreferences = {
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string | null;
    cookieConsentCompleted: boolean;
    cookieConsentCompletedAt?: string | null;
};

const API_BASE = appConfig.rendererApiBase;
const USER_ID_KEY = "renderer:userId";
const WORKSPACE_ID_KEY = "renderer:workspaceId";
const API_KEY_KEY = "renderer:apiKey";
const SESSION_EVENT = "renderer:session-changed";
const SQL_STATS_EVENT = "renderer:sql-stats";
const MY_CERTIFICATES_DEDUPE_MS = 1500;

export type SqlStats = {
    statements: number;
    elapsedMs: number;
    sqlElapsedMs: number;
    serializationElapsedMs: number;
    otherElapsedMs: number;
    status: number;
    method: string;
    url: string;
    capturedAt: string;
    sqlTexts: string[];
    sqlDetails: Array<{ sql: string; elapsedMs: number | null }>;
    request: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string | null;
    };
    response: {
        status: number;
        headers: Record<string, string>;
        body: string | null;
    };
};

export type DownloadedFile = {
    blob: Blob;
    fileName: string;
};

type MyCertificatesCache = {
    key: string;
    at: number;
    data?: CertificateSummary[];
    promise?: Promise<CertificateSummary[]>;
};

let myCertificatesCache: MyCertificatesCache | null = null;

export function getCurrentUserId(): string {
    const raw = window.localStorage.getItem(USER_ID_KEY)?.trim();
    return raw || "demo-user";
}

export function setCurrentUserId(userId: string): void {
    const nextValue = userId.trim() || "demo-user";
    const currentValue = getCurrentUserId();
    if (nextValue === currentValue) {
        return;
    }
    window.localStorage.setItem(USER_ID_KEY, nextValue);
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
    const nextValue = apiKey?.trim() || null;
    const currentValue = getCurrentApiKey();
    if (nextValue === currentValue) {
        return;
    }
    if (nextValue) {
        window.localStorage.setItem(API_KEY_KEY, nextValue);
    } else {
        window.localStorage.removeItem(API_KEY_KEY);
        window.localStorage.removeItem(USER_ID_KEY);
    }
    emitSessionChanged();
}

export function setCurrentWorkspaceId(workspaceId: string | null): void {
    const nextValue = workspaceId?.trim() || null;
    const currentValue = getCurrentWorkspaceId();
    if (nextValue === currentValue) {
        return;
    }
    if (nextValue) {
        window.localStorage.setItem(WORKSPACE_ID_KEY, nextValue);
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

export function subscribeSqlStats(listener: (stats: SqlStats) => void): () => void {
    const handler = (event: Event) => {
        const custom = event as CustomEvent<SqlStats>;
        if (custom.detail) {
            listener(custom.detail);
        }
    };
    window.addEventListener(SQL_STATS_EVENT, handler as EventListener);
    return () => window.removeEventListener(SQL_STATS_EVENT, handler as EventListener);
}

const TRACE_BODY_LIMIT = 8000;

async function emitSqlStats(
    response: Response,
    method: string,
    requestTrace: { url: string; headers: Record<string, string>; body: string | null }
) {
    const statementsRaw = response.headers.get("X-SQL-Statements");
    const elapsedRaw = response.headers.get("X-Request-Elapsed-Ms");
    if (!statementsRaw || !elapsedRaw) return;

    const statements = Number.parseInt(statementsRaw, 10);
    const elapsedMs = Number.parseInt(elapsedRaw, 10);
    if (!Number.isFinite(statements) || !Number.isFinite(elapsedMs)) return;
    const sqlElapsedRaw = response.headers.get("X-SQL-Elapsed-Ms");
    const serializationElapsedRaw = response.headers.get("X-Serialization-Elapsed-Ms");
    const otherElapsedRaw = response.headers.get("X-Other-Elapsed-Ms");
    const sqlElapsedMs = Number.parseInt(sqlElapsedRaw ?? "", 10);
    const serializationElapsedMs = Number.parseInt(serializationElapsedRaw ?? "", 10);
    const otherElapsedMs = Number.parseInt(otherElapsedRaw ?? "", 10);
    const detailRaw = response.headers.get("X-SQL-Statements-Detail");

    const sqlDetails = decodeSqlStatements(detailRaw);
    const fallbackSqlElapsedMs = sqlDetails.reduce((sum, entry) => sum + (entry.elapsedMs ?? 0), 0);
    const safeSqlElapsedMs = Number.isFinite(sqlElapsedMs) ? Math.max(0, sqlElapsedMs) : fallbackSqlElapsedMs;
    const safeSerializationElapsedMs = Number.isFinite(serializationElapsedMs) ? Math.max(0, serializationElapsedMs) : 0;
    const safeOtherElapsedMs = Number.isFinite(otherElapsedMs)
        ? Math.max(0, otherElapsedMs)
        : Math.max(0, Math.max(0, elapsedMs) - safeSqlElapsedMs - safeSerializationElapsedMs);
    const responseHeaders = headersToRecord(response.headers);
    const responseBody = await readResponseBodyForTrace(response);
    const stats: SqlStats = {
        statements: Math.max(0, statements),
        elapsedMs: Math.max(0, elapsedMs),
        sqlElapsedMs: safeSqlElapsedMs,
        serializationElapsedMs: safeSerializationElapsedMs,
        otherElapsedMs: safeOtherElapsedMs,
        status: response.status,
        method: method.toUpperCase(),
        url: response.url,
        capturedAt: new Date().toISOString(),
        sqlDetails,
        sqlTexts: sqlDetails.map((item) => item.sql),
        request: {
            method: method.toUpperCase(),
            url: requestTrace.url,
            headers: requestTrace.headers,
            body: requestTrace.body,
        },
        response: {
            status: response.status,
            headers: responseHeaders,
            body: responseBody,
        },
    };
    window.dispatchEvent(new CustomEvent<SqlStats>(SQL_STATS_EVENT, { detail: stats }));
}

function decodeSqlStatements(raw: string | null): Array<{ sql: string; elapsedMs: number | null }> {
    if (!raw) return [];
    try {
        const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "===".slice((normalized.length + 3) % 4);
        const decoded = window.atob(padded);
        const text = decodeURIComponent(
            Array.from(decoded)
                .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
                .join("")
        );
        return text
            .split(/\n{2,}/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => {
                const timingMatch = item.match(/^\/\*\s*elapsedMs=(\d+)\s*\*\/\s*([\s\S]+)$/);
                if (!timingMatch) {
                    return { sql: item, elapsedMs: null };
                }
                const elapsed = Number.parseInt(timingMatch[1], 10);
                return {
                    sql: timingMatch[2].trim(),
                    elapsedMs: Number.isFinite(elapsed) ? elapsed : null,
                };
            });
    } catch {
        return [];
    }
}

async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = init?.method || "GET";
    const requestTrace = {
        url: resolveRequestUrl(input),
        headers: headersToRecord(init?.headers),
        body: bodyToTraceString(init?.body),
    };
    const response = await fetch(input, init);
    await emitSqlStats(response, method, requestTrace);
    return response;
}

function resolveRequestUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return input.url;
}

function headersToRecord(headers: HeadersInit | null | undefined): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }
    return { ...headers };
}

function bodyToTraceString(body: BodyInit | null | undefined): string | null {
    if (body == null) return null;
    if (typeof body === "string") return truncateTraceBody(body);
    if (body instanceof URLSearchParams) return truncateTraceBody(body.toString());
    if (body instanceof FormData) {
        const pairs: string[] = [];
        body.forEach((value, key) => {
            pairs.push(`${key}=${typeof value === "string" ? value : "[file]"}`);
        });
        return truncateTraceBody(pairs.join("&"));
    }
    return `[${Object.prototype.toString.call(body)}]`;
}

async function readResponseBodyForTrace(response: Response): Promise<string | null> {
    const contentType = response.headers.get("Content-Type") || "";
    if (!isTextLikeContentType(contentType)) {
        return `[non-text response: ${contentType || "unknown"}]`;
    }
    try {
        const bodyText = await response.clone().text();
        return truncateTraceBody(bodyText);
    } catch {
        return null;
    }
}

function isTextLikeContentType(contentType: string): boolean {
    const value = contentType.toLowerCase();
    return value.includes("application/json")
        || value.includes("text/")
        || value.includes("application/problem+json")
        || value.includes("application/xml")
        || value.includes("application/javascript")
        || value.includes("application/x-www-form-urlencoded");
}

function truncateTraceBody(value: string): string {
    if (value.length <= TRACE_BODY_LIMIT) return value;
    return `${value.slice(0, TRACE_BODY_LIMIT)}\n...[truncated ${value.length - TRACE_BODY_LIMIT} chars]`;
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
    const res = await trackedFetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...workspaceHeaders(requireWorkspace), ...(init?.headers ?? {}) },
        ...init,
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Request failed (${res.status})`));
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
    const raw = (await response.text().catch(() => "")).trim();
    if (!raw) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed === "string") {
            return parsed.trim() || fallback;
        }
        if (parsed && typeof parsed === "object") {
            const payload = parsed as Record<string, unknown>;
            const detail = typeof payload.detail === "string" ? payload.detail.trim() : "";
            if (detail) {
                return detail;
            }
            const message = typeof payload.message === "string" ? payload.message.trim() : "";
            if (message) {
                return message;
            }
            const title = typeof payload.title === "string" ? payload.title.trim() : "";
            if (title) {
                return title;
            }
            const error = typeof payload.error === "string" ? payload.error.trim() : "";
            if (error) {
                return error;
            }
        }
    } catch {
        // Fall through and return the raw text body.
    }

    return raw;
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

export async function listDesigns(
    query = "",
    page = 0,
    size = 12,
    options?: {
        workspaceOnly?: boolean;
    }
): Promise<PagedResult<DesignSummary>> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (options?.workspaceOnly) params.set("workspaceOnly", "true");
    params.set("page", String(page));
    params.set("size", String(size));
    const data = await apiFetch<PageResponse<DesignSummary>>(`/designs?${params.toString()}`);
    return {
        items: data.content ?? [],
        page: data.number ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: (data.number ?? page) + 1 < (data.totalPages ?? 0),
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

export async function listMyCertificates(query = "", page = 0, size = 50): Promise<CertificateSummary[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    const key = params.toString();
    const now = Date.now();
    if (myCertificatesCache && myCertificatesCache.key === key) {
        if (myCertificatesCache.promise) {
            return await myCertificatesCache.promise;
        }
        if (myCertificatesCache.data && now - myCertificatesCache.at <= MY_CERTIFICATES_DEDUPE_MS) {
            return myCertificatesCache.data;
        }
    }

    const requestPromise = (async () => {
        const res = await trackedFetch(`${API_BASE}/credential-holder/certificates?${params.toString()}`, {
            method: "GET",
            headers: workspaceHeaders(false),
        });
        if (!res.ok) {
            throw new Error(await parseErrorMessage(res, `Request failed (${res.status})`));
        }
        const data = (await res.json()) as PageResponse<CertificateSummary>;
        const content = data.content ?? [];
        myCertificatesCache = { key, at: Date.now(), data: content };
        return content;
    })();

    myCertificatesCache = { key, at: now, promise: requestPromise };
    try {
        return await requestPromise;
    } finally {
        if (myCertificatesCache?.key === key && myCertificatesCache.promise) {
            myCertificatesCache.promise = undefined;
        }
    }
}

export async function getMyCertificateById(id: string): Promise<CertificateDetail> {
    const res = await trackedFetch(`${API_BASE}/credential-holder/certificates/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: workspaceHeaders(false),
    });
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Request failed (${res.status})`));
    }
    return (await res.json()) as CertificateDetail;
}

export async function getCertificateById(id: string): Promise<CertificateDetail> {
    return await apiFetch<CertificateDetail>(`/certificates/${id}`);
}

export async function getCertificatePdfBytes(id: string): Promise<Uint8Array> {
    const res = await trackedFetch(`${API_BASE}/certificates/${encodeURIComponent(id)}/view`, {
        method: "GET",
        headers: workspaceHeaders(),
    });
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `PDF fetch failed (${res.status})`));
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) {
        throw new Error("PDF is empty.");
    }
    return bytes;
}

export async function getMyCertificatePdfBytes(id: string): Promise<Uint8Array> {
    const res = await trackedFetch(`${API_BASE}/credential-holder/certificates/${encodeURIComponent(id)}/view`, {
        method: "GET",
        headers: workspaceHeaders(false),
    });
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `PDF fetch failed (${res.status})`));
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) {
        throw new Error("PDF is empty.");
    }
    return bytes;
}

export async function getCertificateCredential(id: string): Promise<CertificateCredential> {
    return await apiFetch<CertificateCredential>(`/certificates/${id}/credential`);
}

export async function getMyCertificateCredential(id: string): Promise<CertificateCredential> {
    const res = await trackedFetch(`${API_BASE}/credential-holder/certificates/${encodeURIComponent(id)}/credential`, {
        method: "GET",
        headers: workspaceHeaders(false),
    });
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Request failed (${res.status})`));
    }
    return (await res.json()) as CertificateCredential;
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
    const res = await trackedFetch(`${API_BASE}/templates/${id}/download`, {
        method: "GET",
        headers: workspaceHeaders(),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Download failed (${res.status})`));
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
    const res = await trackedFetch(`${API_BASE}/templates/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Download failed (${res.status})`));
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
    const res = await trackedFetch(`${API_BASE}/templates/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Render failed (${res.status})`));
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

    const res = await trackedFetch(`${API_BASE}/templates/certificates/batch`, {
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
        throw new Error(await parseErrorMessage(res, `Batch render failed (${res.status})`));
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

export async function queueCertificateBatchJob(payload: {
    template: Template;
    certificates: Array<unknown | { data?: unknown; fileName?: string }>;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<CertificateBatchSummary> {
    const certificates = payload.certificates.map((item) => {
        if (item && typeof item === "object" && ("data" in item || "fileName" in item)) {
            const typed = item as { data?: unknown; fileName?: string };
            return { data: typed.data ?? {}, fileName: typed.fileName };
        }
        return { data: item ?? {} };
    });

    return await apiFetch<CertificateBatchSummary>("/certificate-batches", {
        method: "POST",
        body: JSON.stringify({
            template: payload.template,
            certificates,
            assetBaseUrl: payload.assetBaseUrl,
            fileName: payload.fileName,
        }),
    });
}

export async function listCertificateBatches(params?: {
    page?: number;
    size?: number;
}): Promise<PagedResult<CertificateBatchSummary>> {
    const query = new URLSearchParams();
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 50));
    const data = await apiFetch<PageResponse<CertificateBatchSummary>>(`/certificate-batches?${query.toString()}`);
    return {
        items: data.content ?? [],
        page: data.number ?? 0,
        size: data.size ?? 50,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: (data.number ?? 0) + 1 < (data.totalPages ?? 0),
    };
}

export async function getCertificateBatchById(id: string): Promise<CertificateBatchSummary> {
    return await apiFetch<CertificateBatchSummary>(`/certificate-batches/${id}`);
}

export async function downloadCertificateBatchZipById(id: string, fallbackName = "certificates"): Promise<DownloadedFile> {
    const res = await trackedFetch(`${API_BASE}/certificate-batches/${encodeURIComponent(id)}/download`, {
        method: "GET",
        headers: workspaceHeaders(),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Download failed (${res.status})`));
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(res.headers.get("Content-Disposition"), fallbackName, "zip"),
    };
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
    const res = await trackedFetch(`${API_BASE}/certificates/${id}/download`, {
        method: "GET",
        headers: workspaceHeaders(),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Download failed (${res.status})`));
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(res.headers.get("Content-Disposition"), fallbackName, "pdf"),
    };
}

export async function downloadMyCertificateById(id: string, fallbackName = "certificate"): Promise<DownloadedFile> {
    const res = await trackedFetch(`${API_BASE}/credential-holder/certificates/${encodeURIComponent(id)}/download`, {
        method: "GET",
        headers: workspaceHeaders(false),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Download failed (${res.status})`));
    }

    return {
        blob: await res.blob(),
        fileName: parseDownloadFileName(res.headers.get("Content-Disposition"), fallbackName, "pdf"),
    };
}

export async function sendCertificateEmailById(id: string): Promise<void> {
    await apiFetch<void>(`/certificates/${id}/send-email`, {
        method: "POST",
    });
}

export async function renderTemplateFo(payload: {
    template: Template;
    data?: unknown;
    assetBaseUrl?: string;
    fileName?: string;
}): Promise<DownloadedFile> {
    const res = await trackedFetch(`${API_BASE}/templates/render/fo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...workspaceHeaders() },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Render failed (${res.status})`));
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

export async function listAuditEvents(params?: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    workspaceId?: string;
    page?: number;
    size?: number;
}): Promise<PagedResult<AuditEventSummary>> {
    const query = new URLSearchParams();
    if (params?.action?.trim()) query.set("action", params.action.trim());
    if (params?.entityType?.trim()) query.set("entityType", params.entityType.trim());
    if (params?.entityId?.trim()) query.set("entityId", params.entityId.trim());
    if (params?.actorUserId?.trim()) query.set("actorUserId", params.actorUserId.trim());
    if (params?.workspaceId?.trim()) query.set("workspaceId", params.workspaceId.trim());
    query.set("page", String(params?.page ?? 0));
    query.set("size", String(params?.size ?? 50));
    const data = await apiFetch<PageResponse<AuditEventSummary>>(`/audits?${query.toString()}`);
    return {
        items: data.content ?? [],
        page: data.number ?? 0,
        size: data.size ?? 50,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: (data.number ?? 0) + 1 < (data.totalPages ?? 0),
    };
}

export async function register(payload: { username: string; password: string; invitationToken?: string }): Promise<AuthResponse> {
    const response = await trackedFetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Register failed (${response.status})`));
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function login(payload: { username: string; password: string }): Promise<AuthResponse> {
    const response = await trackedFetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Login failed (${response.status})`));
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function logout(): Promise<void> {
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;
    const response = await trackedFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Logout failed (${response.status})`));
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
    const response = await trackedFetch(`${API_BASE}/auth/me`, {
        method: "GET",
        headers: { "X-API-Key": apiKey, Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Auth check failed (${response.status})`));
    }
    return (await response.json()) as AuthUser;
}

export async function updateMyEmail(email: string): Promise<AuthEmailStatus> {
    return await apiFetch<AuthEmailStatus>("/auth/email", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function verifyMyEmail(code: string): Promise<AuthEmailStatus> {
    return await apiFetch<AuthEmailStatus>("/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}

export async function verifyEmailByLink(token: string): Promise<AuthEmailStatus> {
    const res = await trackedFetch(`${API_BASE}/auth/email/verify-link?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Verification failed (${res.status})`));
    }
    return (await res.json()) as AuthEmailStatus;
}

export async function appSetupStatus(): Promise<AppSetupStatus> {
    const response = await trackedFetch(`${API_BASE}/app/setup/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Setup status failed (${response.status})`));
    }
    return (await response.json()) as AppSetupStatus;
}

export async function initializeAppSetup(payload: {
    username: string;
    password: string;
    registrationMode: "self" | "invitation";
}): Promise<AuthResponse> {
    const response = await trackedFetch(`${API_BASE}/app/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Setup initialization failed (${response.status})`));
    }
    const auth = (await response.json()) as AuthResponse;
    setCurrentApiKey(auth.apiKey);
    setCurrentUserId(auth.userId);
    return auth;
}

export async function createInvitation(payload: CreateInvitationPayload): Promise<AuthInvitation> {
    const apiKey = getCurrentApiKey();
    if (!apiKey) throw new Error("No API key set");
    const username = payload.username.trim();
    const inviteeEmail = payload.inviteeEmail?.trim();
    const response = await trackedFetch(`${API_BASE}/auth/invitations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            username,
            inviteeEmail: inviteeEmail || undefined,
            sendEmail: Boolean(payload.sendEmail),
        }),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Invitation failed (${response.status})`));
    }
    return (await response.json()) as AuthInvitation;
}

export async function getAuthPreferences(): Promise<AuthUserPreferences> {
    return await apiFetch<AuthUserPreferences>("/auth/preferences");
}

export async function updateAuthPreferences(payload: {
    onboardingCompleted?: boolean;
    cookieConsentCompleted?: boolean;
}): Promise<AuthUserPreferences> {
    return await apiFetch<AuthUserPreferences>("/auth/preferences", {
        method: "POST",
        body: JSON.stringify(payload),
    });
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

export async function searchWorkspaceMemberCandidates(
    workspaceId: string,
    query: string
): Promise<WorkspaceMemberCandidate[]> {
    const params = new URLSearchParams();
    params.set("query", query.trim());
    return await apiFetch<WorkspaceMemberCandidate[]>(`/workspaces/${workspaceId}/members/search?${params.toString()}`);
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await apiFetch<void>(`/workspaces/${workspaceId}/members/${encodeURIComponent(userId)}`, {
        method: "DELETE",
    });
}
