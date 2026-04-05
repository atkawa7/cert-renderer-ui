import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Checkbox, IconButton, Menu, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CopyAllIcon from "@mui/icons-material/CopyAll";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import Crop169Icon from "@mui/icons-material/Crop169";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import PanoramaFishEyeIcon from "@mui/icons-material/PanoramaFishEye";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import StopIcon from "@mui/icons-material/Stop";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import TimelineIcon from "@mui/icons-material/Timeline";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import SaveIcon from "@mui/icons-material/Save";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import polygonClipping from "polygon-clipping";

const STORAGE_KEY = "renderer_svg_editor_state_v1";
const STORAGE_SNAPSHOT_KEY = "renderer_svg_editor_snapshot_v1";
const DEFAULT_VIEWBOX = "0 0 1200 1200";

type ShapeType = "rect" | "square" | "circle" | "ellipse" | "triangle" | "octagon" | "line" | "path" | "text";

type SvgShape = {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    rotation: number;
    text: string;
    fontSize: number;
    d: string;
    fillRule: "nonzero" | "evenodd";
    pathBaseWidth: number;
    pathBaseHeight: number;
};

type DragState = {
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
};

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type ResizeState = {
    id: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
    originRadius: number;
    originFontSize: number;
};

type MarqueeState = {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
};

type ViewBox = { x: number; y: number; width: number; height: number };

type EditorDoc = {
    viewBox: string;
    shapes: SvgShape[];
    selectedId: string | null;
    selectedIds: string[];
};

function parseViewBox(value: string): ViewBox | null {
    const parts = value.trim().split(/[\s,]+/).map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
    const [x, y, width, height] = parts;
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
}

function uid(): string {
    return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function round2(v: number): number {
    return Math.round(v * 100) / 100;
}

function createShape(type: ShapeType, vb: ViewBox): SvgShape {
    const cx = vb.x + vb.width / 2;
    const cy = vb.y + vb.height / 2;
    const base: SvgShape = {
        id: uid(),
        type,
        x: cx,
        y: cy,
        width: 260,
        height: 180,
        radius: 110,
        fill: "#e3f2fd",
        stroke: "#0d47a1",
        strokeWidth: 8,
        rotation: 0,
        text: "Text",
        fontSize: 64,
        d: "M0 -120 C-75 -120 -120 -70 -120 0 C-120 75 0 150 0 150 C0 150 120 75 120 0 C120 -70 75 -120 0 -120 Z",
        fillRule: "nonzero",
        pathBaseWidth: 260,
        pathBaseHeight: 180,
    };

    if (type === "line") {
        base.fill = "none";
        base.width = 280;
        base.height = 0;
    }
    if (type === "text") {
        base.fill = "#111827";
        base.stroke = "none";
        base.strokeWidth = 0;
    }
    if (type === "circle") {
        base.width = 220;
        base.height = 220;
        base.radius = 110;
    }
    if (type === "square") {
        base.width = 220;
        base.height = 220;
    }
    return base;
}

function trianglePoints(shape: SvgShape): string {
    const s = Math.max(8, shape.width / 2);
    const p1 = `${shape.x},${shape.y - s}`;
    const p2 = `${shape.x - s},${shape.y + s}`;
    const p3 = `${shape.x + s},${shape.y + s}`;
    return `${p1} ${p2} ${p3}`;
}

function octagonPoints(shape: SvgShape): string {
    const s = Math.max(8, shape.width / 2);
    const k = s * 0.42;
    const x = shape.x;
    const y = shape.y;
    return [
        `${x - k},${y - s}`,
        `${x + k},${y - s}`,
        `${x + s},${y - k}`,
        `${x + s},${y + k}`,
        `${x + k},${y + s}`,
        `${x - k},${y + s}`,
        `${x - s},${y + k}`,
        `${x - s},${y - k}`,
    ].join(" ");
}

function rotateAround(x: number, y: number, cx: number, cy: number, angleDeg: number) {
    const radians = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos,
    };
}

function ringsToRelativePath(
    rings: Array<Array<[number, number]>>,
    cx: number,
    cy: number
): string {
    const parts: string[] = [];
    rings.forEach((ring) => {
        if (!ring || ring.length < 3) return;
        const clean = ring.slice();
        const first = clean[0];
        const last = clean[clean.length - 1];
        if (first && last && first[0] === last[0] && first[1] === last[1]) {
            clean.pop();
        }
        if (clean.length < 3) return;
        parts.push(`M ${round2(clean[0][0] - cx)} ${round2(clean[0][1] - cy)}`);
        for (let i = 1; i < clean.length; i += 1) {
            parts.push(`L ${round2(clean[i][0] - cx)} ${round2(clean[i][1] - cy)}`);
        }
        parts.push("Z");
    });
    return parts.join(" ");
}

