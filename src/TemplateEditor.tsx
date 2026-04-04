// TemplateEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    Menu,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AntBtn from "./components/AntBtn";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import TableChartIcon from "@mui/icons-material/TableChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import TuneIcon from "@mui/icons-material/Tune";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import SaveIcon from "@mui/icons-material/Save";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FlipToFrontIcon from "@mui/icons-material/FlipToFront";
import FlipToBackIcon from "@mui/icons-material/FlipToBack";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalCenterIcon from "@mui/icons-material/AlignHorizontalCenter";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import AlignVerticalTopIcon from "@mui/icons-material/AlignVerticalTop";
import AlignVerticalCenterIcon from "@mui/icons-material/AlignVerticalCenter";
import AlignVerticalBottomIcon from "@mui/icons-material/AlignVerticalBottom";
import { Rnd, type RndDragCallback, type RndResizeCallback } from "react-rnd";
import { useConfirm } from "./components/ConfirmDialogProvider";
import { useNotifications } from "./components/NotificationsProvider";
import { convertTemplateToDesignDraft, type DesignCreateDraft } from "./designCatalog";
import { BlockRenderer, Inspector, resolveImageSrc } from "./components/template-editor/TemplateEditorBlocks";
import * as XLSX from "xlsx";

type Orientation = "portrait" | "landscape" | string;
type PaperKey =
    | "A0"
    | "A1"
    | "A2"
    | "A3"
    | "A4"
    | "A5"
    | "A6"
    | "LETTER"
    | "LEGAL"
    | "TABLOID"
    | "JUNIOR_LEGAL";

type PaperSizeDef = { key: PaperKey; label: string; wMm: number; hMm: number };

const PAPER_SIZES: Record<PaperKey, PaperSizeDef> = {
    A0: { key: "A0", label: "A0", wMm: 841, hMm: 1189 },
    A1: { key: "A1", label: "A1", wMm: 594, hMm: 841 },
    A2: { key: "A2", label: "A2", wMm: 420, hMm: 594 },
    A3: { key: "A3", label: "A3", wMm: 297, hMm: 420 },
    A4: { key: "A4", label: "A4", wMm: 210, hMm: 297 },
    A5: { key: "A5", label: "A5", wMm: 148, hMm: 210 },
    A6: { key: "A6", label: "A6", wMm: 105, hMm: 148 },
    LETTER: { key: "LETTER", label: "Letter (ANSI A)", wMm: 216, hMm: 279 },
    LEGAL: { key: "LEGAL", label: "Legal", wMm: 216, hMm: 356 },
    TABLOID: { key: "TABLOID", label: "Tabloid/Ledger (ANSI B)", wMm: 279, hMm: 432 },
    JUNIOR_LEGAL: { key: "JUNIOR_LEGAL", label: "Junior Legal", wMm: 127, hMm: 203 },
};

function normalizePaperKey(paperSize?: string): PaperKey {
    if (!paperSize) return "A4";
    const v = paperSize.trim().toUpperCase();
    if (/^A[0-6]$/.test(v)) return v as PaperKey;
    if (v === "LETTER" || v === "ANSI A") return "LETTER";
    if (v === "LEGAL") return "LEGAL";
    if (v === "TABLOID" || v === "LEDGER" || v === "ANSI B") return "TABLOID";
    if (v === "JUNIOR LEGAL" || v === "JUNIOR_LEGAL") return "JUNIOR_LEGAL";
    return "A4";
}

function normalizeOrientation(o?: Orientation): "portrait" | "landscape" {
    const v = String(o ?? "portrait").toLowerCase();
    return v === "landscape" ? "landscape" : "portrait";
}

function getAspectRatioMm(paperKey: PaperKey, orientation: "portrait" | "landscape"): number {
    const s = PAPER_SIZES[paperKey] ?? PAPER_SIZES.A4;
    return orientation === "portrait" ? s.wMm / s.hMm : s.hMm / s.wMm; // width/height
}

