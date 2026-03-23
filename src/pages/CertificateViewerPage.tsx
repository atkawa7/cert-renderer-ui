import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import AntBtn from "../components/AntBtn";
import { getCertificatePdfBytes } from "../templateApi";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export default function CertificateViewerPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState(900);
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [loading, setLoading] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
    const viewerBlobUrl = useMemo(() => {
        if (!pdfBytes) return null;
        return URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    }, [pdfBytes]);

    useEffect(() => {
        const element = viewerRef.current;
        if (!element) return;

        const apply = () => {
            const next = Math.max(320, element.clientWidth - 32);
            setContainerWidth(next);
        };

        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;
        let loadingTask: ReturnType<typeof getDocument> | null = null;

        (async () => {
            setLoading(true);
            setError(null);
            setPdfDoc(null);
            setPdfBytes(null);
            setPageNumber(1);
            setTotalPages(0);
            try {
                const bytes = await getCertificatePdfBytes(id);
                if (cancelled) return;
                setPdfBytes(bytes);
                loadingTask = getDocument({ data: bytes });
                const nextDoc = await loadingTask.promise;
                if (cancelled) {
                    nextDoc.destroy();
                    return;
                }
                setPdfDoc(nextDoc);
                setTotalPages(nextDoc.numPages);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load PDF.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (loadingTask) {
                loadingTask.destroy();
            }
        };
    }, [id]);

    useEffect(() => {
        return () => {
            if (pdfDoc) {
                void pdfDoc.destroy();
            }
        };
    }, [pdfDoc]);

    useEffect(() => {
        return () => {
            if (viewerBlobUrl) {
                URL.revokeObjectURL(viewerBlobUrl);
            }
        };
    }, [viewerBlobUrl]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current || totalPages === 0) return;

        let cancelled = false;

        (async () => {
            setRendering(true);
            try {
                const page = await pdfDoc.getPage(pageNumber);
                if (cancelled) return;

                const base = page.getViewport({ scale: 1 });
                const fitScale = containerWidth / base.width;
                const effectiveScale = Math.max(0.5, Math.min(4, fitScale * zoom));
                const viewport = page.getViewport({ scale: effectiveScale });

                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                const pixelRatio = window.devicePixelRatio || 1;
                canvas.width = Math.floor(viewport.width * pixelRatio);
                canvas.height = Math.floor(viewport.height * pixelRatio);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
                await renderTask.promise;
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to render PDF page.");
                }
            } finally {
                if (!cancelled) {
                    setRendering(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, pageNumber, totalPages, zoom, containerWidth]);

    if (!id) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                    <Typography variant="h5">Certificate Viewer</Typography>
                    <Typography color="text.secondary">Missing certificate id.</Typography>
                    <Box>
                        <AntBtn onClick={() => navigate("/certificates")}>Back to certificates</AntBtn>
                    </Box>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, height: "100vh", boxSizing: "border-box" }}>
            <Stack spacing={2} sx={{ height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography variant="h5">Certificate Viewer</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Viewing the stored PDF with a custom in-app viewer.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <AntBtn onClick={() => navigate("/certificates")}>Back</AntBtn>
                        <AntBtn
                            onClick={() => {
                                if (viewerBlobUrl) {
                                    window.open(viewerBlobUrl, "_blank", "noopener,noreferrer");
                                }
                            }}
                            disabled={!viewerBlobUrl}
                        >
                            Open in tab
                        </AntBtn>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <AntBtn onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={loading || rendering || pageNumber <= 1}>
                        Prev
                    </AntBtn>
                    <Typography variant="body2">
                        Page {totalPages > 0 ? pageNumber : "-"} / {totalPages || "-"}
                    </Typography>
                    <AntBtn
                        onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                        disabled={loading || rendering || totalPages === 0 || pageNumber >= totalPages}
                    >
                        Next
                    </AntBtn>
                    <AntBtn onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))} disabled={loading || rendering}>
                        Zoom -
                    </AntBtn>
                    <Typography variant="body2">{Math.round(zoom * 100)}%</Typography>
                    <AntBtn onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))} disabled={loading || rendering}>
                        Zoom +
                    </AntBtn>
                    <AntBtn onClick={() => setZoom(1)} disabled={loading || rendering}>
                        Reset
                    </AntBtn>
                </Stack>

                <Box
                    ref={viewerRef}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        overflow: "auto",
                        bgcolor: "background.paper",
                        p: 2,
                    }}
                >
                    {error ? (
                        <Stack spacing={1}>
                            <Typography color="error.main">Failed to display certificate PDF.</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {error}
                            </Typography>
                        </Stack>
                    ) : loading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography>Loading PDF...</Typography>
                        </Stack>
                    ) : (
                        <Stack alignItems="center" spacing={1}>
                            <Box
                                component="canvas"
                                ref={canvasRef}
                                title="Certificate PDF viewer"
                                sx={{ display: "block", borderRadius: 1, boxShadow: "0 2px 16px rgba(0,0,0,0.12)", bgcolor: "#fff" }}
                            />
                            {rendering && (
                                <Typography variant="body2" color="text.secondary">
                                    Rendering page...
                                </Typography>
                            )}
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}
