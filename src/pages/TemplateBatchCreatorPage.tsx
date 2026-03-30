import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Divider, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import AntBtn from "../components/AntBtn";
import {
    downloadCertificateBatchZipById,
    getTemplateById,
    listCertificateBatches,
    queueCertificateBatchJob,
    type CertificateBatchSummary,
} from "../templateApi";
import { appConfig } from "../appConfig";
import { useNotifications } from "../components/NotificationsProvider";
import type { Template } from "../TemplateEditor";

const DEFAULT_BULK_CERTIFICATE_COLUMNS = [
    "recipient.firstName",
    "recipient.lastName",
    "recipient.email",
    "certificate.uuid",
    "certificate.reference",
    "certificate.issued_on",
    "program.name",
    "program.code",
    "institution.domain",
];

function extractPlaceholderPaths(value: string): string[] {
    const out: string[] = [];
    const pattern = /\[([^\]]+)]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
        const path = String(match[1] ?? "").trim();
        if (path) out.push(path);
    }
    return out;
}

function collectTemplatePaths(node: unknown, out: Set<string>) {
    if (typeof node === "string") {
        for (const path of extractPlaceholderPaths(node)) out.add(path);
        return;
    }
    if (Array.isArray(node)) {
        for (const item of node) collectTemplatePaths(item, out);
        return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const varPath = String(record.var ?? "").trim();
    if (varPath) out.add(varPath);
    for (const value of Object.values(record)) {
        collectTemplatePaths(value, out);
    }
}

function setPathValue(root: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const next = current[key];
        if (!next || typeof next !== "object" || Array.isArray(next)) {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
}

function parseExcelCellValue(raw: unknown): unknown {
    if (raw === null || raw === undefined) return "";
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    const text = String(raw);
    const trimmed = text.trim();
    if (!trimmed) return "";
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return text;
        }
    }
    return text;
}

function toCertificatesFromRows(rows: Array<Record<string, unknown>>): unknown[] {
    const out: Array<Record<string, unknown>> = [];
    for (const row of rows) {
        const certificate: Record<string, unknown> = {};
        for (const [column, raw] of Object.entries(row)) {
            const path = column.trim();
            if (!path) continue;
            const value = parseExcelCellValue(raw);
            if (value === "") continue;
            setPathValue(certificate, path, value);
        }
        if (Object.keys(certificate).length > 0) out.push(certificate);
    }
    return out;
}

function sanitizeBase(name: string): string {
    return (name.trim() || "certificates").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function formatDate(value?: string | null): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function downloadBlob(fileName: string, blob: Blob) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
}