function parsePointList(value: string): Array<{ x: number; y: number }> {
    return value
        .trim()
        .split(/\s+/)
        .map((pair) => {
            const [x, y] = pair.split(",").map(Number);
            return { x, y };
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function sampleShapePolygon(shape: SvgShape): Array<{ x: number; y: number }> | null {
    const cx = shape.x;
    const cy = shape.y;
    let points: Array<{ x: number; y: number }> = [];

    if (shape.type === "rect") {
        const hw = shape.width / 2;
        const hh = shape.height / 2;
        points = [
            { x: cx - hw, y: cy - hh },
            { x: cx + hw, y: cy - hh },
            { x: cx + hw, y: cy + hh },
            { x: cx - hw, y: cy + hh },
        ];
    } else if (shape.type === "square") {
        const hs = shape.width / 2;
        points = [
            { x: cx - hs, y: cy - hs },
            { x: cx + hs, y: cy - hs },
            { x: cx + hs, y: cy + hs },
            { x: cx - hs, y: cy + hs },
        ];
    } else if (shape.type === "circle") {
        const r = Math.max(4, shape.radius);
        for (let i = 0; i < 36; i += 1) {
            const t = (Math.PI * 2 * i) / 36;
            points.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
        }
    } else if (shape.type === "ellipse") {
        const rx = Math.max(4, shape.width / 2);
        const ry = Math.max(4, shape.height / 2);
        for (let i = 0; i < 36; i += 1) {
            const t = (Math.PI * 2 * i) / 36;
            points.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
        }
    } else if (shape.type === "triangle") {
        points = parsePointList(trianglePoints(shape));
    } else if (shape.type === "octagon") {
        points = parsePointList(octagonPoints(shape));
    } else if (shape.type === "line") {
        const x1 = cx - shape.width / 2;
        const y1 = cy - shape.height / 2;
        const x2 = cx + shape.width / 2;
        const y2 = cy + shape.height / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const half = Math.max(2, shape.strokeWidth / 2);
        const nx = (-dy / len) * half;
        const ny = (dx / len) * half;
        points = [
            { x: x1 + nx, y: y1 + ny },
            { x: x2 + nx, y: y2 + ny },
            { x: x2 - nx, y: y2 - ny },
            { x: x1 - nx, y: y1 - ny },
        ];
    } else {
        return null;
    }

    if (shape.rotation) {
        points = points.map((point) => rotateAround(point.x, point.y, cx, cy, shape.rotation));
    }
    return points;
}

function getUnionFunction() {
    const maybe: any = polygonClipping as any;
    if (typeof maybe?.union === "function") return maybe.union as (...args: any[]) => any;
    if (typeof maybe?.default?.union === "function") return maybe.default.union as (...args: any[]) => any;
    return null;
}

function getShapeBounds(shape: SvgShape) {
    if (shape.type === "circle") {
        const r = Math.max(1, shape.radius);
        return { x: shape.x - r, y: shape.y - r, width: r * 2, height: r * 2 };
    }
    if (shape.type === "square") {
        const s = Math.max(1, shape.width);
        return { x: shape.x - s / 2, y: shape.y - s / 2, width: s, height: s };
    }
    if (shape.type === "text") {
        const w = Math.max(24, shape.text.length * shape.fontSize * 0.55);
        const h = Math.max(24, shape.fontSize * 1.4);
        return { x: shape.x - w / 2, y: shape.y - h / 2, width: w, height: h };
    }
    return {
        x: shape.x - Math.max(1, shape.width) / 2,
        y: shape.y - Math.max(1, shape.height) / 2,
        width: Math.max(1, shape.width),
        height: Math.max(1, shape.height),
    };
}

function shapeMarkup(shape: SvgShape): string {
    const fillRule = shape.fillRule ?? "nonzero";
    const common = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"`;
    const transform = `transform="rotate(${shape.rotation} ${shape.x} ${shape.y})"`;

    if (shape.type === "rect") {
        return `<rect x="${round2(shape.x - shape.width / 2)}" y="${round2(shape.y - shape.height / 2)}" width="${round2(shape.width)}" height="${round2(shape.height)}" ${common} ${transform} />`;
    }
    if (shape.type === "square") {
        const s = round2(shape.width);
        return `<rect x="${round2(shape.x - s / 2)}" y="${round2(shape.y - s / 2)}" width="${s}" height="${s}" ${common} ${transform} />`;
    }
    if (shape.type === "circle") {
        return `<circle cx="${round2(shape.x)}" cy="${round2(shape.y)}" r="${round2(shape.radius)}" ${common} ${transform} />`;
    }
    if (shape.type === "ellipse") {
        return `<ellipse cx="${round2(shape.x)}" cy="${round2(shape.y)}" rx="${round2(shape.width / 2)}" ry="${round2(shape.height / 2)}" ${common} ${transform} />`;
    }
    if (shape.type === "triangle") {
        return `<polygon points="${trianglePoints(shape)}" ${common} ${transform} />`;
    }
    if (shape.type === "octagon") {
        return `<polygon points="${octagonPoints(shape)}" ${common} ${transform} />`;
    }
    if (shape.type === "line") {
        const x1 = round2(shape.x - shape.width / 2);
        const y1 = round2(shape.y - shape.height / 2);
        const x2 = round2(shape.x + shape.width / 2);
        const y2 = round2(shape.y + shape.height / 2);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${transform} />`;
    }
    if (shape.type === "path") {
        const baseW = Math.max(1, shape.pathBaseWidth || 260);
        const baseH = Math.max(1, shape.pathBaseHeight || 180);
        const sx = round2(Math.max(0.05, shape.width / baseW));
        const sy = round2(Math.max(0.05, shape.height / baseH));
        return `<g ${transform}><path d="${shape.d}" fill="${shape.fill}" fill-rule="${fillRule}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" transform="translate(${round2(shape.x)} ${round2(shape.y)}) scale(${sx} ${sy})" /></g>`;
    }
    return `<text x="${round2(shape.x)}" y="${round2(shape.y)}" text-anchor="middle" dominant-baseline="middle" font-size="${round2(shape.fontSize)}" fill="${shape.fill}" ${transform}>${shape.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`;
}

function shapeRenderer(
    shape: SvgShape,
    selected: boolean,
    onPointerDown: (event: React.PointerEvent) => void,
    onSelect: (event: React.MouseEvent) => void,
    onEditText: () => void,
    onContextMenu: (event: React.MouseEvent) => void
) {
    const fillRule = shape.fillRule ?? "nonzero";
    const stroke = selected ? "#ef6c00" : shape.stroke;
    const strokeWidth = selected ? Math.max(shape.strokeWidth, 2) + 1 : shape.strokeWidth;
    const common = {
        fill: shape.fill,
        stroke,
        strokeWidth,
        onPointerDown,
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(e);
        },
        onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e);
        },
        style: { cursor: "move" as const },
        transform: `rotate(${shape.rotation} ${shape.x} ${shape.y})`,
    };

    if (shape.type === "rect") {
        return <rect x={shape.x - shape.width / 2} y={shape.y - shape.height / 2} width={shape.width} height={shape.height} {...common} />;
    }
    if (shape.type === "square") {
        return <rect x={shape.x - shape.width / 2} y={shape.y - shape.width / 2} width={shape.width} height={shape.width} {...common} />;
    }
    if (shape.type === "circle") {
        return <circle cx={shape.x} cy={shape.y} r={shape.radius} {...common} />;
    }
    if (shape.type === "ellipse") {
        return <ellipse cx={shape.x} cy={shape.y} rx={shape.width / 2} ry={shape.height / 2} {...common} />;
    }
    if (shape.type === "triangle") {
        return <polygon points={trianglePoints(shape)} {...common} />;
    }
    if (shape.type === "octagon") {
        return <polygon points={octagonPoints(shape)} {...common} />;
    }
    if (shape.type === "line") {
        return (
            <line
                x1={shape.x - shape.width / 2}
                y1={shape.y - shape.height / 2}
                x2={shape.x + shape.width / 2}
                y2={shape.y + shape.height / 2}
                stroke={stroke}
                strokeWidth={strokeWidth}
                onPointerDown={onPointerDown}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(e);
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e);
                }}
                style={{ cursor: "move" }}
                transform={`rotate(${shape.rotation} ${shape.x} ${shape.y})`}
            />
        );
    }
    if (shape.type === "path") {
        const baseW = Math.max(1, shape.pathBaseWidth || 260);
        const baseH = Math.max(1, shape.pathBaseHeight || 180);
        const sx = Math.max(0.05, shape.width / baseW);
        const sy = Math.max(0.05, shape.height / baseH);
        return (
            <g
                transform={`rotate(${shape.rotation} ${shape.x} ${shape.y})`}
                onPointerDown={onPointerDown}
                onClick={(e) => { e.stopPropagation(); onSelect(e); }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e);
                }}
                style={{ cursor: "move" }}
            >
                <path d={shape.d} fill={shape.fill} fillRule={fillRule} stroke={stroke} strokeWidth={strokeWidth} transform={`translate(${shape.x} ${shape.y}) scale(${sx} ${sy})`} />
            </g>
        );
    }
    return (
        <text
            x={shape.x}
            y={shape.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={shape.fontSize}
            fill={shape.fill}
            onPointerDown={onPointerDown}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(e);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onEditText();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e);
            }}
            style={{ cursor: "move" }}
            transform={`rotate(${shape.rotation} ${shape.x} ${shape.y})`}
        >
            {shape.text}
        </text>
    );
}

export default function SvgPathEditorPage() {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const prevDocRef = useRef<EditorDoc | null>(null);
    const applyingHistoryRef = useRef(false);
    const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
    const [shapes, setShapes] = useState<SvgShape[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [historyPast, setHistoryPast] = useState<EditorDoc[]>([]);
    const [historyFuture, setHistoryFuture] = useState<EditorDoc[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [resize, setResize] = useState<ResizeState | null>(null);
    const [marquee, setMarquee] = useState<MarqueeState | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<{ mouseX: number; mouseY: number } | null>(null);
    const [toolbarExpanded, setToolbarExpanded] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");

    const vb = useMemo(() => parseViewBox(viewBox) ?? { x: 0, y: 0, width: 1200, height: 1200 }, [viewBox]);
    const selectedId = selectedIds[0] ?? null;
    const selectedShape = useMemo(() => shapes.find((s) => s.id === selectedId) ?? null, [shapes, selectedId]);
    const selectedShapes = useMemo(() => shapes.filter((s) => selectedIds.includes(s.id)), [shapes, selectedIds]);

    function normalizeShapes(input: SvgShape[]): SvgShape[] {
        return input.map((shape) => ({
            ...shape,
            fillRule: shape.fillRule ?? "nonzero",
            pathBaseWidth: Math.max(1, shape.pathBaseWidth ?? 260),
            pathBaseHeight: Math.max(1, shape.pathBaseHeight ?? 180),
        }));
    }

    function toDoc(nextViewBox = viewBox, nextShapes = shapes, nextSelectedIds = selectedIds): EditorDoc {
        return {
            viewBox: nextViewBox,
            shapes: nextShapes,
            selectedId: nextSelectedIds[0] ?? null,
            selectedIds: [...nextSelectedIds],
        };
    }

    function applyDoc(doc: EditorDoc) {
        applyingHistoryRef.current = true;
        const normalized = normalizeShapes(doc.shapes || []);
        const valid = (doc.selectedIds || []).filter((id) => normalized.some((shape) => shape.id === id));
        const fallback = doc.selectedId && normalized.some((shape) => shape.id === doc.selectedId) ? [doc.selectedId] : (normalized[0] ? [normalized[0].id] : []);
        setViewBox(doc.viewBox || DEFAULT_VIEWBOX);
        setShapes(normalized);
        setSelectedIds(valid.length ? valid : fallback);
    }

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const first = createShape("path", vb);
                setShapes([first]);
                setSelectedIds([first.id]);
                prevDocRef.current = {
                    viewBox: DEFAULT_VIEWBOX,
                    shapes: [first],
                    selectedId: first.id,
                    selectedIds: [first.id],
                };
                setHydrated(true);
                return;
            }
            const parsed = JSON.parse(raw) as { viewBox?: string; shapes?: SvgShape[]; selectedId?: string | null; selectedIds?: string[] };
            if (parsed.viewBox) setViewBox(parsed.viewBox);
            if (Array.isArray(parsed.shapes) && parsed.shapes.length > 0) {
                const normalizedShapes = normalizeShapes(parsed.shapes);
                setShapes(normalizedShapes);
                const persisted = Array.isArray(parsed.selectedIds) ? parsed.selectedIds.filter((id) => normalizedShapes.some((s) => s.id === id)) : [];
                const fallback = parsed.selectedId && normalizedShapes.some((s) => s.id === parsed.selectedId) ? [parsed.selectedId] : [normalizedShapes[normalizedShapes.length - 1].id];
                setSelectedIds(persisted.length ? persisted : fallback);
                prevDocRef.current = {
                    viewBox: parsed.viewBox || DEFAULT_VIEWBOX,
                    shapes: normalizedShapes,
                    selectedId: (persisted.length ? persisted[0] : fallback[0]) ?? null,
                    selectedIds: persisted.length ? persisted : fallback,
                };
            } else {
                const first = createShape("path", vb);
                setShapes([first]);
                setSelectedIds([first.id]);
                prevDocRef.current = {
                    viewBox: parsed.viewBox || DEFAULT_VIEWBOX,
                    shapes: [first],
                    selectedId: first.id,
                    selectedIds: [first.id],
                };
            }
        } catch {
            const first = createShape("path", vb);
            setShapes([first]);
            setSelectedIds([first.id]);
            prevDocRef.current = {
                viewBox: DEFAULT_VIEWBOX,
                shapes: [first],
                selectedId: first.id,
                selectedIds: [first.id],
            };
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewBox, shapes, selectedId, selectedIds }));
        } catch {
            // ignore storage failures
        }
    }, [viewBox, shapes, selectedId, selectedIds, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        const current = toDoc();
        if (applyingHistoryRef.current) {
            prevDocRef.current = current;
            applyingHistoryRef.current = false;
            return;
        }
        const prev = prevDocRef.current;
        if (!prev) {
            prevDocRef.current = current;
            return;
        }
        const prevSig = JSON.stringify(prev);
        const currentSig = JSON.stringify(current);
        if (prevSig === currentSig) return;
        setHistoryPast((past) => {
            const next = [...past, prev];
            return next.length > 100 ? next.slice(next.length - 100) : next;
        });
        setHistoryFuture([]);
        prevDocRef.current = current;
    }, [viewBox, shapes, selectedIds, selectedId, hydrated]);

    function undoHistory() {
        if (historyPast.length === 0) return;
        const current = toDoc();
        const prev = historyPast[historyPast.length - 1];
        setHistoryPast((past) => past.slice(0, -1));
        setHistoryFuture((future) => [current, ...future]);
        applyDoc(prev);
    }

    function redoHistory() {
        if (historyFuture.length === 0) return;
        const current = toDoc();
        const next = historyFuture[0];
        setHistoryFuture((future) => future.slice(1));
        setHistoryPast((past) => [...past, current]);
        applyDoc(next);
    }

    function clientToSvg(clientX: number, clientY: number) {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        return {
            x: vb.x + ((clientX - rect.left) / rect.width) * vb.width,
            y: vb.y + ((clientY - rect.top) / rect.height) * vb.height,
        };
    }

    function addShape(type: ShapeType) {
        const next = createShape(type, vb);
        setShapes((prev) => [...prev, next]);
        setSelectedIds([next.id]);
    }

    function selectSingle(id: string) {
        setSelectedIds([id]);
    }

    function toggleSelection(id: string) {
        setSelectedIds((prev) => (
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        ));
    }

    function clearSelection() {
        setSelectedIds([]);
    }

    function updateSelected(patch: Partial<SvgShape>) {
        if (!selectedId) return;
        setShapes((prev) => prev.map((shape) => (shape.id === selectedId ? { ...shape, ...patch } : shape)));
    }

    function beginDrag(id: string, event: React.PointerEvent) {
        event.stopPropagation();
        if (resize || marquee) return;
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;
        const pt = clientToSvg(event.clientX, event.clientY);
        if (!pt) return;
        if (!selectedIds.includes(id)) {
            setSelectedIds([id]);
        }
        setDrag({ id, startX: pt.x, startY: pt.y, originX: shape.x, originY: shape.y });
    }

    function beginResize(id: string, handle: ResizeHandle, event: React.PointerEvent) {
        event.stopPropagation();
        event.preventDefault();
        if (marquee) return;
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;
        const pt = clientToSvg(event.clientX, event.clientY);
        if (!pt) return;
        if (!selectedIds.includes(id)) {
            setSelectedIds([id]);
        }
        setResize({
            id,
            handle,
            startX: pt.x,
            startY: pt.y,
            originX: shape.x,
            originY: shape.y,
            originWidth: shape.width,
            originHeight: shape.height,
            originRadius: shape.radius,
            originFontSize: shape.fontSize,
        });
    }

    useEffect(() => {
        if (!drag) return;
        const onMove = (event: PointerEvent) => {
            const pt = clientToSvg(event.clientX, event.clientY);
            if (!pt) return;
            const dx = pt.x - drag.startX;
            const dy = pt.y - drag.startY;
            setShapes((prev) => prev.map((shape) => (
                shape.id === drag.id ? { ...shape, x: round2(drag.originX + dx), y: round2(drag.originY + dy) } : shape
            )));
        };
        const onUp = () => setDrag(null);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag, vb, resize]);

    useEffect(() => {
        if (!resize) return;
        const onMove = (event: PointerEvent) => {
            const pt = clientToSvg(event.clientX, event.clientY);
            if (!pt) return;
            const dx = pt.x - resize.startX;
            const dy = pt.y - resize.startY;
            setShapes((prev) => prev.map((shape) => {
                if (shape.id !== resize.id) return shape;
                const signX = resize.handle.includes("w") ? -1 : resize.handle.includes("e") ? 1 : 0;
                const signY = resize.handle.includes("n") ? -1 : resize.handle.includes("s") ? 1 : 0;
                const nextWidth = Math.max(8, resize.originWidth + dx * signX * 2);
                const nextHeight = Math.max(8, resize.originHeight + dy * signY * 2);
                const nextX = signX === 0 ? resize.originX : round2(resize.originX + (dx / 2));
                const nextY = signY === 0 ? resize.originY : round2(resize.originY + (dy / 2));

                if (shape.type === "square") {
                    const side = Math.max(8, nextWidth);
                    return { ...shape, x: nextX, y: nextY, width: side, height: side };
                }
                if (shape.type === "circle") {
                    const diameter = Math.max(8, nextWidth);
                    return { ...shape, x: nextX, y: nextY, radius: round2(diameter / 2), width: diameter, height: diameter };
                }
                if (shape.type === "text") {
                    const candidate = Math.max(8, resize.originFontSize + dy * signY * 0.5 + dx * signX * 0.2);
                    return { ...shape, x: nextX, y: nextY, fontSize: round2(candidate) };
                }
                return { ...shape, x: nextX, y: nextY, width: round2(nextWidth), height: round2(nextHeight) };
            }));
        };
        const onUp = () => setResize(null);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resize, vb]);

    function beginMarquee(event: React.PointerEvent) {
        if (event.button !== 0) return;
        if (drag || resize) return;
        const pt = clientToSvg(event.clientX, event.clientY);
        if (!pt) return;
        closeContextMenu();
        setMarquee({
            startX: pt.x,
            startY: pt.y,
            currentX: pt.x,
            currentY: pt.y,
            additive: Boolean(event.shiftKey || event.ctrlKey || event.metaKey),
        });
    }

    useEffect(() => {
        if (!marquee) return;
        const onMove = (event: PointerEvent) => {
            const pt = clientToSvg(event.clientX, event.clientY);
            if (!pt) return;
            setMarquee((prev) => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : prev));
        };
        const onUp = () => {
            setMarquee((current) => {
                if (!current) return null;
                const dxAbs = Math.abs(current.currentX - current.startX);
                const dyAbs = Math.abs(current.currentY - current.startY);
                if (dxAbs < 2 && dyAbs < 2) {
                    if (!current.additive) clearSelection();
                    return null;
                }
                const minX = Math.min(current.startX, current.currentX);
                const maxX = Math.max(current.startX, current.currentX);
                const minY = Math.min(current.startY, current.currentY);
                const maxY = Math.max(current.startY, current.currentY);
                const enclosed = shapes
                    .filter((shape) => {
                        const b = getShapeBounds(shape);
                        return b.x >= minX && b.y >= minY && (b.x + b.width) <= maxX && (b.y + b.height) <= maxY;
                    })
                    .map((shape) => shape.id);
                if (current.additive) {
                    setSelectedIds((prev) => Array.from(new Set([...prev, ...enclosed])));
                } else {
                    setSelectedIds(enclosed);
                }
                return null;
            });
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marquee, shapes, vb]);

    function removeSelected() {
        if (selectedIds.length === 0) return;
        setShapes((prev) => {
            const selectedSet = new Set(selectedIds);
            const next = prev.filter((shape) => !selectedSet.has(shape.id));
            setSelectedIds(next.length ? [next[next.length - 1].id] : []);
            return next;
        });
    }

    function duplicateSelected() {
        if (selectedShapes.length === 0) return;
        const copies = selectedShapes.map((shape) => ({
            ...shape,
            id: uid(),
            x: shape.x + 40,
            y: shape.y + 40,
        }));
        setShapes((prev) => [...prev, ...copies]);
        setSelectedIds(copies.map((shape) => shape.id));
    }

    function mergeSelectedShapes() {
        if (selectedShapes.length < 2) {
            setMessage("Select at least two shapes to merge.");
            setMessageType("error");
            return;
        }
        const unsupported = selectedShapes.filter((shape) => shape.type === "path" || shape.type === "text");
        if (unsupported.length > 0) {
            setMessage("Merge currently supports geometric shapes/lines only (not text/path).");
            setMessageType("error");
            return;
        }

        const polygons = selectedShapes
            .map((shape) => {
                const points = sampleShapePolygon(shape);
                if (!points || points.length < 3) return null;
                const ring: Array<[number, number]> = points.map((point) => [point.x, point.y]);
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
                    ring.push([first[0], first[1]]);
                }
                return [ring];
            })
            .filter((polygon): polygon is Array<Array<[number, number]>> => Array.isArray(polygon));

        if (polygons.length < 2) {
            setMessage("Unable to merge selected shapes.");
            setMessageType("error");
            return;
        }

        let unionResult: number[][][][] | null = null;
        try {
            const unionFn = getUnionFunction();
            if (!unionFn) {
                setMessage("Pathfinder merge is unavailable (union function not loaded).");
                setMessageType("error");
                return;
            }
            const unionRaw = unionFn(...(polygons as any[]));
            if (!Array.isArray(unionRaw) || unionRaw.length === 0) {
                unionResult = null;
            } else if (Array.isArray(unionRaw[0]?.[0]?.[0])) {
                // MultiPolygon: number[][][][]
                unionResult = unionRaw as number[][][][];
            } else {
                // Polygon: number[][][] -> normalize to MultiPolygon
                unionResult = [unionRaw as number[][][]];
            }
        } catch {
            setMessage("Boolean union failed for selected shapes.");
            setMessageType("error");
            return;
        }
        if (!unionResult || unionResult.length === 0) {
            setMessage("No merged geometry produced.");
            setMessageType("error");
            return;
        }

        const rings: Array<Array<[number, number]>> = unionResult.flatMap((polygon) => polygon as Array<[number, number]>[]);
        const allPoints = rings.flat();
        const minX = Math.min(...allPoints.map((point) => point[0]));
        const maxX = Math.max(...allPoints.map((point) => point[0]));
        const minY = Math.min(...allPoints.map((point) => point[1]));
        const maxY = Math.max(...allPoints.map((point) => point[1]));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const d = ringsToRelativePath(rings, cx, cy);
        const base = selectedShapes[0];
        const mergedWidth = round2(Math.max(8, maxX - minX));
        const mergedHeight = round2(Math.max(8, maxY - minY));
        const merged: SvgShape = {
            ...createShape("path", vb),
            id: uid(),
            x: round2(cx),
            y: round2(cy),
            width: mergedWidth,
            height: mergedHeight,
            rotation: 0,
            fill: base.fill,
            stroke: base.stroke,
            strokeWidth: base.strokeWidth,
            fillRule: "evenodd",
            pathBaseWidth: mergedWidth,
            pathBaseHeight: mergedHeight,
            d,
        };

        const selectedSet = new Set(selectedIds);
        setShapes((prev) => [...prev.filter((shape) => !selectedSet.has(shape.id)), merged]);
        setSelectedIds([merged.id]);
        setMessage("Merged selected shapes (union).");
        setMessageType("success");
    }

    function mergeSelectedKeepOutlines() {
        if (selectedShapes.length < 2) {
            setMessage("Select at least two shapes to merge.");
            setMessageType("error");
            return;
        }
        const unsupported = selectedShapes.filter((shape) => shape.type === "path" || shape.type === "text");
        if (unsupported.length > 0) {
            setMessage("Merge currently supports geometric shapes/lines only (not text/path).");
            setMessageType("error");
            return;
        }

        const rings: Array<Array<[number, number]>> = selectedShapes
            .map((shape) => {
                const points = sampleShapePolygon(shape);
                if (!points || points.length < 3) return null;
                const ring: Array<[number, number]> = points.map((point) => [point.x, point.y]);
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
                    ring.push([first[0], first[1]]);
                }
                return ring;
            })
            .filter((ring): ring is Array<[number, number]> => Array.isArray(ring) && ring.length >= 3);

        if (rings.length < 2) {
            setMessage("Unable to merge selected shapes.");
            setMessageType("error");
            return;
        }

        const allPoints = rings.flat();
        const minX = Math.min(...allPoints.map((point) => point[0]));
        const maxX = Math.max(...allPoints.map((point) => point[0]));
        const minY = Math.min(...allPoints.map((point) => point[1]));
        const maxY = Math.max(...allPoints.map((point) => point[1]));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const d = ringsToRelativePath(rings, cx, cy);
        const base = selectedShapes[0];
        const mergedWidth = round2(Math.max(8, maxX - minX));
        const mergedHeight = round2(Math.max(8, maxY - minY));
        const merged: SvgShape = {
            ...createShape("path", vb),
            id: uid(),
            x: round2(cx),
            y: round2(cy),
            width: mergedWidth,
            height: mergedHeight,
            rotation: 0,
            fill: base.fill,
            stroke: base.stroke,
            strokeWidth: base.strokeWidth,
            fillRule: "nonzero",
            pathBaseWidth: mergedWidth,
            pathBaseHeight: mergedHeight,
            d,
        };

        const selectedSet = new Set(selectedIds);
        setShapes((prev) => [...prev.filter((shape) => !selectedSet.has(shape.id)), merged]);
        setSelectedIds([merged.id]);
        setMessage("Merged selected shapes (keep outlines).");
        setMessageType("success");
    }

    function bringForward() {
        if (selectedIds.length === 0) return;
        setShapes((prev) => {
            const next = [...prev];
            const selectedSet = new Set(selectedIds);
            for (let i = next.length - 2; i >= 0; i -= 1) {
                if (selectedSet.has(next[i].id) && !selectedSet.has(next[i + 1].id)) {
                    const tmp = next[i];
                    next[i] = next[i + 1];
                    next[i + 1] = tmp;
                }
            }
            return next;
        });
    }

    function sendBackward() {
        if (selectedIds.length === 0) return;
        setShapes((prev) => {
            const next = [...prev];
            const selectedSet = new Set(selectedIds);
            for (let i = 1; i < next.length; i += 1) {
                if (selectedSet.has(next[i].id) && !selectedSet.has(next[i - 1].id)) {
                    const tmp = next[i];
                    next[i] = next[i - 1];
                    next[i - 1] = tmp;
                }
            }
            return next;
        });
    }

    function sendToFront() {
        if (selectedIds.length === 0) return;
        setShapes((prev) => {
            const selectedSet = new Set(selectedIds);
            const keep = prev.filter((shape) => !selectedSet.has(shape.id));
            const picked = prev.filter((shape) => selectedSet.has(shape.id));
            return [...keep, ...picked];
        });
    }

    function sendToBack() {
        if (selectedIds.length === 0) return;
        setShapes((prev) => {
            const selectedSet = new Set(selectedIds);
            const picked = prev.filter((shape) => selectedSet.has(shape.id));
            const keep = prev.filter((shape) => !selectedSet.has(shape.id));
            return [...picked, ...keep];
        });
    }

    function alignSelected(mode: "left" | "right" | "hcenter" | "top" | "bottom" | "vcenter") {
        if (selectedShapes.length < 2) return;
        const selectedSet = new Set(selectedIds);
        const boundsById = new Map<string, ReturnType<typeof getShapeBounds>>();
        selectedShapes.forEach((shape) => boundsById.set(shape.id, getShapeBounds(shape)));
        const allBounds = selectedShapes.map((shape) => boundsById.get(shape.id)!);
        const groupLeft = Math.min(...allBounds.map((b) => b.x));
        const groupRight = Math.max(...allBounds.map((b) => b.x + b.width));
        const groupTop = Math.min(...allBounds.map((b) => b.y));
        const groupBottom = Math.max(...allBounds.map((b) => b.y + b.height));
        const groupCx = (groupLeft + groupRight) / 2;
        const groupCy = (groupTop + groupBottom) / 2;

        setShapes((prev) => prev.map((shape) => {
            if (!selectedSet.has(shape.id)) return shape;
            const b = boundsById.get(shape.id)!;
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            let dx = 0;
            let dy = 0;
            if (mode === "left") dx = groupLeft - b.x;
            if (mode === "right") dx = groupRight - (b.x + b.width);
            if (mode === "hcenter") dx = groupCx - cx;
            if (mode === "top") dy = groupTop - b.y;
            if (mode === "bottom") dy = groupBottom - (b.y + b.height);
            if (mode === "vcenter") dy = groupCy - cy;
            return { ...shape, x: round2(shape.x + dx), y: round2(shape.y + dy) };
        }));
    }

    function rotateSelected(delta: number) {
        if (!selectedShape) return;
        updateSelected({ rotation: round2(selectedShape.rotation + delta) });
    }

    function nudgeSelected(dx: number, dy: number) {
        if (selectedIds.length === 0) return;
        const selectedSet = new Set(selectedIds);
        setShapes((prev) => prev.map((shape) => (
            selectedSet.has(shape.id)
                ? { ...shape, x: round2(shape.x + dx), y: round2(shape.y + dy) }
                : shape
        )));
    }

    function openContextMenu(id: string, event: React.MouseEvent) {
        if (!selectedIds.includes(id)) {
            setSelectedIds([id]);
        }
        setMenuAnchor({ mouseX: event.clientX + 2, mouseY: event.clientY - 6 });
    }

    function openContextMenuForSelection(event: React.MouseEvent) {
        event.preventDefault();
        if (selectedIds.length === 0) return;
        setMenuAnchor({ mouseX: event.clientX + 2, mouseY: event.clientY - 6 });
    }

    function closeContextMenu() {
        setMenuAnchor(null);
    }

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase() ?? "";
            const isEditable = Boolean(
                target?.isContentEditable
                || tagName === "input"
                || tagName === "textarea"
                || tagName === "select"
            );
            if (isEditable) return;

            const step = event.shiftKey ? 10 : 1;
            if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length > 0) {
                event.preventDefault();
                removeSelected();
                return;
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                nudgeSelected(-step, 0);
                return;
            }
            if (event.key === "ArrowRight") {
                event.preventDefault();
                nudgeSelected(step, 0);
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                nudgeSelected(0, -step);
                return;
            }
            if (event.key === "ArrowDown") {
                event.preventDefault();
                nudgeSelected(0, step);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedIds]);

    function editSelectedText(id: string) {
        const target = shapes.find((shape) => shape.id === id);
        if (!target || target.type !== "text") return;
        const next = window.prompt("Edit text", target.text);
        if (next == null) return;
        setShapes((prev) => prev.map((shape) => (
            shape.id === id ? { ...shape, text: next } : shape
        )));
        setSelectedIds([id]);
    }

    const svgMarkup = useMemo(() => {
        const body = shapes.map((shape) => `  ${shapeMarkup(shape)}`).join("\n");
        return `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"${viewBox}\">\n${body}\n</svg>`;
    }, [shapes, viewBox]);

    async function copySvg() {
        try {
            await navigator.clipboard.writeText(svgMarkup);
            setMessage("SVG copied.");
            setMessageType("success");
        } catch {
            setMessage("Could not copy SVG.");
            setMessageType("error");
        }
    }

    function downloadSvg() {
        try {
            const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "svg-editor.svg";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setMessage("SVG downloaded.");
            setMessageType("success");
        } catch {
            setMessage("Failed to download SVG.");
            setMessageType("error");
        }
    }

    function saveSnapshot() {
        try {
            localStorage.setItem(
                STORAGE_SNAPSHOT_KEY,
                JSON.stringify(toDoc())
            );
            setMessage("Snapshot saved.");
            setMessageType("success");
        } catch {
            setMessage("Failed to save snapshot.");
            setMessageType("error");
        }
    }

    function restoreSnapshot() {
        try {
            const raw = localStorage.getItem(STORAGE_SNAPSHOT_KEY);
            if (!raw) {
                setMessage("No saved snapshot found.");
                setMessageType("error");
                return;
            }
            const parsed = JSON.parse(raw) as EditorDoc;
            if (!Array.isArray(parsed.shapes) || parsed.shapes.length === 0) {
                setMessage("Saved snapshot is empty or invalid.");
                setMessageType("error");
                return;
            }
            applyDoc(parsed);
            setMessage("Snapshot restored.");
            setMessageType("success");
        } catch {
            setMessage("Failed to restore snapshot.");
            setMessageType("error");
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: "auto" }}>
            <Stack spacing={2}>
                {toolbarExpanded ? (
                    <Paper elevation={0} sx={{ p: 1, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                            <Tooltip title="Collapse tools">
                                <IconButton size="small" onClick={() => setToolbarExpanded(false)}><ExpandLessIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Add Rectangle"><IconButton size="small" onClick={() => addShape("rect")}><Crop169Icon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Square"><IconButton size="small" onClick={() => addShape("square")}><CropSquareIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Circle"><IconButton size="small" onClick={() => addShape("circle")}><CircleOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Ellipse"><IconButton size="small" onClick={() => addShape("ellipse")}><PanoramaFishEyeIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Triangle"><IconButton size="small" onClick={() => addShape("triangle")}><ChangeHistoryIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Octagon"><IconButton size="small" onClick={() => addShape("octagon")}><StopIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Line"><IconButton size="small" onClick={() => addShape("line")}><HorizontalRuleIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Path"><IconButton size="small" onClick={() => addShape("path")}><TimelineIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Add Text"><IconButton size="small" onClick={() => addShape("text")}><TextFieldsIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Copy SVG"><IconButton size="small" onClick={() => void copySvg()}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Download SVG"><IconButton size="small" onClick={downloadSvg}><FileDownloadIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Save Snapshot"><IconButton size="small" onClick={saveSnapshot}><SaveIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Restore Snapshot"><IconButton size="small" onClick={restoreSnapshot}><SettingsBackupRestoreIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Undo"><span><IconButton size="small" onClick={undoHistory} disabled={historyPast.length === 0}><UndoIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Redo"><span><IconButton size="small" onClick={redoHistory} disabled={historyFuture.length === 0}><RedoIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Duplicate selected"><IconButton size="small" onClick={duplicateSelected} disabled={!selectedShape}><CopyAllIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Delete selected"><IconButton size="small" color="error" onClick={removeSelected} disabled={!selectedShape}><DeleteSweepIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Rotate -15"><IconButton size="small" onClick={() => rotateSelected(-15)} disabled={!selectedShape}><RotateLeftIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Rotate +15"><IconButton size="small" onClick={() => rotateSelected(15)} disabled={!selectedShape}><RotateRightIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Send backward"><IconButton size="small" onClick={sendBackward} disabled={!selectedShape}><ArrowDownwardIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Bring forward"><IconButton size="small" onClick={bringForward} disabled={!selectedShape}><ArrowUpwardIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                    </Paper>
                ) : (
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Tooltip title="Expand tools"><IconButton size="small" onClick={() => setToolbarExpanded(true)}><ExpandMoreIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                )}

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                    <Paper elevation={0} sx={{ flex: 1, minWidth: 0, p: 2, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Canvas</Typography>
                            <Box
                                sx={{
                                    width: "100%",
                                    aspectRatio: "1 / 1",
                                    maxWidth: "min(100%, calc(100vh - 100px))",
                                    maxHeight: "calc(100vh - 100px)",
                                    mx: "auto",
                                    borderRadius: 2,
                                    border: "1px dashed rgba(0,0,0,0.26)",
                                    backgroundImage: "linear-gradient(45deg, #f4f6f8 25%, transparent 25%), linear-gradient(-45deg, #f4f6f8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f4f6f8 75%), linear-gradient(-45deg, transparent 75%, #f4f6f8 75%)",
                                    backgroundSize: "20px 20px",
                                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
                                    p: 0.8,
                                }}
                            >
                                <svg
                                    ref={svgRef}
                                    viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
                                    style={{ width: "100%", height: "100%", touchAction: "none", cursor: drag || resize ? "grabbing" : marquee ? "crosshair" : "default" }}
                                    onPointerDown={beginMarquee}
                                    onClick={() => closeContextMenu()}
                                    onContextMenu={openContextMenuForSelection}
                                >
                                    {shapes.map((shape) => (
                                        <g key={shape.id}>
                                            {shapeRenderer(
                                                shape,
                                                selectedIds.includes(shape.id),
                                                (event) => beginDrag(shape.id, event),
                                                (event) => {
                                                    if (event.shiftKey || event.ctrlKey || event.metaKey) {
                                                        toggleSelection(shape.id);
                                                    } else {
                                                        selectSingle(shape.id);
                                                    }
                                                },
                                                () => editSelectedText(shape.id),
                                                (event) => openContextMenu(shape.id, event)
                                            )}
                                        </g>
                                    ))}
                                    {marquee ? (
                                        <rect
                                            x={Math.min(marquee.startX, marquee.currentX)}
                                            y={Math.min(marquee.startY, marquee.currentY)}
                                            width={Math.abs(marquee.currentX - marquee.startX)}
                                            height={Math.abs(marquee.currentY - marquee.startY)}
                                            fill="rgba(30,136,229,0.14)"
                                            stroke="#1e88e5"
                                            strokeWidth={2}
                                            strokeDasharray="8 6"
                                            pointerEvents="none"
                                        />
                                    ) : null}
                                    {selectedShapes.map((shape) => {
                                        const b = getShapeBounds(shape);
                                        return (
                                            <rect
                                                key={`sel-bounds-${shape.id}`}
                                                x={b.x}
                                                y={b.y}
                                                width={b.width}
                                                height={b.height}
                                                fill="none"
                                                stroke="#ff9800"
                                                strokeWidth={2}
                                                strokeDasharray="8 6"
                                                pointerEvents="none"
                                            />
                                        );
                                    })}
                                    {selectedShape && selectedIds.length === 1 ? (() => {
                                        const bounds = getShapeBounds(selectedShape);
                                        const x = bounds.x;
                                        const y = bounds.y;
                                        const w = bounds.width;
                                        const h = bounds.height;
                                        const handles: Array<{ key: ResizeHandle; x: number; y: number; cursor: string }> = [
                                            { key: "nw", x, y, cursor: "nwse-resize" },
                                            { key: "n", x: x + w / 2, y, cursor: "ns-resize" },
                                            { key: "ne", x: x + w, y, cursor: "nesw-resize" },
                                            { key: "e", x: x + w, y: y + h / 2, cursor: "ew-resize" },
                                            { key: "se", x: x + w, y: y + h, cursor: "nwse-resize" },
                                            { key: "s", x: x + w / 2, y: y + h, cursor: "ns-resize" },
                                            { key: "sw", x, y: y + h, cursor: "nesw-resize" },
                                            { key: "w", x, y: y + h / 2, cursor: "ew-resize" },
                                        ];
                                        return (
                                            <g>
                                                {handles.map((handle) => (
                                                    <rect
                                                        key={handle.key}
                                                        x={handle.x - 9}
                                                        y={handle.y - 9}
                                                        width={18}
                                                        height={18}
                                                        fill="#ffffff"
                                                        stroke="#ff9800"
                                                        strokeWidth={2}
                                                        style={{ cursor: handle.cursor }}
                                                        onPointerDown={(event) => beginResize(selectedShape.id, handle.key, event)}
                                                    />
                                                ))}
                                            </g>
                                        );
                                    })() : null}
                                </svg>
                            </Box>
                            <Menu
                                open={Boolean(menuAnchor)}
                                onClose={closeContextMenu}
                                anchorReference="anchorPosition"
                                anchorPosition={menuAnchor ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX } : undefined}
                            >
                                <MenuItem onClick={() => { mergeSelectedShapes(); closeContextMenu(); }}>Merge Selected (Union)</MenuItem>
                                <MenuItem onClick={() => { mergeSelectedKeepOutlines(); closeContextMenu(); }}>Merge Selected (Keep Outlines)</MenuItem>
                                <MenuItem onClick={() => { duplicateSelected(); closeContextMenu(); }}>Duplicate</MenuItem>
                                <MenuItem onClick={() => { removeSelected(); closeContextMenu(); }}>Delete</MenuItem>
                                <MenuItem onClick={() => { bringForward(); closeContextMenu(); }}>Bring Forward</MenuItem>
                                <MenuItem onClick={() => { sendBackward(); closeContextMenu(); }}>Send Backward</MenuItem>
                                <MenuItem onClick={() => { sendToFront(); closeContextMenu(); }}>Send To Front</MenuItem>
                                <MenuItem onClick={() => { sendToBack(); closeContextMenu(); }}>Send To Back</MenuItem>
                                <MenuItem onClick={() => { alignSelected("left"); closeContextMenu(); }}>Align Left</MenuItem>
                                <MenuItem onClick={() => { alignSelected("hcenter"); closeContextMenu(); }}>Align Center (Horizontal)</MenuItem>
                                <MenuItem onClick={() => { alignSelected("right"); closeContextMenu(); }}>Align Right</MenuItem>
                                <MenuItem onClick={() => { alignSelected("top"); closeContextMenu(); }}>Align Top</MenuItem>
                                <MenuItem onClick={() => { alignSelected("vcenter"); closeContextMenu(); }}>Align Middle (Vertical)</MenuItem>
                                <MenuItem onClick={() => { alignSelected("bottom"); closeContextMenu(); }}>Align Bottom</MenuItem>
                            </Menu>
                        </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ width: { xs: "100%", md: 330 }, flexShrink: 0, p: 2, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack spacing={1.2}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>SVG Editor</Typography>
                            <TextField
                                label="ViewBox"
                                value={viewBox}
                                onChange={(e) => setViewBox(e.target.value)}
                                size="small"
                                fullWidth
                                helperText='Example: "0 0 1200 1200"'
                            />

                            <TextField
                                select
                                label="Primary Shape"
                                size="small"
                                value={selectedId ?? ""}
                                onChange={(e) => setSelectedIds(e.target.value ? [e.target.value] : [])}
                                fullWidth
                            >
                                {shapes.map((shape, idx) => (
                                    <MenuItem key={shape.id} value={shape.id}>{idx + 1}. {shape.type}</MenuItem>
                                ))}
                            </TextField>

                            <Paper variant="outlined" sx={{ maxHeight: 170, overflowY: "auto", p: 0.6 }}>
                                <Stack spacing={0.2}>
                                    {shapes.map((shape, idx) => (
                                        <Box
                                            key={`sel-${shape.id}`}
                                            sx={{ display: "flex", alignItems: "center", px: 0.2, borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
                                            onClick={() => toggleSelection(shape.id)}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={selectedIds.includes(shape.id)}
                                                onChange={() => toggleSelection(shape.id)}
                                            />
                                            <Typography variant="caption">{idx + 1}. {shape.type}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <TextField select label="Add" size="small" value="" onChange={(e) => addShape(e.target.value as ShapeType)} sx={{ minWidth: 130 }}>
                                    <MenuItem value="rect">Rectangle</MenuItem>
                                    <MenuItem value="square">Square</MenuItem>
                                    <MenuItem value="circle">Circle</MenuItem>
                                    <MenuItem value="ellipse">Ellipse</MenuItem>
                                    <MenuItem value="triangle">Triangle</MenuItem>
                                    <MenuItem value="octagon">Octagon</MenuItem>
                                    <MenuItem value="line">Line</MenuItem>
                                    <MenuItem value="path">Path</MenuItem>
                                    <MenuItem value="text">Text</MenuItem>
                                </TextField>
                            </Stack>

                            {selectedShape ? (
                                <>
                                    <TextField label="Type" size="small" value={selectedShape.type} InputProps={{ readOnly: true }} fullWidth />
                                    <Stack direction="row" spacing={1}>
                                        <TextField label="X" size="small" type="number" value={selectedShape.x} onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })} fullWidth />
                                        <TextField label="Y" size="small" type="number" value={selectedShape.y} onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })} fullWidth />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                        <TextField label="Width" size="small" type="number" value={selectedShape.width} onChange={(e) => updateSelected({ width: Math.max(1, Number(e.target.value) || 1) })} fullWidth />
                                        <TextField label="Height" size="small" type="number" value={selectedShape.height} onChange={(e) => updateSelected({ height: Math.max(1, Number(e.target.value) || 1) })} fullWidth />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                        <TextField label="Radius" size="small" type="number" value={selectedShape.radius} onChange={(e) => updateSelected({ radius: Math.max(1, Number(e.target.value) || 1) })} fullWidth />
                                        <TextField label="Rotation" size="small" type="number" value={selectedShape.rotation} onChange={(e) => updateSelected({ rotation: Number(e.target.value) || 0 })} fullWidth />
                                    </Stack>
                                    <TextField label="Fill" size="small" value={selectedShape.fill} onChange={(e) => updateSelected({ fill: e.target.value })} fullWidth />
                                    <TextField label="Stroke" size="small" value={selectedShape.stroke} onChange={(e) => updateSelected({ stroke: e.target.value })} fullWidth />
                                    <TextField label="Stroke Width" size="small" type="number" value={selectedShape.strokeWidth} onChange={(e) => updateSelected({ strokeWidth: Math.max(0, Number(e.target.value) || 0) })} fullWidth />

                                    {selectedShape.type === "text" ? (
                                        <>
                                            <TextField label="Text" size="small" value={selectedShape.text} onChange={(e) => updateSelected({ text: e.target.value })} fullWidth />
                                            <TextField label="Font Size" size="small" type="number" value={selectedShape.fontSize} onChange={(e) => updateSelected({ fontSize: Math.max(1, Number(e.target.value) || 1) })} fullWidth />
                                        </>
                                    ) : null}

                                    {selectedShape.type === "path" ? (
                                        <TextField label="Path d" size="small" value={selectedShape.d} onChange={(e) => updateSelected({ d: e.target.value })} fullWidth multiline minRows={4} maxRows={8} />
                                    ) : null}
                                </>
                            ) : (
                                <Typography variant="caption" color="text.secondary">Select a shape from canvas or list to edit properties.</Typography>
                            )}

                            <TextField label="Generated SVG" value={svgMarkup} fullWidth multiline minRows={6} maxRows={12} InputProps={{ readOnly: true }} />
                        </Stack>
                    </Paper>
                </Stack>

                {message ? <Alert severity={messageType}>{message}</Alert> : null}
            </Stack>
        </Box>
    );
}
