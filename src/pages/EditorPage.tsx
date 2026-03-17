import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import TemplateEditor, { type Template } from "../TemplateEditor";
import {
    createDesign,
    createTemplate,
    deleteTemplateById,
    getDesignById,
    getTemplateById,
    renderTemplatePdf,
    updateTemplateById,
    type TemplateDetail,
} from "../templateApi";
import { appConfig } from "../appConfig";
import { useConfirm } from "../components/ConfirmDialogProvider";
import { useNotifications } from "../components/NotificationsProvider";

function toPagedTemplate(raw: Partial<Template>, fallbackName: string): Template {
    const background = (raw.background ?? { type: "color", color: "#ffffff", url: "", svg: "" }) as any;
    const blocks = (raw.blocks ?? []) as any[];
    const paperSize = raw.paperSize ?? "A4";
    const orientation = raw.orientation ?? "portrait";
    const pages = raw.pages ?? [
        {
            id: "front",
            name: "Front",
            background,
            blocks,
            paperSize,
            orientation,
        },
    ];

    return {
        name: (raw.name ?? fallbackName).trim() || fallbackName,
        pages: pages.map((p: any, idx: number) => ({
            id: String(p.id ?? (idx === 0 ? "front" : `page_${idx + 1}`)),
            name: String(p.name ?? (idx === 0 ? "Front" : idx === 1 ? "Back" : `Page ${idx + 1}`)),
            background: p.background ?? { type: "color", color: "#ffffff", url: "", svg: "" },
            blocks: Array.isArray(p.blocks) ? p.blocks : [],
            paperSize: p.paperSize ?? paperSize,
            orientation: p.orientation ?? orientation,
        })),
    };
}

function toEditorTemplate(detail: TemplateDetail): Template {
    const template = (detail.template ?? {}) as Partial<Template>;
    return toPagedTemplate(template, detail.name ?? "Untitled Template");
}

