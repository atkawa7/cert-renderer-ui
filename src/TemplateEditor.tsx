// TemplateEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
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
    Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { InputAdornment } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { Rnd, type RndDragCallback, type RndResizeCallback } from "react-rnd";
import { useConfirm } from "./components/ConfirmDialogProvider";
import { convertTemplateToDesignDraft, type DesignCreateDraft } from "./designCatalog";

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

function parseEmToNumber(v?: string, fallback = 24): number {
    if (!v) return fallback;
    const n = parseFloat(String(v).replace("em", "").trim());
    return Number.isFinite(n) ? n : fallback;
}

function parseLineHeightToNumber(v?: string | number, fallback = 1.1): number {
    if (v === null || v === undefined) return fallback;
    const n = parseFloat(String(v).replace("em", "").replace("px", "").trim());
    return Number.isFinite(n) ? n : fallback;
}

function toEm(n: number): string {
    // keep it clean like "35em"
    return `${Math.round(n)}em`;
}

function clampNum(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

// ---------------- Template model types ----------------
export type Background = { url: string; type: "image" | "color"; color?: string };
export type BlockType = "text" | "image" | "horizontal-line";
export type BaseBlockStyle = { top?: string; left?: string; width?: string; height?: string };

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

export type TextBlock = {
    id: string;
    type: "text";
    style: TextBlockStyle;
    value: string;
    autoScale?: boolean;
    locked?: boolean;
};

export type ImageBlock = { id: string; type: "image"; style: ImageBlockStyle; value: string; locked?: boolean };
export type HorizontalLineBlock = { id: string; type: "horizontal-line"; style: LineBlockStyle; locked?: boolean };
export type Block = TextBlock | ImageBlock | HorizontalLineBlock;

export type Template = {
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
    defaultRenderDataJson?: string;
    onConvertToDesign?: (design: DesignCreateDraft) => void | Promise<void>;
    convertToDesignLabel?: string;
    sessionStorageKey?: string;
    onPersistSession?: (template: Template) => void | Promise<void>;
    persistDebounceMs?: number;
};

type Size = { w: number; h: number };
type AlignMode = "left" | "h-center" | "right" | "top" | "v-center" | "bottom";

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
    if (b.type === "horizontal-line") {
        const s = b.style as LineBlockStyle;
        s.backgroundColor ??= "#333333";
        s.height ??= "0.6%";
    }

    return b;
}
function isTextBlock(b: Block): b is TextBlock {
    return b.type === "text";
}
function isImageBlock(b: Block): b is ImageBlock {
    return b.type === "image";
}
function isLineBlock(b: Block): b is HorizontalLineBlock {
    return b.type === "horizontal-line";
}
function blockTypeLabel(b: Block): string {
    if (b.type === "text") return "Text";
    if (b.type === "image") return "Image";
    return "Line";
}
function normalizeTemplate(input: Template): Template {
    const t = deepClone(input);
    t.blocks = (t.blocks ?? []).map((b) => {
        if (!(b as any).id) (b as any).id = makeId();
        return normalizeBlock(b as Block);
    });
    if (!t.background) t.background = { type: "color", url: "", color: "#ffffff" };
    t.name ??= "";
    t.paperSize ??= "A4";
    t.orientation ??= "portrait";
    return t;
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
};
const PALETTE_WIDTH_PX = 320;

