import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    CircularProgress,
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Pagination,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import TemplateEditor, { type Template } from "./TemplateEditor";
import {
    createDesign,
    deleteDesignById,
    getDesignById,
    deleteTemplateById,
    createTemplate,
    getTemplateById,
    listDesigns,
    listTemplates,
    renderTemplatePdf,
    type DesignSummary,
    type TemplateDetail,
    type TemplateSummary,
    updateTemplateById,
} from "./templateApi";
import { appConfig } from "./appConfig";
import { Link as RouterLink, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useConfirm } from "./components/ConfirmDialogProvider";

const ASSET_BASE_URL = "https://certifier-production-amplify.s3.eu-west-1.amazonaws.com/public/";
const SIDEBAR_WIDTH = 260;

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function toEditorTemplate(detail: TemplateDetail): Template {
    const template = (detail.template ?? {}) as Partial<Template>;
    return {
        name: template.name ?? detail.name ?? "",
        background: (template.background ?? { type: "color", color: "#ffffff", url: "" }) as Template["background"],
        blocks: (template.blocks ?? []) as Template["blocks"],
        paperSize: template.paperSize ?? "A4",
        orientation: template.orientation ?? "portrait",
    };
}

function makeNewTemplate(): Template {
    return {
        name: `Template copy`,
    };
}

