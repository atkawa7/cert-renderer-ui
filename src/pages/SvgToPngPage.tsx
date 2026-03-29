import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Box, Paper, Stack, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AntBtn from "../components/AntBtn";

function parsePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, 8192);
}

function toDataUri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function SvgToPngPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [svgInput, setSvgInput] = useState("");
    const [widthInput, setWidthInput] = useState("1024");
    const [heightInput, setHeightInput] = useState("1024");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const hasSvg = useMemo(() => svgInput.trim().length > 0, [svgInput]);
    const looksLikeSvg = useMemo(() => /<svg[\s>]/i.test(svgInput), [svgInput]);
    const svgPreviewSrc = useMemo(() => (looksLikeSvg ? toDataUri(svgInput) : ""), [looksLikeSvg, svgInput]);

    function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const content = typeof reader.result === "string" ? reader.result : "";
            setSvgInput(content);
            setError("");
        };
        reader.readAsText(file);
        event.target.value = "";
    }

    async function downloadPng() {
        if (!looksLikeSvg) return;
        setBusy(true);
        setError("");
        try {
            const targetWidth = parsePositiveInt(widthInput, 1024);
            const targetHeight = parsePositiveInt(heightInput, 1024);
            const image = new Image();
            image.decoding = "async";
            image.src = toDataUri(svgInput);
            await image.decode();

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Unable to create drawing context.");
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
            if (!blob) throw new Error("Failed to generate PNG image.");

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "converted.png";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err?.message || "Could not convert SVG to PNG.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">SVG to PNG</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Convert SVG markup into a downloadable PNG directly in your browser.
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
                    <Paper elevation={0} sx={{ flex: 1, p: 2.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <AntBtn antType="primary" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                                    Upload SVG
                                </AntBtn>
                                <AntBtn startIcon={<FileDownloadIcon />} onClick={() => void downloadPng()} disabled={!looksLikeSvg || busy}>
                                    {busy ? "Converting..." : "Download PNG"}
                                </AntBtn>
                                <AntBtn antType="text" danger startIcon={<DeleteOutlineIcon />} onClick={() => setSvgInput("")} disabled={!hasSvg}>
                                    Clear
                                </AntBtn>
                            </Stack>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <TextField
                                    label="Output Width (px)"
                                    value={widthInput}
                                    onChange={(e) => setWidthInput(e.target.value)}
                                    size="small"
                                    fullWidth
                                />
                                <TextField
                                    label="Output Height (px)"
                                    value={heightInput}
                                    onChange={(e) => setHeightInput(e.target.value)}
                                    size="small"
                                    fullWidth
                                />
                            </Stack>

                            <TextField
                                fullWidth
                                multiline
                                minRows={14}
                                maxRows={22}
                                label="SVG Markup"
                                value={svgInput}
                                onChange={(e) => setSvgInput(e.target.value)}
                                helperText="Paste full SVG markup (must include <svg ...>...</svg>)."
                            />

                            <Box
                                component="input"
                                ref={fileInputRef}
                                type="file"
                                accept=".svg,image/svg+xml"
                                onChange={handleFileUpload}
                                sx={{ display: "none" }}
                            />
                        </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ flex: 1, p: 2.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Preview
                            </Typography>

                            {!hasSvg ? (
                                <Alert severity="info">Paste or upload SVG to preview and convert.</Alert>
                            ) : !looksLikeSvg ? (
                                <Alert severity="error">Input is not valid SVG markup.</Alert>
                            ) : (
                                <Box
                                    sx={{
                                        minHeight: 320,
                                        borderRadius: 2,
                                        border: "1px dashed rgba(0,0,0,0.2)",
                                        bgcolor: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "auto",
                                        p: 2,
                                    }}
                                >
                                    <Box component="img" src={svgPreviewSrc} alt="SVG preview" sx={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }} />
                                </Box>
                            )}

                            {error ? <Alert severity="error">{error}</Alert> : null}
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Box>
    );
}