// ---------------- Component ----------------
export default function TemplateEditor({
                                           initialTemplate,
                                           assetBaseUrl = "",
                                           defaultPreview = false,
                                           onSaveTemplate,
                                           saveButtonLabel = "Save",
                                           onRenderTemplate,
                                           renderButtonLabel = "Render PDF",
                                           defaultRenderDataJson = "{}",
                                           onConvertToDesign,
                                           convertToDesignLabel = "Convert to Design",
                                           sessionStorageKey,
                                           onPersistSession,
                                           persistDebounceMs = 1200,
                                       }: TemplateEditorProps) {
    const confirm = useConfirm();
    const [template, setTemplate] = useState<Template>(() => normalizeTemplate(initialTemplate));

    // ✅ Preview toggle
    const [previewMode, setPreviewMode] = useState<boolean>(defaultPreview);
    const [gridEnabled, setGridEnabled] = useState<boolean>(false);
    const [zoomPct, setZoomPct] = useState<number>(100);
    const gridSizePx = 20;

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingExternal, setSavingExternal] = useState<boolean>(false);
    const [renderingExternal, setRenderingExternal] = useState<boolean>(false);
    const [convertingDesign, setConvertingDesign] = useState<boolean>(false);
    const [renderDataJson, setRenderDataJson] = useState<string>(defaultRenderDataJson);
    const importInputRef = useRef<HTMLInputElement | null>(null);
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

    const primarySelectedId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;

    const selectedBlock = useMemo(
        () => template.blocks.find((b) => b.id === primarySelectedId) ?? null,
        [template.blocks, primarySelectedId]
    );

    const paperKey = normalizePaperKey(template.paperSize);
    const orientation = normalizeOrientation(template.orientation);
    const aspectRatio = getAspectRatioMm(paperKey, orientation);

    const canvasOuterRef = useRef<HTMLDivElement | null>(null);
    const canvasInnerRef = useRef<HTMLDivElement | null>(null);

    const [canvasBaseWidth, setCanvasBaseWidth] = useState<number>(900);
    const [canvasSize, setCanvasSize] = useState<Size>({ w: 900, h: 900 / aspectRatio });

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

    const bgUrl = template.background?.type === "image" ? `${assetBaseUrl}${template.background.url}` : null;

    function updateBlock(blockId: string, patch: Partial<Block>) {
        setTemplate((prev) => {
            const next = deepClone(prev);
            next.blocks = next.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as Block) : b));
            return next;
        });
    }

    function updateBlockStyle(blockId: string, patch: Partial<BaseBlockStyle & Record<string, unknown>>) {
        setTemplate((prev) => {
            const next = deepClone(prev);
            next.blocks = next.blocks.map((b) =>
                b.id === blockId ? ({ ...b, style: { ...(b.style ?? {}), ...patch } } as Block) : b
            );
            return next;
        });
    }

    function toggleLock(blockId: string) {
        const b = template.blocks.find((x) => x.id === blockId);
        if (!b) return;
        updateBlock(blockId, { locked: !Boolean((b as any).locked) } as Partial<Block>);
    }

    async function copyJson() {
        await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
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
        setTemplate((prev) => ({
            ...prev,
            blocks: prev.blocks.filter((b) => !selectedIds.includes(b.id)),
        }));
        setSelectedIds([]);
        setEditingId(null);
    }

    function duplicateSelected() {
        if (!selectedIds.length || previewMode) return;
        setTemplate((prev) => {
            const selectedSet = new Set(selectedIds);
            const toDuplicate = prev.blocks.filter((b) => selectedSet.has(b.id)).map(normalizeBlock);
            if (!toDuplicate.length) return prev;

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

            return { ...prev, blocks: [...prev.blocks, ...duplicates] };
        });
    }

    function setSelectedLocked(nextLocked: boolean) {
        if (!selectedIds.length || previewMode) return;
        setTemplate((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => (selectedIds.includes(b.id) ? ({ ...b, locked: nextLocked } as Block) : b)),
        }));
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
        setTemplate((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
        setSelectedIds([block.id]);
        setEditingId(type === "text" ? block.id : null);
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
        let parsedData: unknown;
        try {
            parsedData = JSON.parse(renderDataJson || "{}");
        } catch {
            window.alert("Render data must be valid JSON.");
            return;
        }
        try {
            setRenderingExternal(true);
            await onRenderTemplate(deepClone(template), parsedData);
        } finally {
            setRenderingExternal(false);
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
            } catch {
                window.alert("Invalid JSON file.");
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
        setTemplate((prev) => {
            const selectedSet = new Set(selectedIds);
            const selected = prev.blocks.filter((b) => selectedSet.has(b.id));
            const others = prev.blocks.filter((b) => !selectedSet.has(b.id));
            const nextBlocks = direction === "front" ? [...others, ...selected] : [...selected, ...others];
            return { ...prev, blocks: nextBlocks };
        });
    }

    function moveLayer(blockId: string, direction: "front" | "back") {
        if (previewMode) return;
        setTemplate((prev) => {
            const idx = prev.blocks.findIndex((b) => b.id === blockId);
            if (idx < 0) return prev;
            const block = prev.blocks[idx];
            const others = prev.blocks.filter((b) => b.id !== blockId);
            const nextBlocks = direction === "front" ? [...others, block] : [block, ...others];
            return { ...prev, blocks: nextBlocks };
        });
        setSelectedIds([blockId]);
    }

    function nudgeSelectedBy(deltaX: number, deltaY: number) {
        if (!selectedIds.length || previewMode) return;
        setTemplate((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => {
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
            }),
        }));
    }

    function alignSelected(mode: AlignMode) {
        if (previewMode || selectedIds.length < 2) return;

        setTemplate((prev) => {
            const selected = prev.blocks.filter((b) => selectedIds.includes(b.id)).map(normalizeBlock);
            if (selected.length < 2) return prev;

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

            return {
                ...prev,
                blocks: prev.blocks.map((b) => {
                    const patch = patchMap.get(b.id);
                    if (!patch) return b;
                    return { ...b, style: { ...(b.style ?? {}), ...patch } };
                }),
            };
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
                setSelectedIds(template.blocks.map((b) => b.id));
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
    }, [previewMode, selectedIds, template]);

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

        setTemplate((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
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
        const found = template.blocks.find((b) => b.id === id);
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

        const selectedBlocks = template.blocks
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
    }, [previewMode, selectedIds, template.blocks, canvasSize.w, canvasSize.h]);

    // When entering preview: clear selection + editing
    useEffect(() => {
        if (previewMode) {
            setSelectedIds([]);
            setEditingId(null);
        }
    }, [previewMode]);

    useEffect(() => {
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
    }, [sessionStorageKey]);

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
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f3f5f7" }}>
            <Box sx={{ flex: 1, p: 3, pr: `${PALETTE_WIDTH_PX + 24}px`, overflow: "auto", minWidth: 0 }}>
                <Box
                    sx={{
                        minHeight: "calc(100vh - 32px)",
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
                                "linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03)), linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03))",
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
                                    bgcolor: "#fff",
                                    border: "2px solid rgba(0,0,0,0.2)",
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                                    backgroundImage: bgUrl ? `url("${bgUrl}")` : "none",
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
                                                "linear-gradient(to right, rgba(25,118,210,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(25,118,210,0.16) 1px, transparent 1px)",
                                            backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
                                        }}
                                    />
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
                                                bgcolor: "rgba(255,255,255,0.75)",
                                                border: "1px dashed rgba(0,0,0,0.25)",
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
                                                bgcolor: "rgba(255,255,255,0.75)",
                                                border: "1px dashed rgba(0,0,0,0.25)",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            blocks: {template.blocks.length}
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
                                                border: "2px solid rgba(25,118,210,0.6)",
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
                                                    bgcolor: "#fff",
                                                    border: "1px solid rgba(0,0,0,0.15)",
                                                    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                                                    "&:hover": { bgcolor: "#fff" },
                                                }}
                                                title="Delete selected"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
                                {template.blocks.map((raw) => {
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
                                            onContextMenu={(e) => {
                                                if (previewMode) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!selectedIds.includes(b.id)) {
                                                    setSelectedIds([b.id]);
                                                    setEditingId(null);
                                                }
                                                openContextMenu(e, b.id);
                                            }}
                                            onDoubleClick={(e) => {
                                                if (!allowEdit) return;
                                                e.stopPropagation();
                                                if (b.type === "text") setEditingId(b.id);
                                            }}
                                            onDragStop={onDragStop}
                                            onResizeStop={onResizeStop}
                                            // ✅ no dotted lines / borders in preview
                                            style={{
                                                border: previewMode ? "none" : isSelected ? "2px solid #1976d2" : "1px dashed rgba(0,0,0,0.2)",
                                                boxShadow: previewMode ? "none" : isSelected ? "0 0 0 3px rgba(25,118,210,0.15)" : "none",
                                                borderRadius: previewMode ? 0 : 6,
                                                background: previewMode ? "transparent" : isSelected ? "rgba(25,118,210,0.04)" : "transparent",
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
                variant="permanent"
                anchor="right"
                PaperProps={{
                    sx: { width: `${PALETTE_WIDTH_PX}px`, p: 2, borderLeft: "1px solid", borderColor: "divider" },
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="h6">Template Editor</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={undo}
                            disabled={!canUndo}
                        >
                            Undo
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={redo}
                            disabled={!canRedo}
                        >
                            Redo
                        </Button>
                        <Button
                            size="small"
                            variant={previewMode ? "contained" : "outlined"}
                            startIcon={previewMode ? <EditIcon /> : <VisibilityIcon />}
                            onClick={() => setPreviewMode((v) => !v)}
                        >
                            {previewMode ? "Edit" : "Preview"}
                        </Button>
                    </Stack>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {previewMode
                        ? "Preview mode: borders/handles hidden. Interactions disabled."
                        : "Edit mode: drag components onto the canvas. Click to select. Double-click text to edit. Backspace/Delete removes selection."}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Components (disabled in preview) */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Components (drag onto canvas)
                </Typography>

                <Stack spacing={1} sx={{ opacity: previewMode ? 0.5 : 1 }}>
                    <PaletteItem
                        disabled={previewMode}
                        icon={<TextFieldsIcon />}
                        label="Text"
                        onDragStart={(e) => onPaletteDragStart(e, "text")}
                    />
                    <PaletteItem
                        disabled={previewMode}
                        icon={<AddPhotoAlternateIcon />}
                        label="Image"
                        onDragStart={(e) => onPaletteDragStart(e, "image")}
                    />
                    <PaletteItem
                        disabled={previewMode}
                        icon={<HorizontalRuleIcon />}
                        label="Horizontal line"
                        onDragStart={(e) => onPaletteDragStart(e, "horizontal-line")}
                    />
                </Stack>

                <Divider sx={{ my: 2 }} />

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
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No element selected.
                    </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Zoom
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setZoomPct((z) => clampNum(z - 10, 25, 300))}
                    >
                        -
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => setZoomPct(100)}>
                        {zoomPct}%
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setZoomPct((z) => clampNum(z + 10, 25, 300))}
                    >
                        +
                    </Button>
                </Stack>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Canvas Grid
                </Typography>
                <FormControlLabel
                    control={
                        <Switch
                            checked={gridEnabled}
                            onChange={(_, checked) => setGridEnabled(checked)}
                            disabled={previewMode}
                        />
                    }
                    label="Enable grid + snap"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Grid size: {gridSizePx}px
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Align Selection
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("left")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Left
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("h-center")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Center
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("right")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Right
                    </Button>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("top")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Top
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("v-center")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Middle
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => alignSelected("bottom")}
                        disabled={previewMode || selectedIds.length < 2}
                    >
                        Bottom
                    </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Layers
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => moveSelectedLayers("front")}
                        disabled={previewMode || selectedIds.length === 0}
                    >
                        Send to front
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => moveSelectedLayers("back")}
                        disabled={previewMode || selectedIds.length === 0}
                    >
                        Send to back
                    </Button>
                </Stack>

                <Stack spacing={0.5} sx={{ maxHeight: 220, overflow: "auto", pr: 0.5 }}>
                    {[...template.blocks].reverse().map((b, idx) => {
                        const selected = selectedIds.includes(b.id);
                        return (
                            <Stack
                                key={b.id}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: 1,
                                    border: "1px solid rgba(0,0,0,0.12)",
                                    bgcolor: selected ? "rgba(25,118,210,0.08)" : "#fff",
                                    cursor: previewMode ? "default" : "pointer",
                                }}
                                onClick={() => {
                                    if (previewMode) return;
                                    setSelectedIds([b.id]);
                                    setEditingId(null);
                                }}
                            >
                                <Typography variant="caption" sx={{ pr: 1 }}>
                                    {template.blocks.length - idx}. {blockTypeLabel(b)}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveLayer(b.id, "front");
                                        }}
                                        disabled={previewMode}
                                    >
                                        Front
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveLayer(b.id, "back");
                                        }}
                                        disabled={previewMode}
                                    >
                                        Back
                                    </Button>
                                </Stack>
                            </Stack>
                        );
                    })}
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
                            onChange={(e: any) => setTemplate((p) => ({ ...p, paperSize: e.target.value }))}
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
                            onChange={(e: any) => setTemplate((p) => ({ ...p, orientation: e.target.value }))}
                        >
                            <MenuItem value="portrait">portrait</MenuItem>
                            <MenuItem value="landscape">landscape</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                <TextField
                    fullWidth
                    label="Background URL"
                    value={template.background?.url ?? ""}
                    onChange={(e) =>
                        setTemplate((p) => ({
                            ...p,
                            background: {
                                ...(p.background ?? { type: "image", url: "" }),
                                type: "image",
                                url: e.target.value,
                            },
                        }))
                    }
                    sx={{ mt: 1 }}
                    disabled={previewMode}
                />

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={copyJson}>
                        Copy JSON
                    </Button>
                    <Button variant="outlined" onClick={handleSaveAction} disabled={savingExternal}>
                        {savingExternal ? "Saving..." : saveButtonLabel}
                    </Button>
                    {onConvertToDesign && (
                        <Button
                            variant="outlined"
                            onClick={handleConvertToDesignAction}
                            disabled={convertingDesign}
                        >
                            {convertingDesign ? "Converting..." : convertToDesignLabel}
                        </Button>
                    )}
                    <Button variant="outlined" onClick={() => importInputRef.current?.click()}>
                        Import
                    </Button>
                    <Button
                        startIcon={<DeleteIcon />}
                        color="error"
                        variant="outlined"
                        onClick={deleteSelected}
                        disabled={previewMode || selectedIds.length == 0}
                    >
                        Delete
                    </Button>
                </Stack>
                {onRenderTemplate && (
                    <>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            maxRows={8}
                            label="Render Data (JSON)"
                            value={renderDataJson}
                            onChange={(e) => setRenderDataJson(e.target.value)}
                            sx={{ mt: 1.5 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleRenderAction}
                            disabled={renderingExternal}
                            sx={{ mt: 1 }}
                        >
                            {renderingExternal ? "Rendering..." : renderButtonLabel}
                        </Button>
                    </>
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
                            const selectedBlocksNow = template.blocks.filter((b) => selectedIds.includes(b.id));
                            const shouldLock = selectedBlocksNow.some((b) => !Boolean((b as any).locked));
                            setSelectedLocked(shouldLock);
                            closeContextMenu();
                        }}
                    >
                        {template.blocks
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
        </Box>
    );
}

