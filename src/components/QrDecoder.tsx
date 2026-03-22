import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Alert, Box, Paper, Stack, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import jsQR from "jsqr";
import AntBtn from "./AntBtn";

export type QrDecoderProps = {
    onData?: (data: string | null) => void;
    title?: string;
    description?: string;
};

function normalizeImageSrc(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;
    const compact = trimmed.replace(/\s+/g, "");
    return `data:image/png;base64,${compact}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to load image."));
        image.src = src;
    });
}

export default function QrDecoder({
    onData,
    title = "QR Decoder",
    description = "Paste a data:image payload or upload an image, then decode the QR value.",
}: QrDecoderProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [imageInput, setImageInput] = useState("");
    const [decodedData, setDecodedData] = useState<string | null>(null);
    const [decodeError, setDecodeError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const normalizedSrc = useMemo(() => normalizeImageSrc(imageInput), [imageInput]);
    const isValidImageDataUrl = useMemo(() => /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(normalizedSrc), [normalizedSrc]);

    function handleUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            setImageInput(result);
            setDecodeError(null);
            setDecodedData(null);
            onData?.(null);
        };
        reader.readAsDataURL(file);
        event.target.value = "";
    }

    async function decode() {
        if (!isValidImageDataUrl) {
            setDecodeError("Provide a valid data:image URL or upload an image.");
            setDecodedData(null);
            onData?.(null);
            return;
        }

        try {
            const image = await loadImage(normalizedSrc);
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error("Could not read image pixels.");
            context.drawImage(image, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);

            if (!result?.data) {
                setDecodedData(null);
                setDecodeError("No QR code detected in this image.");
                onData?.(null);
                return;
            }

            setDecodedData(result.data);
            setDecodeError(null);
            onData?.(result.data);
        } catch (error) {
            setDecodedData(null);
            setDecodeError(error instanceof Error ? error.message : "Failed to decode QR image.");
            onData?.(null);
        }
    }

    async function copyDecoded() {
        if (!decodedData) return;
        await navigator.clipboard.writeText(decodedData);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    function clearAll() {
        setImageInput("");
        setDecodedData(null);
        setDecodeError(null);
        onData?.(null);
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">{title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
                    <Paper elevation={0} sx={{ flex: 1, p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <AntBtn antType="primary" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                                    Upload Image
                                </AntBtn>
                                <AntBtn startIcon={<QrCodeScannerIcon />} onClick={decode} disabled={!normalizedSrc}>
                                    Decode QR
                                </AntBtn>
                                <AntBtn startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />} onClick={copyDecoded} disabled={!decodedData}>
                                    {copied ? "Copied!" : "Copy Data"}
                                </AntBtn>
                                <AntBtn antType="text" danger startIcon={<DeleteOutlineIcon />} onClick={clearAll} disabled={!imageInput && !decodedData}>
                                    Clear
                                </AntBtn>
                            </Stack>

                            <TextField
                                fullWidth
                                multiline
                                minRows={12}
                                maxRows={20}
                                label="Data Image (data:image/...;base64,...)"
                                value={imageInput}
                                onChange={(e) => {
                                    setImageInput(e.target.value);
                                    if (decodeError) setDecodeError(null);
                                }}
                                helperText="You can paste a full data URL or raw base64 payload."
                            />

                            <Box component="input" ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} sx={{ display: "none" }} />
                        </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ flex: 1, p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Result
                            </Typography>

                            {!imageInput ? (
                                <Alert severity="info">Paste a data image or upload one to decode QR content.</Alert>
                            ) : !isValidImageDataUrl ? (
                                <Alert severity="error">Input is not a valid image data URL.</Alert>
                            ) : (
                                <Box
                                    sx={{
                                        minHeight: 240,
                                        borderRadius: 2,
                                        border: "1px dashed",
                                        borderColor: "divider",
                                        bgcolor: "background.default",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                        p: 2,
                                    }}
                                >
                                    <Box component="img" src={normalizedSrc} alt="QR source" sx={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain" }} />
                                </Box>
                            )}

                            {decodeError && <Alert severity="error">{decodeError}</Alert>}

                            <TextField
                                fullWidth
                                multiline
                                minRows={4}
                                label="Decoded Data"
                                value={decodedData ?? ""}
                                placeholder="Decoded text/value will appear here."
                                InputProps={{ readOnly: true }}
                            />
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Box>
    );
}
