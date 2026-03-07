import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
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

type EditingSession = {
    id: string | null;
    template: Template;
};
const ASSET_BASE_URL = "https://certifier-production-amplify.s3.eu-west-1.amazonaws.com/public/";

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
        background: template.background as Template["background"],
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

export default function App() {
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [query, setQuery] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [session, setSession] = useState<EditingSession | null>(null);
    const [editorSeed, setEditorSeed] = useState(0);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [loadingEditor, setLoadingEditor] = useState(false);
    const [rendering, setRendering] = useState(false);

    const apiBase = appConfig.rendererApiBase;

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

    async function startEdit(id: string) {
        setLoadingEditor(true);
        setStatusMsg(null);
        try {
            const detail = await getTemplateById(id);
            setSession({ id: detail.id, template: toEditorTemplate(detail) });
            setEditorSeed((n) => n + 1);
        } catch (err: any) {
            setStatusMsg(err?.message || "Failed to open template for editing");
        } finally {
            setLoadingEditor(false);
        }
    }

    function startCreateNew() {
        setSession({ id: null, template: makeNewTemplate() });
        setEditorSeed((n) => n + 1);
        setStatusMsg(null);
    }

    async function handleSaveTemplate(next: Template) {
        setSaving(true);
        setStatusMsg(null);
        try {
            const payload = {
                name: (next.name || "").trim() || "Untitled Template",
                template: next,
            };
            const saved = session?.id
                ? await updateTemplateById(session.id, payload)
                : await createTemplate(payload);
            setSession({ id: saved.id, template: toEditorTemplate(saved) });
            await loadTemplates();
            setStatusMsg("Template saved");
        } catch (err: any) {
            setStatusMsg(err?.message || "Failed to save template");
        } finally {
            setSaving(false);
        }
    }

    async function handleRenderTemplate(next: Template, data: unknown) {
        setRendering(true);
        setStatusMsg(null);
        try {
            const pdf = await renderTemplatePdf({
                template: next,
                data,
                assetBaseUrl: ASSET_BASE_URL,
                fileName: (next.name || "template").trim(),
            });
            const blobUrl = URL.createObjectURL(pdf);
            const a = document.createElement("a");
            const fileBase = ((next.name || "template").trim() || "template").replace(/[^a-zA-Z0-9._-]+/g, "_");
            a.href = blobUrl;
            a.download = `${fileBase}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
            setStatusMsg("PDF rendered");
        } catch (err: any) {
            setStatusMsg(err?.message || "Failed to render PDF");
        } finally {
            setRendering(false);
        }
    }

    const editorKey = useMemo(
        () => `${session?.id ?? "new"}-${editorSeed}`,
        [session?.id, editorSeed]
    );

    if (session) {
        return (
            <Box>
                <Box
                    sx={{
                        position: "fixed",
                        top: 14,
                        left: 14,
                        zIndex: 2000,
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                    }}
                >
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                            setSession(null);
                            setStatusMsg(null);
                        }}
                    >
                        Back to templates
                    </Button>
                    {(saving || rendering) && <CircularProgress size={18} />}
                </Box>
                {statusMsg && (
                    <Box sx={{ position: "fixed", top: 14, left: 180, right: 360, zIndex: 2000 }}>
                        <Alert severity="info">{statusMsg}</Alert>
                    </Box>
                )}
                <TemplateEditor
                    key={editorKey}
                    initialTemplate={session.template}
                    assetBaseUrl={ASSET_BASE_URL}
                    onSaveTemplate={handleSaveTemplate}
                    saveButtonLabel={saving ? "Saving..." : "Save to backend"}
                    onRenderTemplate={handleRenderTemplate}
                    renderButtonLabel={rendering ? "Rendering..." : "Render PDF (XSL-FO)"}
                    defaultRenderDataJson={`{\n  "recipient": { "name": "Jane Doe" },\n  "certificate": { "uuid": "CERT-2026-0001", "issued_on": "2026-03-07" }\n}`}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5">Templates</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Environment: {appConfig.env} | Backend: {apiBase}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={startCreateNew}>
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
            {statusMsg && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {statusMsg}
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
                        <ListItemButton key={item.id} onClick={() => startEdit(item.id)} disabled={loadingEditor}>
                            <ListItemText
                                primary={item.name}
                                secondary={`Updated: ${formatDate(item.updatedAt)}  |  Created: ${formatDate(
                                    item.createdAt
                                )}`}
                            />
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(item.id);
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
