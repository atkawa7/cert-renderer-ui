import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Pagination,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useConfirm } from "../components/ConfirmDialogProvider";
import { appConfig } from "../appConfig";
import { createDesign, deleteDesignById, listDesigns, type DesignSummary } from "../templateApi";
import type { Template } from "../TemplateEditor";

type DesignFormState = {
    name: string;
    description: string;
    thumbnailUrl: string;
    templateJson: string;
};

function DesignCreateDialog({
    open,
    creating,
    form,
    onFormChange,
    onClose,
    onSubmit,
}: {
    open: boolean;
    creating: boolean;
    form: DesignFormState;
    onFormChange: (next: DesignFormState) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Add Design</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{ pt: 1 }}>
                    <TextField size="small" label="Name" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} />
                    <TextField size="small" label="Description" value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })} />
                    <TextField size="small" label="Thumbnail URL" value={form.thumbnailUrl} onChange={(e) => onFormChange({ ...form, thumbnailUrl: e.target.value })} />
                    <TextField
                        size="small"
                        label="Template JSON"
                        multiline
                        minRows={10}
                        value={form.templateJson}
                        onChange={(e) => onFormChange({ ...form, templateJson: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={creating}>Cancel</Button>
                <Button variant="contained" onClick={onSubmit} disabled={creating}>{creating ? "Creating..." : "Add Design"}</Button>
            </DialogActions>
        </Dialog>
    );
}

function DesignImagePreviewDialog({ imageUrl, title, onClose }: { imageUrl: string | null; title: string; onClose: () => void }) {
    return (
        <Dialog open={Boolean(imageUrl)} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {imageUrl && (
                    <Box
                        component="img"
                        src={`${appConfig.assetBaseUrl}${imageUrl}`}
                        alt={title}
                        sx={{ width: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

function DesignCardItem({
    design,
    deleting,
    onUse,
    onDelete,
    onPreview,
}: {
    design: DesignSummary;
    deleting: boolean;
    onUse: () => void;
    onDelete: () => void;
    onPreview: () => void;
}) {
    return (
        <Card sx={{ width: 340, borderRadius: 3 }}>
            <CardMedia
                component="img"
                height="180"
                image={`${appConfig.assetBaseUrl}${design.thumbnailUrl}`}
                alt={design.name}
                onClick={onPreview}
                sx={{ objectFit: "cover", bgcolor: "#f1f4f8", cursor: "zoom-in" }}
            />
            <CardContent/>
            <CardActions sx={{ px: 2, pb: 2 }}>
                <Button fullWidth variant="contained"
                        component={RouterLink}
                        to={`/designs/${encodeURIComponent(design.id)}`}>Use Design</Button>
                {!design.defaultDesign && (
                    <Button fullWidth variant="outlined" color="error" onClick={onDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                    </Button>
                )}
            </CardActions>
        </Card>
    );
}

export default function DesignsPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [designs, setDesigns] = useState<DesignSummary[]>([]);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [size] = useState(9);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState("Design Preview");
    const [form, setForm] = useState<DesignFormState>({
        name: "",
        description: "",
        thumbnailUrl: "",
        templateJson: JSON.stringify({}),
    });

    async function loadDesignPage(targetPage = page, targetQuery = query) {
        setLoading(true);
        setErrorMsg(null);
        try {
            const result = await listDesigns(targetQuery, targetPage, size);
            setDesigns(result.items);
            setTotalPages(result.totalPages);
            setPage(result.page);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to load designs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadDesignPage(0, "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreateDesign() {
        setCreating(true);
        setErrorMsg(null);
        try {
            const parsedTemplate = JSON.parse(form.templateJson) as Template;
            await createDesign({
                name: form.name.trim() || "Untitled Design",
                description: form.description.trim(),
                thumbnailUrl: form.thumbnailUrl.trim(),
                template: parsedTemplate,
            });
            setForm({ name: "", description: "", thumbnailUrl: "", templateJson: JSON.stringify({}) });
            setCreateDialogOpen(false);
            await loadDesignPage(0, query);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to create design");
        } finally {
            setCreating(false);
        }
    }

    async function handleDeleteDesign(id: string, designName: string) {
        const ok = await confirm({
            title: "Delete Design",
            message: `Delete \"${designName}\"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            destructive: true,
        });
        if (!ok) return;

        setDeletingId(id);
        setErrorMsg(null);
        try {
            await deleteDesignById(id);
            await loadDesignPage(page, query);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to delete design");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5">Designs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage design library and create editable templates from each design.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>Add Design</Button>
                    <Button variant="outlined" component={RouterLink} to="/templates/new">Start Blank</Button>
                    <Button variant="outlined" onClick={() => void loadDesignPage(page, query)} disabled={loading}>Refresh</Button>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search designs"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void loadDesignPage(0, query);
                    }}
                />
                <Button variant="outlined" onClick={() => void loadDesignPage(0, query)} disabled={loading}>Search</Button>
            </Stack>

            {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

            {loading ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
                    <CircularProgress size={18} />
                    <Typography>Loading designs...</Typography>
                </Stack>
            ) : (
                <Stack direction="row" flexWrap="wrap" gap={2}>
                    {designs.map((design) => (
                        <DesignCardItem
                            key={design.id}
                            design={design}
                            deleting={deletingId === design.id}
                            onUse={() => navigate(`/templates/new?design=${encodeURIComponent(design.id)}`)}
                            onDelete={() => void handleDeleteDesign(design.id, design.name)}
                            onPreview={() => {
                                setPreviewImageUrl(design.thumbnailUrl);
                                setPreviewTitle(design.name);
                            }}
                        />
                    ))}
                </Stack>
            )}

            <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Pagination
                    count={Math.max(totalPages, 1)}
                    page={page + 1}
                    onChange={(_, next) => void loadDesignPage(next - 1, query)}
                    color="primary"
                    shape="rounded"
                />
            </Stack>

            <DesignCreateDialog
                open={createDialogOpen}
                creating={creating}
                form={form}
                onFormChange={setForm}
                onClose={() => {
                    if (creating) return;
                    setCreateDialogOpen(false);
                }}
                onSubmit={handleCreateDesign}
            />
            <DesignImagePreviewDialog
                imageUrl={previewImageUrl}
                title={previewTitle}
                onClose={() => {
                    setPreviewImageUrl(null);
                    setPreviewTitle("Design Preview");
                }}
            />
        </Box>
    );
}