// -------------------- Palette Item --------------------
function PaletteItem({
                         icon,
                         label,
                         onDragStart,
                         disabled = false,
                     }: {
    icon: React.ReactNode;
    label: string;
    onDragStart: (e: React.DragEvent) => void;
    disabled?: boolean;
}) {
    return (
        <Box
            draggable={!disabled}
            onDragStart={(e) => {
                if (disabled) return;
                onDragStart(e);
            }}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.2,
                py: 1,
                borderRadius: 2,
                border: "1px solid rgba(0,0,0,0.15)",
                bgcolor: "#fff",
                cursor: disabled ? "not-allowed" : "grab",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                opacity: disabled ? 0.6 : 1,
                "&:active": { cursor: disabled ? "not-allowed" : "grabbing" },
            }}
        >
            {icon}
            <Typography variant="body2">{label}</Typography>
        </Box>
    );
}

function isDataUrl(value?: string): boolean {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value ?? "").trim());
}
function isAbsoluteUrl(value?: string): boolean {
    return /^(https?:)?\/\//i.test(String(value ?? "").trim());
}
function resolveImageSrc(value: string | undefined, assetBaseUrl = ""): string {
    const src = String(value ?? "").trim();
    if (!src) return "";
    if (isDataUrl(src) || isAbsoluteUrl(src)) return src;
    return `${assetBaseUrl}${src}`;
}

