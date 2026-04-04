import { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography, useTheme } from "@mui/material";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { appConfig } from "../appConfig";
import { downloadMyCertificateById, getMyCertificateById, getMyCertificateCredential, listMyCertificates, type CertificateCredential, type CertificateDetail, type CertificateSummary } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function formatExpiration(expiresAt?: string | null, permanent?: boolean): string {
    if (permanent) return "Permanent";
    if (!expiresAt) return "-";
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return expiresAt;
    return d.toLocaleString();
}

export default function CredentialHolderCertificatesPage() {
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

    async function loadCertificates() {
        setLoading(true);
        try {
            setItems(await listMyCertificates(query));
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load certificates", { title: "My Certificates" });
        } finally {
            setLoading(false);
        }
    }

    async function downloadCertificate(item: CertificateSummary) {
        setDownloadingId(item.id);
        try {
            const file = await downloadMyCertificateById(item.id, item.fileName || item.certificateReference || "certificate");
            const blobUrl = URL.createObjectURL(file.blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = file.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download certificate", { title: "My Certificates" });
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
                getMyCertificateById(item.id),
                getMyCertificateCredential(item.id),
            ]);
            setDetail(detailResult);
            setCredential(credentialResult);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load certificate details", { title: "My Certificates" });
        } finally {
            setDetailLoading(false);
            setCredentialLoading(false);
        }
    }

    const credentialApiUrl = useMemo(() => {
        if (!detail?.id) return "";
        return `${appConfig.rendererApiBase}/credential-holder/certificates/${detail.id}/credential`;
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
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: 1180, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">My Certificates</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Certificates linked to your logged-in email address.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search my certificates"
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
                    <Typography color="text.secondary">No certificates found for your email.</Typography>
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
                                            Email: {item.recipientEmail || "-"} | Organization: {item.organizationName || "-"}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Expires: {formatExpiration(item.vcExpiresAt, item.vcPermanent)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Created: {formatDate(item.createdAt)}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AntBtn onClick={() => void openDetails(item)}>
                                            Details
                                        </AntBtn>
                                        <AntBtn onClick={() => navigate(`/portal/certificates/${item.id}/view`)}>
                                            View PDF
                                        </AntBtn>
                                        <AntBtn onClick={() => void downloadCertificate(item)} disabled={downloadingId === item.id}>
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
                                Email: {detail.recipientEmail || "-"}
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
                            <Typography variant="body2">
                                Expires: {formatExpiration(detail.vcExpiresAt, detail.vcPermanent)}
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
                                        Scan this QR code to access your credential endpoint.
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
                            <AntBtn onClick={() => navigate(`/portal/certificates/${detail.id}/view`)}>
                                View PDF
                            </AntBtn>
                            <AntBtn onClick={() => void downloadCertificate(detail)}>
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
