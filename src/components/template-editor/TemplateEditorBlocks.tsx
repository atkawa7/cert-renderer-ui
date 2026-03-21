import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
    Box,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ClearIcon from "@mui/icons-material/Clear";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import TableRowsIcon from "@mui/icons-material/TableRows";
import FlipToBackIcon from "@mui/icons-material/FlipToBack";
import FlipToFrontIcon from "@mui/icons-material/FlipToFront";
import type {
    BaseBlockStyle,
    Block,
    TableBlockStyle,
    TableCellStyle,
    TextBlock,
} from "../../TemplateEditor";

function clampNum(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function getCaretOffset(root: HTMLElement): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
}

function setCaretOffset(root: HTMLElement, offset: number) {
    const target = Math.max(0, offset);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = target;
    let node: Node | null = walker.nextNode();
    while (node) {
        const len = node.textContent?.length ?? 0;
        if (remaining <= len) {
            const range = document.createRange();
            range.setStart(node, remaining);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            return;
        }
        remaining -= len;
        node = walker.nextNode();
    }
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
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

function parsePxToNumber(v?: string, fallback = 0): number {
    if (!v) return fallback;
    const n = parseFloat(String(v).replace("px", "").trim());
    return Number.isFinite(n) ? n : fallback;
}
function mergeCellStyle(base: TableCellStyle, patch?: TableCellStyle): TableCellStyle {
    return { ...base, ...(patch ?? {}) };
}
function inRange(value: number, start?: number, end?: number): boolean {
    if (start === undefined || !Number.isFinite(start)) return false;
    const safeEnd = end === undefined || !Number.isFinite(end) ? start : end;
    const min = Math.min(start, safeEnd);
    const max = Math.max(start, safeEnd);
    return value >= min && value <= max;
}

function toEm(n: number): string {
    return `${Math.round(n)}em`;
}

function isTextBlock(b: Block): b is Extract<Block, { type: "text" }> {
    return b.type === "text";
}

function isImageBlock(b: Block): b is Extract<Block, { type: "image" }> {
    return b.type === "image" ||  b.type === "svg";
}

function isLineBlock(b: Block): b is Extract<Block, { type: "horizontal-line" }> {
    return b.type === "horizontal-line";
}

function isListBlock(b: Block): b is Extract<Block, { type: "list" }> {
    return b.type === "list";
}

function isTableBlock(b: Block): b is Extract<Block, { type: "table" }> {
    return b.type === "table";
}

function isDataUrl(value?: string): boolean {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value ?? "").trim());
}

function isAbsoluteUrl(value?: string): boolean {
    return /^(https?:)?\/\//i.test(String(value ?? "").trim());
}

function toImageRawSrc(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return "";
    const obj = value as Record<string, unknown>;
    const type = String(obj.type ?? "").toLowerCase();
    if (type === "svg" && typeof obj.svg === "string" && obj.svg.trim()) {
        return obj.svg.trim();
    }
    if (typeof obj.url === "string" && obj.url.trim()) return obj.url.trim();
    if (typeof obj.src === "string" && obj.src.trim()) return obj.src.trim();
    if (typeof obj.svg === "string" && obj.svg.trim()) return obj.svg.trim();
    return "";
}

function imageValueToEditorString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return "";
        }
    }
    return "";
}

function parseImageEditorValue(value: string): unknown {
    const raw = value.trim();
    if (!raw) return "";
    if (raw.startsWith("{") || raw.startsWith("[")) {
        try {
            return JSON.parse(raw);
        } catch {
            return value;
        }
    }
    return value;
}

export function resolveImageSrc(value: unknown, assetBaseUrl = ""): string {
    const src = toImageRawSrc(value);
    if (!src) return "";
    if (src.includes("<svg")) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
    }
    if (isDataUrl(src) || isAbsoluteUrl(src)) return src;
    return `${assetBaseUrl}${encodeURI(src)}`;
}

