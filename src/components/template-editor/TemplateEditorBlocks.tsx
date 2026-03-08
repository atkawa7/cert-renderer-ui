import { useEffect, useLayoutEffect, useMemo, useRef, type ChangeEvent } from "react";
import {
    Box,
    Button,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import type { BaseBlockStyle, Block, TextBlock } from "../../TemplateEditor";

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

function toEm(n: number): string {
    return `${Math.round(n)}em`;
}

function isTextBlock(b: Block): b is Extract<Block, { type: "text" }> {
    return b.type === "text";
}

function isImageBlock(b: Block): b is Extract<Block, { type: "image" }> {
    return b.type === "image";
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

export function resolveImageSrc(value: string | undefined, assetBaseUrl = ""): string {
    const src = String(value ?? "").trim();
    if (!src) return "";
    if (isDataUrl(src) || isAbsoluteUrl(src)) return src;
    return `${assetBaseUrl}${encodeURI(src)}`;
}

export function BlockRenderer({
    block,
    assetBaseUrl,
    editing,
    previewMode,
    onChangeText,
    onCommitText,
    onCancelEdit,
}: {
    block: Block;
    assetBaseUrl: string;
    editing: boolean;
    previewMode: boolean;
    onChangeText: (text: string) => void;
    onCommitText: (text: string) => void;
    onCancelEdit: () => void;
}) {
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
        const fontSizePx = clampNum(parseEmToNumber(s.fontSize, 20), 6, 220);
        const items = String(block.value ?? "")
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
        const fontSizePx = clampNum(parseEmToNumber(s.fontSize, 18), 6, 220);
        const rows = String(block.value ?? "")
            .split(/\r?\n/)
            .map((r) => r.split("|").map((c) => c.trim()));
        const hasRows = rows.length > 0 && rows.some((row) => row.some((c) => c.length > 0));
        const cells = hasRows ? rows : [["Column 1", "Column 2"], ["Value", "Value"]];
        const showHeader = Boolean(s.showHeaderRow ?? true);
        const borderWidth = parsePxToNumber(s.borderWidth, 1);
        const cellBorderStyle = (s.borderStyle ?? "solid") === "none" ? "solid" : s.borderStyle ?? "solid";
        const cellBorderColor = s.borderColor ?? "#666666";

        return (
            <Box sx={commonShellSx}>
                <Box
                    component="table"
                    sx={{
                        width: "100%",
                        height: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
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
                                    <Box
                                        key={`h_${idx}`}
                                        component="th"
                                        sx={{
                                            p: 0.5,
                                            borderStyle: cellBorderStyle,
                                            borderColor: cellBorderColor,
                                            borderWidth: `${Math.max(borderWidth, 1)}px`,
                                            fontWeight: 700,
                                            textAlign: s.textAlign ?? "left",
                                        }}
                                    >
                                        {cell || `Header ${idx + 1}`}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    <Box component="tbody">
                        {cells.slice(showHeader ? 1 : 0).map((row, rIdx) => (
                            <Box component="tr" key={`r_${rIdx}`}>
                                {row.map((cell, cIdx) => (
                                    <Box
                                        key={`c_${rIdx}_${cIdx}`}
                                        component="td"
                                        sx={{
                                            p: 0.5,
                                            borderStyle: cellBorderStyle,
                                            borderColor: cellBorderColor,
                                            borderWidth: `${Math.max(borderWidth, 1)}px`,
                                        }}
                                    >
                                        {cell || "\u00A0"}
                                    </Box>
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
                <ToggleButton value="none">None</ToggleButton>
                <ToggleButton value="solid">Solid</ToggleButton>
                <ToggleButton value="dashed">Dashed</ToggleButton>
                <ToggleButton value="dotted">Dotted</ToggleButton>
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

function EditableText({
    block,
    editing,
    previewMode,
    onChange,
    onCommit,
    onCancel,
}: {
    block: TextBlock;
    editing: boolean;
    previewMode: boolean;
    onChange: (text: string) => void;
    onCommit: (text: string) => void;
    onCancel: () => void;
}) {
    const s = block.style;
    const ref = useRef<HTMLDivElement | null>(null);
    const caretOffsetRef = useRef<number | null>(null);

    const fontSizeNum = parseFloat(String(s.fontSize ?? "24").replace("em", ""));
    const fontSizePx = clampNum(Number.isNaN(fontSizeNum) ? 24 : fontSizeNum, 6, 220);

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
}: {
    block: Block;
    onPatch: (patch: Partial<Block>) => void;
    onStylePatch: (patch: Partial<BaseBlockStyle & Record<string, unknown>>) => void;
    onToggleLock: () => void;
}) {
    const s = block.style;
    const locked = Boolean((block as any).locked);
    const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

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
                <IconButton onClick={onToggleLock} size="small" title={locked ? "Unlock" : "Lock"}>
                    {locked ? <LockIcon /> : <LockOpenIcon />}
                </IconButton>
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
                        minRows={4}
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
                        <ToggleButton value="bullet">Bulleted</ToggleButton>
                        <ToggleButton value="number">Numbered</ToggleButton>
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
                        minRows={5}
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
                        <ToggleButton value="true">Header row on</ToggleButton>
                        <ToggleButton value="false">Header row off</ToggleButton>
                    </ToggleButtonGroup>
                </>
            )}

            {isImageBlock(block) && (
                <>
                    <TextField
                        fullWidth
                        label="Image value (path/url)"
                        value={block.value ?? ""}
                        onChange={(e) => onPatch({ value: e.target.value } as Partial<Block>)}
                    />
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={() => imageUploadInputRef.current?.click()}>
                            Upload image
                        </Button>
                        <Button variant="text" color="inherit" onClick={() => onPatch({ value: "" } as Partial<Block>)}>
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