export default function TemplateBatchCreatorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notifications = useNotifications();
    const excelInputRef = useRef<HTMLInputElement | null>(null);

    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [template, setTemplate] = useState<Template | null>(null);
    const [templateName, setTemplateName] = useState<string>("Template");

    const [batchRows, setBatchRows] = useState<unknown[]>([]);
    const [batchJson, setBatchJson] = useState<string>("[]");
    const [queueing, setQueueing] = useState(false);

    const [jobs, setJobs] = useState<CertificateBatchSummary[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

    const templateColumns = useMemo(() => {
        if (!template) return DEFAULT_BULK_CERTIFICATE_COLUMNS;
        const paths = new Set<string>();
        collectTemplatePaths(template, paths);
        return Array.from(new Set([...DEFAULT_BULK_CERTIFICATE_COLUMNS, ...Array.from(paths)]));
    }, [template]);

    async function loadTemplate() {
        if (!id) return;
        setLoadingTemplate(true);
        try {
            const detail = await getTemplateById(id);
            setTemplate(detail.template);
            setTemplateName(detail.name || "Template");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load template", { title: "Batch Creator" });
        } finally {
            setLoadingTemplate(false);
        }
    }

    async function loadJobs(silent = false) {
        try {
            if (!silent) setLoadingJobs(true);
            const page = await listCertificateBatches({ page: 0, size: 20 });
            setJobs(page.items);
        } catch (err: any) {
            if (!silent) {
                notifications.error(err?.message || "Failed to load batches", { title: "Batch Creator" });
            }
        } finally {
            if (!silent) setLoadingJobs(false);
        }
    }

    useEffect(() => {
        void loadTemplate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        void loadJobs(false);
        const timer = window.setInterval(() => void loadJobs(true), 5000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleDownloadExcelTemplate() {
        try {
            const sample: Record<string, string> = {};
            const blank: Record<string, string> = {};
            for (const col of templateColumns) {
                sample[col] = "";
                blank[col] = "";
            }
            const sheet = XLSX.utils.json_to_sheet([sample, blank], { header: templateColumns, skipHeader: false });
            sheet["!cols"] = templateColumns.map((col) => ({ wch: Math.max(18, Math.min(42, col.length + 4)) }));
            const instructions = XLSX.utils.aoa_to_sheet([
                ["Bulk Certificate Generator - Excel Template"],
                ["Fill one row per certificate and keep the header names unchanged."],
                ["Nested JSON fields use dot notation, for example: recipient.firstName"],
            ]);
            instructions["!cols"] = [{ wch: 90 }];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
            XLSX.utils.book_append_sheet(workbook, sheet, "Certificates");
            XLSX.writeFile(workbook, `${sanitizeBase(templateName)}_bulk_certificate_template.xlsx`);
            notifications.success("Excel template downloaded");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to generate Excel template", { title: "Batch Creator" });
        }
    }

    async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const bytes = await file.arrayBuffer();
            const workbook = XLSX.read(bytes, { type: "array" });
            const sheet = workbook.Sheets["Certificates"] ?? workbook.Sheets[workbook.SheetNames[0]];
            if (!sheet) throw new Error("Workbook has no sheets");
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
            const certificates = toCertificatesFromRows(rows);
            if (!certificates.length) throw new Error("No certificate rows found");
            setBatchRows(certificates);
            setBatchJson(JSON.stringify(certificates, null, 2));
            notifications.success(`Loaded ${certificates.length} certificate rows`);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to parse Excel file", { title: "Batch Creator" });
        } finally {
            e.target.value = "";
        }
    }

    async function handleQueueBatch() {
        if (!template) return;
        let certificates: unknown[] = batchRows;
        if (!certificates.length) {
            try {
                const parsed = JSON.parse(batchJson || "[]");
                if (!Array.isArray(parsed)) throw new Error("Batch JSON must be an array");
                certificates = parsed;
            } catch (err: any) {
                notifications.error(err?.message || "Invalid JSON", { title: "Batch Creator" });
                return;
            }
        }
        if (!certificates.length) {
            notifications.warning("Add at least one certificate row", { title: "Batch Creator" });
            return;
        }
        try {
            setQueueing(true);
            const queued = await queueCertificateBatchJob({
                template,
                certificates,
                assetBaseUrl: appConfig.assetBaseUrl,
                fileName: sanitizeBase(templateName),
            });
            notifications.success(`Batch queued (${queued.id.slice(0, 8)})`);
            setBatchRows([]);
            setBatchJson("[]");
            await loadJobs(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to queue batch", { title: "Batch Creator" });
        } finally {
            setQueueing(false);
        }
    }

    async function handleDownloadBatch(job: CertificateBatchSummary) {
        try {
            setDownloadingJobId(job.id);
            const file = await downloadCertificateBatchZipById(job.id, job.zipFileName || job.requestedFileName || "certificates");
            downloadBlob(file.fileName, file.blob);
            notifications.success("Batch ZIP downloaded");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download ZIP", { title: "Batch Creator" });
        } finally {
            setDownloadingJobId(null);
        }
    }

    if (loadingTemplate) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography>Loading batch creator...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!id || !template) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>Template not found</Alert>
                <AntBtn onClick={() => navigate("/templates")}>Back to templates</AntBtn>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h5">Batch Certificate Creator</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Template: {templateName}
                        </Typography>
                    </Box>
                    <AntBtn onClick={() => navigate(`/templates/${id}/edit`)}>Back to editor</AntBtn>
                </Stack>

                <Divider />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <AntBtn onClick={handleDownloadExcelTemplate}>Download Excel Template</AntBtn>
                    <AntBtn onClick={() => excelInputRef.current?.click()}>Upload Excel</AntBtn>
                    <AntBtn antType="primary" onClick={() => void handleQueueBatch()} disabled={queueing}>
                        {queueing ? "Queueing..." : "Queue Batch Job"}
                    </AntBtn>
                </Stack>
                <Box
                    component="input"
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleExcelUpload}
                    sx={{ display: "none" }}
                />
                <Typography variant="caption" color="text.secondary">
                    Loaded rows: {batchRows.length}
                </Typography>

                <TextField
                    fullWidth
                    multiline
                    minRows={10}
                    label="Batch Data (JSON array)"
                    value={batchJson}
                    onChange={(e) => setBatchJson(e.target.value)}
                    helperText="Upload Excel or paste a JSON array of certificate data."
                />

                <Divider />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Batches</Typography>
                    <AntBtn antType="text" onClick={() => void loadJobs(false)} disabled={loadingJobs}>
                        {loadingJobs ? "Refreshing..." : "Refresh"}
                    </AntBtn>
                </Stack>

                {jobs.length === 0 ? (
                    <Typography color="text.secondary">No batch jobs yet.</Typography>
                ) : (
                    <Stack spacing={1}>
                        {jobs.map((job) => (
                            <Box key={job.id} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {job.templateName} · {job.status}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {job.processedCount}/{job.requestedCount} processed · {job.successCount} success · {job.failureCount} failed
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Created: {formatDate(job.createdAt)} · Completed: {formatDate(job.completedAt)}
                                        </Typography>
                                        {job.errorMessage && (
                                            <Typography variant="caption" color="error" sx={{ display: "block" }}>
                                                {job.errorMessage}
                                            </Typography>
                                        )}
                                    </Box>
                                    {(job.status === "COMPLETED" || job.status === "COMPLETED_WITH_ERRORS") && (
                                        <AntBtn
                                            onClick={() => void handleDownloadBatch(job)}
                                            disabled={!job.zipFileName || downloadingJobId === job.id}
                                        >
                                            {downloadingJobId === job.id ? "Downloading..." : "Download ZIP"}
                                        </AntBtn>
                                    )}
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
