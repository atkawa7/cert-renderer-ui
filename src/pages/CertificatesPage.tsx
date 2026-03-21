import { useEffect, useState } from "react";
import { Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography, useTheme } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { downloadCertificateById, getCertificateById, listCertificates, type CertificateDetail, type CertificateSummary } from "../templateApi";
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
        try {
            setDetail(await getCertificateById(item.id));
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load certificate details", { title: "Certificates" });
        } finally {
            setDetailLoading(false);
        }
    }

    useEffect(() => {
        void loadCertificates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                        <AntBtn onClick={() => navigate(`/certificates/${item.id}/view`)}>
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
                            <AntBtn onClick={() => navigate(`/certificates/${detail.id}/view`)}>
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
