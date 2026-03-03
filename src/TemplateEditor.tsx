// TemplateEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
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
import { Rnd, type RndDragCallback, type RndResizeCallback } from "react-rnd";


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
    return orientation === "portrait" ? s.wMm / s.hMm : s.hMm / s.wMm;
}

// ---------------- Template model types ----------------
export type Background = { url: string; type: "image" | "color"; color?: string };
export type BlockType = "text" | "image" | "horizontal-line";
export type BaseBlockStyle = { top?: string; left?: string; width?: string; height?: string };

export type TextBlockStyle = BaseBlockStyle & {
    color?: string;
    fontSize?: string;
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

export type TemplateEditorProps = { initialTemplate: Template; assetBaseUrl?: string };

type Size = { w: number; h: number };

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

// ---------------- Drag payload ----------------
type PalettePayload = { type: BlockType };
const DND_MIME = "application/x-template-block";

const DEFAULT_NEW_SIZES: Record<BlockType, { wPct: number; hPct: number }> = {
    text: { wPct: 35, hPct: 10 },
    image: { wPct: 20, hPct: 20 },
    "horizontal-line": { wPct: 30, hPct: 0.6 },
};

// ---------------- Component ----------------
export default function TemplateEditor({ initialTemplate, assetBaseUrl = "" }: TemplateEditorProps) {
    const [template, setTemplate] = useState<Template>(() => {
        const t = deepClone(initialTemplate);
        t.blocks = (t.blocks ?? []).map((b) => {
            if (!(b as any).id) (b as any).id = makeId();
            return normalizeBlock(b);
        });
        if (!t.background) t.background = { type: "color", url: "", color: "#ffffff" };
        return t;
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const selectedBlock = useMemo(
        () => template.blocks.find((b) => b.id === selectedId) ?? null,
        [template.blocks, selectedId]
    );

    const paperKey = normalizePaperKey(template.paperSize);
    const orientation = normalizeOrientation(template.orientation);
    const aspectRatio = getAspectRatioMm(paperKey, orientation);

    const canvasOuterRef = useRef<HTMLDivElement | null>(null);
    const canvasInnerRef = useRef<HTMLDivElement | null>(null);

    const [canvasSize, setCanvasSize] = useState<Size>({ w: 900, h: 900 / aspectRatio });

    // measure outer width => derive inner height
    useEffect(() => {
        const el = canvasOuterRef.current;
        if (!el) return;

        const ro = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            const w = rect.width;
            const h = w / aspectRatio;
            setCanvasSize({ w, h });
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, [aspectRatio]);

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

    function deleteSelected() {
        if (!selectedId) return;
        setTemplate((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== selectedId) }));
        setSelectedId(null);
        setEditingId(null);
    }

    // ✅ Backspace/Delete handler (only when NOT typing in an input/contentEditable)
    useEffect(() => {
        function isTypingTarget(el: EventTarget | null): boolean {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return true;
            if (el.isContentEditable) return true;
            // MUI TextField wraps inputs; if user clicks inside, activeElement will be input anyway
            return false;
        }

        function onKeyDown(e: KeyboardEvent) {
            if (!selectedId) return;

            if (e.key !== "Backspace" && e.key !== "Delete") return;

            // don't delete blocks while user is editing text on canvas or typing in inspector
            const active = document.activeElement;
            if (isTypingTarget(active)) return;

            e.preventDefault();
            deleteSelected();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, template.blocks]);

    // ---------- Palette DnD ----------
    function onPaletteDragStart(e: React.DragEvent, type: BlockType) {
        const payload: PalettePayload = { type };
        const s = JSON.stringify(payload);

        e.dataTransfer.setData(DND_MIME, s);
        e.dataTransfer.setData("text/plain", s);
        e.dataTransfer.effectAllowed = "copy";
    }

    function onCanvasDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function onCanvasDrop(e: React.DragEvent) {
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

        const { wPct, hPct } = DEFAULT_NEW_SIZES[payload.type];
        const wPx = (wPct / 100) * rect.width;
        const hPx = (hPct / 100) * rect.height;

        const leftPx = clamp(x - wPx / 2, 0, rect.width - wPx);
        const topPx = clamp(y - hPx / 2, 0, rect.height - hPx);

        const baseStyle: BaseBlockStyle = {
            left: pxToPct(leftPx, rect.width),
            top: pxToPct(topPx, rect.height),
            width: `${wPct}%`,
            height: `${hPct}%`,
        };

        const id = makeId();
        let block: Block;

        if (payload.type === "text") {
            block = normalizeBlock({
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
                    fontWeight: 400,
                    fontStyle: "normal",
                    textAlign: "left",
                    textDecoration: "none",
                },
            });
        } else if (payload.type === "image") {
            block = normalizeBlock({
                id,
                type: "image",
                value: "",
                locked: false,
                style: { ...baseStyle },
            });
        } else {
            block = normalizeBlock({
                id,
                type: "horizontal-line",
                locked: false,
                style: { ...baseStyle, backgroundColor: "#333333" },
            });
        }

        setTemplate((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
        setSelectedId(id);
        setEditingId(payload.type === "text" ? id : null);
    }

    // ---------- RND drag/resize ----------
    const onDragStop: RndDragCallback = (_e, d) => {
        const id = (d.node as HTMLElement).dataset.blockId;
        if (!id) return;

        updateBlockStyle(id, {
            left: pxToPct(d.x, canvasSize.w),
            top: pxToPct(d.y, canvasSize.h),
        });
    };

    const onResizeStop: RndResizeCallback = (_e, _dir, ref, _delta, position) => {
        const id = (ref as HTMLElement).dataset.blockId;
        if (!id) return;

        const newW = (ref as HTMLElement).offsetWidth;
        const newH = (ref as HTMLElement).offsetHeight;

        updateBlockStyle(id, {
            left: pxToPct(position.x, canvasSize.w),
            top: pxToPct(position.y, canvasSize.h),
            width: pxToPct(newW, canvasSize.w),
            height: pxToPct(newH, canvasSize.h),
        });
    };

    return (
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f3f5f7" }}>
            {/* CENTER: canvas */}
            <Box sx={{ flex: 1, p: 10, overflow: "auto", width: "65vw" }}>
                <Box
                    sx={{
                        minHeight: "calc(100vh - 48px)",
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
                        <Box ref={canvasOuterRef} sx={{ width: "min(1200px, 100%)", mx: "auto" }}>
                            <Box
                                ref={canvasInnerRef}
                                onDragOver={onCanvasDragOver}
                                onDrop={onCanvasDrop}
                                onMouseDown={(e) => {
                                    if (e.target === e.currentTarget) {
                                        setSelectedId(null);
                                        setEditingId(null);
                                    }
                                }}
                                sx={{
                                    width: "100%",
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

                                {template.blocks.map((raw) => {
                                    const b = normalizeBlock(raw);

                                    const x = pctToPx(b.style.left, canvasSize.w);
                                    const y = pctToPx(b.style.top, canvasSize.h);
                                    const w = pctToPx(b.style.width, canvasSize.w);
                                    const h = pctToPx(b.style.height, canvasSize.h);

                                    const isSelected = b.id === selectedId;
                                    const isEditing = b.id === editingId;
                                    const locked = Boolean((b as any).locked);
                                    const isLine = b.type === "horizontal-line";
                                    const minHitPx = 16; // clickable height
                                    const safeH = isLine ? Math.max(h, minHitPx) : h;

                                    return (
                                        <Rnd
                                            key={b.id}
                                            data-block-id={b.id}
                                            size={{ width: w, height: safeH }}
                                            position={{ x, y }}
                                            bounds="parent"
                                            enableResizing={!locked}
                                            disableDragging={locked}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedId(b.id);
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                if (b.type === "text") setEditingId(b.id);
                                            }}
                                            onDragStop={onDragStop}
                                            onResizeStop={onResizeStop}
                                            style={{
                                                border: isSelected ? "2px solid #1976d2" : "1px dashed rgba(0,0,0,0.2)",
                                                boxShadow: isSelected ? "0 0 0 3px rgba(25,118,210,0.15)" : "none",
                                                borderRadius: 6,
                                                background: isSelected ? "rgba(25,118,210,0.04)" : "transparent",
                                            }}
                                        >
                                            <Box sx={{ width: "100%", height: "100%" }}>
                                                <BlockRenderer
                                                    block={b}
                                                    assetBaseUrl={assetBaseUrl}
                                                    editing={isEditing}
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

            {/* RIGHT: palette + inspector */}
            <Drawer
                variant="permanent"
                anchor="right"
                PaperProps={{
                    sx: { width: "300px", p: 2, borderLeft: "1px solid", borderColor: "divider" },
                }}
            >
                <Typography variant="h6">Template Editor</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Drag components onto the canvas. Click to select. Double-click text to edit. Backspace/Delete removes selection.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Components (drag onto canvas)
                </Typography>

                <Stack spacing={1}>
                    <PaletteItem icon={<TextFieldsIcon />} label="Text" onDragStart={(e) => onPaletteDragStart(e, "text")} />
                    <PaletteItem icon={<AddPhotoAlternateIcon />} label="Image" onDragStart={(e) => onPaletteDragStart(e, "image")} />
                    <PaletteItem icon={<HorizontalRuleIcon />} label="Horizontal line" onDragStart={(e) => onPaletteDragStart(e, "horizontal-line")} />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Inspector
                </Typography>

                {selectedBlock ? (
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

                <Typography variant="subtitle2">Template</Typography>

                <TextField
                    fullWidth
                    label="Template name"
                    value={template.name ?? ""}
                    onChange={(e) => setTemplate((p) => ({ ...p, name: e.target.value }))}
                    sx={{ mt: 1 }}
                />

                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <FormControl fullWidth>
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

                    <FormControl fullWidth>
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
                            background: { ...(p.background ?? { type: "image", url: "" }), type: "image", url: e.target.value },
                        }))
                    }
                    sx={{ mt: 1 }}
                />

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={copyJson}>
                        Copy JSON
                    </Button>
                    {/* ✅ Delete button now deletes ANY selected block, including horizontal-line */}
                    <Button startIcon={<DeleteIcon />} color="error" variant="outlined" onClick={deleteSelected} disabled={!selectedId}>
                        Delete
                    </Button>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Canvas ratio: {aspectRatio.toFixed(4)} (w/h)
                </Typography>
            </Drawer>
        </Box>
    );
}

// -------------------- Palette Item --------------------
function PaletteItem({
                         icon,
                         label,
                         onDragStart,
                     }: {
    icon: React.ReactNode;
    label: string;
    onDragStart: (e: React.DragEvent) => void;
}) {
    return (
        <Box
            draggable
            onDragStart={onDragStart}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.2,
                py: 1,
                borderRadius: 2,
                border: "1px solid rgba(0,0,0,0.15)",
                bgcolor: "#fff",
                cursor: "grab",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                "&:active": { cursor: "grabbing" },
            }}
        >
            {icon}
            <Typography variant="body2">{label}</Typography>
        </Box>
    );
}

// -------------------- Block Renderer --------------------
function BlockRenderer({
                           block,
                           assetBaseUrl,
                           editing,
                           onCommitText,
                           onCancelEdit,
                       }: {
    block: Block;
    assetBaseUrl: string;
    editing: boolean;
    onCommitText: (text: string) => void;
    onCancelEdit: () => void;
}) {
    if (isTextBlock(block)) {
        return <EditableText block={block} editing={editing} onCommit={onCommitText} onCancel={onCancelEdit} />;
    }

    if (isLineBlock(block)) {
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
                        height: "2px", // actual visible line thickness
                        bgcolor: block.style.backgroundColor ?? "#333",
                        borderRadius: 999,
                    }}
                />
            </Box>
        );
    }

    if (isImageBlock(block)) {
        const url = block.value ? `${assetBaseUrl}${block.value}` : "";
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
                    borderRadius: 6,
                }}
            >
                {url ? (
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Image (set URL/value in inspector)
                    </Typography>
                )}
            </Box>
        );
    }

    return null;
}

