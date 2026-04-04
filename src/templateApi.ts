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
    vcExpiresAt?: string | null;
    vcPermanent?: boolean;
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

export type AuthLoginResponse = {
    userId: string;
    username: string;
    admin: boolean;
    subscriptionTier: "FREE" | "PRO" | string;
    tokenType: "ApiKey" | "Bearer" | "DPoP" | string;
    apiKey?: string | null;
    accessToken?: string | null;
    expiresAt?: string | null;
    requiresTwoFactor?: boolean;
    twoFactorChallengeToken?: string | null;
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

export type AdminUser = {
    userId: string;
    username: string;
    email?: string | null;
    active: boolean;
    admin: boolean;
    subscriptionTier: "FREE" | "PRO" | string;
    createdAt: string;
    updatedAt: string;
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

export type CreateAdminUserPayload = {
    username: string;
    password: string;
    email?: string;
    admin?: boolean;
    subscriptionTier?: "FREE" | "PRO" | string;
};

export type UpdateAdminUserPayload = {
    username: string;
    email?: string;
    admin?: boolean;
    active?: boolean;
    subscriptionTier?: "FREE" | "PRO" | string;
};

export type TwoFactorStatus = {
    enabled: boolean;
    deviceCount: number;
    activeDeviceCount: number;
    backupCodesRemaining: number;
};

export type TwoFactorDevice = {
    deviceId: string;
    label: string;
    active: boolean;
    lastUsedAt?: string | null;
    createdAt: string;
};

export type TwoFactorSetupResponse = {
    deviceId: string;
    label: string;
    secretBase32: string;
    otpauthUri: string;
};

export type TwoFactorBackupCodesResponse = {
    codes: string[];
};

export type AppSetupStatus = {
    setupEnabled: boolean;
    setupCompleted: boolean;
    registrationMode: "self" | "invitation" | string;
    preferredAuthMode: "API_KEY" | "JWT" | "DPOP" | string;
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
const AUTH_MODE_KEY = "renderer:authMode";
const SESSION_EVENT = "renderer:session-changed";
const SQL_STATS_EVENT = "renderer:sql-stats";
const MY_CERTIFICATES_DEDUPE_MS = 1500;
const DPOP_DB_NAME = "renderer-auth";
const DPOP_DB_VERSION = 1;
const DPOP_STORE = "dpop";
const DPOP_KEY_ID = "default";

export type PreferredAuthMode = "API_KEY" | "JWT" | "DPOP";

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
let appSetupStatusInFlight: Promise<AppSetupStatus> | null = null;
let appSetupStatusCache: AppSetupStatus | null = null;

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

export function getCurrentAuthMode(): PreferredAuthMode {
    const raw = window.localStorage.getItem(AUTH_MODE_KEY)?.trim().toUpperCase();
    if (raw === "JWT" || raw === "DPOP" || raw === "API_KEY") {
        return raw;
    }
    return "API_KEY";
}

export function setCurrentAuthMode(mode: PreferredAuthMode): void {
    const normalized = normalizePreferredAuthMode(mode);
    if (getCurrentAuthMode() === normalized) {
        return;
    }
    window.localStorage.setItem(AUTH_MODE_KEY, normalized);
    emitSessionChanged();
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

function setSessionAuth(token: string | null, mode: PreferredAuthMode, userId: string | null) {
    setCurrentAuthMode(mode);
    setCurrentApiKey(token);
    if (userId) {
        setCurrentUserId(userId);
    }
}

function normalizePreferredAuthMode(mode: string | null | undefined): PreferredAuthMode {
    const normalized = (mode ?? "").trim().toUpperCase();
    if (normalized === "JWT" || normalized === "DPOP" || normalized === "API_KEY") {
        return normalized;
    }
    return "API_KEY";
}

type DpopKeyRecord = {
    id: string;
    privateKey: CryptoKey;
    publicKey: CryptoKey;
    publicJwk: JsonWebKey;
    jkt: string;
};

function openDpopDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DPOP_DB_NAME, DPOP_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(DPOP_STORE)) {
                db.createObjectStore(DPOP_STORE, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    });
}

async function loadDpopKeyRecord(): Promise<DpopKeyRecord | null> {
    const db = await openDpopDb();
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(DPOP_STORE, "readonly");
        const store = tx.objectStore(DPOP_STORE);
        const req = store.get(DPOP_KEY_ID);
        req.onsuccess = () => resolve((req.result as DpopKeyRecord | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error("Failed to read DPoP key"));
        tx.oncomplete = () => db.close();
    });
}

async function saveDpopKeyRecord(record: DpopKeyRecord): Promise<void> {
    const db = await openDpopDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(DPOP_STORE, "readwrite");
        tx.objectStore(DPOP_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Failed to save DPoP key"));
        tx.onabort = () => reject(tx.error ?? new Error("Failed to save DPoP key"));
    });
    db.close();
}

