import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

type Point = { x: number; y: number };
type Stroke = Point[];

function clampSize(v: number): number {
    return Number.isFinite(v) ? Math.max(1, Math.round(v)) : 1;
}

function toPathData(points: Point[]): string {
    if (!points.length) return "";
    if (points.length === 1) {
        const p = points[0];
        return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
    const start = points[0];
    let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;
    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const n = points[i + 1];
        const mx = (p.x + n.x) / 2;
        const my = (p.y + n.y) / 2;
        d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    const end = points[points.length - 1];
    d += ` L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    return d;
}

function applyDrawStyle(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#111111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    applyDrawStyle(ctx);
    for (const stroke of strokes) {
        if (!stroke.length) continue;
        ctx.beginPath();
        ctx.stroke(new Path2D(toPathData(stroke)));
    }
}

function downloadText(content: string, fileName: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function SignaturePad() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);

    // Committed strokes — source of truth for undo, clear, resize, export
    const [strokes, setStrokes] = useState<Stroke[]>([]);

    // Refs for in-flight drawing — avoids stale-closure bugs with React state
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Point[]>([]);

    const [size, setSize] = useState({ width: 900, height: 360 });

    const hasInk = strokes.length > 0 || currentStrokeRef.current.length > 0;

    // ── Canvas helpers ────────────────────────────────────────────────────────

    function getCtx(): CanvasRenderingContext2D | null {
        return canvasRef.current?.getContext("2d") ?? null;
    }

    /** Point in logical (CSS) pixels relative to the canvas, from any PointerEvent */
    function pointFromNative(e: PointerEvent): Point {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // ── Resize / redraw ───────────────────────────────────────────────────────

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const host = hostRef.current;
        if (!canvas || !host) return;

        const rect = host.getBoundingClientRect();
        const width = clampSize(rect.width);
        const height = clampSize(rect.height);
        setSize({ width, height });

        const dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Re-draw committed strokes; in-flight stroke will appear on next move
        drawStrokes(ctx, strokes);
    }, [strokes]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(host);
        resizeCanvas();
        return () => ro.disconnect();
    }, [resizeCanvas]);

    // Redraw when committed strokes change (undo / clear)
    useEffect(() => {
        const ctx = getCtx();
        if (!ctx) return;
        drawStrokes(ctx, strokes);
    }, [strokes]);

    // ── Pointer handlers ──────────────────────────────────────────────────────

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        // Only draw with pen, mouse left-button, or single touch
        if (e.pointerType === "mouse" && e.button !== 0) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawingRef.current = true;

        const p = pointFromNative(e.nativeEvent);
        currentStrokeRef.current = [p];

        // Draw an immediate dot so tap-without-drag is visible
        const ctx = getCtx();
        if (ctx) {
            applyDrawStyle(ctx);
            ctx.beginPath();
            ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawingRef.current) return;

        // Collect all coalesced points the browser batched since the last frame
        const events: PointerEvent[] =
            (e.nativeEvent as any).getCoalescedEvents?.() ?? [e.nativeEvent];

        const newPoints = events.map(pointFromNative);
        const stroke = currentStrokeRef.current;

        // Draw directly to canvas — no React state update, no re-render
        const ctx = getCtx();
        if (ctx && stroke.length > 0) {
            applyDrawStyle(ctx);
            ctx.beginPath();
            ctx.moveTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
            for (const p of newPoints) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }

        currentStrokeRef.current = [...stroke, ...newPoints];
    }

    function commitStroke(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        const stroke = currentStrokeRef.current;
        currentStrokeRef.current = [];

        if (!stroke.length) return;

        // Ensure a single tap records as a two-point stroke so it renders
        const committed = stroke.length === 1 ? [stroke[0], stroke[0]] : stroke;
        setStrokes((prev) => [...prev, committed]);
    }

    // ── SVG export ────────────────────────────────────────────────────────────

    const svgMarkup = useMemo(() => {
        const paths = strokes
            .map((s) => toPathData(s))
            .filter(Boolean)
            .map((d) => `<path d="${d}" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`)
            .join("\n  ");

        return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">\n  <rect width="100%" height="100%" fill="#ffffff" />\n  ${paths}\n</svg>`;
    }, [strokes, size.width, size.height]);

    // ── Actions ───────────────────────────────────────────────────────────────

    function downloadPng() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "signature.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function downloadSvg() {
        downloadText(svgMarkup, "signature.svg", "image/svg+xml;charset=utf-8");
    }

    function clearAll() {
        currentStrokeRef.current = [];
        isDrawingRef.current = false;
        setStrokes([]);
    }

    function undo() {
        setStrokes((prev) => prev.slice(0, -1));
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                    <Typography variant="h6">Draw Signature</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Use mouse, trackpad, or touch. Download as PNG or SVG vector.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={undo} disabled={!hasInk}>Undo</Button>
                    <Button size="small" variant="outlined" color="error" onClick={clearAll} disabled={!hasInk}>Clear</Button>
                </Stack>
            </Stack>

            <Box
                ref={hostRef}
                sx={{
                    height: { xs: 240, sm: 300, md: 360 },
                    borderRadius: 1.5,
                    border: "2px dashed rgba(0,0,0,0.2)",
                    bgcolor: "#fff",
                    overflow: "hidden",
                }}
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={commitStroke}
                    onPointerCancel={commitStroke}
                    style={{ display: "block", touchAction: "none", cursor: "crosshair", userSelect: "none" }}
                />
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button variant="contained" onClick={downloadPng} disabled={!hasInk}>Download PNG</Button>
                <Button variant="outlined" onClick={downloadSvg} disabled={!hasInk}>Download SVG</Button>
            </Stack>
        </Paper>
    );
}