function clampNum(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

// ---------------- Template model types ----------------
export type Background = { url: string; type: "image" | "color" | "svg"; color?: string; svg?: string; placeholder?: unknown };
export type BlockType = "text" | "image" | "horizontal-line" | "list" | "table";
export type BaseBlockStyle = {
    top?: string;
    left?: string;
    width?: string;
    height?: string;
    borderStyle?: "none" | "solid" | "dashed" | "dotted" | string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: string;
    padding?: string;
};

export type TextBlockStyle = BaseBlockStyle & {
    color?: string;
    fontSize?: string;
    lineHeight?: string | number;
    fontStyle?: "normal" | "italic" | string;
    textAlign?: "left" | "center" | "right" | string;
    fontFamily?: string;
    fontWeight?: number | string;
    textDecoration?: "none" | "underline" | "line-through" | string;
};

export type LineBlockStyle = BaseBlockStyle & { backgroundColor?: string };
export type ImageBlockStyle = BaseBlockStyle;
export type ImageBlockValue =
    | string
    | {
          type?: "image" | "svg" | string;
          url?: string;
          svg?: string;
          src?: string;
      };
export type ListBlockStyle = TextBlockStyle & { listType?: "bullet" | "number" | string };
export type TableCellStyle = {
    color?: string;
    backgroundColor?: string;
    fontWeight?: number | string;
    fontStyle?: "normal" | "italic" | string;
    textAlign?: "left" | "center" | "right" | string;
    textDecoration?: "none" | "underline" | "line-through" | string;
    borderStyle?: "none" | "solid" | "dashed" | "dotted" | string;
    borderColor?: string;
    borderWidth?: string;
    padding?: string;
};
export type TableRangeStyleRule = {
    start: number;
    end?: number;
    style: TableCellStyle;
};
export type TableCellStyleRule = {
    row: number;
    col: number;
    style: TableCellStyle;
};
export type TableBlockStyle = TextBlockStyle & {
    showHeaderRow?: boolean;
    columnStyles?: TableRangeStyleRule[];
    rowStyles?: TableRangeStyleRule[];
    cellStyles?: TableCellStyleRule[];
};

export type TextBlock = {
    id: string;
    type: "text";
    style: TextBlockStyle;
    value: string;
    autoScale?: boolean;
    locked?: boolean;
};

export type ImageBlock = { id: string; type: "image"; style: ImageBlockStyle; value: ImageBlockValue; locked?: boolean };
export type HorizontalLineBlock = { id: string; type: "horizontal-line"; style: LineBlockStyle; locked?: boolean };
export type ListBlock = { id: string; type: "list"; style: ListBlockStyle; value: string; var?: string; locked?: boolean };
export type TableBlock = { id: string; type: "table"; style: TableBlockStyle; value: string; var?: string; locked?: boolean };
export type Block = TextBlock | ImageBlock | HorizontalLineBlock | ListBlock | TableBlock;

export type Template = {
    name: string;
    pages?: TemplatePage[];
    // Legacy single-page fields (kept for backward compatibility)
    background?: Background;
    blocks?: Block[];
    paperSize?: string;
    orientation?: Orientation;
};

export type TemplatePage = {
    id: string;
    name: string;
    background: Background;
    blocks: Block[];
    paperSize: string;
    orientation: Orientation;
};

export type TemplateEditorProps = {
    initialTemplate: Template;
    assetBaseUrl?: string;
    /** Start in preview mode? */
    defaultPreview?: boolean;
    onSaveTemplate?: (template: Template) => void | Promise<void>;
    saveButtonLabel?: string;
    onRenderTemplate?: (template: Template, data: unknown) => void | Promise<void>;
    renderButtonLabel?: string;
    onBatchRenderCertificates?: (template: Template, data: unknown[]) => void | Promise<void>;
    batchRenderButtonLabel?: string;
    onStoreCertificate?: (template: Template, data: unknown) => void | Promise<void>;
    storeCertificateLabel?: string;
    onStoreCertificateBatch?: (template: Template, data: unknown[]) => void | Promise<void>;
    storeCertificateBatchLabel?: string;
    onQueueCertificateBatchJob?: (template: Template, data: unknown[]) => Promise<CertificateBatchJobSummary>;
    queueCertificateBatchJobLabel?: string;
    onListCertificateBatchJobs?: () => Promise<CertificateBatchJobSummary[]>;
    onDownloadCertificateBatchZip?: (batchId: string, fallbackName?: string) => Promise<void>;
    onDownloadRenderedFo?: (template: Template, data: unknown) => void | Promise<void>;
    downloadRenderedFoLabel?: string;
    onDownloadTemplate?: (template: Template) => void | Promise<void>;
    downloadButtonLabel?: string;
    onOpenBatchCreator?: () => void;
    openBatchCreatorLabel?: string;
    defaultRenderDataJson?: string;
    onConvertToDesign?: (design: DesignCreateDraft) => void | Promise<void>;
    convertToDesignLabel?: string;
    onBackToDesign?: () => void;
    backToDesignLabel?: string;
    onBackToTemplates?: () => void;
    onDeleteTemplate?: () => void | Promise<void>;
    deleteTemplateLabel?: string;
    deletingTemplate?: boolean;
    sessionStorageKey?: string;
    restoreLocalSession?: boolean;
    onPersistSession?: (template: Template) => void | Promise<void>;
    persistDebounceMs?: number;
    appSidebarHidden?: boolean;
    onToggleAppSidebar?: () => void;
};

type Size = { w: number; h: number };
type AlignMode = "left" | "h-center" | "right" | "top" | "v-center" | "bottom";
type RenderFormField = { id: string; path: string; value: string };
type CertificateBatchJobFailure = { rowIndex: number; fileName?: string | null; message: string };
type CertificateBatchJobSummary = {
    id: string;
    templateName: string;
    requestedFileName: string;
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
    requestedCount: number;
    processedCount: number;
    successCount: number;
    failureCount: number;
    zipFileName?: string | null;
    errorMessage?: string | null;
    createdAt: string;
    completedAt?: string | null;
    failures?: CertificateBatchJobFailure[];
};

// ---------------- Helpers ----------------
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}
function pctToPx(pct: string | undefined, totalPx: number): number {
    if (!pct) return 0;
    const v = parseFloat(String(pct).replace("%", ""));
    if (Number.isNaN(v)) return 0;
    return (v / 100) * totalPx;
}
function pxToPct(px: number, totalPx: number): string {
    if (!totalPx) return "0%";
    return `${(px / totalPx) * 100}%`;
}
function makeId(): string {
    return `blk_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseListValue(raw: string): string[] {
    return String(raw ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
function parseTableValue(raw: string): { columns: string[]; rows: Array<Record<string, string>> } {
    const lines = String(raw ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (!lines.length) return { columns: [], rows: [] };

    const columns = lines[0].split("|").map((s) => s.trim());
    const rows = lines.slice(1).map((line) => {
        const parts = line.split("|").map((s) => s.trim());
        const row: Record<string, string> = {};
        for (let i = 0; i < columns.length; i++) {
            row[columns[i]] = parts[i] ?? "";
        }
        return row;
    });
    return { columns, rows };
}
const TEMPLATE_PLACEHOLDER_PATTERN = /\[([^\]]+)]/g;
const BASE64_IMAGE_PREFIX_PATTERN = /^(data:image\/[a-zA-Z0-9.+-]+;base64,).+/i;

function extractPlaceholderPaths(value: string): Array<{ path: string; exact: boolean }> {
    const raw = String(value ?? "");
    const trimmed = raw.trim();
    const exact = trimmed.match(/^\[([^\]]+)]$/);
    if (exact?.[1]) {
        return [{ path: exact[1].trim(), exact: true }];
    }

    const out: Array<{ path: string; exact: boolean }> = [];
    TEMPLATE_PLACEHOLDER_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TEMPLATE_PLACEHOLDER_PATTERN.exec(raw)) !== null) {
        const path = String(match[1] ?? "").trim();
        if (path) {
            out.push({ path, exact: false });
        }
    }
    return out;
}

function collectValuePlaceholders(
    value: unknown,
    fallbackValue: unknown,
    out: Array<{ path: string; defaultValue: unknown }>
) {
    if (typeof value === "string") {
        for (const found of extractPlaceholderPaths(value)) {
            out.push({
                path: found.path,
                defaultValue: found.exact && fallbackValue !== undefined ? compactRenderDataDefault(fallbackValue) : "",
            });
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectValuePlaceholders(item, fallbackValue, out);
        }
        return;
    }

    if (isPlainObject(value)) {
        const objectFallback = Object.prototype.hasOwnProperty.call(value, "placeholder")
            ? (value as Record<string, unknown>).placeholder
            : fallbackValue;
        for (const [key, item] of Object.entries(value)) {
            if (key === "placeholder") continue;
            collectValuePlaceholders(item, objectFallback, out);
        }
    }
}

function compactRenderDataDefault(value: unknown): unknown {
    if (typeof value === "string") {
        const match = value.match(BASE64_IMAGE_PREFIX_PATTERN);
        return match ? match[1] : value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => compactRenderDataDefault(item));
    }
    if (isPlainObject(value)) {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            out[key] = compactRenderDataDefault(item);
        }
        return out;
    }
    return value;
}

function collectVarSpecs(template: Template): Array<{ path: string; defaultValue: unknown }> {
    const out: Array<{ path: string; defaultValue: unknown }> = [];
    const pages = template.pages ?? [];
    for (const page of pages) {
        collectValuePlaceholders(page.background, page.background?.placeholder, out);
        for (const raw of page.blocks ?? []) {
            const b = normalizeBlock(raw as Block);
            collectValuePlaceholders(b, (b as any).placeholder, out);
            const varPath = String((b as any).var ?? "").trim();
            if (!varPath) continue;
            if (b.type === "list") {
                out.push({ path: varPath, defaultValue: parseListValue((b as any).value ?? "") });
            } else if (b.type === "table") {
                out.push({ path: varPath, defaultValue: parseTableValue((b as any).value ?? "") });
            }
        }
    }
    return out;
}
function shouldHydrate(currentValue: unknown): boolean {
    if (currentValue === undefined || currentValue === null) return true;
    if (Array.isArray(currentValue) && currentValue.length === 0) return true;
    if (isPlainObject(currentValue)) {
        const cols = (currentValue as any).columns;
        const rows = (currentValue as any).rows;
        if (Array.isArray(cols) && Array.isArray(rows) && cols.length === 0 && rows.length === 0) {
            return true;
        }
    }
    return false;
}
function ensurePath(root: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const next = cur[key];
        if (!isPlainObject(next)) {
            cur[key] = {};
        }
        cur = cur[key] as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1];
    if (shouldHydrate(cur[leaf])) {
        cur[leaf] = value;
    }
}
function setPathValue(root: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const next = cur[key];
        if (!isPlainObject(next)) {
            cur[key] = {};
        }
        cur = cur[key] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
}
function flattenRenderDataToFields(
    value: unknown,
    prefix = "",
    out: RenderFormField[] = []
): RenderFormField[] {
    if (isPlainObject(value)) {
        for (const [key, child] of Object.entries(value)) {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            flattenRenderDataToFields(child, nextPrefix, out);
        }
        return out;
    }
    if (!prefix) {
        return out;
    }
    out.push({
        id: makeId(),
        path: prefix,
        value: typeof value === "string" ? value : JSON.stringify(value),
    });
    return out;
}

const DEFAULT_BULK_CERTIFICATE_COLUMNS = [
    "recipient.firstName",
    "recipient.lastName",
    "recipient.email",
    "certificate.uuid",
    "certificate.reference",
    "certificate.issued_on",
    "certificate.expires_on",
    "certificate.permanent",
    "program.name",
    "program.code",
    "institution.domain",
];

function toSpreadsheetCellValue(value: unknown): string | number | boolean {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    if (value === null || value === undefined) {
        return "";
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function sanitizeDownloadBaseName(name: string): string {
    return (name.trim() || "bulk_certificates").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function formatTimestamp(value?: string | null): string {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
}
function parseRenderFormValue(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    try {
        return JSON.parse(trimmed);
    } catch {
        return raw;
    }
}
function buildRenderDataFromFields(fields: RenderFormField[]): Record<string, unknown> {
    const root: Record<string, unknown> = {};
    for (const field of fields) {
        const path = field.path.trim();
        if (!path) continue;
        setPathValue(root, path, parseRenderFormValue(field.value));
    }
    return root;
}
function parseRenderFieldsFromJson(rawJson: string): RenderFormField[] {
    try {
        const parsed = JSON.parse(rawJson || "{}");
        if (!isPlainObject(parsed)) {
            return [{ id: makeId(), path: "", value: "" }];
        }
        const fields = flattenRenderDataToFields(parsed);
        return fields.length ? fields : [{ id: makeId(), path: "", value: "" }];
    } catch {
        return [{ id: makeId(), path: "", value: "" }];
    }
}
function injectVarDefaultsIntoRenderDataJson(rawJson: string, template: Template): string {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawJson || "{}");
    } catch {
        parsed = {};
    }
    const root = isPlainObject(parsed) ? (parsed as Record<string, unknown>) : {};
    const specs = collectVarSpecs(template);
    for (const spec of specs) {
        ensurePath(root, spec.path, spec.defaultValue);
    }
    return JSON.stringify(root, null, 2);
}
function normalizeBlock(block: Block): Block {
    const b = deepClone(block);

    b.style.top ??= "10%";
    b.style.left ??= "10%";
    b.style.width ??= b.type === "horizontal-line" ? "30%" : "25%";
    b.style.height ??= b.type === "horizontal-line" ? "0.6%" : "10%";

    if (b.type === "text") {
        const s = b.style as TextBlockStyle;
        s.color ??= "#333333";
        s.fontFamily ??= "serif";
        s.fontSize ??= "24em";
        s.lineHeight ??= "1.1";
        s.fontStyle ??= "normal";
        s.textAlign ??= "left";
        s.fontWeight ??= 400;
        s.textDecoration ??= "none";
    }
    if (b.type === "list") {
        const s = b.style as ListBlockStyle;
        s.color ??= "#333333";
        s.fontFamily ??= "serif";
        s.fontSize ??= "20em";
        s.lineHeight ??= "1.2";
        s.fontStyle ??= "normal";
        s.textAlign ??= "left";
        s.fontWeight ??= 400;
        s.textDecoration ??= "none";
        s.listType ??= "bullet";
        (b as ListBlock).var ??= "";
        (b as ListBlock).value ??= "First item\nSecond item\nThird item";
    }
    if (b.type === "table") {
        const s = b.style as TableBlockStyle;
        s.color ??= "#333333";
        s.fontFamily ??= "serif";
        s.fontSize ??= "18em";
        s.lineHeight ??= "1.2";
        s.fontStyle ??= "normal";
        s.textAlign ??= "left";
        s.fontWeight ??= 400;
        s.textDecoration ??= "none";
        s.showHeaderRow ??= true;
        s.columnStyles ??= [];
        s.rowStyles ??= [];
        s.cellStyles ??= [];
        (b as TableBlock).var ??= "";
        (b as TableBlock).value ??=
            "Header 1|Header 2|Header 3\nRow 1 Col 1|Row 1 Col 2|Row 1 Col 3";
    }
    if (b.type === "horizontal-line") {
        const s = b.style as LineBlockStyle;
        s.backgroundColor ??= "#333333";
        s.height ??= "0.6%";
    }

    return b;
}
function normalizeTemplate(input: Template): Template {
    const t = deepClone(input);
    const normalizedPages = (t.pages ?? []).map((raw, idx) => normalizePage(raw as TemplatePage, idx));
    if (!normalizedPages.length) {
        normalizedPages.push(
            normalizePage(
                {
                    id: "front",
                    name: "Front",
                    background: (t.background ?? { type: "color", url: "", color: "#ffffff", svg: "" }) as Background,
                    blocks: (t.blocks ?? []) as Block[],
                    paperSize: t.paperSize ?? "A4",
                    orientation: t.orientation ?? "portrait",
                },
                0
            )
        );
    }
    t.pages = normalizedPages;
    t.name ??= "";
    return t;
}

function normalizePage(raw: TemplatePage, idx: number): TemplatePage {
    const page = deepClone(raw ?? ({} as TemplatePage));
    page.id = String(page.id ?? "").trim() || `page_${idx + 1}`;
    page.name = String(page.name ?? "").trim() || (idx === 0 ? "Front" : idx === 1 ? "Back" : `Page ${idx + 1}`);
    page.blocks = (page.blocks ?? []).map((b) => {
        if (!(b as any).id) (b as any).id = makeId();
        return normalizeBlock(b as Block);
    });
    if (!page.background) {
        page.background = { type: "color", url: "", color: "#ffffff", svg: "" };
    } else {
        const bg = page.background as Background;
        bg.url ??= "";
        bg.color ??= "#ffffff";
        bg.svg ??= "";
        if (!bg.type) {
            if ((bg.svg ?? "").trim()) bg.type = "svg";
            else if ((bg.url ?? "").trim()) bg.type = "image";
            else bg.type = "color";
        }
    }
    page.paperSize ??= "A4";
    page.orientation ??= "portrait";
    return page;
}
function templatesEqual(a: Template, b: Template): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------- Drag payload ----------------
type PalettePayload = { type: BlockType };
const DND_MIME = "application/x-template-block";

const DEFAULT_NEW_SIZES: Record<BlockType, { wPct: number; hPct: number }> = {
    text: { wPct: 35, hPct: 10 },
    image: { wPct: 20, hPct: 20 },
    "horizontal-line": { wPct: 30, hPct: 0.6 },
    list: { wPct: 32, hPct: 20 },
    table: { wPct: 50, hPct: 24 },
};
const PALETTE_WIDTH_PX = 320;
const PALETTE_WIDTH_COMPACT_PX = 248;

// ---------------- Component ----------------
export default function TemplateEditor({
                                           initialTemplate,
                                           assetBaseUrl = "",
                                           defaultPreview = false,
                                           onSaveTemplate,
                                           saveButtonLabel = "Save",
                                           onRenderTemplate,
                                           renderButtonLabel = "Render PDF",
                                           onBatchRenderCertificates,
                                           batchRenderButtonLabel = "Generate Batch ZIP",
                                           onStoreCertificate,
                                           storeCertificateLabel = "Generate and Store",
                                           onStoreCertificateBatch,
                                           storeCertificateBatchLabel = "Store Batch",
                                           onQueueCertificateBatchJob,
                                           queueCertificateBatchJobLabel = "Queue Batch Job",
                                           onListCertificateBatchJobs,
                                           onDownloadCertificateBatchZip,
                                           onDownloadRenderedFo,
                                           downloadRenderedFoLabel = "Download Rendered FO",
                                           onDownloadTemplate,
                                           downloadButtonLabel = "Download Template",
                                           onOpenBatchCreator,
                                           openBatchCreatorLabel = "Batch Creator",
                                           defaultRenderDataJson = "{}",
                                           onConvertToDesign,
                                           convertToDesignLabel = "Convert to Design",
                                           onBackToDesign,
                                           backToDesignLabel = "Back to design",
                                           onBackToTemplates,
                                           onDeleteTemplate,
                                           deleteTemplateLabel = "Delete Template",
                                           deletingTemplate = false,
                                           sessionStorageKey,
                                           restoreLocalSession = true,
                                           onPersistSession,
                                           persistDebounceMs = 1200,
                                           appSidebarHidden = false,
                                           onToggleAppSidebar,
                                       }: TemplateEditorProps) {
    const theme = useTheme();
    const isOverlayInspector = useMediaQuery(theme.breakpoints.down("md"));
    const isCompactLayout = useMediaQuery(theme.breakpoints.down("lg"));
    const isDark = theme.palette.mode === "dark";
    const inspectorWidthPx = isCompactLayout ? PALETTE_WIDTH_COMPACT_PX : PALETTE_WIDTH_PX;
    const compactUiFontSize = isCompactLayout ? "0.82rem" : "0.92rem";
    const toolbarBorderColor = alpha(theme.palette.text.primary, isDark ? 0.34 : 0.12);
    const toolbarBgColor = alpha(theme.palette.background.paper, isDark ? 0.9 : 0.92);
    const checkerColor = alpha(theme.palette.text.primary, isDark ? 0.14 : 0.06);
    const canvasBorderColor = alpha(theme.palette.text.primary, isDark ? 0.5 : 0.2);
    const canvasShadowColor = alpha("#000000", isDark ? 0.55 : 0.15);
    const gridLineColor = alpha(theme.palette.primary.main, isDark ? 0.28 : 0.16);
    const guideLabelBg = alpha(theme.palette.background.paper, isDark ? 0.9 : 0.8);
    const hintBg = alpha(theme.palette.background.paper, isDark ? 0.88 : 0.75);
    const hintBorder = `1px dashed ${alpha(theme.palette.text.primary, isDark ? 0.42 : 0.25)}`;
    const selectedBorderColor = theme.palette.primary.main;
    const selectedGlowColor = alpha(theme.palette.primary.main, isDark ? 0.3 : 0.15);
    const selectedFillColor = alpha(theme.palette.primary.main, isDark ? 0.14 : 0.04);
    const confirm = useConfirm();
    const notifications = useNotifications();
    const [template, setTemplate] = useState<Template>(() => normalizeTemplate(initialTemplate));

    // ✅ Preview toggle
    const [previewMode, setPreviewMode] = useState<boolean>(defaultPreview);
    const [toolbarMinimized, setToolbarMinimized] = useState<boolean>(false);
    const [gridEnabled, setGridEnabled] = useState<boolean>(false);
    const [centerGuidesEnabled, setCenterGuidesEnabled] = useState<boolean>(false);
    const [zoomPct, setZoomPct] = useState<number>(isCompactLayout ? 90 : 100);
    const gridSizePx = 20;

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingExternal, setSavingExternal] = useState<boolean>(false);
    const [renderingExternal, setRenderingExternal] = useState<boolean>(false);
    const [batchRenderingExternal, setBatchRenderingExternal] = useState<boolean>(false);
    const [storingCertificateExternal, setStoringCertificateExternal] = useState<boolean>(false);
    const [storingCertificateBatchExternal, setStoringCertificateBatchExternal] = useState<boolean>(false);
    const [queueingBatchJobExternal, setQueueingBatchJobExternal] = useState<boolean>(false);
    const [downloadingRenderedFoExternal, setDownloadingRenderedFoExternal] = useState<boolean>(false);
    const [downloadingExternal, setDownloadingExternal] = useState<boolean>(false);
    const [downloadingBulkTemplateExternal, setDownloadingBulkTemplateExternal] = useState<boolean>(false);
    const [batchJobs, setBatchJobs] = useState<CertificateBatchJobSummary[]>([]);
    const [loadingBatchJobs, setLoadingBatchJobs] = useState<boolean>(false);
    const [downloadingBatchJobId, setDownloadingBatchJobId] = useState<string | null>(null);
    const [convertingDesign, setConvertingDesign] = useState<boolean>(false);
    const [renderDataJson, setRenderDataJson] = useState<string>(defaultRenderDataJson);
    const [renderDataMode, setRenderDataMode] = useState<"form" | "json">("form");
    const [renderDataFields, setRenderDataFields] = useState<RenderFormField[]>(() => parseRenderFieldsFromJson(defaultRenderDataJson));
    const [renderDialogOpen, setRenderDialogOpen] = useState<boolean>(false);
    const [renderDialogError, setRenderDialogError] = useState<string | null>(null);
    const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
    const importInputRef = useRef<HTMLInputElement | null>(null);
    const batchExcelInputRef = useRef<HTMLInputElement | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        canvasX: number;
        canvasY: number;
        targetBlockId: string | null;
    } | null>(null);
    const undoStackRef = useRef<Template[]>([]);
    const redoStackRef = useRef<Template[]>([]);
    const prevTemplateRef = useRef<Template>(deepClone(template));
    const suppressHistoryRef = useRef<boolean>(false);
    const skipFirstPersistRef = useRef<boolean>(true);
    const [historyTick, setHistoryTick] = useState(0);
    const canUndo = useMemo(() => undoStackRef.current.length > 0, [historyTick]);
    const canRedo = useMemo(() => redoStackRef.current.length > 0, [historyTick]);
    const [activePageId, setActivePageId] = useState<string>("");

    const pages = template.pages ?? [];
    const activePageIndex = useMemo(() => {
        if (!pages.length) return -1;
        const byId = activePageId ? pages.findIndex((p) => p.id === activePageId) : -1;
        return byId >= 0 ? byId : 0;
    }, [pages, activePageId]);
    const activePage = activePageIndex >= 0 ? pages[activePageIndex] : null;

    useEffect(() => {
        if (!pages.length) return;
        if (!activePageId || !pages.some((p) => p.id === activePageId)) {
            setActivePageId(pages[0].id);
        }
    }, [pages, activePageId]);

    useEffect(() => {
        if (!isOverlayInspector) return;
        if (!selectedIds.length) return;
        setInspectorOpen(true);
    }, [isOverlayInspector, selectedIds.length]);

    useEffect(() => {
        if (!isCompactLayout) return;
        setZoomPct((prev) => (prev > 90 ? 90 : prev));
    }, [isCompactLayout]);

    useEffect(() => {
        if (!renderDialogOpen || !onListCertificateBatchJobs) return;
        void refreshCertificateBatchJobs(false);
        const timer = window.setInterval(() => {
            void refreshCertificateBatchJobs(true);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [renderDialogOpen, onListCertificateBatchJobs]);

    function updateActivePage(mutator: (page: TemplatePage) => void) {
        setTemplate((prev) => {
            const next = deepClone(prev);
            if (!next.pages || !next.pages.length) return next;
            const idx = next.pages.findIndex((p) => p.id === activePageId);
            const safeIdx = idx >= 0 ? idx : 0;
            mutator(next.pages[safeIdx]);
            return next;
        });
    }

    const primarySelectedId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;

    const selectedBlock = useMemo(
        () => activePage?.blocks.find((b) => b.id === primarySelectedId) ?? null,
        [activePage, primarySelectedId]
    );

    const paperKey = normalizePaperKey(activePage?.paperSize);
    const orientation = normalizeOrientation(activePage?.orientation);
    const aspectRatio = getAspectRatioMm(paperKey, orientation);

    const canvasOuterRef = useRef<HTMLDivElement | null>(null);
    const canvasInnerRef = useRef<HTMLDivElement | null>(null);

    const [canvasBaseWidth, setCanvasBaseWidth] = useState<number>(900);
    const [canvasSize, setCanvasSize] = useState<Size>({ w: 900, h: 900 / aspectRatio });
    const renderDataForPreview = useMemo(() => {
        try {
            if (renderDataMode === "form") {
                return buildRenderDataFromFields(renderDataFields);
            }
            return JSON.parse(renderDataJson || "{}");
        } catch {
            return null;
        }
    }, [renderDataFields, renderDataJson, renderDataMode]);
    const centerGridOffsetX = useMemo(() => {
        const mod = (canvasSize.w / 2) % gridSizePx;
        return Number.isFinite(mod) ? mod : 0;
    }, [canvasSize.w]);
    const centerGridOffsetY = useMemo(() => {
        const mod = (canvasSize.h / 2) % gridSizePx;
        return Number.isFinite(mod) ? mod : 0;
    }, [canvasSize.h]);

    // measure outer width
    useEffect(() => {
        const el = canvasOuterRef.current;
        if (!el) return;

        const ro = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            setCanvasBaseWidth(Math.max(rect.width, 320));
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const zoom = zoomPct / 100;
        const w = canvasBaseWidth * zoom;
        const h = w / aspectRatio;
        setCanvasSize({ w, h });
    }, [canvasBaseWidth, aspectRatio, zoomPct]);
    const viewportTextScale = useMemo(() => clampNum(canvasSize.w / 900, 0.45, 1), [canvasSize.w]);

    const bgUrl = useMemo(() => {
        const bg = activePage?.background as Background | undefined;
        if (!bg) return null;
        if (bg.type === "svg" && (bg.svg ?? "").trim()) {
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bg.svg ?? "")}`;
        }
        if (bg.type === "image") {
            return resolveImageSrc(bg.url, assetBaseUrl) || null;
        }
        return null;
    }, [activePage, assetBaseUrl]);
    const bgType = (activePage?.background?.type ?? "color") as Background["type"];
    const bgCssImage = useMemo(() => {
        if (!bgUrl) return "none";
        return `url(${JSON.stringify(bgUrl)})`;
    }, [bgUrl]);

    function updateBlock(blockId: string, patch: Partial<Block>) {
        updateActivePage((page) => {
            page.blocks = page.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b));
        });
    }

    function updateBlockStyle(blockId: string, patch: Partial<BaseBlockStyle & Record<string, unknown>>) {
        updateActivePage((page) => {
            page.blocks = page.blocks.map((b) =>
                b.id === blockId ? ({ ...b, style: { ...(b.style ?? {}), ...patch } } as Block) : b
            );
        });
    }

    function toggleLock(blockId: string) {
        const b = activePage?.blocks.find((x) => x.id === blockId);
        if (!b) return;
        updateBlock(blockId, { locked: !Boolean((b as any).locked) } as Partial<Block>);
    }

    async function copyJson() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
            notifications.success("Template JSON copied");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to copy template JSON", { title: "Clipboard" });
        }
    }

    async function deleteSelected() {
        if (!selectedIds.length) return;
        const ok = await confirm({
            title: "Delete Selected Blocks",
            message: `Delete ${selectedIds.length} selected item${selectedIds.length > 1 ? "s" : ""}?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            destructive: true,
        });
        if (!ok) return;
        updateActivePage((page) => {
            page.blocks = page.blocks.filter((b) => !selectedIds.includes(b.id));
        });
        setSelectedIds([]);
        setEditingId(null);
    }

    function duplicateSelected() {
        if (!selectedIds.length || previewMode) return;
        updateActivePage((page) => {
            const selectedSet = new Set(selectedIds);
            const toDuplicate = page.blocks.filter((b) => selectedSet.has(b.id)).map(normalizeBlock);
            if (!toDuplicate.length) return;

            const duplicates = toDuplicate.map((b) => {
                const top = pctToPx(b.style.top, canvasSize.h);
                const left = pctToPx(b.style.left, canvasSize.w);
                const width = pctToPx(b.style.width, canvasSize.w);
                const height = pctToPx(b.style.height, canvasSize.h);
                const offsetX = Math.min(left + 12, Math.max(canvasSize.w - width, 0));
                const offsetY = Math.min(top + 12, Math.max(canvasSize.h - height, 0));

                return {
                    ...b,
                    id: makeId(),
                    style: {
                        ...(b.style ?? {}),
                        left: pxToPct(offsetX, canvasSize.w),
                        top: pxToPct(offsetY, canvasSize.h),
                    },
                    locked: false,
                } as Block;
            });

            page.blocks = [...page.blocks, ...duplicates];
        });
    }

    function setSelectedLocked(nextLocked: boolean) {
        if (!selectedIds.length || previewMode) return;
        updateActivePage((page) => {
            page.blocks = page.blocks.map((b) => (selectedIds.includes(b.id) ? ({ ...b, locked: nextLocked } as Block) : b));
        });
    }

    function createBlockAt(type: BlockType, x: number, y: number): Block {
        const { wPct, hPct } = DEFAULT_NEW_SIZES[type];
        const wPx = (wPct / 100) * canvasSize.w;
        const hPx = (hPct / 100) * canvasSize.h;
        const leftPx = clamp(x - wPx / 2, 0, Math.max(canvasSize.w - wPx, 0));
        const topPx = clamp(y - hPx / 2, 0, Math.max(canvasSize.h - hPx, 0));

        const baseStyle: BaseBlockStyle = {
            left: pxToPct(leftPx, canvasSize.w),
            top: pxToPct(topPx, canvasSize.h),
            width: `${wPct}%`,
            height: `${hPct}%`,
        };

        const id = makeId();
        if (type === "text") {
            return normalizeBlock({
                id,
                type: "text",
                value: "Double-click to edit",
                autoScale: false,
                locked: false,
                style: {
                    ...baseStyle,
                    color: "#333333",
                    fontFamily: "serif",
                    fontSize: "24em",
                    lineHeight: "1.1",
                    fontWeight: 400,
                    fontStyle: "normal",
                    textAlign: "left",
                    textDecoration: "none",
                },
            });
        }
        if (type === "image") {
            return normalizeBlock({
                id,
                type: "image",
                value: "",
                locked: false,
                style: { ...baseStyle },
            });
        }
        if (type === "list") {
            return normalizeBlock({
                id,
                type: "list",
                value: "First item\nSecond item\nThird item",
                var: "",
                locked: false,
                style: {
                    ...baseStyle,
                    color: "#333333",
                    fontFamily: "serif",
                    fontSize: "20em",
                    lineHeight: "1.2",
                    fontWeight: 400,
                    fontStyle: "normal",
                    textAlign: "left",
                    textDecoration: "none",
                    listType: "bullet",
                },
            });
        }
        if (type === "table") {
            return normalizeBlock({
                id,
                type: "table",
                value: "Header 1|Header 2|Header 3\nRow 1 Col 1|Row 1 Col 2|Row 1 Col 3",
                var: "",
                locked: false,
                style: {
                    ...baseStyle,
                    color: "#333333",
                    fontFamily: "serif",
                    fontSize: "18em",
                    lineHeight: "1.2",
                    fontWeight: 400,
                    fontStyle: "normal",
                    textAlign: "left",
                    textDecoration: "none",
                    showHeaderRow: true,
                    columnStyles: [],
                    rowStyles: [],
                    cellStyles: [],
                },
            });
        }
        return normalizeBlock({
            id,
            type: "horizontal-line",
            locked: false,
            style: { ...baseStyle, backgroundColor: "#333333" },
        });
    }

    function addBlockAt(type: BlockType, x: number, y: number) {
        if (previewMode) return;
        const block = createBlockAt(type, x, y);
        updateActivePage((page) => {
            page.blocks = [...page.blocks, block];
        });
        setSelectedIds([block.id]);
        setEditingId(type === "text" ? block.id : null);
    }

    function addBlockCentered(type: BlockType) {
        addBlockAt(type, canvasSize.w / 2, canvasSize.h / 2);
    }

    function addBackPageIfMissing() {
        setTemplate((prev) => {
            const next = deepClone(prev);
            const currentPages = next.pages ?? [];
            if (!currentPages.length) return next;
            if (currentPages.some((p) => p.name.toLowerCase() === "back")) return next;
            const first = normalizePage(currentPages[0], 0);
            const back = normalizePage(
                {
                    id: "back",
                    name: "Back",
                    background: deepClone(first.background),
                    blocks: [],
                    paperSize: first.paperSize,
                    orientation: first.orientation,
                },
                currentPages.length
            );
            next.pages = [...currentPages, back];
            return next;
        });
    }

    function openContextMenu(e: React.MouseEvent, targetBlockId: string | null) {
        if (previewMode) return;
        const inner = canvasInnerRef.current;
        if (!inner) return;
        const rect = inner.getBoundingClientRect();
        const canvasX = clamp(e.clientX - rect.left, 0, rect.width);
        const canvasY = clamp(e.clientY - rect.top, 0, rect.height);
        setContextMenu({
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
            canvasX,
            canvasY,
            targetBlockId,
        });
    }

    function closeContextMenu() {
        setContextMenu(null);
    }

    async function handleSaveAction() {
        if (!onSaveTemplate) {
            saveTemplateJson();
            return;
        }
        try {
            setSavingExternal(true);
            await onSaveTemplate(deepClone(template));
        } finally {
            setSavingExternal(false);
        }
    }

    async function handleRenderAction() {
        if (!onRenderTemplate) return;
        const parsedData = parseRenderDialogData();
        if (parsedData === undefined) return;
        try {
            setRenderDialogError(null);
            setRenderingExternal(true);
            await onRenderTemplate(deepClone(template), parsedData);
            setRenderDialogOpen(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to render template", { title: "Render" });
        } finally {
            setRenderingExternal(false);
        }
    }

    async function handleDownloadRenderedFoAction() {
        if (!onDownloadRenderedFo) return;
        const parsedData = parseRenderDialogData();
        if (parsedData === undefined) return;
        try {
            setRenderDialogError(null);
            setDownloadingRenderedFoExternal(true);
            await onDownloadRenderedFo(deepClone(template), parsedData);
            setRenderDialogOpen(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download rendered FO", { title: "Render" });
        } finally {
            setDownloadingRenderedFoExternal(false);
        }
    }

    async function handleBatchRenderAction() {
        if (!onBatchRenderCertificates) return;
        const parsedData = parseRenderDialogData();
        if (parsedData === undefined) return;
        if (!Array.isArray(parsedData)) {
            setRenderDialogError("Batch generation requires a JSON array of certificate data.");
            notifications.warning("Batch generation requires a JSON array", { title: "Certificates" });
            return;
        }
        try {
            setRenderDialogError(null);
            setBatchRenderingExternal(true);
            await onBatchRenderCertificates(deepClone(template), parsedData);
            setRenderDialogOpen(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to generate certificate batch", { title: "Certificates" });
        } finally {
            setBatchRenderingExternal(false);
        }
    }

    async function handleStoreCertificateAction() {
        if (!onStoreCertificate) return;
        const parsedData = parseRenderDialogData();
        if (parsedData === undefined) return;
        if (Array.isArray(parsedData)) {
            setRenderDialogError("Single certificate storage requires a JSON object.");
            notifications.warning("Single certificate storage requires a JSON object", { title: "Certificates" });
            return;
        }
        try {
            setRenderDialogError(null);
            setStoringCertificateExternal(true);
            await onStoreCertificate(deepClone(template), parsedData);
            setRenderDialogOpen(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to store certificate", { title: "Certificates" });
        } finally {
            setStoringCertificateExternal(false);
        }
    }

    async function handleStoreCertificateBatchAction() {
        if (!onStoreCertificateBatch) return;
        const parsedData = parseRenderDialogData();
        if (parsedData === undefined) return;
        if (!Array.isArray(parsedData)) {
            setRenderDialogError("Batch storage requires a JSON array of certificate data.");
            notifications.warning("Batch storage requires a JSON array", { title: "Certificates" });
            return;
        }
        try {
            setRenderDialogError(null);
            setStoringCertificateBatchExternal(true);
            await onStoreCertificateBatch(deepClone(template), parsedData);
            setRenderDialogOpen(false);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to store certificate batch", { title: "Certificates" });
        } finally {
            setStoringCertificateBatchExternal(false);
        }
    }

    async function refreshCertificateBatchJobs(silent = false) {
        if (!onListCertificateBatchJobs) return;
        try {
            if (!silent) setLoadingBatchJobs(true);
            const jobs = await onListCertificateBatchJobs();
            setBatchJobs(jobs);
        } catch (err: any) {
            if (!silent) {
                notifications.error(err?.message || "Failed to load certificate batches", { title: "Certificates" });
            }
        } finally {
            if (!silent) setLoadingBatchJobs(false);
        }
    }

    async function handleQueueCertificateBatchJobAction(payload: unknown[]) {
        if (!onQueueCertificateBatchJob) return;
        if (!Array.isArray(payload)) {
            setRenderDialogError("Queued batch jobs require a JSON array of certificate data.");
            notifications.warning("Batch jobs require a JSON array", { title: "Certificates" });
            return;
        }
        if (!payload.length) {
            setRenderDialogError("Batch job requires at least one certificate row.");
            notifications.warning("Batch job requires at least one row", { title: "Certificates" });
            return;
        }
        try {
            setRenderDialogError(null);
            setQueueingBatchJobExternal(true);
            const created = await onQueueCertificateBatchJob(deepClone(template), payload);
            notifications.success(`Batch queued: ${created.id.slice(0, 8)} (${created.requestedCount} rows)`);
            await refreshCertificateBatchJobs(true);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to queue certificate batch job", { title: "Certificates" });
        } finally {
            setQueueingBatchJobExternal(false);
        }
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

    function flattenExcelRowsToCertificates(rows: Array<Record<string, unknown>>): unknown[] {
        const out: Array<Record<string, unknown>> = [];
        for (const row of rows) {
            const certificate: Record<string, unknown> = {};
            for (const [column, rawValue] of Object.entries(row ?? {})) {
                const path = String(column ?? "").trim();
                if (!path) continue;
                const value = parseExcelCellValue(rawValue);
                if (value === "") continue;
                setPathValue(certificate, path, value);
            }
            if (Object.keys(certificate).length > 0) {
                out.push(certificate);
            }
        }
        return out;
    }

    async function handleBatchExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const bytes = await file.arrayBuffer();
            const workbook = XLSX.read(bytes, { type: "array" });
            const preferredSheet = workbook.Sheets["Certificates"] ?? workbook.Sheets[workbook.SheetNames[0]];
            if (!preferredSheet) {
                throw new Error("Workbook has no worksheet data");
            }
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(preferredSheet, {
                defval: "",
                raw: false,
            });
            const certificates = flattenExcelRowsToCertificates(rows);
            if (!certificates.length) {
                throw new Error("No certificate rows found in the uploaded Excel file");
            }
            await handleQueueCertificateBatchJobAction(certificates);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to parse Excel upload", { title: "Certificates" });
        } finally {
            e.target.value = "";
        }
    }

    async function handleDownloadBatchJobZip(batch: CertificateBatchJobSummary) {
        if (!onDownloadCertificateBatchZip) return;
        try {
            setDownloadingBatchJobId(batch.id);
            await onDownloadCertificateBatchZip(batch.id, batch.zipFileName ?? batch.requestedFileName ?? "certificates");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download batch ZIP", { title: "Certificates" });
        } finally {
            setDownloadingBatchJobId(null);
        }
    }

    function updateRenderDataField(id: string, patch: Partial<Omit<RenderFormField, "id">>) {
        setRenderDataFields((prev) =>
            prev.map((field) => (field.id === id ? { ...field, ...patch } : field))
        );
    }

    function removeRenderDataField(id: string) {
        setRenderDataFields((prev) => {
            const next = prev.filter((field) => field.id !== id);
            return next.length ? next : [{ id: makeId(), path: "", value: "" }];
        });
    }

    function addRenderDataField() {
        setRenderDataFields((prev) => [...prev, { id: makeId(), path: "", value: "" }]);
    }

    function switchRenderDataMode(nextMode: "form" | "json") {
        if (nextMode === renderDataMode) return;
        if (nextMode === "json") {
            setRenderDataJson(JSON.stringify(buildRenderDataFromFields(renderDataFields), null, 2));
            setRenderDataMode("json");
            setRenderDialogError(null);
            return;
        }
        const fields = parseRenderFieldsFromJson(renderDataJson);
        setRenderDataFields(fields);
        setRenderDataMode("form");
        setRenderDialogError(null);
    }

    function parseRenderDialogData(): unknown | undefined {
        if (renderDataMode === "form") {
            const hasPath = renderDataFields.some((field) => field.path.trim().length > 0);
            if (!hasPath) {
                setRenderDialogError("Add at least one field path (for example: recipient.name).");
                notifications.warning("Add at least one certificate data field", { title: "Render" });
                return undefined;
            }
            return buildRenderDataFromFields(renderDataFields);
        }
        try {
            return JSON.parse(renderDataJson || "{}");
        } catch {
            setRenderDialogError("Render data must be valid JSON.");
            notifications.warning("Render data must be valid JSON", { title: "Render" });
            return undefined;
        }
    }

    async function handleDownloadAction() {
        if (onDownloadTemplate) {
            try {
                setDownloadingExternal(true);
                await onDownloadTemplate(deepClone(template));
            } finally {
                setDownloadingExternal(false);
            }
            return;
        }
        saveTemplateJson();
    }

    function handleDownloadBulkExcelTemplate() {
        try {
            setDownloadingBulkTemplateExternal(true);
            const varSpecs = collectVarSpecs(template);
            const defaultsByPath = new Map<string, unknown>();
            for (const spec of varSpecs) {
                const path = spec.path.trim();
                if (path && !defaultsByPath.has(path)) {
                    defaultsByPath.set(path, spec.defaultValue);
                }
            }

            const columns = Array.from(
                new Set<string>([
                    ...DEFAULT_BULK_CERTIFICATE_COLUMNS,
                    ...Array.from(defaultsByPath.keys()),
                ])
            );

            const sampleRow: Record<string, string | number | boolean> = {};
            const blankRow: Record<string, string> = {};
            for (const column of columns) {
                const defaultValue = defaultsByPath.get(column);
                sampleRow[column] = defaultValue === undefined ? "" : toSpreadsheetCellValue(defaultValue);
                blankRow[column] = "";
            }

            const sheet = XLSX.utils.json_to_sheet([sampleRow, blankRow], {
                header: columns,
                skipHeader: false,
            });
            sheet["!cols"] = columns.map((column) => ({
                wch: Math.max(18, Math.min(42, column.length + 4)),
            }));

            const instructions = XLSX.utils.aoa_to_sheet([
                ["Bulk Certificate Generator - Excel Template"],
                ["Fill one row per certificate and keep the header names unchanged."],
                ["Nested JSON fields use dot notation, for example: recipient.firstName"],
                ["Arrays/objects can be entered as JSON text when needed."],
            ]);
            instructions["!cols"] = [{ wch: 90 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
            XLSX.utils.book_append_sheet(workbook, sheet, "Certificates");

            const base = sanitizeDownloadBaseName(template.name ?? "");
            XLSX.writeFile(workbook, `${base}_bulk_certificate_template.xlsx`);
            notifications.success("Bulk certificate Excel template downloaded");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to generate bulk Excel template", { title: "Certificates" });
        } finally {
            setDownloadingBulkTemplateExternal(false);
        }
    }

    async function handleConvertToDesignAction() {
        if (!onConvertToDesign) return;
        try {
            setConvertingDesign(true);
            const draft = convertTemplateToDesignDraft(deepClone(template), {
                assetBaseUrl,
            });
            await onConvertToDesign(draft);
        } finally {
            setConvertingDesign(false);
        }
    }

    function saveTemplateJson() {
        const pretty = JSON.stringify(template, null, 2);
        const blob = new Blob([pretty], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const base = (template.name || "template").trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
        a.href = url;
        a.download = `${base || "template"}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result ?? "");
                const raw = JSON.parse(text) as Template;
                const next = normalizeTemplate(raw);
                setTemplate(next);
                setSelectedIds([]);
                setEditingId(null);
                notifications.success("Template JSON imported");
            } catch {
                notifications.error("Invalid JSON file", { title: "Import" });
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    }

    function undo() {
        const prev = undoStackRef.current.pop();
        if (!prev) return;
        redoStackRef.current.push(deepClone(template));
        suppressHistoryRef.current = true;
        setTemplate(deepClone(prev));
        setSelectedIds([]);
        setEditingId(null);
        setHistoryTick((v) => v + 1);
    }

    function redo() {
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(deepClone(template));
        suppressHistoryRef.current = true;
        setTemplate(deepClone(next));
        setSelectedIds([]);
        setEditingId(null);
        setHistoryTick((v) => v + 1);
    }

    function moveSelectedLayers(direction: "front" | "back") {
        if (!selectedIds.length || previewMode) return;
        updateActivePage((page) => {
            const selectedSet = new Set(selectedIds);
            const selected = page.blocks.filter((b) => selectedSet.has(b.id));
            const others = page.blocks.filter((b) => !selectedSet.has(b.id));
            const nextBlocks = direction === "front" ? [...others, ...selected] : [...selected, ...others];
            page.blocks = nextBlocks;
        });
    }

    function moveLayer(blockId: string, direction: "front" | "back") {
        if (previewMode) return;
        updateActivePage((page) => {
            const idx = page.blocks.findIndex((b) => b.id === blockId);
            if (idx < 0) return;
            const block = page.blocks[idx];
            const others = page.blocks.filter((b) => b.id !== blockId);
            const nextBlocks = direction === "front" ? [...others, block] : [block, ...others];
            page.blocks = nextBlocks;
        });
        setSelectedIds([blockId]);
    }

    function nudgeSelectedBy(deltaX: number, deltaY: number) {
        if (!selectedIds.length || previewMode) return;
        updateActivePage((page) => {
            page.blocks = page.blocks.map((b) => {
                if (!selectedIds.includes(b.id)) return b;
                const normalized = normalizeBlock(b);
                const w = pctToPx(normalized.style.width, canvasSize.w);
                const h = pctToPx(normalized.style.height, canvasSize.h);
                const x = pctToPx(normalized.style.left, canvasSize.w);
                const y = pctToPx(normalized.style.top, canvasSize.h);

                const nextX = clamp(x + deltaX, 0, Math.max(canvasSize.w - w, 0));
                const nextY = clamp(y + deltaY, 0, Math.max(canvasSize.h - h, 0));

                return {
                    ...b,
                    style: {
                        ...(b.style ?? {}),
                        left: pxToPct(nextX, canvasSize.w),
                        top: pxToPct(nextY, canvasSize.h),
                    },
                };
            });
        });
    }

    function alignSelected(mode: AlignMode) {
        if (previewMode || selectedIds.length < 2) return;

        updateActivePage((page) => {
            const selected = page.blocks.filter((b) => selectedIds.includes(b.id)).map(normalizeBlock);
            if (selected.length < 2) return;

            const rects = selected.map((b) => {
                const x = pctToPx(b.style.left, canvasSize.w);
                const y = pctToPx(b.style.top, canvasSize.h);
                const w = pctToPx(b.style.width, canvasSize.w);
                const h = pctToPx(b.style.height, canvasSize.h);
                return { id: b.id, x, y, w, h };
            });

            const bounds = {
                left: Math.min(...rects.map((r) => r.x)),
                top: Math.min(...rects.map((r) => r.y)),
                right: Math.max(...rects.map((r) => r.x + r.w)),
                bottom: Math.max(...rects.map((r) => r.y + r.h)),
            };
            const centerX = (bounds.left + bounds.right) / 2;
            const centerY = (bounds.top + bounds.bottom) / 2;

            const patchMap = new Map<string, Partial<BaseBlockStyle>>();
            rects.forEach((r) => {
                let nx = r.x;
                let ny = r.y;

                if (mode === "left") nx = bounds.left;
                if (mode === "h-center") nx = centerX - r.w / 2;
                if (mode === "right") nx = bounds.right - r.w;

                if (mode === "top") ny = bounds.top;
                if (mode === "v-center") ny = centerY - r.h / 2;
                if (mode === "bottom") ny = bounds.bottom - r.h;

                patchMap.set(r.id, {
                    left: pxToPct(clamp(nx, 0, canvasSize.w - r.w), canvasSize.w),
                    top: pxToPct(clamp(ny, 0, canvasSize.h - r.h), canvasSize.h),
                });
            });

            page.blocks = page.blocks.map((b) => {
                const patch = patchMap.get(b.id);
                if (!patch) return b;
                return { ...b, style: { ...(b.style ?? {}), ...patch } };
            });
        });
    }

    useEffect(() => {
        if (suppressHistoryRef.current) {
            suppressHistoryRef.current = false;
            prevTemplateRef.current = deepClone(template);
            return;
        }

        const prev = prevTemplateRef.current;
        if (!templatesEqual(prev, template)) {
            undoStackRef.current.push(deepClone(prev));
            if (undoStackRef.current.length > 100) undoStackRef.current.shift();
            redoStackRef.current = [];
            prevTemplateRef.current = deepClone(template);
            setHistoryTick((v) => v + 1);
        }
    }, [template]);

    useEffect(() => {
        function isTypingTarget(el: Element | null): boolean {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return true;
            if (el.isContentEditable) return true;
            return false;
        }

        function onKeyDown(e: KeyboardEvent) {
            if (previewMode) return;

            const active = document.activeElement;
            if (isTypingTarget(active)) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                e.preventDefault();
                setSelectedIds((activePage?.blocks ?? []).map((b) => b.id));
                setEditingId(null);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
                return;
            }

            if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.length) {
                e.preventDefault();
                deleteSelected();
                return;
            }

            if (
                (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
                && selectedIds.length
            ) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
                const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
                nudgeSelectedBy(dx, dy);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewMode, selectedIds, template, activePage]);

    // ---------- Palette DnD ----------
    function onPaletteDragStart(e: React.DragEvent, type: BlockType) {
        if (previewMode) return;
        const payload: PalettePayload = { type };
        const s = JSON.stringify(payload);

        e.dataTransfer.setData(DND_MIME, s);
        e.dataTransfer.setData("text/plain", s);
        e.dataTransfer.effectAllowed = "copy";
    }

    function onCanvasDragOver(e: React.DragEvent) {
        if (previewMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function onCanvasDrop(e: React.DragEvent) {
        if (previewMode) return;
        e.preventDefault();

        const raw = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain");
        if (!raw) return;

        let payload: PalettePayload | null = null;
        try {
            payload = JSON.parse(raw) as PalettePayload;
        } catch {
            return;
        }
        if (!payload?.type) return;

        const inner = canvasInnerRef.current;
        if (!inner) return;

        const rect = inner.getBoundingClientRect();

        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const y = clamp(e.clientY - rect.top, 0, rect.height);

        const block = createBlockAt(payload.type, x, y);

        updateActivePage((page) => {
            page.blocks = [...page.blocks, block];
        });
        setSelectedIds([block.id]);
        setEditingId(payload.type === "text" ? block.id : null);
    }

    // ---------- RND drag/resize ----------
    const onDragStop: RndDragCallback = (_e, d) => {
        if (previewMode) return;
        const id = (d.node as HTMLElement).dataset.blockId;
        if (!id) return;

        updateBlockStyle(id, {
            left: pxToPct(d.x, canvasSize.w),
            top: pxToPct(d.y, canvasSize.h),
        });
    };

    const onResizeStop: RndResizeCallback = (_e, _dir, ref, _delta, position) => {
        if (previewMode) return;
        const id = (ref as HTMLElement).dataset.blockId;
        if (!id) return;

        const newW = (ref as HTMLElement).offsetWidth;
        const newH = (ref as HTMLElement).offsetHeight;

        // Optional: keep line heights sane when resizing
        const found = activePage?.blocks.find((b) => b.id === id);
        const isLine = found?.type === "horizontal-line";
        const rawHeightPct = pxToPct(newH, canvasSize.h);
        const clampedHeightPct = isLine
            ? `${clamp(parseFloat(rawHeightPct), 0.6, 6)}%`
            : rawHeightPct;

        updateBlockStyle(id, {
            left: pxToPct(position.x, canvasSize.w),
            top: pxToPct(position.y, canvasSize.h),
            width: pxToPct(newW, canvasSize.w),
            height: clampedHeightPct,
        });
    };

    const selectionBoundsPx = useMemo(() => {
        if (previewMode) return null;
        if (!selectedIds.length) return null;

        const selectedBlocks = (activePage?.blocks ?? [])
            .filter((b) => selectedIds.includes(b.id))
            .map(normalizeBlock);

        if (!selectedBlocks.length) return null;

        const rects = selectedBlocks.map((b) => {
            const x = pctToPx(b.style.left, canvasSize.w);
            const y = pctToPx(b.style.top, canvasSize.h);
            const w = pctToPx(b.style.width, canvasSize.w);

            const isLine = b.type === "horizontal-line";
            const hRaw = pctToPx(b.style.height, canvasSize.h);
            const h = isLine ? Math.max(hRaw, 16) : hRaw;

            return { x, y, w, h };
        });

        const left = Math.min(...rects.map((r) => r.x));
        const top = Math.min(...rects.map((r) => r.y));
        const right = Math.max(...rects.map((r) => r.x + r.w));
        const bottom = Math.max(...rects.map((r) => r.y + r.h));

        return {
            left,
            top,
            width: right - left,
            height: bottom - top,
        };
    }, [previewMode, selectedIds, activePage, canvasSize.w, canvasSize.h]);

    // When entering preview: clear selection + editing
    useEffect(() => {
        if (previewMode) {
            setSelectedIds([]);
            setEditingId(null);
        }
    }, [previewMode]);

    useEffect(() => {
        setSelectedIds([]);
        setEditingId(null);
    }, [activePageId]);

    useEffect(() => {
        if (!restoreLocalSession) return;
        if (!sessionStorageKey) return;
        try {
            const raw = localStorage.getItem(sessionStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { template?: Template };
            if (!parsed?.template) return;
            const restored = normalizeTemplate(parsed.template);
            setTemplate(restored);
            prevTemplateRef.current = deepClone(restored);
            undoStackRef.current = [];
            redoStackRef.current = [];
            setSelectedIds([]);
            setEditingId(null);
            setHistoryTick((v) => v + 1);
            suppressHistoryRef.current = true;
        } catch {
            // ignore broken local draft payload
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionStorageKey, restoreLocalSession]);

    useEffect(() => {
        if (!sessionStorageKey) return;
        try {
            localStorage.setItem(
                sessionStorageKey,
                JSON.stringify({
                    updatedAt: new Date().toISOString(),
                    template,
                })
            );
            const indexKey = "renderer.template.session.index";
            const raw = localStorage.getItem(indexKey);
            const list = raw ? (JSON.parse(raw) as string[]) : [];
            if (!list.includes(sessionStorageKey)) {
                localStorage.setItem(indexKey, JSON.stringify([...list, sessionStorageKey]));
            }
        } catch {
            // ignore storage quota/security errors
        }
    }, [sessionStorageKey, template]);

    useEffect(() => {
        if (!onPersistSession) return;
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        const handle = window.setTimeout(() => {
            void onPersistSession(deepClone(template));
        }, persistDebounceMs);
        return () => window.clearTimeout(handle);
    }, [template, onPersistSession, persistDebounceMs]);

    return (
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
            <Box
                sx={{
                    flex: 1,
                    p: { xs: 1.5, sm: 2, md: 3 },
                    pr: isOverlayInspector
                        ? { xs: 1.5, sm: 2, md: 3 }
                        : { xs: 1.5, sm: 2, md: `${inspectorWidthPx + 20}px` },
                    overflow: "auto",
                    minWidth: 0,
                }}
            >
                <Box
                    sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 20,
                        mb: 2,
                        p: 1.25,
                        borderRadius: 2,
                        border: toolbarMinimized ? "none" : `1px solid ${toolbarBorderColor}`,
                        bgcolor: toolbarMinimized ? "transparent" : toolbarBgColor,
                        backdropFilter: toolbarMinimized ? "none" : "blur(6px)",
                        boxShadow: toolbarMinimized ? "none" : undefined,
                        "& .MuiIconButton-root": {
                            p: "4px",
                        },
                        "& .MuiTypography-root": {
                            fontSize: compactUiFontSize,
                        },
                    }}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                        <Tooltip title={toolbarMinimized ? "Expand Toolbar" : "Minimize Toolbar"}>
                            <IconButton size="small" onClick={() => setToolbarMinimized((v) => !v)}>
                                {toolbarMinimized ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        {!toolbarMinimized && (
                            <>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={activePageId}
                            onChange={(_, v) => {
                                if (!v) return;
                                setActivePageId(v);
                            }}
                            sx={{ "& .MuiToggleButton-root": { py: "2px", px: 1, fontSize: 11 } }}
                        >
                            {pages.map((p) => (
                                <ToggleButton key={p.id} value={p.id}>
                                    {p.name}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        {pages.length < 2 && (
                            <Tooltip title="Add Back Page">
                                <span>
                                    <IconButton size="small" onClick={addBackPageIfMissing} disabled={previewMode}>
                                        <NoteAddIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <Tooltip title="Undo">
                            <span>
                                <IconButton size="small" onClick={undo} disabled={!canUndo}>
                                    <UndoIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Redo">
                            <span>
                                <IconButton size="small" onClick={redo} disabled={!canRedo}>
                                    <RedoIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={previewMode ? "Edit" : "Preview"}>
                            <IconButton
                                size="small"
                                onClick={() => setPreviewMode((v) => !v)}
                                color={previewMode ? "primary" : "default"}
                            >
                                {previewMode ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        {onToggleAppSidebar && (
                            <Tooltip title={appSidebarHidden ? "Show Sidebar" : "Maximize Canvas"}>
                                <IconButton size="small" onClick={onToggleAppSidebar}>
                                    <ViewSidebarIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {isOverlayInspector && (
                            <Tooltip title="Inspector">
                                <IconButton size="small" onClick={() => setInspectorOpen(true)}>
                                    <TuneIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="Add Text (drag or click)">
                            <span>
                                <IconButton
                                    size="small"
                                    draggable={!previewMode}
                                    onDragStart={(e) => onPaletteDragStart(e, "text")}
                                    onClick={() => addBlockCentered("text")}
                                    disabled={previewMode}
                                >
                                    <TextFieldsIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Add Image (drag or click)">
                            <span>
                                <IconButton
                                    size="small"
                                    draggable={!previewMode}
                                    onDragStart={(e) => onPaletteDragStart(e, "image")}
                                    onClick={() => addBlockCentered("image")}
                                    disabled={previewMode}
                                >
                                    <AddPhotoAlternateIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Add Line (drag or click)">
                            <span>
                                <IconButton
                                    size="small"
                                    draggable={!previewMode}
                                    onDragStart={(e) => onPaletteDragStart(e, "horizontal-line")}
                                    onClick={() => addBlockCentered("horizontal-line")}
                                    disabled={previewMode}
                                >
                                    <HorizontalRuleIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Add List (drag or click)">
                            <span>
                                <IconButton
                                    size="small"
                                    draggable={!previewMode}
                                    onDragStart={(e) => onPaletteDragStart(e, "list")}
                                    onClick={() => addBlockCentered("list")}
                                    disabled={previewMode}
                                >
                                    <FormatListBulletedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Add Table (drag or click)">
                            <span>
                                <IconButton
                                    size="small"
                                    draggable={!previewMode}
                                    onDragStart={(e) => onPaletteDragStart(e, "table")}
                                    onClick={() => addBlockCentered("table")}
                                    disabled={previewMode}
                                >
                                    <TableChartIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="Zoom Out">
                            <IconButton size="small" onClick={() => setZoomPct((z) => clampNum(z - 10, 25, 300))}>
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset Zoom">
                            <AntBtn antType="text" onClick={() => setZoomPct(100)} sx={{ minWidth: 40, px: 0.5, fontSize: 11 }}>
                                {zoomPct}%
                            </AntBtn>
                        </Tooltip>
                        <Tooltip title="Zoom In">
                            <IconButton size="small" onClick={() => setZoomPct((z) => clampNum(z + 10, 25, 300))}>
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Grid">
                            <FormControlLabel
                                sx={{ ml: 0.5, mr: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={gridEnabled}
                                        onChange={(_, checked) => setGridEnabled(checked)}
                                        disabled={previewMode}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 11 }}>Grid</Typography>}
                            />
                        </Tooltip>
                        <Tooltip title="Center Guides">
                            <FormControlLabel
                                sx={{ ml: 0.5, mr: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={centerGuidesEnabled}
                                        onChange={(_, checked) => setCenterGuidesEnabled(checked)}
                                    />
                                }
                                label={<Typography sx={{ fontSize: 11 }}>Guides</Typography>}
                            />
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Tooltip title="Copy JSON">
                            <IconButton size="small" onClick={copyJson}>
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Import">
                            <IconButton size="small" onClick={() => importInputRef.current?.click()}>
                                <FileUploadIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={downloadingExternal ? "Downloading..." : downloadButtonLabel}>
                            <span>
                                <IconButton size="small" onClick={handleDownloadAction} disabled={downloadingExternal}>
                                    <DownloadIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {onConvertToDesign && (
                            <Tooltip title={convertingDesign ? "Converting..." : convertToDesignLabel}>
                                <span>
                                    <IconButton size="small" onClick={handleConvertToDesignAction} disabled={convertingDesign}>
                                        <AutoFixHighIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <Tooltip title={savingExternal ? "Saving..." : saveButtonLabel}>
                            <span>
                                <IconButton size="small" onClick={handleSaveAction} disabled={savingExternal}>
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete Selected">
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={deleteSelected}
                                    disabled={previewMode || selectedIds.length === 0}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {onRenderTemplate && (
                            <Tooltip title={renderingExternal ? "Rendering..." : renderButtonLabel}>
                                <span>
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => {
                                            setRenderDialogError(null);
                                            const hydratedJson = injectVarDefaultsIntoRenderDataJson(renderDataJson, template);
                                            setRenderDataJson(hydratedJson);
                                            setRenderDataFields(parseRenderFieldsFromJson(hydratedJson));
                                            setRenderDialogOpen(true);
                                        }}
                                        disabled={renderingExternal}
                                    >
                                        <PictureAsPdfIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        {onOpenBatchCreator && (
                            <Tooltip title={openBatchCreatorLabel}>
                                <IconButton size="small" color="primary" onClick={onOpenBatchCreator}>
                                    <NoteAddIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {onBackToDesign && (
                            <Tooltip title={backToDesignLabel}>
                                <IconButton size="small" onClick={onBackToDesign}>
                                    <ArrowBackIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onBackToTemplates && (
                            <Tooltip title="Back to templates">
                                <IconButton size="small" onClick={onBackToTemplates}>
                                    <ArrowBackIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {onDeleteTemplate && (
                            <Tooltip title={deletingTemplate ? "Deleting..." : deleteTemplateLabel}>
                                <span>
                                    <IconButton size="small" color="error" onClick={onDeleteTemplate} disabled={deletingTemplate}>
                                        <DeleteForeverIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                            </>
                        )}
                    </Stack>
                </Box>
                <Box
                    sx={{
                        minHeight: "calc(100vh - 120px)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "flex-start",
                        pt: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: "min(1200px, 100%)",
                            p: 2,
                            borderRadius: 3,
                            background:
                                `linear-gradient(45deg, ${checkerColor} 25%, transparent 25%, transparent 75%, ${checkerColor} 75%, ${checkerColor}), linear-gradient(45deg, ${checkerColor} 25%, transparent 25%, transparent 75%, ${checkerColor} 75%, ${checkerColor})`,
                            backgroundSize: "24px 24px",
                            backgroundPosition: "0 0, 12px 12px",
                        }}
                    >
                        <Box ref={canvasOuterRef} sx={{ width: "min(1200px, 100%)", mx: "auto", overflowX: "auto" }}>
                            <Box
                                ref={canvasInnerRef}
                                onDragOver={onCanvasDragOver}
                                onDrop={onCanvasDrop}
                                onContextMenu={(e) => {
                                    if (previewMode) return;
                                    e.preventDefault();
                                    if (e.target === e.currentTarget) {
                                        setSelectedIds([]);
                                        setEditingId(null);
                                        openContextMenu(e, null);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    if (previewMode) return;
                                    if (e.target !== e.currentTarget) return;

                                    const isMultiSelectGesture = (e as any).shiftKey || (e as any).ctrlKey || (e as any).metaKey;
                                    if (isMultiSelectGesture) return;

                                    setSelectedIds([]);
                                    setEditingId(null);
                                }}
                                sx={{
                                    width: `${canvasSize.w}px`,
                                    height: `${canvasSize.h}px`,
                                    position: "relative",
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    bgcolor:
                                        bgType === "color"
                                            ? ((activePage?.background as Background | undefined)?.color || "#ffffff")
                                            : "#fff",
                                    border: `2px solid ${canvasBorderColor}`,
                                    boxShadow: `0 10px 30px ${canvasShadowColor}`,
                                    backgroundImage: bgCssImage,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {gridEnabled && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            inset: 0,
                                            pointerEvents: "none",
                                            backgroundImage:
                                                `linear-gradient(to right, ${gridLineColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)`,
                                            backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
                                            backgroundPosition: `${centerGridOffsetX}px ${centerGridOffsetY}px`,
                                        }}
                                    />
                                )}
                                {centerGuidesEnabled && (
                                    <>
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                left: 0,
                                                right: 0,
                                                top: "calc(50% - 0.5px)",
                                                height: "1px",
                                                bgcolor: "rgba(244, 67, 54, 0.9)",
                                                pointerEvents: "none",
                                                zIndex: 3,
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: 0,
                                                bottom: 0,
                                                left: "calc(50% - 0.5px)",
                                                width: "1px",
                                                bgcolor: "rgba(76, 175, 80, 0.9)",
                                                pointerEvents: "none",
                                                zIndex: 3,
                                            }}
                                        />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                position: "absolute",
                                                left: 8,
                                                top: "calc(50% + 4px)",
                                                px: 0.5,
                                                bgcolor: guideLabelBg,
                                                borderRadius: 0.5,
                                                color: "rgba(183, 28, 28, 0.9)",
                                                pointerEvents: "none",
                                                zIndex: 4,
                                            }}
                                        >
                                            Equator
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                position: "absolute",
                                                left: "calc(50% + 6px)",
                                                top: 8,
                                                px: 0.5,
                                                bgcolor: guideLabelBg,
                                                borderRadius: 0.5,
                                                color: "rgba(27, 94, 32, 0.9)",
                                                pointerEvents: "none",
                                                zIndex: 4,
                                            }}
                                        >
                                            Greenwich
                                        </Typography>
                                    </>
                                )}

                                {/* Hints only in edit mode */}
                                {!previewMode && (
                                    <>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                position: "absolute",
                                                top: 8,
                                                left: 8,
                                                px: 1,
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: hintBg,
                                                border: hintBorder,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            Drop components here
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            sx={{
                                                position: "absolute",
                                                top: 8,
                                                right: 8,
                                                px: 1,
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: hintBg,
                                                border: hintBorder,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            blocks: {activePage?.blocks.length ?? 0}
                                        </Typography>
                                    </>
                                )}


                                {selectionBoundsPx && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            left: selectionBoundsPx.left,
                                            top: selectionBoundsPx.top,
                                            width: selectionBoundsPx.width,
                                            height: selectionBoundsPx.height,
                                            pointerEvents: "none",
                                            zIndex: 50,
                                        }}
                                    >
                                        {/* optional outline around multi-selection */}
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                border: `2px solid ${alpha(selectedBorderColor, isDark ? 0.7 : 0.6)}`,
                                                borderRadius: 2,
                                            }}
                                        />

                                        {/* overlay delete button */}
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: -14,
                                                right: -14,
                                                pointerEvents: "auto",
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={deleteSelected}
                                                sx={{
                                                    bgcolor: "background.paper",
                                                    border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.28 : 0.15)}`,
                                                    boxShadow: `0 6px 20px ${alpha("#000000", isDark ? 0.45 : 0.15)}`,
                                                    "&:hover": { bgcolor: "background.paper" },
                                                }}
                                                title="Delete selected"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
                                {(activePage?.blocks ?? []).map((raw) => {
                                    const b = normalizeBlock(raw);

                                    const x = pctToPx(b.style.left, canvasSize.w);
                                    const y = pctToPx(b.style.top, canvasSize.h);
                                    const w = pctToPx(b.style.width, canvasSize.w);
                                    const h = pctToPx(b.style.height, canvasSize.h);

                                    const isSelected = !previewMode && selectedIds.includes(b.id);
                                    const isEditing = !previewMode && b.id === editingId;
                                    const locked = Boolean((b as any).locked);

                                    // ✅ Make horizontal-lines clickable (min hit area)
                                    const isLine = b.type === "horizontal-line";
                                    const minHitPx = 16;
                                    const safeH = isLine ? Math.max(h, minHitPx) : h;

                                    const allowEdit = !previewMode;
                                    const allowInteract = allowEdit && !locked;

                                    return (
                                        <Rnd
                                            key={b.id}
                                            data-block-id={b.id}
                                            size={{ width: w, height: safeH }}
                                            position={{ x, y }}
                                            bounds="parent"
                                            dragGrid={gridEnabled ? [gridSizePx, gridSizePx] : undefined}
                                            resizeGrid={gridEnabled ? [gridSizePx, gridSizePx] : undefined}
                                            enableResizing={allowInteract}
                                            disableDragging={!allowInteract}
                                            onMouseDown={(e) => {
                                                if (previewMode) return;
                                                e.stopPropagation();

                                                const toggle = e.shiftKey || e.ctrlKey || e.metaKey;

                                                if (toggle) {
                                                    setSelectedIds((prev) =>
                                                        prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                                                    );
                                                } else {
                                                    setSelectedIds([b.id]); // normal click = single select
                                                }
                                            }}
                                            onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
                                                if (previewMode) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!selectedIds.includes(b.id)) {
                                                    setSelectedIds([b.id]);
                                                    setEditingId(null);
                                                }
                                                openContextMenu(e, b.id);
                                            }}
                                            onDoubleClick={(e: React.MouseEvent<HTMLElement>) => {
                                                if (!allowEdit) return;
                                                e.stopPropagation();
                                                if (b.type === "text") setEditingId(b.id);
                                            }}
                                            onDragStop={onDragStop}
                                            onResizeStop={onResizeStop}
                                            // ✅ no dotted lines / borders in preview
                                            style={{
                                                border: previewMode
                                                    ? "none"
                                                    : isSelected
                                                        ? `2px solid ${selectedBorderColor}`
                                                        : `1px dashed ${alpha(theme.palette.text.primary, isDark ? 0.35 : 0.2)}`,
                                                boxShadow: previewMode ? "none" : isSelected ? `0 0 0 3px ${selectedGlowColor}` : "none",
                                                borderRadius: previewMode ? 0 : 6,
                                                background: previewMode ? "transparent" : isSelected ? selectedFillColor : "transparent",
                                                minHeight: isLine ? `${minHitPx}px` : undefined,
                                                pointerEvents: previewMode ? "none" : "auto", // ✅ preview truly non-interactive
                                            }}
                                            resizeHandleStyles={previewMode ? undefined : undefined}
                                        >
                                            <Box sx={{ width: "100%", height: "100%" }}>
                                                <BlockRenderer
                                                    block={b}
                                                    assetBaseUrl={assetBaseUrl}
                                                    editing={isEditing}
                                                    previewMode={previewMode}
                                                    viewportScale={viewportTextScale}
                                                    renderData={renderDataForPreview}
                                                    onChangeText={(txt) => {
                                                        updateBlock(b.id, { value: txt } as Partial<Block>);
                                                    }}
                                                    onCommitText={(txt) => {
                                                        updateBlock(b.id, { value: txt } as Partial<Block>);
                                                        setEditingId(null);
                                                    }}
                                                    onCancelEdit={() => setEditingId(null)}
                                                />
                                            </Box>
                                        </Rnd>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* RIGHT: palette + inspector + preview */}
            <Drawer
                variant={isOverlayInspector ? "temporary" : "permanent"}
                anchor="right"
                open={isOverlayInspector ? inspectorOpen : true}
                onClose={() => setInspectorOpen(false)}
                ModalProps={{ keepMounted: true }}
                PaperProps={{
                    sx: {
                        width: { xs: "min(90vw, 320px)", md: `${inspectorWidthPx}px` },
                        p: 2,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        "& .MuiTypography-root": { fontSize: compactUiFontSize },
                        "& .MuiButton-root": { fontSize: compactUiFontSize, px: isCompactLayout ? 1 : 1.5 },
                        "& .MuiFormLabel-root, & .MuiInputBase-input": { fontSize: compactUiFontSize },
                    },
                }}
            >
                <Typography variant="h6" sx={{ mb: 1 }}>Inspector Panel</Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {previewMode
                        ? "Preview mode is active. Inspector is read-only."
                        : "Select blocks on the canvas to edit style, layer order and template settings."}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Inspector */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Inspector
                </Typography>

                {previewMode ? (
                    <Typography variant="body2" color="text.secondary">
                        Preview mode is on.
                    </Typography>
                ) : selectedBlock ? (
                    <Inspector
                        block={selectedBlock}
                        onPatch={(patch) => updateBlock(selectedBlock.id, patch)}
                        onStylePatch={(patch) => updateBlockStyle(selectedBlock.id, patch)}
                        onToggleLock={() => toggleLock(selectedBlock.id)}
                        onSendToBack={() => moveLayer(selectedBlock.id, "back")}
                        onBringToFront={() => moveLayer(selectedBlock.id, "front")}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No element selected.
                    </Typography>
                )}

                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Align Selection
                </Typography>
                <Stack direction="row" spacing={0.25}>
                    {([
                        { mode: "left",     icon: <AlignHorizontalLeftIcon fontSize="small" />,   title: "Align Left" },
                        { mode: "h-center", icon: <AlignHorizontalCenterIcon fontSize="small" />, title: "Align Center" },
                        { mode: "right",    icon: <AlignHorizontalRightIcon fontSize="small" />,  title: "Align Right" },
                        { mode: "top",      icon: <AlignVerticalTopIcon fontSize="small" />,      title: "Align Top" },
                        { mode: "v-center", icon: <AlignVerticalCenterIcon fontSize="small" />,   title: "Align Middle" },
                        { mode: "bottom",   icon: <AlignVerticalBottomIcon fontSize="small" />,   title: "Align Bottom" },
                    ] as const).map(({ mode, icon, title }) => (
                        <Tooltip key={mode} title={title}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => alignSelected(mode)}
                                    disabled={previewMode || selectedIds.length < 2}
                                >
                                    {icon}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Layers
                </Typography>
                <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Bring to Front">
                        <span>
                            <IconButton size="small" onClick={() => moveSelectedLayers("front")} disabled={previewMode || selectedIds.length === 0}>
                                <FlipToFrontIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Send to Back">
                        <span>
                            <IconButton size="small" onClick={() => moveSelectedLayers("back")} disabled={previewMode || selectedIds.length === 0}>
                                <FlipToBackIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
                <Divider sx={{ my: 2 }} />

                {/* Template settings */}
                <Typography variant="subtitle2">Template</Typography>

                <TextField
                    fullWidth
                    label="Template name"
                    value={template.name ?? ""}
                    onChange={(e) => setTemplate((p) => ({ ...p, name: e.target.value }))}
                    sx={{ mt: 1 }}
                    disabled={previewMode}
                />

                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <FormControl fullWidth disabled={previewMode}>
                        <InputLabel id="paper-label">Paper</InputLabel>
                        <Select
                            labelId="paper-label"
                            label="Paper"
                            value={paperKey}
                            onChange={(e: any) =>
                                updateActivePage((page) => {
                                    page.paperSize = e.target.value;
                                })
                            }
                        >
                            {Object.values(PAPER_SIZES).map((p) => (
                                <MenuItem key={p.key} value={p.key}>
                                    {p.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth disabled={previewMode}>
                        <InputLabel id="ori-label">Orientation</InputLabel>
                        <Select
                            labelId="ori-label"
                            label="Orientation"
                            value={orientation}
                            onChange={(e: any) =>
                                updateActivePage((page) => {
                                    page.orientation = e.target.value;
                                })
                            }
                        >
                            <MenuItem value="portrait">portrait</MenuItem>
                            <MenuItem value="landscape">landscape</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                <TextField
                    fullWidth
                    select
                    label="Background Type"
                    value={bgType}
                    onChange={(e) =>
                        updateActivePage((page) => {
                            page.background = {
                                ...(page.background ?? { type: "color", color: "#ffffff", url: "", svg: "" }),
                                type: e.target.value as Background["type"],
                            };
                        })
                    }
                    sx={{ mt: 1 }}
                    disabled={previewMode}
                >
                    <MenuItem value="color">Color</MenuItem>
                    <MenuItem value="image">Image</MenuItem>
                    <MenuItem value="svg">SVG</MenuItem>
                </TextField>

                {bgType === "image" && (
                    <TextField
                        fullWidth
                        label="Background URL"
                        value={activePage?.background?.url ?? ""}
                        onChange={(e) =>
                            updateActivePage((page) => {
                                page.background = {
                                    ...(page.background ?? { type: "image", url: "" }),
                                    type: "image",
                                    url: e.target.value,
                                } as Background;
                            })
                        }
                        sx={{ mt: 1 }}
                        disabled={previewMode}
                    />
                )}

                {bgType === "svg" && (
                    <TextField
                        fullWidth
                        label="Background SVG"
                        multiline
                        minRows={3}
                        maxRows={6}
                        value={(activePage?.background as Background | undefined)?.svg ?? ""}
                        onChange={(e) =>
                            updateActivePage((page) => {
                                page.background = {
                                    ...(page.background ?? { type: "svg", svg: "", url: "", color: "#ffffff" }),
                                    type: "svg",
                                    svg: e.target.value,
                                } as Background;
                            })
                        }
                        sx={{ mt: 1 }}
                        disabled={previewMode}
                    />
                )}

                {bgType === "color" && (
                    <TextField
                        fullWidth
                        label="Background Color"
                        value={activePage?.background?.color ?? "#ffffff"}
                        onChange={(e) =>
                            updateActivePage((page) => {
                                page.background = {
                                    ...(page.background ?? { type: "color", color: "#ffffff", url: "", svg: "" }),
                                    type: "color",
                                    color: e.target.value,
                                } as Background;
                            })
                        }
                        sx={{ mt: 1 }}
                        disabled={previewMode}
                    />
                )}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Canvas ratio: {aspectRatio.toFixed(4)} (w/h)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Undo: Cmd/Ctrl+Z, Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
                </Typography>
                <Box
                    component="input"
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    sx={{ display: "none" }}
                />
                <Box
                    component="input"
                    ref={batchExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleBatchExcelUpload}
                    sx={{ display: "none" }}
                />
            </Drawer>

            <Menu
                open={Boolean(contextMenu)}
                onClose={closeContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
                }
            >
                <MenuItem
                    onClick={() => {
                        if (!contextMenu) return;
                        addBlockAt("text", contextMenu.canvasX, contextMenu.canvasY);
                        closeContextMenu();
                    }}
                >
                    Add text
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (!contextMenu) return;
                        addBlockAt("image", contextMenu.canvasX, contextMenu.canvasY);
                        closeContextMenu();
                    }}
                >
                    Add image
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (!contextMenu) return;
                        addBlockAt("horizontal-line", contextMenu.canvasX, contextMenu.canvasY);
                        closeContextMenu();
                    }}
                >
                    Add line
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (!contextMenu) return;
                        addBlockAt("list", contextMenu.canvasX, contextMenu.canvasY);
                        closeContextMenu();
                    }}
                >
                    Add list
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (!contextMenu) return;
                        addBlockAt("table", contextMenu.canvasX, contextMenu.canvasY);
                        closeContextMenu();
                    }}
                >
                    Add table
                </MenuItem>

                {selectedIds.length > 0 && <Divider />}

                {selectedIds.length > 0 && (
                    <MenuItem
                        onClick={() => {
                            duplicateSelected();
                            closeContextMenu();
                        }}
                    >
                        Duplicate selected
                    </MenuItem>
                )}
                {selectedIds.length > 0 && (
                    <MenuItem
                        onClick={() => {
                            const selectedBlocksNow = (activePage?.blocks ?? []).filter((b) => selectedIds.includes(b.id));
                            const shouldLock = selectedBlocksNow.some((b) => !Boolean((b as any).locked));
                            setSelectedLocked(shouldLock);
                            closeContextMenu();
                        }}
                    >
                        {(activePage?.blocks ?? [])
                            .filter((b) => selectedIds.includes(b.id))
                            .every((b) => Boolean((b as any).locked))
                            ? "Unlock selected"
                            : "Lock selected"}
                    </MenuItem>
                )}
                {selectedIds.length > 0 && (
                    <MenuItem
                        onClick={() => {
                            moveSelectedLayers("front");
                            closeContextMenu();
                        }}
                    >
                        Send to front
                    </MenuItem>
                )}
                {selectedIds.length > 0 && (
                    <MenuItem
                        onClick={() => {
                            moveSelectedLayers("back");
                            closeContextMenu();
                        }}
                    >
                        Send to back
                    </MenuItem>
                )}
                {selectedIds.length > 0 && (
                    <MenuItem
                        onClick={() => {
                            deleteSelected();
                            closeContextMenu();
                        }}
                    >
                        Delete selected
                    </MenuItem>
                )}
            </Menu>
            <Dialog
                open={renderDialogOpen}
                onClose={() => {
                    if (renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal) return;
                    setRenderDialogOpen(false);
                    setRenderDialogError(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Generate Certificates</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.25} sx={{ mt: 1 }}>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={renderDataMode}
                            onChange={(_, next) => {
                                if (!next) return;
                                switchRenderDataMode(next);
                            }}
                        >
                            <ToggleButton value="form">Form</ToggleButton>
                            <ToggleButton value="json">JSON</ToggleButton>
                        </ToggleButtonGroup>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                            <AntBtn
                                antType="default"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadBulkExcelTemplate}
                                disabled={downloadingBulkTemplateExternal}
                            >
                                {downloadingBulkTemplateExternal ? "Preparing template..." : "Download Excel Template"}
                            </AntBtn>
                            {onQueueCertificateBatchJob && (
                                <Stack direction="row" spacing={1}>
                                    <AntBtn onClick={() => batchExcelInputRef.current?.click()}>
                                        Upload Excel and Queue
                                    </AntBtn>
                                    <AntBtn
                                        antType="primary"
                                        onClick={() => {
                                            const parsedData = parseRenderDialogData();
                                            if (parsedData === undefined) return;
                                            if (!Array.isArray(parsedData)) {
                                                setRenderDialogError("Queued batch jobs require a JSON array of certificate data.");
                                                notifications.warning("Batch jobs require a JSON array", { title: "Certificates" });
                                                return;
                                            }
                                            void handleQueueCertificateBatchJobAction(parsedData);
                                        }}
                                        disabled={queueingBatchJobExternal}
                                    >
                                        {queueingBatchJobExternal ? "Queueing..." : queueCertificateBatchJobLabel}
                                    </AntBtn>
                                </Stack>
                            )}
                        </Stack>
                        {renderDataMode === "form" ? (
                            <Stack spacing={1}>
                                {renderDataFields.map((field) => (
                                    <Stack key={field.id} direction="row" spacing={1} alignItems="center">
                                        <TextField
                                            size="small"
                                            label="Path"
                                            placeholder="recipient.name"
                                            value={field.path}
                                            onChange={(e) => updateRenderDataField(field.id, { path: e.target.value })}
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            size="small"
                                            label="Value"
                                            placeholder="Jane Doe"
                                            value={field.value}
                                            onChange={(e) => updateRenderDataField(field.id, { value: e.target.value })}
                                            sx={{ flex: 1 }}
                                        />
                                        <AntBtn antType="text" danger onClick={() => removeRenderDataField(field.id)}>
                                            Remove
                                        </AntBtn>
                                    </Stack>
                                ))}
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        {"Dot paths are converted to nested JSON, for example recipient.name -> { \"recipient\": { \"name\": \"...\" } }."}
                                    </Typography>
                                    <AntBtn antType="text" onClick={addRenderDataField}>Add field</AntBtn>
                                </Stack>
                            </Stack>
                        ) : (
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={12}
                                label="Certificate Data (JSON)"
                                value={renderDataJson}
                                onChange={(e) => setRenderDataJson(e.target.value)}
                                helperText="Use a JSON object for one certificate or a JSON array for batch generation."
                            />
                        )}
                        {onListCertificateBatchJobs && (
                            <Stack spacing={1} sx={{ pt: 1 }}>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="subtitle2">Batch Jobs</Typography>
                                    <AntBtn antType="text" onClick={() => void refreshCertificateBatchJobs(false)} disabled={loadingBatchJobs}>
                                        {loadingBatchJobs ? "Refreshing..." : "Refresh"}
                                    </AntBtn>
                                </Stack>
                                {loadingBatchJobs ? (
                                    <Typography variant="caption" color="text.secondary">Loading batches...</Typography>
                                ) : batchJobs.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">
                                        No batch jobs yet. Upload Excel or queue a JSON array to start one.
                                    </Typography>
                                ) : (
                                    <Stack spacing={0.75}>
                                        {batchJobs.map((batch) => (
                                            <Box key={batch.id} sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                                                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {batch.templateName} · {batch.status}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {batch.processedCount}/{batch.requestedCount} processed · {batch.successCount} success · {batch.failureCount} failed
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                            Created: {formatTimestamp(batch.createdAt)} · Completed: {formatTimestamp(batch.completedAt)}
                                                        </Typography>
                                                        {batch.errorMessage && (
                                                            <Typography variant="caption" color="error" sx={{ display: "block" }}>
                                                                {batch.errorMessage}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    {onDownloadCertificateBatchZip && (batch.status === "COMPLETED" || batch.status === "COMPLETED_WITH_ERRORS") && (
                                                        <AntBtn
                                                            onClick={() => void handleDownloadBatchJobZip(batch)}
                                                            disabled={downloadingBatchJobId === batch.id || !batch.zipFileName}
                                                        >
                                                            {downloadingBatchJobId === batch.id ? "Downloading..." : "Download ZIP"}
                                                        </AntBtn>
                                                    )}
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Stack>
                        )}
                    </Stack>
                    {renderDialogError && (
                        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                            {renderDialogError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <AntBtn
                        antType="text"
                        onClick={() => {
                            setRenderDialogOpen(false);
                            setRenderDialogError(null);
                        }}
                        disabled={renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal}
                    >
                        Cancel
                    </AntBtn>
                    {onStoreCertificate && (
                        <AntBtn
                            onClick={handleStoreCertificateAction}
                            disabled={renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal}
                        >
                            {storingCertificateExternal ? "Storing..." : storeCertificateLabel}
                        </AntBtn>
                    )}
                    {onStoreCertificateBatch && (
                        <AntBtn
                            onClick={handleStoreCertificateBatchAction}
                            disabled={renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal}
                        >
                            {storingCertificateBatchExternal ? "Storing batch..." : storeCertificateBatchLabel}
                        </AntBtn>
                    )}
                    {onBatchRenderCertificates && (
                        <AntBtn
                            onClick={handleBatchRenderAction}
                            disabled={renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal}
                        >
                            {batchRenderingExternal ? "Generating batch..." : batchRenderButtonLabel}
                        </AntBtn>
                    )}
                    {onDownloadRenderedFo && (
                        <AntBtn
                            onClick={handleDownloadRenderedFoAction}
                            disabled={renderingExternal || downloadingRenderedFoExternal || batchRenderingExternal || storingCertificateExternal || storingCertificateBatchExternal || queueingBatchJobExternal}
                        >
                            {downloadingRenderedFoExternal ? "Downloading FO..." : downloadRenderedFoLabel}
                        </AntBtn>
                    )}
                    <AntBtn antType="primary" onClick={handleRenderAction} disabled={renderingExternal || queueingBatchJobExternal}>
                        {renderingExternal ? "Generating..." : renderButtonLabel}
                    </AntBtn>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
