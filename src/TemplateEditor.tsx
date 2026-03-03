// TemplateEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Divider,
    Drawer,
    FormControl,
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
import ImageIcon from "@mui/icons-material/Image";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { Rnd, type RndDragCallback, type RndResizeCallback } from "react-rnd";

/**
 * ✅ Now uses template.paperSize + template.orientation to compute canvas aspect ratio.
 * Supports ISO A-series + common NA sizes. Unknown sizes fallback to A4.
 */

// -------------------- Paper sizes --------------------
type Orientation = "portrait" | "landscape" | string;
type PaperKey =
    | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6"
    | "LETTER" | "LEGAL" | "TABLOID" | "JUNIOR_LEGAL"
    | "B4_JIS"
    | "ARCH_A"
    | "C4";

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

    B4_JIS: { key: "B4_JIS", label: "B4 (JIS)", wMm: 257, hMm: 364 },
    ARCH_A: { key: "ARCH_A", label: "Arch A", wMm: 229, hMm: 305 },
    C4: { key: "C4", label: "C4 Envelope", wMm: 229, hMm: 324 },
};

// template uses "A4" etc; we normalize to our keys
function normalizePaperKey(paperSize: string | undefined): PaperKey {
    if (!paperSize) return "A4";
    const v = paperSize.trim().toUpperCase();

    // ISO A sizes
    if (/^A[0-6]$/.test(v)) return v as PaperKey;

    // North America and aliases
    if (v === "LETTER" || v === "ANSI A") return "LETTER";
    if (v === "LEGAL") return "LEGAL";
    if (v === "TABLOID" || v === "LEDGER" || v === "ANSI B") return "TABLOID";
    if (v === "JUNIOR LEGAL" || v === "JUNIOR_LEGAL") return "JUNIOR_LEGAL";

    // Others
    if (v === "B4" || v === "B4_JIS") return "B4_JIS";
    if (v === "ARCH A" || v === "ARCH_A") return "ARCH_A";
    if (v === "C4") return "C4";

    return "A4";
}

function normalizeOrientation(o: Orientation | undefined): "portrait" | "landscape" {
    const v = String(o ?? "portrait").toLowerCase();
    return v === "landscape" ? "landscape" : "portrait";
}

function getAspectRatioMm(paperKey: PaperKey, orientation: "portrait" | "landscape"): number {
    const s = PAPER_SIZES[paperKey] ?? PAPER_SIZES.A4;
    // CSS aspect-ratio expects width/height
    return orientation === "portrait" ? s.wMm / s.hMm : s.hMm / s.wMm;
}

// -------------------- Template model types --------------------
export type Background = { url: string; type: "image" | "color"; color?: string };
export type BlockType = "text" | "image" | "horizontal-line";

export type BaseBlockStyle = {
    top?: string;
    left?: string;
    width?: string;
    height?: string;
};

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

export type TextBlock = { id: string; type: "text"; style: TextBlockStyle; value: string; autoScale?: boolean };
export type ImageBlock = { id: string; type: "image"; style: ImageBlockStyle; value: string };
export type HorizontalLineBlock = { id: string; type: "horizontal-line"; style: LineBlockStyle };
export type Block = TextBlock | ImageBlock | HorizontalLineBlock;

export type Template = {
    name: string;
    background: Background;
    blocks: Block[];
    paperSize: string; // "A4", "LETTER", ...
    orientation: Orientation; // "landscape" | "portrait"
    thumbnail?: string;
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
    id?: string;
    workspaceId?: string;
    type?: string;
};

export type TemplateEditorProps = { initialTemplate: Template; assetBaseUrl?: string };

type Size = { w: number; h: number };

// -------------------- helpers --------------------
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

    if (!b.style.top) b.style.top = "10%";
    if (!b.style.left) b.style.left = "10%";
    if (!b.style.width) b.style.width = b.type === "horizontal-line" ? "30%" : "20%";
    if (!b.style.height) b.style.height = b.type === "horizontal-line" ? "0.3%" : "8%";

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
        s.height ??= "0.3%";
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