function toBase64Url(value: Uint8Array): string {
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function utf8Bytes(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return new Uint8Array(bytes).buffer;
}

async function sha256Base64Url(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(utf8Bytes(value)));
    return toBase64Url(new Uint8Array(digest));
}

async function computeJwkThumbprintBase64Url(jwk: JsonWebKey): Promise<string> {
    const required = {
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
    };
    if (!required.crv || !required.kty || !required.x || !required.y) {
        throw new Error("Invalid DPoP public key");
    }
    const canonical = JSON.stringify(required);
    return await sha256Base64Url(canonical);
}

async function ensureDpopKeyRecord(): Promise<DpopKeyRecord> {
    const existing = await loadDpopKeyRecord();
    if (existing?.privateKey && existing?.publicJwk?.kty && existing?.jkt) {
        return existing;
    }

    // Generate temporary exportable pair so we can create portable public JWK,
    // then re-import private key as non-extractable for IndexedDB persistence.
    const tempPair = (await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    )) as CryptoKeyPair;

    const publicJwk = (await crypto.subtle.exportKey("jwk", tempPair.publicKey)) as JsonWebKey;
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", tempPair.privateKey);
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pkcs8,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );
    const publicKey = await crypto.subtle.importKey(
        "jwk",
        publicJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
    );
    const jkt = await computeJwkThumbprintBase64Url(publicJwk);
    const created: DpopKeyRecord = { id: DPOP_KEY_ID, privateKey, publicKey, publicJwk, jkt };
    await saveDpopKeyRecord(created);
    return created;
}

function base64UrlJson(value: unknown): string {
    return toBase64Url(utf8Bytes(JSON.stringify(value)));
}

function derToJose(signatureDer: Uint8Array, joseLength: number): Uint8Array {
    if (signatureDer.length === joseLength) {
        return signatureDer;
    }
    if (signatureDer.length < 8 || signatureDer[0] !== 0x30) {
        throw new Error("Invalid ECDSA signature format");
    }
    let offset = 2;
    if (signatureDer[offset] !== 0x02) throw new Error("Invalid ECDSA signature format");
    const rLen = signatureDer[offset + 1];
    const r = signatureDer.slice(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    if (signatureDer[offset] !== 0x02) throw new Error("Invalid ECDSA signature format");
    const sLen = signatureDer[offset + 1];
    const s = signatureDer.slice(offset + 2, offset + 2 + sLen);

    const out = new Uint8Array(joseLength);
    const half = joseLength / 2;
    out.set(r.slice(Math.max(0, r.length - half)), half - Math.min(half, r.length));
    out.set(s.slice(Math.max(0, s.length - half)), joseLength - Math.min(half, s.length));
    return out;
}

async function buildDpopProof(method: string, htu: string, accessToken?: string): Promise<string> {
    const record = await ensureDpopKeyRecord();
    const header = {
        typ: "dpop+jwt",
        alg: "ES256",
        jwk: record.publicJwk,
    };
    const payload: Record<string, unknown> = {
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        htm: method.toUpperCase(),
        htu,
    };
    if (accessToken) {
        payload.ath = await sha256Base64Url(accessToken);
    }
    const encodedHeader = base64UrlJson(header);
    const encodedPayload = base64UrlJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const derSignature = new Uint8Array(
        await crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            record.privateKey,
            toArrayBuffer(utf8Bytes(signingInput))
        )
    );
    const joseSignature = derToJose(derSignature, 64);
    return `${signingInput}.${toBase64Url(joseSignature)}`;
}

