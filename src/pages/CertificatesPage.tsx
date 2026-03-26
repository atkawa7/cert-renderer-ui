import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography, useTheme } from "@mui/material";
import AntBtn from "../components/AntBtn";
import QRCode from "qrcode";
import { appConfig } from "../appConfig";
import { currentUser, downloadCertificateById, getCertificateById, getCertificateCredential, listCertificates, type CertificateCredential, type CertificateDetail, type CertificateSummary } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";
import { useNavigate } from "react-router-dom";

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export default function CertificatesPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [items, setItems] = useState<CertificateSummary[]>([]);
    const [detail, setDetail] = useState<CertificateDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [credential, setCredential] = useState<CertificateCredential | null>(null);
    const [credentialLoading, setCredentialLoading] = useState(false);
    const [credentialQrDataUrl, setCredentialQrDataUrl] = useState<string | null>(null);
    const [exportAllowed, setExportAllowed] = useState(false);

    async function loadCertificates() {
        setLoading(true);
        try {
            setItems(await listCertificates(query));
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load certificates", { title: "Certificates" });
        } finally {
            setLoading(false);
        }
    }

    async function downloadCertificate(item: CertificateSummary) {
        setDownloadingId(item.id);
        try {
            const file = await downloadCertificateById(item.id, item.fileName || item.certificateReference || "certificate");
            const blobUrl = URL.createObjectURL(file.blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = file.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download certificate", { title: "Certificates" });
        } finally {
            setDownloadingId(null);
        }
    }

    async function openDetails(item: CertificateSummary) {
        setDetailLoading(true);
        setCredentialLoading(true);
        setCredential(null);
        setCredentialQrDataUrl(null);
        try {
            const [detailResult, credentialResult] = await Promise.all([
                getCertificateById(item.id),
                getCertificateCredential(item.id),
            ]);
            setDetail(detailResult);
            setCredential(credentialResult);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load certificate details", { title: "Certificates" });
        } finally {
            setDetailLoading(false);
            setCredentialLoading(false);
        }
    }

    const credentialApiUrl = useMemo(() => {
        if (!detail?.id) return "";
        return `${appConfig.rendererApiBase}/certificates/${detail.id}/credential`;
    }, [detail?.id]);

    useEffect(() => {
        if (!credential || !credentialApiUrl) {
            setCredentialQrDataUrl(null);
            return;
        }
        let cancelled = false;
        QRCode.toDataURL(credentialApiUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 220,
        })
            .then((dataUrl) => {
                if (!cancelled) setCredentialQrDataUrl(dataUrl);
            })
            .catch(() => {
                if (!cancelled) setCredentialQrDataUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [credential, credentialApiUrl]);

    useEffect(() => {
        void loadCertificates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;
        currentUser()
            .then((user) => {
                if (cancelled) return;
                setExportAllowed(String(user.subscriptionTier || "FREE").toUpperCase() === "PRO");
            })
            .catch(() => {
                if (cancelled) return;
                setExportAllowed(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: 1180, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">Certificates</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Stored certificate PDFs and their render arguments.
                    </Typography>
                </Box>
                {!exportAllowed ? (
                    <Alert severity="info">
                        Free plan: certificate view and download are disabled. Upgrade to Pro to access certificate PDFs.
                    </Alert>
                ) : null}

                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search certificates"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void loadCertificates();
                        }}
                    />
                    <AntBtn onClick={() => void loadCertificates()} disabled={loading}>Search</AntBtn>
                </Stack>

                <Divider />

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading certificates...</Typography>
                    </Stack>
                ) : items.length === 0 ? (
                    <Typography color="text.secondary">No certificates found.</Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {items.map((item) => (
                            <Box key={item.id} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: "background.paper" }}>
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {[item.recipientFirstName, item.recipientLastName].filter(Boolean).join(" ").trim() || item.templateName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Ref: {item.certificateReference || "-"} | Date: {item.certificateDate || "-"} | Program: {item.programName || "-"} ({item.programCode || "-"})
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Organization: {item.organizationName || "-"} | Template: {item.templateName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Created: {formatDate(item.createdAt)}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AntBtn onClick={() => void openDetails(item)}>
                                            Details
                                        </AntBtn>
                                        <AntBtn onClick={() => navigate(`/certificates/${item.id}/view`)} disabled={!exportAllowed}>
                                            View PDF
                                        </AntBtn>
                                        <AntBtn onClick={() => void downloadCertificate(item)} disabled={!exportAllowed || downloadingId === item.id}>
                                            {downloadingId === item.id ? "Downloading..." : "Download"}
                                        </AntBtn>
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Stack>

            <Dialog open={detailLoading || Boolean(detail)} onClose={() => !detailLoading && setDetail(null)} fullWidth maxWidth="md">
                <DialogTitle>Certificate details</DialogTitle>
                <DialogContent dividers>
                    {detailLoading && !detail ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography>Loading certificate details...</Typography>
                        </Stack>
                    ) : detail ? (
                        <Stack spacing={1.5}>
                            <Typography variant="body2">
                                Recipient: {[detail.recipientFirstName, detail.recipientLastName].filter(Boolean).join(" ").trim() || "-"}
                            </Typography>
                            <Typography variant="body2">
                                Reference: {detail.certificateReference || "-"} | Date: {detail.certificateDate || "-"}
                            </Typography>
                            <Typography variant="body2">
                                Program: {detail.programName || "-"} ({detail.programCode || "-"})
                            </Typography>
                            <Typography variant="body2">
                                Organization: {detail.organizationName || "-"}
                            </Typography>
                            <Typography variant="body2">
                                File: {detail.fileName}
                            </Typography>
                            <Divider />
                            <Typography variant="subtitle2">Verified credential</Typography>
                            {credentialLoading ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CircularProgress size={16} />
                                    <Typography variant="body2">Loading credential...</Typography>
                                </Stack>
                            ) : credential ? (
                                <Stack spacing={1.2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Scan this QR code to access the credential endpoint.
                                    </Typography>
                                    {credentialQrDataUrl ? (
                                        <Box
                                            component="img"
                                            src={credentialQrDataUrl}
                                            alt="Credential QR code"
                                            sx={{ width: 220, height: 220, borderRadius: 1, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            QR generation failed.
                                        </Typography>
                                    )}
                                    <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                                        {credentialApiUrl}
                                    </Typography>
                                    <Box>
                                        <AntBtn
                                            antType="text"
                                            onClick={() => {
                                                const jwt = credential.proof?.jwt;
                                                if (!jwt) {
                                                    notifications.error("Credential JWT is missing", { title: "Certificates" });
                                                    return;
                                                }
                                                void navigator.clipboard.writeText(jwt);
                                                notifications.success("Credential JWT copied", { title: "Certificates" });
                                            }}
                                        >
                                            Copy credential JWT
                                        </AntBtn>
                                    </Box>
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No credential available.
                                </Typography>
                            )}
                            <Divider />
                            <Typography variant="subtitle2">Stored render arguments</Typography>
                            <Box
                                component="pre"
                                sx={{
                                    m: 0,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: "#1f2a35",
                                    color: "#e8eef5",
                                    overflowX: "auto",
                                    fontSize: 13,
                                }}
                            >
                                {JSON.stringify(detail.data, null, 2)}
                            </Box>
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    {detail && (
                        <>
                            <AntBtn onClick={() => navigate(`/certificates/${detail.id}/view`)} disabled={!exportAllowed}>
                                View PDF
                            </AntBtn>
                            <AntBtn onClick={() => void downloadCertificate(detail)} disabled={!exportAllowed}>
                                Download
                            </AntBtn>
                        </>
                    )}
                    <AntBtn onClick={() => setDetail(null)} disabled={detailLoading}>
                        Close
                    </AntBtn>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