function makeNewTemplate(): Template {
    return {
        name: "Template copy",
        pages: [
            {
                id: "front",
                name: "Front",
                background: { type: "color", color: "#ffffff", url: "", svg: "" } as any,
                blocks: [],
                paperSize: "A4",
                orientation: "portrait",
            },
        ],
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

export default function EditorPage({
    mode,
    sidebarWidth: _sidebarWidth,
    appSidebarHidden = false,
    onToggleAppSidebar,
}: {
    mode: "new" | "edit";
    sidebarWidth: number;
    appSidebarHidden?: boolean;
    onToggleAppSidebar?: () => void;
}) {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const confirm = useConfirm();
    const notifications = useNotifications();
    const designId = searchParams.get("design");

    const [template, setTemplate] = useState<Template | null>(
        mode === "new" ? (designId ? null : makeNewTemplate()) : null
    );
    const [templateId, setTemplateId] = useState<string | null>(mode === "edit" ? id ?? null : null);
    const [sourceDesignId, setSourceDesignId] = useState<string | null>(mode === "new" ? designId : null);
    const [loading, setLoading] = useState(mode === "edit" || (mode === "new" && Boolean(designId)));
    const [saving, setSaving] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const persistInFlightRef = useRef(false);

    useEffect(() => {
        if (mode !== "new") return;
        let cancelled = false;

        setTemplateId(null);
        setErrorMsg(null);

        if (!designId) {
            setLoading(false);
            setTemplate(makeNewTemplate());
            setSourceDesignId(null);
            return;
        }

        setLoading(true);
        setTemplate(null);
        getDesignById(designId)
            .then((design) => {
                if (cancelled) return;
                const draftName = `${design.name || design.template?.name || "Template"} copy`;
                const draft = toPagedTemplate((design.template ?? {}) as Partial<Template>, draftName);
                setTemplate(draft);
                setSourceDesignId(designId);
                notifications.info(`Using design: ${design.name}`);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setTemplate(makeNewTemplate());
                setSourceDesignId(null);
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

        getTemplateById(id)
            .then((detail) => {
                if (cancelled) return;
                setTemplate(toEditorTemplate(detail));
                setTemplateId(detail.id);
                setSourceDesignId(detail.sourceDesignId ?? null);
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
        try {
            const payload = {
                name: (next.name || "").trim() || "Untitled Template",
                template: next,
                sourceDesignId,
            };
            const saved = templateId
                ? await updateTemplateById(templateId, payload)
                : await createTemplate(payload);

            setTemplate(toEditorTemplate(saved));
            setTemplateId(saved.id);
            setSourceDesignId(saved.sourceDesignId ?? sourceDesignId);
            notifications.success("Template saved");

            if (!templateId) {
                navigate(`/templates/${saved.id}/edit`, { replace: true });
            }
        } catch (err: any) {
            notifications.error(err?.message || "Failed to save template", { title: "Template" });
        } finally {
            setSaving(false);
        }
    }

    async function handlePersistSession(next: Template) {
        if (persistInFlightRef.current) return;
        persistInFlightRef.current = true;
        try {
            const payload = {
                name: (next.name || "").trim() || "Untitled Template",
                template: next,
                sourceDesignId,
            };
            if (templateId) {
                await updateTemplateById(templateId, payload);
            } else {
                const created = await createTemplate(payload);
                setTemplateId(created.id);
                navigate(`/templates/${created.id}/edit`, { replace: true });
            }
        } catch {
            // autosave failures stay silent
        } finally {
            persistInFlightRef.current = false;
        }
    }

    async function handleRenderTemplate(next: Template, data: unknown) {
        setRendering(true);
        try {
            const pdf = await renderTemplatePdf({
                template: next,
                data,
                assetBaseUrl: appConfig.assetBaseUrl,
                fileName: (next.name || "template").trim(),
            });
            downloadPdfBlob(next.name || "template", pdf);
            notifications.success("PDF rendered");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to render PDF", { title: "Render" });
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
        try {
            await createDesign({
                name: payload.name,
                description: payload.description ?? "",
                thumbnailUrl: payload.thumbnailUrl,
                template: payload.template,
            });
            notifications.success("Design created from template");
            navigate("/designs");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to convert template to design", { title: "Design" });
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
        try {
            await deleteTemplateById(templateId);
            notifications.success("Template deleted");
            navigate("/templates");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to delete template", { title: "Template" });
        } finally {
            setDeleting(false);
        }
    }

    const editorKey = useMemo(() => `${mode}-${templateId ?? "new"}`, [mode, templateId]);

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
            <TemplateEditor
                key={editorKey}
                initialTemplate={template}
                assetBaseUrl={appConfig.assetBaseUrl}
                onSaveTemplate={handleSaveTemplate}
                saveButtonLabel={saving ? "Saving..." : "Save to backend"}
                onRenderTemplate={handleRenderTemplate}
                renderButtonLabel={rendering ? "Rendering..." : "Render PDF (XSL-FO)"}
                defaultRenderDataJson={`{\n  "recipient": { "name": "Jane Doe" },\n  "certificate": { "uuid": "CERT-2026-0001", "issued_on": "2026-03-07" }\n}`}
                onConvertToDesign={handleConvertTemplateToDesign}
                onBackToDesign={
                    sourceDesignId
                        ? () => navigate(`/designs/${encodeURIComponent(sourceDesignId)}`)
                        : undefined
                }
                onBackToTemplates={() => navigate("/templates")}
                onDeleteTemplate={mode === "edit" ? handleDeleteTemplate : undefined}
                deletingTemplate={deleting}
                sessionStorageKey={
                    templateId
                        ? `renderer.template.session.${templateId}`
                        : `renderer.template.session.new.${designId ?? "default"}`
                }
                restoreLocalSession={mode === "new"}
                onPersistSession={handlePersistSession}
                appSidebarHidden={appSidebarHidden}
                onToggleAppSidebar={onToggleAppSidebar}
            />
        </Box>
    );
}