function toDpopHtu(url: string): string {
    try {
        const parsed = new URL(url, window.location.origin);
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
        const withoutFragment = url.split("#", 1)[0];
        return withoutFragment.split("?", 1)[0];
    }
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
    const url = resolveRequestUrl(input);
    const baseHeaders = headersToRecord(init?.headers);
    const authHeaders = await resolveAuthHeaders(method, url, baseHeaders);
    const mergedHeaders = { ...baseHeaders, ...authHeaders };
    const requestTrace = {
        url,
        headers: mergedHeaders,
        body: bodyToTraceString(init?.body),
    };
    const response = await fetch(input, {
        ...init,
        headers: mergedHeaders,
    });
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
    const workspaceId = getCurrentWorkspaceId();
    if (workspaceId) {
        headers["X-Workspace-Id"] = workspaceId;
    } else if (requireWorkspace) {
        throw new Error("Select an org workspace first in the Workspaces page.");
    }
    return headers;
}

async function resolveAuthHeaders(method: string, url: string, existing: Record<string, string>): Promise<Record<string, string>> {
    if (isPublicAuthBootstrapRequest(url)) {
        return {};
    }
    if (existing.Authorization || existing.authorization || existing["X-API-Key"] || existing["x-api-key"]) {
        return {};
    }
    const token = getCurrentApiKey();
    if (!token) {
        return {};
    }
    const mode = getCurrentAuthMode();
    if (mode === "JWT") {
        return { Authorization: `Bearer ${token}` };
    }
    if (mode === "DPOP") {
        const dpopProof = await buildDpopProof(method, toDpopHtu(url), token);
        return {
            Authorization: `DPoP ${token}`,
            DPoP: dpopProof,
        };
    }
    return {
        "X-API-Key": token,
        Authorization: `Bearer ${token}`,
    };
}

function isPublicAuthBootstrapRequest(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin);
        const path = parsed.pathname;
        return path === "/auth/login"
            || path === "/auth/register"
            || path === "/app/setup"
            || path === "/app/setup/status";
    } catch {
        return false;
    }
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

export async function updateCertificateExpirationById(
    id: string,
    payload: {
        expiresAt?: string | null;
        permanent?: boolean | null;
    }
): Promise<CertificateDetail> {
    return await apiFetch<CertificateDetail>(`/certificates/${id}/expiration`, {
        method: "PATCH",
        body: JSON.stringify(payload),
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

export async function register(payload: { username: string; password: string; invitationToken?: string; captchaToken?: string }): Promise<AuthResponse> {
    const response = await trackedFetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Register failed (${response.status})`));
    }
    const auth = (await response.json()) as AuthResponse;
    setSessionAuth(auth.apiKey, "API_KEY", auth.userId);
    return auth;
}

export async function login(
    payload: {
        username: string;
        password: string;
        captchaToken?: string;
        twoFactorCode?: string;
        twoFactorChallengeToken?: string;
    },
    preferredMode?: PreferredAuthMode
): Promise<AuthLoginResponse> {
    const preferred = normalizePreferredAuthMode(preferredMode ?? null);
    const loginUrl = `${API_BASE}/auth/login`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (preferred === "DPOP") {
        await ensureDpopKeyRecord();
        headers.DPoP = await buildDpopProof("POST", toDpopHtu(loginUrl));
    }

    const response = await trackedFetch(loginUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Login failed (${response.status})`));
    }
    const auth = (await response.json()) as AuthLoginResponse;
    if (auth.requiresTwoFactor) {
        return auth;
    }
    if (auth.accessToken && auth.tokenType?.toUpperCase() === "DPOP") {
        setSessionAuth(auth.accessToken, "DPOP", auth.userId);
    } else if (auth.accessToken) {
        setSessionAuth(auth.accessToken, "JWT", auth.userId);
    } else {
        setSessionAuth(auth.apiKey || null, "API_KEY", auth.userId);
    }
    return auth;
}