// -------------------- Block Renderer --------------------
function BlockRenderer({
                           block,
                           assetBaseUrl,
                           editing,
                           previewMode,
                           onCommitText,
                           onCancelEdit,
                       }: {
    block: Block;
    assetBaseUrl: string;
    editing: boolean;
    previewMode: boolean;
    onCommitText: (text: string) => void;
    onCancelEdit: () => void;
}) {
    if (isTextBlock(block)) {
        return (
            <EditableText
                block={block}
                editing={editing}
                previewMode={previewMode}
                onCommit={onCommitText}
                onCancel={onCancelEdit}
            />
        );
    }

    if (isLineBlock(block)) {
        // ✅ rectangle hit-box is provided by Rnd; we draw a centered 2px line inside
        return (
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 0.5,
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        height: "2px",
                        bgcolor: block.style.backgroundColor ?? "#333",
                        borderRadius: 999,
                    }}
                />
            </Box>
        );
    }

    if (isImageBlock(block)) {
        const url = resolveImageSrc(block.value, assetBaseUrl);
        return (
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    bgcolor: url ? "transparent" : "rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    borderRadius: 0,
                }}
            >
                {url ? (
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                    !previewMode && (
                        <Typography variant="caption" color="text.secondary">
                            Image (set URL, relative path, or data URL in inspector)
                        </Typography>
                    )
                )}
            </Box>
        );
    }

    return null;
}