function downloadPdfBlob(fileBaseName: string, blob: Blob) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileBase = (fileBaseName.trim() || "template").replace(/[^a-zA-Z0-9._-]+/g, "_");
    a.href = blobUrl;
    a.download = `${fileBase}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
}

function EditorPage({ mode }: { mode: "new" | "edit" }) {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const confirm = useConfirm();
    const designId = searchParams.get("design");

    const [template, setTemplate] = useState<Template | null>(mode === "new" ? makeNewTemplate() : null);
    const [templateId, setTemplateId] = useState<string | null>(mode === "edit" ? id ?? null : null);
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [persistingSession, setPersistingSession] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const persistInFlightRef = useRef(false);

    useEffect(() => {
        if (mode !== "new") return;
        let cancelled = false;

        setTemplateId(null);
        setErrorMsg(null);
        setStatusMsg(null);

        if (!designId) {
            setLoading(false);
            setTemplate(makeNewTemplate());
            return;
        }

        setLoading(true);
        getDesignById(designId)
            .then((design) => {
                if (cancelled) return;
                const draft = {
                    ...design.template,
                    name: `${design.name || design.template?.name || "Template"} copy`,
                } as Template;
                setTemplate(draft);
                setStatusMsg(`Using design: ${design.name}`);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setTemplate(makeNewTemplate());
                setErrorMsg(err?.message || "Failed to load design");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [mode, designId]);

    useEffect(() => {
        if (mode !== "edit") return;
        if (!id) {
            setErrorMsg("Missing template id");
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setErrorMsg(null);
        setStatusMsg(null);

        getTemplateById(id)
            .then((detail) => {
                if (cancelled) return;
                setTemplate(toEditorTemplate(detail));
                setTemplateId(detail.id);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setErrorMsg(err?.message || "Failed to load template");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, mode]);

    async function handleSaveTemplate(next: Template) {
        setSaving(true);
        setStatusMsg(null);
        setErrorMsg(null);
        try {
            const payload = {
                name: (next.name || "").trim() || "Untitled Template",
                template: next,
            };
            const saved = templateId
                ? await updateTemplateById(templateId, payload)
                : await createTemplate(payload);

            const editorModel = toEditorTemplate(saved);
            setTemplate(editorModel);
            setTemplateId(saved.id);
            setStatusMsg("Template saved");

            if (!templateId) {
                navigate(`/templates/${saved.id}/edit`, { replace: true });
            }
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to save template");
        } finally {
            setSaving(false);
        }
    }

    async function handlePersistSession(next: Template) {
        if (persistInFlightRef.current) return;
        persistInFlightRef.current = true;
        setPersistingSession(true);
        try {
            const payload = {
                name: (next.name || "").trim() || "Untitled Template",
                template: next,
            };
            if (templateId) {
                await updateTemplateById(templateId, payload);
            } else {
                const created = await createTemplate(payload);
                setTemplateId(created.id);
                navigate(`/templates/${created.id}/edit`, { replace: true });
            }
        } catch {
            // explicit Save continues to surface full errors; autosave failures stay silent
        } finally {
            persistInFlightRef.current = false;
            setPersistingSession(false);
        }
    }

    async function handleRenderTemplate(next: Template, data: unknown) {
        setRendering(true);
        setStatusMsg(null);
        setErrorMsg(null);
        try {
            const pdf = await renderTemplatePdf({
                template: next,
                data,
                assetBaseUrl: ASSET_BASE_URL,
                fileName: (next.name || "template").trim(),
            });
            downloadPdfBlob(next.name || "template", pdf);
            setStatusMsg("PDF rendered");
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to render PDF");
        } finally {
            setRendering(false);
        }
    }

    async function handleConvertTemplateToDesign(payload: {
        name: string;
        description?: string;
        thumbnailUrl: string;
        template: Template;
    }) {
        setStatusMsg(null);
        setErrorMsg(null);
        try {
            await createDesign({
                name: payload.name,
                description: payload.description ?? "",
                thumbnailUrl: payload.thumbnailUrl,
                template: payload.template,
            });
            setStatusMsg("Design created from template");
            navigate("/designs");
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to convert template to design");
        }
    }

    async function handleDeleteTemplate() {
        if (!templateId) return;
        const label = (template?.name || "this template").trim();
        const ok = await confirm({
            title: "Delete Template",
            message: `Delete \"${label}\"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            destructive: true,
        });
        if (!ok) return;

        setDeleting(true);
        setErrorMsg(null);
        setStatusMsg(null);
        try {
            await deleteTemplateById(templateId);
            navigate("/templates");
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to delete template");
        } finally {
            setDeleting(false);
        }
    }

    const editorKey = useMemo(
        () => `${mode}-${templateId ?? "new"}`,
        [mode, templateId]
    );

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography>Loading template...</Typography>
                </Stack>
            </Box>
        );
    }

    if (errorMsg && !template) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
                <Button variant="contained" component={RouterLink} to="/templates">
                    Back to templates
                </Button>
            </Box>
        );
    }

    if (!template) return null;

    return (
        <Box>
            <Box
                sx={{
                    position: "fixed",
                    top: 14,
                    left: SIDEBAR_WIDTH + 22,
                    zIndex: 2000,
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                }}
            >
                <Button variant="contained" size="small" component={RouterLink} to="/templates">
                    Back to templates
                </Button>
                {mode  === 'edit' && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={handleDeleteTemplate}
                        disabled={deleting}
                    >
                        Delete template
                    </Button>
                )}
                {(saving || rendering || persistingSession || deleting) && <CircularProgress size={18} />}
            </Box>
            {(statusMsg || errorMsg) && (
                <Box sx={{ position: "fixed", top: 14, left: SIDEBAR_WIDTH + 188, right: 360, zIndex: 2000 }}>
                    {statusMsg && <Alert severity="info" sx={{ mb: errorMsg ? 1 : 0 }}>{statusMsg}</Alert>}
                    {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
                </Box>
            )}
            <TemplateEditor
                key={editorKey}
                initialTemplate={template}
                assetBaseUrl={ASSET_BASE_URL}
                onSaveTemplate={handleSaveTemplate}
                saveButtonLabel={saving ? "Saving..." : "Save to backend"}
                onRenderTemplate={handleRenderTemplate}
                renderButtonLabel={rendering ? "Rendering..." : "Render PDF (XSL-FO)"}
                defaultRenderDataJson={`{\n  "recipient": { "name": "Jane Doe" },\n  "certificate": { "uuid": "CERT-2026-0001", "issued_on": "2026-03-07" }\n}`}
                onConvertToDesign={handleConvertTemplateToDesign}
                sessionStorageKey={
                    templateId
                        ? `renderer.template.session.${templateId}`
                        : `renderer.template.session.new.${designId ?? "default"}`
                }
                onPersistSession={handlePersistSession}
            />
        </Box>
    );
}