export async function logout(): Promise<void> {
    const token = getCurrentApiKey();
    if (!token) return;
    const response = await trackedFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
    });
    if (!response.ok) {
        throw new Error(await parseErrorMessage(response, `Logout failed (${response.status})`));
    }
    setCurrentAuthMode("API_KEY");
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
    const token = getCurrentApiKey();
    if (!token) throw new Error("No auth token set");
    const response = await trackedFetch(`${API_BASE}/auth/me`, {
        method: "GET",
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
    if (appSetupStatusCache) {
        return appSetupStatusCache;
    }
    if (appSetupStatusInFlight) {
        return await appSetupStatusInFlight;
    }
    appSetupStatusInFlight = (async () => {
        const response = await trackedFetch(`${API_BASE}/app/setup/status`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            throw new Error(await parseErrorMessage(response, `Setup status failed (${response.status})`));
        }
        const status = (await response.json()) as AppSetupStatus;
        appSetupStatusCache = status;
        return status;
    })();
    try {
        return await appSetupStatusInFlight;
    } finally {
        appSetupStatusInFlight = null;
    }
}

export async function initializeAppSetup(payload: {
    username: string;
    password: string;
    registrationMode: "self" | "invitation";
    preferredAuthMode: PreferredAuthMode;
    captchaToken?: string;
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
    appSetupStatusCache = {
        setupEnabled: false,
        setupCompleted: true,
        registrationMode: payload.registrationMode,
        preferredAuthMode: payload.preferredAuthMode,
    };
    setSessionAuth(auth.apiKey, "API_KEY", auth.userId);
    return auth;
}

export async function createInvitation(payload: CreateInvitationPayload): Promise<AuthInvitation> {
    const token = getCurrentApiKey();
    if (!token) throw new Error("No auth token set");
    const username = payload.username.trim();
    const inviteeEmail = payload.inviteeEmail?.trim();
    const response = await trackedFetch(`${API_BASE}/auth/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

export async function listAdminUsers(): Promise<AdminUser[]> {
    return await apiFetch<AdminUser[]>("/admin/users");
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
    return await apiFetch<AdminUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
    return await apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function resetAdminUserPassword(userId: string, password: string): Promise<AdminUser> {
    return await apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
    });
}

export async function disableAdminUser(userId: string): Promise<AdminUser> {
    return await apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/disable`, {
        method: "POST",
    });
}

export async function enableAdminUser(userId: string): Promise<AdminUser> {
    return await apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/enable`, {
        method: "POST",
    });
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
    return await apiFetch<TwoFactorStatus>("/auth/2fa/status");
}

export async function listTwoFactorDevices(): Promise<TwoFactorDevice[]> {
    return await apiFetch<TwoFactorDevice[]>("/auth/2fa/devices");
}

export async function beginTwoFactorSetup(label: string): Promise<TwoFactorSetupResponse> {
    return await apiFetch<TwoFactorSetupResponse>("/auth/2fa/devices/setup", {
        method: "POST",
        body: JSON.stringify({ label }),
    });
}

export async function confirmTwoFactorSetup(deviceId: string, code: string): Promise<TwoFactorDevice> {
    return await apiFetch<TwoFactorDevice>(`/auth/2fa/devices/${encodeURIComponent(deviceId)}/confirm`, {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}

export async function removeTwoFactorDevice(deviceId: string): Promise<void> {
    await apiFetch<void>(`/auth/2fa/devices/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
    });
}

export async function regenerateTwoFactorBackupCodes(): Promise<TwoFactorBackupCodesResponse> {
    return await apiFetch<TwoFactorBackupCodesResponse>("/auth/2fa/backup-codes/regenerate", {
        method: "POST",
    });
}
