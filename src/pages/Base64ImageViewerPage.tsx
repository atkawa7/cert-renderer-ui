import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Box, Paper, Stack, TextField, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AntBtn from "../components/AntBtn";

function normalizeImageSrc(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)) {
        return trimmed;
    }
    const compact = trimmed.replace(/\s+/g, "");
    return `data:image/png;base64,${compact}`;
}

function detectMimeType(src: string): string {
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
    return match?.[1] ?? "image/png";
}

export default function Base64ImageViewerPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [copied, setCopied] = useState(false);

    const normalizedSrc = useMemo(() => normalizeImageSrc(inputValue), [inputValue]);
    const isValidImage = useMemo(() => /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(normalizedSrc), [normalizedSrc]);
    const payloadSize = useMemo(() => {
        if (!normalizedSrc) return 0;
        const base64 = normalizedSrc.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, "");
        return Math.floor((base64.length * 3) / 4);
    }, [normalizedSrc]);

    async function copyBase64() {
        if (!normalizedSrc) return;
        await navigator.clipboard.writeText(normalizedSrc);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    function downloadImage() {
        if (!normalizedSrc) return;
        const ext = detectMimeType(normalizedSrc).split("/")[1] || "png";
        const a = document.createElement("a");
        a.href = normalizedSrc;
        a.download = `base64-image.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            setInputValue(result);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">Base64 Image Viewer</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Paste a base64 image string or upload an image file to inspect and preview it.
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
                    <Paper elevation={0} sx={{ flex: 1, p: 2.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <AntBtn antType="primary" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                                    Upload Image
                                </AntBtn>
                                <AntBtn startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />} onClick={copyBase64} disabled={!normalizedSrc}>
                                    {copied ? "Copied!" : "Copy Base64"}
                                </AntBtn>
                                <AntBtn startIcon={<FileDownloadIcon />} onClick={downloadImage} disabled={!normalizedSrc || !isValidImage}>
                                    Download
                                </AntBtn>
                                <AntBtn antType="text" danger startIcon={<DeleteOutlineIcon />} onClick={() => setInputValue("")} disabled={!inputValue}>
                                    Clear
                                </AntBtn>
                            </Stack>

                            <TextField
                                fullWidth
                                multiline
                                minRows={14}
                                maxRows={22}
                                label="Base64 Image"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                helperText="Supports full data URLs or raw base64 payloads."
                            />

                            <Box
                                component="input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
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
                            {!inputValue ? (
                                <Alert severity="info">Paste base64 content or upload an image to preview it.</Alert>
                            ) : !isValidImage ? (
                                <Alert severity="error">The current value is not a valid base64 image data URL.</Alert>
                            ) : (
                                <>
                                    <Box
                                        sx={{
                                            minHeight: 320,
                                            borderRadius: 2,
                                            border: "1px dashed rgba(0,0,0,0.2)",
                                            bgcolor: "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            overflow: "hidden",
                                            p: 2,
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={normalizedSrc}
                                            alt="Base64 preview"
                                            sx={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
                                        />
                                    </Box>

                                    <Stack spacing={0.5}>
                                        <Typography variant="body2" color="text.secondary">
                                            MIME Type: {detectMimeType(normalizedSrc)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Approx Size: {(payloadSize / 1024).toFixed(1)} KB
                                        </Typography>
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Box>
    );
}