function EditableText({
                          block,
                          editing,
                          onCommit,
                          onCancel,
                      }: {
    block: TextBlock;
    editing: boolean;
    onCommit: (text: string) => void;
    onCancel: () => void;
}) {
    const s = block.style;
    const ref = useRef<HTMLDivElement | null>(null);

    const fontSizeNum = parseFloat(String(s.fontSize ?? "24").replace("em", ""));
    const fontSizePx = clamp(Number.isNaN(fontSizeNum) ? 24 : fontSizeNum, 6, 200);

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
                justifyContent: s.textAlign === "center" ? "center" : s.textAlign === "right" ? "flex-end" : "flex-start",
                px: 0.5,
                overflow: "hidden",
                whiteSpace: "pre-wrap",
                lineHeight: 1.1,
                fontSize: `${fontSizePx}px`,
            }}
        >
            <Box
                ref={ref}
                contentEditable={editing}
                suppressContentEditableWarning
                spellCheck={false}
                onBlur={() => {
                    if (!editing) return;
                    onCommit((ref.current?.innerText ?? "").trimEnd());
                }}
                onKeyDown={(e) => {
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

            {isTextBlock(block) && (
                <>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            label="Color"
                            value={block.style.color ?? ""}
                            onChange={(e) => onStylePatch({ color: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label='Font size ("35em")'
                            value={block.style.fontSize ?? ""}
                            onChange={(e) => onStylePatch({ fontSize: e.target.value })}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        label="Font family"
                        value={block.style.fontFamily ?? ""}
                        onChange={(e) => onStylePatch({ fontFamily: e.target.value })}
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
                <TextField fullWidth label="Left" value={s.left ?? ""} onChange={(e) => onStylePatch({ left: e.target.value })} />
            </Stack>

            <Stack direction="row" spacing={1}>
                <TextField fullWidth label="Width" value={s.width ?? ""} onChange={(e) => onStylePatch({ width: e.target.value })} />
                <TextField fullWidth label="Height" value={s.height ?? ""} onChange={(e) => onStylePatch({ height: e.target.value })} />
            </Stack>
        </Stack>
    );
}