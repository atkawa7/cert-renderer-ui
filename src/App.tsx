import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import TemplateEditor, { type Template } from "./TemplateEditor";
import fallbackTemplateJson from "./template.json";
import {
    createTemplate,
    getTemplateById,
    listTemplates,
    renderTemplatePdf,
    type TemplateDetail,
    type TemplateSummary,
    updateTemplateById,
} from "./templateApi";
import { appConfig } from "./appConfig";
import { Link as RouterLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

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
    const fallback = fallbackTemplateJson as Template;
    return {
        ...fallback,
        name: `${fallback.name || "Template"} copy`,
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

    const [template, setTemplate] = useState<Template | null>(mode === "new" ? makeNewTemplate() : null);
    const [templateId, setTemplateId] = useState<string | null>(mode === "edit" ? id ?? null : null);
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [persistingSession, setPersistingSession] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const persistInFlightRef = useRef(false);

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
                {(saving || rendering || persistingSession) && <CircularProgress size={18} />}
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
                sessionStorageKey={`renderer.template.session.${templateId ?? "new"}`}
                onPersistSession={handlePersistSession}
            />
        </Box>
    );
}

function TemplatesListPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [query, setQuery] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [loadingEditor, setLoadingEditor] = useState(false);
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
                    <Button variant="contained" component={RouterLink} to="/templates/new">
                        New template
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
                    <ListItemButton component={RouterLink} to="/templates/new">
                        <AddBoxOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                        <ListItemText primary="New Template" />
                    </ListItemButton>
                </List>
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/templates" replace />} />
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/templates/new" element={<EditorPage mode="new" />} />
                    <Route path="/templates/:id/edit" element={<EditorPage mode="edit" />} />
                </Routes>
            </Box>
        </Box>
    );
}