function EditableText({
                          block,
                          editing,
                          previewMode,
                          onCommit,
                          onCancel,
                      }: {
    block: TextBlock;
    editing: boolean;
    previewMode: boolean;
    onCommit: (text: string) => void;
    onCancel: () => void;
}) {
    const s = block.style;
    const ref = useRef<HTMLDivElement | null>(null);

    // treat "35em" numeric part as px-ish
    const fontSizeNum = parseFloat(String(s.fontSize ?? "24").replace("em", ""));
    const fontSizePx = clamp(Number.isNaN(fontSizeNum) ? 24 : fontSizeNum, 6, 220);

    useEffect(() => {
        if (editing && ref.current) {
            ref.current.focus();
            const range = document.createRange();
            range.selectNodeContents(ref.current);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [editing]);

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                color: s.color ?? "#333",
                fontFamily: s.fontFamily ?? "serif",
                fontWeight: s.fontWeight ?? 400,
                fontStyle: s.fontStyle ?? "normal",
                textDecoration: s.textDecoration ?? "none",
                textAlign: s.textAlign ?? "left",
                display: "flex",
                alignItems: "center",
                justifyContent:
                    s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-end" : "flex-start",
                px: 0.5,
                overflow: "hidden",
                whiteSpace: "pre-wrap",
                lineHeight: parseLineHeightToNumber(s.lineHeight, 1.1),
                fontSize: `${fontSizePx}px`,
            }}
        >
            <Box
                ref={ref}
                contentEditable={!previewMode && editing}
                suppressContentEditableWarning
                spellCheck={false}
                onBlur={() => {
                    if (previewMode) return;
                    if (!editing) return;
                    onCommit((ref.current?.innerText ?? "").trimEnd());
                }}
                onKeyDown={(e) => {
                    if (previewMode) return;
                    if (!editing) return;
                    if (e.key === "Enter") {
                        e.preventDefault();
                        onCommit((ref.current?.innerText ?? "").trimEnd());
                    }
                    if (e.key === "Escape") {
                        e.preventDefault();
                        if (ref.current) ref.current.innerText = block.value ?? "";
                        onCancel();
                    }
                }}
                style={{ outline: "none", width: "100%" }}
            >
                {block.value ?? ""}
            </Box>
        </Box>
    );
}

