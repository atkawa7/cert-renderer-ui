import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography, useTheme } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { createInstitution, listInstitutions, updateInstitutionById, verifyInstitutionById, type InstitutionDetail, type InstitutionSummary } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

type FormState = {
    name: string;
    domain: string;
    issuePath: string;
};

const EMPTY_FORM: FormState = {
    name: "",
    domain: "",
    issuePath: "/credentials",
};

function formatDate(value?: string | null): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export default function InstitutionsPage() {
    const theme = useTheme();
    const notifications = useNotifications();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [items, setItems] = useState<InstitutionSummary[]>([]);
    const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
    const [editTarget, setEditTarget] = useState<InstitutionSummary | null>(null);
    const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
    const [selectedInstitution, setSelectedInstitution] = useState<InstitutionDetail | null>(null);

    async function loadInstitutions() {
        setLoading(true);
        try {
            setItems(await listInstitutions(query));
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load institutions", { title: "Institutions" });
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        setSaving(true);
        try {
            const created = await createInstitution(createForm);
            setSelectedInstitution(created);
            setCreateForm(EMPTY_FORM);
            notifications.success("Institution created", { title: "Institutions" });
            await loadInstitutions();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to create institution", { title: "Institutions" });
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdate() {
        if (!editTarget) return;
        setSaving(true);
        try {
            const updated = await updateInstitutionById(editTarget.id, editForm);
            setSelectedInstitution(updated);
            notifications.success("Institution updated", { title: "Institutions" });
            setEditTarget(null);
            await loadInstitutions();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to update institution", { title: "Institutions" });
        } finally {
            setSaving(false);
        }
    }

    async function handleVerify(item: InstitutionSummary) {
        setVerifyingId(item.id);
        try {
            const verified = await verifyInstitutionById(item.id);
            setSelectedInstitution(verified);
            notifications.success("Institution verified", { title: "Institutions" });
            await loadInstitutions();
        } catch (err: any) {
            notifications.error(err?.message || "Verification failed", { title: "Institutions" });
        } finally {
            setVerifyingId(null);
        }
    }

    useEffect(() => {
        void loadInstitutions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: 1180, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">Institutions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Add, update, and verify institution domains using DNS TXT records.
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search institutions"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void loadInstitutions();
                        }}
                    />
                    <AntBtn onClick={() => void loadInstitutions()} disabled={loading}>
                        Search
                    </AntBtn>
                </Stack>

                <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                        Add institution
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                        <TextField
                            label="Name"
                            size="small"
                            fullWidth
                            value={createForm.name}
                            onChange={(e) => setCreateForm((v) => ({ ...v, name: e.target.value }))}
                        />
                        <TextField
                            label="Domain"
                            size="small"
                            fullWidth
                            placeholder="certificates.example.edu"
                            value={createForm.domain}
                            onChange={(e) => setCreateForm((v) => ({ ...v, domain: e.target.value }))}
                        />
                        <TextField
                            label="Issue path"
                            size="small"
                            fullWidth
                            placeholder="/credentials"
                            value={createForm.issuePath}
                            onChange={(e) => setCreateForm((v) => ({ ...v, issuePath: e.target.value }))}
                        />
                        <AntBtn antType="primary" onClick={() => void handleCreate()} disabled={saving}>
                            {saving ? "Saving..." : "Create"}
                        </AntBtn>
                    </Stack>
                </Box>

                {selectedInstitution && (
                    <Alert severity={selectedInstitution.verified ? "success" : "info"}>
                        <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                DNS verification
                            </Typography>
                            <Typography variant="body2">Host: {selectedInstitution.verificationHost}</Typography>
                            <Typography variant="body2">TXT name: {selectedInstitution.verificationRecordName}</Typography>
                            <Typography variant="body2">TXT value: {selectedInstitution.verificationRecordValue}</Typography>
                            <Typography variant="body2">
                                Issue URL: {selectedInstitution.issueUrl}
                            </Typography>
                        </Stack>
                    </Alert>
                )}

                <Divider />

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading institutions...</Typography>
                    </Stack>
                ) : items.length === 0 ? (
                    <Typography color="text.secondary">No institutions found.</Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {items.map((item) => (
                            <Box key={item.id} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: "background.paper" }}>
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {item.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Domain: {item.domain}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Issue URL: {item.issueUrl}
                                        </Typography>
                                        <Typography variant="caption" color={item.verified ? "success.main" : "warning.main"}>
                                            {item.verified ? `Verified (${formatDate(item.verifiedAt)})` : "Not verified"}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AntBtn
                                            onClick={() => {
                                                setEditTarget(item);
                                                setEditForm({
                                                    name: item.name,
                                                    domain: item.domain,
                                                    issuePath: item.issuePath,
                                                });
                                            }}
                                        >
                                            Edit
                                        </AntBtn>
                                        <AntBtn
                                            antType="primary"
                                            onClick={() => void handleVerify(item)}
                                            disabled={verifyingId === item.id || item.verified}
                                        >
                                            {item.verified ? "Verified" : verifyingId === item.id ? "Verifying..." : "Verify"}
                                        </AntBtn>
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Stack>

            <Dialog open={Boolean(editTarget)} onClose={() => !saving && setEditTarget(null)} fullWidth maxWidth="sm">
                <DialogTitle>Update institution</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.2}>
                        <TextField
                            label="Name"
                            size="small"
                            fullWidth
                            value={editForm.name}
                            onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))}
                        />
                        <TextField
                            label="Domain"
                            size="small"
                            fullWidth
                            value={editForm.domain}
                            onChange={(e) => setEditForm((v) => ({ ...v, domain: e.target.value }))}
                        />
                        <TextField
                            label="Issue path"
                            size="small"
                            fullWidth
                            value={editForm.issuePath}
                            onChange={(e) => setEditForm((v) => ({ ...v, issuePath: e.target.value }))}
                        />
                        <Alert severity="warning">
                            Updating institution details resets verification. Add the returned TXT record and verify again.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <AntBtn onClick={() => setEditTarget(null)} disabled={saving}>
                        Cancel
                    </AntBtn>
                    <AntBtn antType="primary" onClick={() => void handleUpdate()} disabled={saving}>
                        {saving ? "Saving..." : "Update"}
                    </AntBtn>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