export function BlockRenderer({
    block,
    assetBaseUrl,
    editing,
    previewMode,
    viewportScale = 1,
    renderData,
    onChangeText,
    onCommitText,
    onCancelEdit,
}: {
    block: Block;
    assetBaseUrl: string;
    editing: boolean;
    previewMode: boolean;
    viewportScale?: number;
    renderData?: unknown;
    onChangeText: (text: string) => void;
    onCommitText: (text: string) => void;
    onCancelEdit: () => void;
}) {
    function readPath(data: unknown, path: string): unknown {
        const key = String(path ?? "").trim();
        if (!key) return undefined;
        const parts = key.split(".").filter(Boolean);
        let cur: any = data;
        for (const part of parts) {
            if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
            cur = cur[part];
        }
        return cur;
    }

    const commonShellSx = useMemo(
        () => ({
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            borderStyle: block.style.borderStyle ?? "none",
            borderColor: block.style.borderColor ?? "#333333",
            borderWidth: block.style.borderWidth ?? "0px",
            borderRadius: block.style.borderRadius ?? "0px",
            p: block.style.padding ?? "0px",
            overflow: "hidden",
        }),
        [block.style]
    );

    if (isTextBlock(block)) {
        return (
            <Box sx={commonShellSx}>
                <EditableText
                    block={block}
                    editing={editing}
                    previewMode={previewMode}
                    viewportScale={viewportScale}
                    onChange={onChangeText}
                    onCommit={onCommitText}
                    onCancel={onCancelEdit}
                />
            </Box>
        );
    }

    if (isLineBlock(block)) {
        return (
            <Box sx={commonShellSx}>
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
            </Box>
        );
    }

    if (isListBlock(block)) {
        const s = block.style;
        const fontSizePx = clampNum(parseEmToNumber(s.fontSize, 20) * viewportScale, 5, 220);
        const fromVar = readPath(renderData, block.var ?? "");
        const items =
            Array.isArray(fromVar)
                ? fromVar.map((v) => String(v ?? "")).filter((v) => v.trim().length > 0)
                : String(block.value ?? "")
                      .split(/\r?\n/)
                      .map((v) => v.trim())
                      .filter((v) => v.length > 0);
        const listType = String(s.listType ?? "bullet");
        const ListTag = listType === "number" ? "ol" : "ul";

        return (
            <Box sx={commonShellSx}>
                <Box
                    component={ListTag}
                    sx={{
                        m: 0,
                        pl: 2.5,
                        color: s.color ?? "#333",
                        fontFamily: s.fontFamily ?? "serif",
                        fontWeight: s.fontWeight ?? 400,
                        fontStyle: s.fontStyle ?? "normal",
                        textDecoration: s.textDecoration ?? "none",
                        textAlign: s.textAlign ?? "left",
                        whiteSpace: "pre-wrap",
                        lineHeight: parseLineHeightToNumber(s.lineHeight, 1.2),
                        fontSize: `${fontSizePx}px`,
                    }}
                >
                    {(items.length ? items : ["List item"]).map((item, idx) => (
                        <li key={`${idx}_${item}`}>{item}</li>
                    ))}
                </Box>
            </Box>
        );
    }

    if (isTableBlock(block)) {
        const s = block.style;
        const fontSizePx = clampNum(parseEmToNumber(s.fontSize, 18) * viewportScale, 5, 220);
        const fromVar = readPath(renderData, block.var ?? "");
        const runtimeColumns = Array.isArray((fromVar as any)?.columns)
            ? (fromVar as any).columns.map((c: unknown) => String(c ?? ""))
            : [];
        const runtimeRows = Array.isArray((fromVar as any)?.rows) ? (fromVar as any).rows : [];
        const hasRuntimeTable = runtimeColumns.length > 0;

        const fallbackRows = String(block.value ?? "")
            .split(/\r?\n/)
            .map((r) => r.split("|").map((c) => c.trim()));
        const hasFallbackRows = fallbackRows.length > 0 && fallbackRows.some((row) => row.some((c) => c.length > 0));
        const fallbackCells = hasFallbackRows ? fallbackRows : [["Column 1", "Column 2"], ["Value", "Value"]];

        const cells = hasRuntimeTable
            ? [
                  runtimeColumns,
                  ...runtimeRows.map((row: Record<string, unknown>) =>
                      runtimeColumns.map((col) => String(row?.[col] ?? ""))
                  ),
              ]
            : fallbackCells;
        const showHeader = Boolean(s.showHeaderRow ?? true);
        const borderWidth = parsePxToNumber(s.borderWidth, 1);
        const tableBorderStyle = s.borderStyle ?? "solid";
        const tableBorderColor = s.borderColor ?? "#666666";
        const tableStyles = s as TableBlockStyle;
        const columnStyles = tableStyles.columnStyles ?? [];
        const rowStyles = tableStyles.rowStyles ?? [];
        const cellStyles = tableStyles.cellStyles ?? [];
        const baseCellStyle: TableCellStyle = {
            color: s.color,
            backgroundColor: undefined,
            fontWeight: s.fontWeight,
            fontStyle: s.fontStyle,
            textAlign: s.textAlign,
            textDecoration: s.textDecoration,
            borderStyle: s.borderStyle,
            borderColor: s.borderColor,
            borderWidth: s.borderWidth,
            padding: s.padding,
        };
        const resolveCellStyle = (rowIdx: number, colIdx: number): TableCellStyle => {
            let out = mergeCellStyle(baseCellStyle, undefined);
            for (const rule of columnStyles) {
                if (inRange(colIdx, rule?.start, rule?.end)) {
                    out = mergeCellStyle(out, rule?.style);
                }
            }
            for (const rule of rowStyles) {
                if (inRange(rowIdx, rule?.start, rule?.end)) {
                    out = mergeCellStyle(out, rule?.style);
                }
            }
            for (const rule of cellStyles) {
                if (rule?.row === rowIdx && rule?.col === colIdx) {
                    out = mergeCellStyle(out, rule?.style);
                }
            }
            return out;
        };

        return (
            <Box sx={commonShellSx}>
                <Box
                    component="table"
                    sx={{
                        width: "100%",
                        height: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                        borderStyle: tableBorderStyle,
                        borderColor: tableBorderColor,
                        borderWidth: `${Math.max(borderWidth, 0)}px`,
                        color: s.color ?? "#333",
                        fontFamily: s.fontFamily ?? "serif",
                        fontWeight: s.fontWeight ?? 400,
                        fontStyle: s.fontStyle ?? "normal",
                        textDecoration: s.textDecoration ?? "none",
                        textAlign: s.textAlign ?? "left",
                        lineHeight: parseLineHeightToNumber(s.lineHeight, 1.2),
                        fontSize: `${fontSizePx}px`,
                    }}
                >
                    {showHeader && cells.length > 0 && (
                        <Box component="thead">
                            <Box component="tr">
                                {cells[0].map((cell, idx) => (
                                    (() => {
                                        const cs = resolveCellStyle(-1, idx);
                                        const csBorderWidth = parsePxToNumber(cs.borderWidth, borderWidth);
                                        return (
                                    <Box
                                        key={`h_${idx}`}
                                        component="th"
                                        sx={{
                                            p: cs.padding ?? "4px",
                                            borderBottomStyle: cs.borderStyle ?? tableBorderStyle,
                                            borderBottomColor: cs.borderColor ?? tableBorderColor,
                                            borderBottomWidth: `${Math.max(csBorderWidth, 1)}px`,
                                            fontWeight: cs.fontWeight ?? 700,
                                            fontStyle: cs.fontStyle ?? s.fontStyle ?? "normal",
                                            textAlign: cs.textAlign ?? s.textAlign ?? "left",
                                            textDecoration: cs.textDecoration ?? s.textDecoration ?? "none",
                                            color: cs.color ?? s.color ?? "#333",
                                            backgroundColor: cs.backgroundColor,
                                        }}
                                    >
                                        {cell || `Header ${idx + 1}`}
                                    </Box>
                                        );
                                    })()
                                ))}
                            </Box>
                        </Box>
                    )}
                    <Box component="tbody">
                        {cells.slice(showHeader ? 1 : 0).map((row, rIdx) => (
                            <Box component="tr" key={`r_${rIdx}`}>
                                {row.map((cell, cIdx) => (
                                    (() => {
                                        const cs = resolveCellStyle(rIdx, cIdx);
                                        return (
                                    <Box
                                        key={`c_${rIdx}_${cIdx}`}
                                        component="td"
                                        sx={{
                                            p: cs.padding ?? "4px",
                                            fontWeight: cs.fontWeight ?? s.fontWeight ?? 400,
                                            fontStyle: cs.fontStyle ?? s.fontStyle ?? "normal",
                                            textAlign: cs.textAlign ?? s.textAlign ?? "left",
                                            textDecoration: cs.textDecoration ?? s.textDecoration ?? "none",
                                            color: cs.color ?? s.color ?? "#333",
                                            backgroundColor: cs.backgroundColor,
                                        }}
                                    >
                                        {cell || "\u00A0"}
                                    </Box>
                                        );
                                    })()
                                ))}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        );
    }

    if (isImageBlock(block)) {
        const url = resolveImageSrc(block.value, assetBaseUrl);
        return (
            <Box sx={commonShellSx}>
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
            </Box>
        );
    }

    return null;
}

function BorderInspectorFields({
    style,
    onStylePatch,
}: {
    style: BaseBlockStyle;
    onStylePatch: (patch: Partial<BaseBlockStyle & Record<string, unknown>>) => void;
}) {
    return (
        <>
            <Divider />
            <Typography variant="subtitle2">Border</Typography>
            <ToggleButtonGroup
                size="small"
                value={String(style.borderStyle ?? "none")}
                exclusive
                onChange={(_, v) => {
                    if (!v) return;
                    onStylePatch({ borderStyle: v });
                }}
            >
                <Tooltip title="No border">
                    <ToggleButton value="none">
                        <Box sx={{ width: 16, height: 16, border: "2px solid", borderColor: "action.disabled", borderRadius: "2px", opacity: 0.3 }} />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Solid border">
                    <ToggleButton value="solid">
                        <Box sx={{ width: 16, height: 16, border: "2px solid currentColor", borderRadius: "2px" }} />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Dashed border">
                    <ToggleButton value="dashed">
                        <Box sx={{ width: 16, height: 16, border: "2px dashed currentColor", borderRadius: "2px" }} />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Dotted border">
                    <ToggleButton value="dotted">
                        <Box sx={{ width: 16, height: 16, border: "3px dotted currentColor", borderRadius: "2px" }} />
                    </ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    label="Border color"
                    value={style.borderColor ?? "#333333"}
                    onChange={(e) => onStylePatch({ borderColor: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Border width"
                    value={style.borderWidth ?? "0px"}
                    onChange={(e) => onStylePatch({ borderWidth: e.target.value })}
                    helperText="px"
                />
            </Stack>

            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    label="Border radius"
                    value={style.borderRadius ?? "0px"}
                    onChange={(e) => onStylePatch({ borderRadius: e.target.value })}
                    helperText="px"
                />
                <TextField
                    fullWidth
                    label="Padding"
                    value={style.padding ?? "0px"}
                    onChange={(e) => onStylePatch({ padding: e.target.value })}
                    helperText="px"
                />
            </Stack>
        </>
    );
}

function prettyJson(value: unknown): string {
    try {
        return JSON.stringify(value ?? [], null, 2);
    } catch {
        return "[]";
    }
}

function parseJsonArray(value: string): unknown[] {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function EditableText({
    block,
    editing,
    previewMode,
    viewportScale = 1,
    onChange,
    onCommit,
    onCancel,
}: {
    block: TextBlock;
    editing: boolean;
    previewMode: boolean;
    viewportScale?: number;
    onChange: (text: string) => void;
    onCommit: (text: string) => void;
    onCancel: () => void;
}) {
    const s = block.style;
    const ref = useRef<HTMLDivElement | null>(null);
    const caretOffsetRef = useRef<number | null>(null);

    const fontSizeNum = parseFloat(String(s.fontSize ?? "24").replace("em", ""));
    const fontSizePx = clampNum((Number.isNaN(fontSizeNum) ? 24 : fontSizeNum) * viewportScale, 5, 220);

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

    useLayoutEffect(() => {
        if (!editing) return;
        if (!ref.current) return;
        if (caretOffsetRef.current === null) return;
        setCaretOffset(ref.current, Math.min(caretOffsetRef.current, ref.current.innerText.length));
    }, [editing, block.value]);

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
                    if (previewMode || !editing) return;
                    onCommit((ref.current?.innerText ?? "").trimEnd());
                }}
                onInput={() => {
                    if (previewMode || !editing) return;
                    if (ref.current) {
                        caretOffsetRef.current = getCaretOffset(ref.current);
                    }
                    onChange((ref.current?.innerText ?? "").trimEnd());
                }}
                onKeyDown={(e) => {
                    if (previewMode || !editing) return;
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

export function Inspector({
    block,
    onPatch,
    onStylePatch,
    onToggleLock,
    onSendToBack,
    onBringToFront,
}: {
    block: Block;
    onPatch: (patch: Partial<Block>) => void;
    onStylePatch: (patch: Partial<BaseBlockStyle & Record<string, unknown>>) => void;
    onToggleLock: () => void;
    onSendToBack: () => void;
    onBringToFront: () => void;
}) {
    const s = block.style;
    const locked = Boolean((block as any).locked);
    const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
    const [imageValueText, setImageValueText] = useState("");
    const [columnStylesJson, setColumnStylesJson] = useState("");
    const [rowStylesJson, setRowStylesJson] = useState("");
    const [cellStylesJson, setCellStylesJson] = useState("");

    useEffect(() => {
        if (!isTableBlock(block)) return;
        setColumnStylesJson(prettyJson((block.style as TableBlockStyle).columnStyles ?? []));
        setRowStylesJson(prettyJson((block.style as TableBlockStyle).rowStyles ?? []));
        setCellStylesJson(prettyJson((block.style as TableBlockStyle).cellStyles ?? []));
    }, [block]);

    useEffect(() => {
        if (!isImageBlock(block)) return;
        setImageValueText(imageValueToEditorString(block.value));
    }, [block]);

    function onSelectImageFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !isImageBlock(block)) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            if (!result) return;
            onPatch({ value: result } as Partial<Block>);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">{block.type.toUpperCase()} • {block.id}</Typography>
                <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Send to Back">
                        <IconButton size="small" onClick={onSendToBack}>
                            <FlipToBackIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Bring to Front">
                        <IconButton size="small" onClick={onBringToFront}>
                            <FlipToFrontIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={locked ? "Unlock" : "Lock"}>
                        <IconButton onClick={onToggleLock} size="small">
                            {locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {isTextBlock(block) && (
                <TextField
                    fullWidth
                    label="Text value"
                    value={block.value ?? ""}
                    onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                    helperText="Tip: double-click text on canvas to edit inline."
                />
            )}

            {isListBlock(block) && (
                <>
                    <TextField
                        fullWidth
                        label="Var (JSON path)"
                        value={block.var ?? ""}
                        onChange={(e) => onPatch({ var: e.target.value } as Partial<Block>)}
                        helperText="Runtime path, e.g. payload.items"
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={6}
                        label="List items (one per line)"
                        value={block.value ?? ""}
                        onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                    />
                    <ToggleButtonGroup
                        value={String(block.style.listType ?? "bullet")}
                        exclusive
                        onChange={(_, v) => v && onStylePatch({ listType: v })}
                        size="small"
                    >
                        <Tooltip title="Bulleted"><ToggleButton value="bullet"><FormatListBulletedIcon fontSize="small" /></ToggleButton></Tooltip>
                        <Tooltip title="Numbered"><ToggleButton value="number"><FormatListNumberedIcon fontSize="small" /></ToggleButton></Tooltip>
                    </ToggleButtonGroup>
                </>
            )}

            {isTableBlock(block) && (
                <>
                    <TextField
                        fullWidth
                        label="Var (JSON path)"
                        value={block.var ?? ""}
                        onChange={(e) => onPatch({ var: e.target.value } as Partial<Block>)}
                        helperText="Runtime path, e.g. payload.table"
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={6}
                        label="Table rows (use | for columns)"
                        value={block.value ?? ""}
                        onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                        helperText={"Example: Name|Role|Date"}
                    />
                    <ToggleButtonGroup
                        value={String(Boolean(block.style.showHeaderRow))}
                        exclusive
                        onChange={(_, v) => {
                            if (!v) return;
                            onStylePatch({ showHeaderRow: v === "true" });
                        }}
                        size="small"
                    >
                        <Tooltip title="Header row on"><ToggleButton value="true"><TableRowsIcon fontSize="small" /></ToggleButton></Tooltip>
                        <Tooltip title="Header row off"><ToggleButton value="false" sx={{ opacity: 0.5 }}><TableRowsIcon fontSize="small" /></ToggleButton></Tooltip>
                    </ToggleButtonGroup>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={5}
                        label="Column styles JSON"
                        value={columnStylesJson}
                        onChange={(e) => setColumnStylesJson(e.target.value)}
                        onBlur={() => onStylePatch({ columnStyles: parseJsonArray(columnStylesJson) })}
                        helperText='[{ "start": 0, "end": 1, "style": { "backgroundColor": "#f5f5f5", "fontWeight": 700 } }]'
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={5}
                        label="Row styles JSON"
                        value={rowStylesJson}
                        onChange={(e) => setRowStylesJson(e.target.value)}
                        onBlur={() => onStylePatch({ rowStyles: parseJsonArray(rowStylesJson) })}
                        helperText='[{ "start": 0, "end": 2, "style": { "backgroundColor": "#fafafa" } }]'
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={5}
                        label="Cell styles JSON"
                        value={cellStylesJson}
                        onChange={(e) => setCellStylesJson(e.target.value)}
                        onBlur={() => onStylePatch({ cellStyles: parseJsonArray(cellStylesJson) })}
                        helperText='[{ "row": 1, "col": 2, "style": { "color": "#d32f2f", "fontWeight": 700 } }]'
                    />
                </>
            )}

            {(isImageBlock(block)) && (
                <>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                        label="Image value (path/url or JSON)"
                        value={imageValueText}
                        onChange={(e) => setImageValueText(e.target.value)}
                        onBlur={() => onPatch({ value: parseImageEditorValue(imageValueText) } as Partial<Block>)}
                        helperText='Supports string URL/path or JSON like {"type":"svg","svg":"<svg ...>...</svg>"}'
                    />
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Upload image">
                            <IconButton size="small" onClick={() => imageUploadInputRef.current?.click()}>
                                <AddPhotoAlternateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Clear image">
                            <IconButton size="small" onClick={() => onPatch({ value: "" } as Partial<Block>)}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
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
                            <img src={resolveImageSrc(block.value, "")} alt="Selected block" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </Box>
                    )}
                </>
            )}

            {(isTextBlock(block) || isListBlock(block) || isTableBlock(block)) && (
                <>
                    <Stack direction="row" spacing={1} alignItems="center">
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
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => onStylePatch({ color: e.target.value })}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ width: 28, height: 28, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                        />

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

                    <TextField fullWidth label="Font family" value={block.style.fontFamily ?? ""} onChange={(e) => onStylePatch({ fontFamily: e.target.value })} />
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
                        <Tooltip title="Align left"><ToggleButton value="left"><FormatAlignLeftIcon fontSize="small" /></ToggleButton></Tooltip>
                        <Tooltip title="Align center"><ToggleButton value="center"><FormatAlignCenterIcon fontSize="small" /></ToggleButton></Tooltip>
                        <Tooltip title="Align right"><ToggleButton value="right"><FormatAlignRightIcon fontSize="small" /></ToggleButton></Tooltip>
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

            <BorderInspectorFields style={s} onStylePatch={onStylePatch} />

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