// -------------------- Inspector --------------------
function Inspector({
                       block,
                       onPatch,
                       onStylePatch,
                       onToggleLock,
                   }: {
    block: Block;
    onPatch: (patch: Partial<Block>) => void;
    onStylePatch: (patch: Partial<BaseBlockStyle & Record<string, unknown>>) => void;
    onToggleLock: () => void;
}) {
    const s = block.style;
    const locked = Boolean((block as any).locked);
    const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

    function onSelectImageFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !isImageBlock(block)) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result) return;
            onPatch({ value: result } as Partial<Block>);
        };
        reader.readAsDataURL(file);

        // allow selecting the same file again
        e.target.value = "";
    }

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">
                    {block.type.toUpperCase()} • {block.id}
                </Typography>
                <IconButton onClick={onToggleLock} size="small" title={locked ? "Unlock" : "Lock"}>
                    {locked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
            </Stack>

            {block.type !== "horizontal-line" && (
                <TextField
                    fullWidth
                    label={block.type === "image" ? "Image value (path/url)" : "Text value"}
                    value={"value" in block ? (block as any).value : ""}
                    onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                    helperText={block.type === "text" ? "Tip: double-click text on canvas to edit inline." : undefined}
                />
            )}

            {isImageBlock(block) && (
                <>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<AddPhotoAlternateIcon />}
                            onClick={() => imageUploadInputRef.current?.click()}
                        >
                            Upload image
                        </Button>
                        <Button
                            variant="text"
                            color="inherit"
                            onClick={() => onPatch({ value: "" } as Partial<Block>)}
                        >
                            Clear
                        </Button>
                    </Stack>

                    <Box
                        component="input"
                        ref={imageUploadInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onSelectImageFile}
                        sx={{ display: "none" }}
                    />

                    {Boolean(block.value) && (
                        <Box
                            sx={{
                                width: "100%",
                                height: 120,
                                borderRadius: 1,
                                border: "1px solid rgba(0,0,0,0.15)",
                                bgcolor: "rgba(0,0,0,0.03)",
                                overflow: "hidden",
                            }}
                        >
                            <img
                                src={resolveImageSrc(block.value, "")}
                                alt="Selected block"
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        </Box>
                    )}
                </>
            )}

            {isTextBlock(block) && (
                <>
                    {/* Color + font size row */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* ✅ Color picker */}
                        <TextField
                            fullWidth
                            label="Color"
                            value={block.style.color ?? "#333333"}
                            onChange={(e) => onStylePatch({ color: e.target.value })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Box
                                            component="input"
                                            type="color"
                                            value={block.style.color ?? "#333333"}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                onStylePatch({ color: e.target.value })
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                padding: 0,
                                                border: "none",
                                                background: "transparent",
                                                cursor: "pointer",
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* ✅ Font size stepper */}
                        <TextField
                            label="Font"
                            value={block.style.fontSize ?? "24em"}
                            onChange={(e) => onStylePatch({ fontSize: e.target.value })}
                            sx={{ width: 130 }}
                            inputProps={{ inputMode: "numeric" }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconButton
                                            size="small"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                const cur = parseEmToNumber(block.style.fontSize, 24);
                                                const next = clampNum(cur - 1, 6, 220);
                                                onStylePatch({ fontSize: toEm(next) });
                                            }}
                                        >
                                            <RemoveIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                const cur = parseEmToNumber(block.style.fontSize, 24);
                                                const next = clampNum(cur + 1, 6, 220);
                                                onStylePatch({ fontSize: toEm(next) });
                                            }}
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            helperText="em"
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        label="Font family"
                        value={block.style.fontFamily ?? ""}
                        onChange={(e) => onStylePatch({ fontFamily: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Line height"
                        value={String(block.style.lineHeight ?? "1.1")}
                        onChange={(e) => onStylePatch({ lineHeight: e.target.value })}
                        helperText="Examples: 1.1, 1.3, 1.6"
                    />

                    <ToggleButtonGroup
                        value={String(block.style.textAlign ?? "left")}
                        exclusive
                        onChange={(_, v) => v && onStylePatch({ textAlign: v })}
                        size="small"
                    >
                        <ToggleButton value="left">Left</ToggleButton>
                        <ToggleButton value="center">Center</ToggleButton>
                        <ToggleButton value="right">Right</ToggleButton>
                    </ToggleButtonGroup>
                </>
            )}

            {isLineBlock(block) && (
                <TextField
                    fullWidth
                    label="Line color"
                    value={block.style.backgroundColor ?? ""}
                    onChange={(e) => onStylePatch({ backgroundColor: e.target.value })}
                />
            )}

            <Divider />
            <Typography variant="subtitle2">Layout (% values)</Typography>

            <Stack direction="row" spacing={1}>
                <TextField fullWidth label="Top" value={s.top ?? ""} onChange={(e) => onStylePatch({ top: e.target.value })} />
                <TextField
                    fullWidth
                    label="Left"
                    value={s.left ?? ""}
                    onChange={(e) => onStylePatch({ left: e.target.value })}
                />
            </Stack>

            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    label="Width"
                    value={s.width ?? ""}
                    onChange={(e) => onStylePatch({ width: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Height"
                    value={s.height ?? ""}
                    onChange={(e) => onStylePatch({ height: e.target.value })}
                />
            </Stack>
        </Stack>
    );
}