function DesignsPage() {
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
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [templateJson, setTemplateJson] = useState(JSON.stringify({}));

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
        loadDesignPage(0, "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreateDesign() {
        setCreating(true);
        setErrorMsg(null);
        try {
            const parsedTemplate = JSON.parse(templateJson) as Template;
            await createDesign({
                name: name.trim() || "Untitled Design",
                description: description.trim(),
                thumbnailUrl: thumbnailUrl.trim(),
                template: parsedTemplate,
            });
            setName("");
            setDescription("");
            setThumbnailUrl("");
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
                <Button variant="outlined" component={RouterLink} to="/templates/new">
                    Start Blank
                </Button>
            </Stack>

            <Card sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Add Design
                    </Typography>
                    <TextField
                        size="small"
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                        size="small"
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <TextField
                        size="small"
                        label="Thumbnail URL"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                    />
                    <TextField
                        size="small"
                        label="Template JSON"
                        multiline
                        minRows={8}
                        value={templateJson}
                        onChange={(e) => setTemplateJson(e.target.value)}
                    />
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleCreateDesign} disabled={creating}>
                            {creating ? "Creating..." : "Add Design"}
                        </Button>
                        <Button variant="outlined" onClick={() => loadDesignPage(page, query)} disabled={loading}>
                            Refresh
                        </Button>
                    </Stack>
                </Stack>
            </Card>

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
                <Button variant="outlined" onClick={() => loadDesignPage(0, query)} disabled={loading}>
                    Search
                </Button>
            </Stack>

            {errorMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMsg}
                </Alert>
            )}

            {loading ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
                    <CircularProgress size={18} />
                    <Typography>Loading designs...</Typography>
                </Stack>
            ) : (
                <Stack direction="row" flexWrap="wrap" gap={2}>
                    {designs.map((design) => (
                        <Card key={design.id} sx={{ width: 340, borderRadius: 3 }}>
                        <CardMedia
                            component="img"
                            height="180"
                            image={design.thumbnailUrl}
                            alt={design.name}
                            sx={{ objectFit: "cover", bgcolor: "#f1f4f8" }}
                        />
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {design.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {design.description || "-"}
                            </Typography>
                        </CardContent>
                        <CardActions sx={{ px: 2, pb: 2 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => navigate(`/templates/new?design=${encodeURIComponent(design.id)}`)}
                            >
                                Use Design
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                onClick={() => void handleDeleteDesign(design.id, design.name)}
                                disabled={deletingId === design.id}
                            >
                                {deletingId === design.id ? "Deleting..." : "Delete"}
                            </Button>
                        </CardActions>
                    </Card>
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
        </Box>
    );
}

function TemplatesListPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [query, setQuery] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [loadingEditor, setLoadingEditor] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [listError, setListError] = useState<string | null>(null);

    async function loadTemplates() {
        setLoadingList(true);
        setListError(null);
        try {
            const items = await listTemplates(query);
            setTemplates(items);
        } catch (err: any) {
            setListError(err?.message || "Failed to load templates");
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        loadTemplates();
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
        setListError(null);
        try {
            await deleteTemplateById(id);
            await loadTemplates();
        } catch (err: any) {
            setListError(err?.message || "Failed to delete template");
        } finally {
            setDeletingId(null);
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
                    <Button variant="contained" component={RouterLink} to="/designs">
                        Create from design
                    </Button>
                    <Button variant="outlined" component={RouterLink} to="/templates/new">
                        Blank template
                    </Button>
                    <Button variant="outlined" onClick={loadTemplates} disabled={loadingList}>
                        Refresh
                    </Button>
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
                        if (e.key === "Enter") loadTemplates();
                    }}
                />
                <Button variant="outlined" onClick={loadTemplates} disabled={loadingList}>
                    Search
                </Button>
            </Stack>

            {listError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {listError}
                </Alert>
            )}

            <Divider sx={{ mb: 1 }} />
            {loadingList ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
                    <CircularProgress size={18} />
                    <Typography>Loading templates...</Typography>
                </Stack>
            ) : templates.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                    No templates found.
                </Typography>
            ) : (
                <List disablePadding>
                    {templates.map((item) => (
                        <ListItemButton key={item.id} onClick={() => openEditor(item.id)} disabled={loadingEditor}>
                            <ListItemText
                                primary={item.name}
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

export default function App() {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6fb" }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: SIDEBAR_WIDTH,
                    flexShrink: 0,
                    ["& .MuiDrawer-paper"]: {
                        width: SIDEBAR_WIDTH,
                        boxSizing: "border-box",
                        borderRight: "1px solid rgba(0,0,0,0.08)",
                    },
                }}
            >
                <Toolbar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Renderer UI
                    </Typography>
                </Toolbar>
                <Divider />
                <List>
                    <ListItemButton component={RouterLink} to="/templates">
                        <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                        <ListItemText primary="Templates" />
                    </ListItemButton>
                    <ListItemButton component={RouterLink} to="/designs">
                        <CollectionsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                        <ListItemText primary="Designs" />
                    </ListItemButton>
                </List>
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/templates" replace />} />
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/designs" element={<DesignsPage />} />
                    <Route path="/templates/new" element={<EditorPage mode="new" />} />
                    <Route path="/templates/:id/edit" element={<EditorPage mode="edit" />} />
                </Routes>
            </Box>
        </Box>
    );
}