// -------------------- component --------------------
export default function TemplateEditor({ initialTemplate, assetBaseUrl = "" }: TemplateEditorProps) {
    const [template, setTemplate] = useState<Template>(() => {
        const t = deepClone(initialTemplate);
        t.blocks = (t.blocks ?? []).map(normalizeBlock);
        return t;
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedBlock = useMemo(
        () => template.blocks.find((b) => b.id === selectedId) ?? null,
        [template.blocks, selectedId]
    );

    const paperKey = normalizePaperKey(template.paperSize);
    const orientation = normalizeOrientation(template.orientation);
    const aspectRatio = getAspectRatioMm(paperKey, orientation); // width/height

    const canvasOuterRef = useRef<HTMLDivElement | null>(null);
    const [canvasSize, setCanvasSize] = useState<Size>({
        w: 1000,
        h: 1000 / aspectRatio,
    });

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

    const bgUrl =
        template.background?.type === "image" ? `${assetBaseUrl}${template.background.url}` : null;

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

    function addBlock(type: BlockType) {
        let block: Block;

        if (type === "text") {
            block = normalizeBlock({
                id: makeId(),
                type: "text",
                value: "New Text",
                autoScale: false,
                style: {
                    top: "10%",
                    left: "10%",
                    width: "30%",
                    height: "10%",
                    color: "#333333",
                    fontFamily: "serif",
                    fontSize: "24em",
                    fontWeight: 400,
                    fontStyle: "normal",
                    textAlign: "left",
                    textDecoration: "none",
                },
            });
        } else if (type === "image") {
            block = normalizeBlock({
                id: makeId(),
                type: "image",
                value: "",
                style: { top: "10%", left: "10%", width: "20%", height: "20%" },
            });
        } else {
            block = normalizeBlock({
                id: makeId(),
                type: "horizontal-line",
                style: { top: "10%", left: "10%", width: "30%", height: "0.3%", backgroundColor: "#333333" },
            });
        }

        setTemplate((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
        setSelectedId(block.id);
    }

    function deleteSelected() {
        if (!selectedId) return;
        setTemplate((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== selectedId) }));
        setSelectedId(null);
    }

    async function copyJson() {
        await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    }

    // Drag/resize callbacks (we read id from data-block-id)
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
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
            {/* Left: Canvas */}
            <Box sx={{ flex: 1, p: 2, overflow: "auto", backgroundColor: "red" }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Button startIcon={<TextFieldsIcon />} variant="contained" onClick={() => addBlock("text")}>
                        Add Text
                    </Button>
                    <Button startIcon={<ImageIcon />} variant="contained" onClick={() => addBlock("image")}>
                        Add Image
                    </Button>
                    <Button
                        startIcon={<HorizontalRuleIcon />}
                        variant="contained"
                        onClick={() => addBlock("horizontal-line")}
                    >
                        Add Line
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={copyJson}>
                        Copy JSON
                    </Button>
                    <Button
                        startIcon={<DeleteIcon />}
                        color="error"
                        variant="outlined"
                        onClick={deleteSelected}
                        disabled={!selectedId}
                    >
                        Delete
                    </Button>
                </Stack>

                <Box
                    ref={canvasOuterRef}
                    sx={{
                        width: "min(1200px, 100%)",
                        mx: "auto",
                        borderRadius: 2,
                        boxShadow: 3,
                        bgcolor: "#fff",
                        backgroundColor:"blue",
                        position: "relative",
                        userSelect: "none",
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            aspectRatio: `${aspectRatio}`, // ✅ computed from paper + orientation
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: 2,
                            backgroundImage: bgUrl ? `url("${bgUrl}")` : "none",
                            backgroundColor: template.background?.type === "color" ? template.background.color : "transparent",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) setSelectedId(null);
                        }}
                    >
                        {template.blocks.map((raw) => {
                            const b = normalizeBlock(raw);
                            const x = pctToPx(b.style.left, canvasSize.w);
                            const y = pctToPx(b.style.top, canvasSize.h);
                            const w = pctToPx(b.style.width, canvasSize.w);
                            const h = pctToPx(b.style.height, canvasSize.h);
                            const isSelected = b.id === selectedId;

                            return (
                                <Rnd
                                    key={b.id}
                                    size={{ width: w, height: h }}
                                    position={{ x, y }}
                                    bounds="parent"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(b.id);
                                    }}
                                    onDragStop={onDragStop}
                                    onResizeStop={onResizeStop}
                                    enableResizing
                                    style={{
                                        outline: isSelected ? "2px solid #1976d2" : "none",
                                        outlineOffset: "2px",
                                        borderRadius: 4,
                                    }}
                                >
                                    <Box data-block-id={b.id} sx={{ width: "100%", height: "100%" }}>
                                        <BlockRenderer block={b} assetBaseUrl={assetBaseUrl} />
                                    </Box>
                                </Rnd>
                            );
                        })}
                    </Box>
                </Box>
            </Box>

            {/* Right: Inspector */}
            <Drawer
                variant="permanent"
                anchor="left"
                PaperProps={{ sx: { width: 360, p: 2, borderLeft: "1px solid", borderColor: "divider" } }}
            >
                <Typography variant="h6">Inspector</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a block to edit.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {selectedBlock ? (
                    <Inspector
                        block={selectedBlock}
                        onPatch={(patch) => updateBlock(selectedBlock.id, patch)}
                        onStylePatch={(patch) => updateBlockStyle(selectedBlock.id, patch)}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No block selected.
                    </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                    Template
                </Typography>

                <TextField
                    fullWidth
                    label="Template name"
                    value={template.name ?? ""}
                    onChange={(e) => setTemplate((p) => ({ ...p, name: e.target.value }))}
                    sx={{ mb: 1.5 }}
                />

                <Stack direction="row" spacing={1}>
                    <FormControl fullWidth>
                        <InputLabel id="paper-label">Paper size</InputLabel>
                        <Select
                            labelId="paper-label"
                            label="Paper size"
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
                    sx={{ mt: 1.5 }}
                />

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Canvas ratio: {aspectRatio.toFixed(4)} (width/height) • {paperKey} • {orientation}
                </Typography>
            </Drawer>
        </Box>
    );
}

// -------------------- BlockRenderer --------------------
function BlockRenderer({ block, assetBaseUrl }: { block: Block; assetBaseUrl: string }) {
    const s = block.style;

    if (isTextBlock(block)) {
        const fontSizeNum = parseFloat(String(s.fontSize ?? "24").replace("em", ""));
        const fontSizePx = clamp(Number.isNaN(fontSizeNum) ? 24 : fontSizeNum, 6, 200);

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
                    lineHeight: 1.1,
                    fontSize: `${fontSizePx}px`,
                }}
            >
                {block.value}
            </Box>
        );
    }

    if (isLineBlock(block)) {
        return <Box sx={{ width: "100%", height: "100%", bgcolor: block.style.backgroundColor ?? "#333" }} />;
    }

    if (isImageBlock(block)) {
        const url = block.value ? `${assetBaseUrl}${block.value}` : "";
        return (
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    bgcolor: url ? "transparent" : "rgba(0,0,0,0.05)",
                    border: url ? "none" : "1px dashed rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                {url ? (
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Image (set value/url)
                    </Typography>
                )}
            </Box>
        );
    }

    return null;
}

