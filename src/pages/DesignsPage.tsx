import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardActions,
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
    Tooltip,
    Typography,
} from "@mui/material";
import AntBtn from "../components/AntBtn";
import AddCircleIcon from "@mui/icons-material/AddCircle";
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
                <AntBtn antType="text" onClick={onClose} disabled={creating}>Cancel</AntBtn>
                <AntBtn antType="primary" onClick={onSubmit} disabled={creating}>{creating ? "Creating..." : "Add Design"}</AntBtn>
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
                <AntBtn antType="text" onClick={onClose}>Close</AntBtn>
            </DialogActions>
        </Dialog>
    );
}

function DesignCardItem({
    design,
    deleting,
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
        <Card elevation={0} sx={{ width: 200, borderRadius: 2, border: "none", bgcolor: "transparent" }}>
            <Box sx={{ position: "relative", "&:hover .use-overlay": { opacity: 1 } }}>
                <CardMedia
                    component="img"
                    height="110"
                    image={`${appConfig.assetBaseUrl}${design.thumbnailUrl}`}
                    alt={design.name}
                    onClick={onPreview}
                    sx={{ objectFit: "cover", bgcolor: "#f1f4f8", cursor: "zoom-in", display: "block" }}
                />
                <Box
                    className="use-overlay"
                    component={RouterLink}
                    to={`/designs/${encodeURIComponent(design.id)}`}
                    sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.35)",
                        opacity: 0,
                        transition: "opacity 0.2s",
                        textDecoration: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Tooltip title="Use Design">
                        <AddCircleIcon sx={{ fontSize: 40, color: "white", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} />
                    </Tooltip>
                </Box>
            </Box>
            {!design.defaultDesign && (
                <CardActions sx={{ px: 1, pb: 1, pt: 0.5 }}>
                    <AntBtn fullWidth danger onClick={onDelete} disabled={deleting}>
                        {deleting ? "..." : "Delete"}
                    </AntBtn>
                </CardActions>
            )}
        </Card>
    );
}

export default function DesignsPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [designs, setDesigns] = useState<DesignSummary[]>([]);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(16);
    const [totalPages, setTotalPages] = useState(0);
    const sizeRef = useRef(16);
    const mountedRef = useRef(false);
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

    async function loadDesignPage(targetPage = page, targetQuery = query, targetSize = size) {
        setLoading(true);
        setErrorMsg(null);
        try {
            const result = await listDesigns(targetQuery, targetPage, targetSize);
            setDesigns(result.items);
            setTotalPages(result.totalPages);
            setPage(result.page);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to load designs");
        } finally {
            setLoading(false);
        }
    }

    function computePageSize(): number {
        const CARD_W = 200;
        const CARD_H = 150;
        const GAP = 16;
        const OVERHEAD = 230;
        const containerW = window.innerWidth - 48;
        const cols = Math.max(1, Math.floor((containerW + GAP) / (CARD_W + GAP)));
        const rows = Math.max(1, Math.floor((window.innerHeight - OVERHEAD + GAP) / (CARD_H + GAP)));
        return cols * rows;
    }

    useEffect(() => {
        const initial = computePageSize();
        sizeRef.current = initial;
        setSize(initial);
        mountedRef.current = true;
        void loadDesignPage(0, "", initial);

        function onResize() {
            const next = computePageSize();
            if (next !== sizeRef.current) {
                sizeRef.current = next;
                setSize(next);
                void loadDesignPage(0, query, next);
            }
        }

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
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
                    <AntBtn antType="primary" onClick={() => setCreateDialogOpen(true)}>Add Design</AntBtn>
                    <AntBtn component={RouterLink} to="/templates/new">Start Blank</AntBtn>
                    <AntBtn onClick={() => void loadDesignPage(page, query)} disabled={loading}>Refresh</AntBtn>
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
                <AntBtn onClick={() => void loadDesignPage(0, query)} disabled={loading}>Search</AntBtn>
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
