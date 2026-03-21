import { useEffect, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { appConfig } from "../appConfig";
import { deleteTemplateById, downloadTemplateById, listTemplates, type TemplateSummary } from "../templateApi";
import { useConfirm } from "../components/ConfirmDialogProvider";
import { useNotifications } from "../components/NotificationsProvider";

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export default function TemplatesListPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const notifications = useNotifications();
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [query, setQuery] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [loadingEditor, setLoadingEditor] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    function saveBlob(blob: Blob, fileName: string) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    }

    async function loadTemplates() {
        setLoadingList(true);
        try {
            const items = await listTemplates(query);
            setTemplates(items);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load templates", { title: "Templates" });
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void loadTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function openEditor(id: string) {
        setLoadingEditor(true);
        navigate(`/templates/${id}/edit`);
    }

    async function deleteTemplate(id: string) {
        const template = templates.find((t) => t.id === id);
        const label = (template?.name || "this template").trim();
        const ok = await confirm({
            title: "Delete Template",
            message: `Delete \"${label}\"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            destructive: true,
        });
        if (!ok) return;
        setDeletingId(id);
        try {
            await deleteTemplateById(id);
            notifications.success("Template deleted");
            await loadTemplates();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to delete template", { title: "Templates" });
        } finally {
            setDeletingId(null);
        }
    }

    async function downloadTemplate(id: string) {
        const template = templates.find((t) => t.id === id);
        setDownloadingId(id);
        try {
            const file = await downloadTemplateById(id, template?.name || "template");
            saveBlob(file.blob, file.fileName);
            notifications.success("Template downloaded");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to download template", { title: "Templates" });
        } finally {
            setDownloadingId(null);
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5">Templates</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Environment: {appConfig.env} | Backend: {appConfig.rendererApiBase}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" component={RouterLink} to="/designs">Create from design</Button>
                    <Button variant="outlined" component={RouterLink} to="/templates/new">Blank template</Button>
                    <Button variant="outlined" onClick={() => void loadTemplates()} disabled={loadingList}>Refresh</Button>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search templates"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void loadTemplates();
                    }}
                />
                <Button variant="outlined" onClick={() => void loadTemplates()} disabled={loadingList}>Search</Button>
            </Stack>

            <Divider sx={{ mb: 1 }} />
            {loadingList ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
                    <CircularProgress size={18} />
                    <Typography>Loading templates...</Typography>
                </Stack>
            ) : templates.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>No templates found.</Typography>
            ) : (
                <List disablePadding>
                    {templates.map((item) => (
                        <ListItemButton key={item.id} onClick={() => openEditor(item.id)} disabled={loadingEditor}>
                            <ListItemText
                                primary={
                                    item.sourceDesignId ? (
                                        <Typography
                                            component={RouterLink}
                                            to={`/designs/${encodeURIComponent(item.sourceDesignId)}`}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ textDecoration: "none", color: "inherit", "&:hover": { textDecoration: "underline" } }}
                                        >
                                            {item.name}
                                        </Typography>
                                    ) : (
                                        item.name
                                    )
                                }
                                secondary={`Updated: ${formatDate(item.updatedAt)}  |  Created: ${formatDate(item.createdAt)}`}
                            />
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditor(item.id);
                                }}
                                disabled={loadingEditor}
                            >
                                Edit
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void downloadTemplate(item.id);
                                }}
                                disabled={downloadingId === item.id}
                                sx={{ ml: 1 }}
                            >
                                {downloadingId === item.id ? "Downloading..." : "Download"}
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteTemplate(item.id);
                                }}
                                disabled={deletingId === item.id}
                                sx={{ ml: 1 }}
                            >
                                {deletingId === item.id ? "Deleting..." : "Delete"}
                            </Button>
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Box>
    );
}