// -------------------- Inspector --------------------
function Inspector({
                       block,
                       onPatch,
                       onStylePatch,
                   }: {
    block: Block;
    onPatch: (patch: Partial<Block>) => void;
    onStylePatch: (patch: Partial<BaseBlockStyle & Record<string, unknown>>) => void;
}) {
    const s = block.style;

    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">
                {block.type.toUpperCase()} • {block.id}
            </Typography>

            {block.type !== "horizontal-line" && (
                <TextField
                    fullWidth
                    label={block.type === "image" ? "Image value (path/url)" : "Text value"}
                    value={("value" in block ? block.value : "") ?? ""}
                    onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                />
            )}

            {isTextBlock(block) && (
                <>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            label="Color"
                            value={s.color ?? ""}
                            onChange={(e) => onStylePatch({ color: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label='Font size (e.g. "35em")'
                            value={s.fontSize ?? ""}
                            onChange={(e) => onStylePatch({ fontSize: e.target.value })}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        label="Font family"
                        value={s.fontFamily ?? ""}
                        onChange={(e) => onStylePatch({ fontFamily: e.target.value })}
                    />

                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            label="Font weight"
                            value={String(s.fontWeight ?? 400)}
                            onChange={(e) => onStylePatch({ fontWeight: e.target.value })}
                        />

                        <FormControl fullWidth>
                            <InputLabel id="fs-label">Font style</InputLabel>
                            <Select
                                labelId="fs-label"
                                label="Font style"
                                value={String(s.fontStyle ?? "normal")}
                                onChange={(e: any) => onStylePatch({ fontStyle: e.target.value })}
                            >
                                <MenuItem value="normal">normal</MenuItem>
                                <MenuItem value="italic">italic</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>

                    <ToggleButtonGroup
                        value={String(s.textAlign ?? "left")}
                        exclusive
                        onChange={(_, v) => v && onStylePatch({ textAlign: v })}
                        size="small"
                    >
                        <ToggleButton value="left">Left</ToggleButton>
                        <ToggleButton value="center">Center</ToggleButton>
                        <ToggleButton value="right">Right</ToggleButton>
                    </ToggleButtonGroup>

                    <FormControl fullWidth>
                        <InputLabel id="dec-label">Decoration</InputLabel>
                        <Select
                            labelId="dec-label"
                            label="Decoration"
                            value={String(s.textDecoration ?? "none")}
                            onChange={(e: any) => onStylePatch({ textDecoration: e.target.value })}
                        >
                            <MenuItem value="none">none</MenuItem>
                            <MenuItem value="underline">underline</MenuItem>
                            <MenuItem value="line-through">line-through</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="as-label">AutoScale</InputLabel>
                        <Select
                            labelId="as-label"
                            label="AutoScale"
                            value={String(Boolean(block.autoScale))}
                            onChange={(e: any) => onPatch({ autoScale: e.target.value === "true" } as Partial<Block>)}
                        >
                            <MenuItem value="false">false</MenuItem>
                            <MenuItem value="true">true</MenuItem>
                        </Select>
                    </FormControl>
                </>
            )}

            {isLineBlock(block) && (
                <TextField
                    fullWidth
                    label="Line color (backgroundColor)"
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