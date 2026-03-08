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
        const cx = p.x;
        const cy = p.y;
        const mx = (p.x + n.x) / 2;
        const my = (p.y + n.y) / 2;
        d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    const end = points[points.length - 1];
    d += ` L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    return d;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokes) {
        if (!stroke.length) continue;
        ctx.beginPath();
        const path = new Path2D(toPathData(stroke));
        ctx.stroke(path);
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
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [size, setSize] = useState({ width: 900, height: 360 });

    const hasInk = strokes.length > 0;

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawStrokes(ctx, strokes);
    }, [strokes]);

    function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const p = pointFromEvent(e);
        setIsDrawing(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        setStrokes((prev) => [...prev, [p]]);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawing) return;
        const p = pointFromEvent(e);
        setStrokes((prev) => {
            if (!prev.length) return prev;
            const next = [...prev];
            next[next.length - 1] = [...next[next.length - 1], p];
            return next;
        });
    }

    function stopDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setStrokes((prev) => {
            if (!prev.length) return prev;
            const last = prev[prev.length - 1];
            if (last.length >= 2) return prev;
            const clone = [...prev];
            clone[clone.length - 1] = [...last, { ...last[0] }];
            return clone;
        });
    }

    const svgMarkup = useMemo(() => {
        const paths = strokes
            .map((stroke) => toPathData(stroke))
            .filter(Boolean)
            .map((d) => `<path d="${d}" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`)
            .join("\n  ");

        return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">\n  <rect width="100%" height="100%" fill="#ffffff" />\n  ${paths}\n</svg>`;
    }, [strokes, size.height, size.width]);

    function downloadPng() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "signature.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function downloadSvg() {
        downloadText(svgMarkup, "signature.svg", "image/svg+xml;charset=utf-8");
    }

    function clearAll() {
        setStrokes([]);
    }

    function undo() {
        setStrokes((prev) => prev.slice(0, -1));
    }

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
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
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
