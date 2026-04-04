import { useEffect, useState } from "react";
import { AppBar, Avatar, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Paper, Stack, Tab, Tabs, Toolbar, Tooltip, Typography, useMediaQuery, useTheme, type PaletteMode } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Rnd } from "react-rnd";
import BrowserTabTitle from "./components/BrowserTabTitle";
import DesignsPage from "./pages/DesignsPage";
import DesignDetailsPage from "./pages/DesignDetailsPage";
import EditorPage from "./pages/EditorPage";
import TemplatesListPage from "./pages/TemplatesListPage";
import TemplateBatchCreatorPage from "./pages/TemplateBatchCreatorPage";
import SignaturePage from "./pages/SignaturePage";
import Base64ImageViewerPage from "./pages/Base64ImageViewerPage";
import QrDecoderPage from "./pages/QrDecoderPage";
import SvgToPngPage from "./pages/SvgToPngPage";
import PasswordGeneratorPage from "./pages/PasswordGeneratorPage";
import CertificatesPage from "./pages/CertificatesPage";
import CertificateViewerPage from "./pages/CertificateViewerPage";
import CredentialHolderCertificatesPage from "./pages/CredentialHolderCertificatesPage";
import CredentialHolderCertificateViewerPage from "./pages/CredentialHolderCertificateViewerPage";
import InstitutionsPage from "./pages/InstitutionsPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import LoginPage from "./pages/LoginPage";
import MagicLinkLoginPage from "./pages/MagicLinkLoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import LogoutPage from "./pages/LogoutPage";
import ProfilePage from "./pages/ProfilePage";
import AppSetupPage from "./pages/AppSetupPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UsersPage from "./pages/UsersPage";
import SwaggerDocsPage from "./pages/SwaggerDocsPage";
import AntBtn from "./components/AntBtn";
import { currentUser, ensureActiveWorkspace, getAuthPreferences, getCurrentApiKey, getCurrentUserId, getCurrentWorkspaceId, listWorkspaces, setCurrentApiKey, setCurrentUserId, subscribeSessionChange, subscribeSqlStats, updateAuthPreferences, type SqlStats } from "./templateApi";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_COMPACT = 196;
const SQL_PANEL_POS_KEY = "renderer:sql-panel-pos";
const SQL_PANEL_SIZE_KEY = "renderer:sql-panel-size";
const SQL_PANEL_MINIMIZED_KEY = "renderer:sql-panel-minimized";
const SQL_PANEL_CLOSED_KEY = "renderer:sql-panel-closed";
type AppProps = {
    themeMode: PaletteMode;
    onToggleTheme: () => void;
};

type SqlSeverity = "normal" | "warn" | "critical";

function getRequestSeverity(otherElapsedMs: number, statements: number): SqlSeverity {
    const nonDbMs = Math.max(0, otherElapsedMs);
    if (nonDbMs >= 1500 || statements >= 20) return "critical";
    if (nonDbMs >= 500 || statements >= 10) return "warn";
    return "normal";
}

function getStatementSeverity(elapsedMs: number | null): SqlSeverity {
    if (elapsedMs == null) return "normal";
    if (elapsedMs >= 500) return "critical";
    if (elapsedMs >= 150) return "warn";
    return "normal";
}

function severityColor(severity: SqlSeverity): "text.secondary" | "warning.main" | "error.main" {
    if (severity === "critical") return "error.main";
    if (severity === "warn") return "warning.main";
    return "text.secondary";
}

function formatSqlForCard(sql: string): string {
    return sql
        .replace(/\s+/g, " ")
        .replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|VALUES|SET)\b/gi, "\n$1")
        .replace(/\b(AND|OR)\b/gi, "\n  $1")
        .trim();
}

function shortPath(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return url;
    }
}

function formatHeaders(headers: Record<string, string>): string {
    const entries = Object.entries(headers);
    if (entries.length === 0) return "(none)";
    return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
}

export default function App({ themeMode, onToggleTheme }: AppProps) {
    const location = useLocation();
    const theme = useTheme();
    const isOverlayNav = useMediaQuery(theme.breakpoints.down("md"));
    const isCompactNav = useMediaQuery(theme.breakpoints.down("lg"));
    const sidebarWidth = isCompactNav ? SIDEBAR_WIDTH_COMPACT : SIDEBAR_WIDTH;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [sidebarHidden, setSidebarHidden] = useState(false);
    const [, setSessionVersion] = useState(0);
    const [workspaceReady, setWorkspaceReady] = useState(false);
    const [preferencesReady, setPreferencesReady] = useState(false);
    const [cookieConsentCompleted, setCookieConsentCompleted] = useState(false);
    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
    const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
    const [sqlStatsFeed, setSqlStatsFeed] = useState<SqlStats[]>([]);
    const [selectedSqlIndex, setSelectedSqlIndex] = useState(0);
    const [sqlDetailTab, setSqlDetailTab] = useState(0);
    const [sqlPanelPos, setSqlPanelPos] = useState<{ x: number; y: number } | null>(() => {
        const raw = window.localStorage.getItem(SQL_PANEL_POS_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as { x?: number; y?: number };
            if (typeof parsed.x === "number" && typeof parsed.y === "number") {
                return { x: parsed.x, y: parsed.y };
            }
        } catch {
            // Ignore bad local storage value.
        }
        return null;
    });
    const [sqlPanelSize, setSqlPanelSize] = useState<{ width: number; height: number }>(() => {
        const raw = window.localStorage.getItem(SQL_PANEL_SIZE_KEY);
        if (!raw) return { width: 440, height: 420 };
        try {
            const parsed = JSON.parse(raw) as { width?: number; height?: number };
            if (typeof parsed.width === "number" && typeof parsed.height === "number") {
                return { width: parsed.width, height: parsed.height };
            }
        } catch {
            // Ignore bad local storage value.
        }
        return { width: 440, height: 420 };
    });
    const [sqlPanelMinimized, setSqlPanelMinimized] = useState(() => window.localStorage.getItem(SQL_PANEL_MINIMIZED_KEY) === "true");
    const [sqlPanelClosed, setSqlPanelClosed] = useState(() => window.localStorage.getItem(SQL_PANEL_CLOSED_KEY) === "true");
    const [activeWorkspaceLabel, setActiveWorkspaceLabel] = useState<string>("none");
    const [currentUserAdmin, setCurrentUserAdmin] = useState(false);
    const effectiveSidebarWidth = sidebarHidden ? 0 : sidebarWidth;
    const activeUserId = getCurrentUserId();
    const activeWorkspaceId = getCurrentWorkspaceId();
    const isAuthenticated = Boolean(getCurrentApiKey());
    const profileMenuOpen = Boolean(profileMenuAnchor);
    const toolsMenuOpen = Boolean(toolsMenuAnchor);
    const avatarLabel = (activeUserId || "U").slice(0, 1).toUpperCase();
    const isDevMode = import.meta.env.DEV;
    const isEditorRoute =
        location.pathname === "/templates/new"
        || (location.pathname.startsWith("/templates/") && location.pathname.endsWith("/edit"));
    const editorInspectorOffsetPx = isCompactNav ? 268 : 340;
    const onboardingSteps = [
        {
            title: "Create Or Select Workspace",
            body: "Work inside your org workspace. Templates, certificates, institutions, and members are scoped to it.",
        },
        {
            title: "Build From Designs",
            body: "Use global designs or workspace designs to create templates. Internal designs from other workspaces are blocked.",
        },
        {
            title: "Issue And Verify Certificates",
            body: "Generate certificates, view their VC payload and QR, and verify institutions with DNS TXT records before issuing.",
        },
    ];

    useEffect(() => {
        return subscribeSessionChange(() => {
            setSessionVersion((value) => value + 1);
        });
    }, []);

    useEffect(() => {
        if (!isDevMode) return;
        return subscribeSqlStats((stats) => {
            setSqlStatsFeed((prev) => [stats, ...prev].slice(0, 60));
            setSelectedSqlIndex(0);
        });
    }, [isDevMode]);

    useEffect(() => {
        if (!isDevMode || sqlPanelPos) return;
        const panelWidth = 440;
        const panelHeightEstimate = 360;
        const x = Math.max(16, window.innerWidth - panelWidth - 16);
        const y = Math.max(16, window.innerHeight - panelHeightEstimate - (cookieConsentCompleted ? 16 : 96));
        setSqlPanelPos({ x, y });
    }, [isDevMode, sqlPanelPos, cookieConsentCompleted]);

    useEffect(() => {
        if (!sqlPanelPos) return;
        window.localStorage.setItem(SQL_PANEL_POS_KEY, JSON.stringify(sqlPanelPos));
    }, [sqlPanelPos]);

    useEffect(() => {
        window.localStorage.setItem(SQL_PANEL_SIZE_KEY, JSON.stringify(sqlPanelSize));
    }, [sqlPanelSize]);

    useEffect(() => {
        window.localStorage.setItem(SQL_PANEL_MINIMIZED_KEY, String(sqlPanelMinimized));
    }, [sqlPanelMinimized]);

    useEffect(() => {
        window.localStorage.setItem(SQL_PANEL_CLOSED_KEY, String(sqlPanelClosed));
    }, [sqlPanelClosed]);

    useEffect(() => {
        let cancelled = false;
        async function prepareWorkspace() {
            if (!isAuthenticated) {
                setWorkspaceReady(false);
                setCurrentUserAdmin(false);
                return;
            }
            setWorkspaceReady(false);
            try {
                const profile = await currentUser();
                setCurrentUserId(profile.userId);
                setCurrentUserAdmin(Boolean(profile.admin));
                await ensureActiveWorkspace();
                if (!cancelled) {
                    setWorkspaceReady(true);
                }
            } catch {
                if (!cancelled) {
                    setCurrentUserAdmin(false);
                    setCurrentApiKey(null);
                }
            }
        }
        void prepareWorkspace();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !workspaceReady) return;
        let cancelled = false;
        async function loadPreferences() {
            setPreferencesReady(false);
            try {
                const preferences = await getAuthPreferences();
                if (cancelled) return;
                setCookieConsentCompleted(preferences.cookieConsentCompleted);
                if (!preferences.onboardingCompleted) {
                    setOnboardingStep(0);
                    setOnboardingOpen(true);
                } else {
                    setOnboardingOpen(false);
                }
            } finally {
                if (!cancelled) {
                    setPreferencesReady(true);
                }
            }
        }
        void loadPreferences();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, workspaceReady, activeUserId]);

    useEffect(() => {
        let cancelled = false;
        async function loadWorkspaceLabel() {
            if (!activeWorkspaceId) {
                setActiveWorkspaceLabel("none");
                return;
            }
            try {
                const workspaces = await listWorkspaces();
                if (cancelled) return;
                const match = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
                if (match) {
                    setActiveWorkspaceLabel(`${match.name} (${match.id})`);
                } else {
                    setActiveWorkspaceLabel(activeWorkspaceId);
                }
            } catch {
                if (!cancelled) {
                    setActiveWorkspaceLabel(activeWorkspaceId);
                }
            }
        }
        void loadWorkspaceLabel();
        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId]);

    if (!isAuthenticated) {
        return (
            <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
                <BrowserTabTitle />
                <Box sx={{ position: "fixed", top: 10, right: 10 }}>
                    <Tooltip title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                        <IconButton onClick={onToggleTheme} aria-label="Toggle theme">
                            {themeMode === "light" ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/magic-login" element={<MagicLinkLoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/app/setup" element={<AppSetupPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Box>
        );
    }

    if (!workspaceReady || !preferencesReady) {
        return (
            <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", p: 2 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography>Preparing your workspace...</Typography>
                </Stack>
            </Box>
        );
    }

    const navContent = (
        <>
            <Toolbar sx={{ minHeight: isCompactNav ? 52 : 64 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Certificates
                    </Typography>
                    {isDevMode ? (
                        <Box
                            component="span"
                            sx={{
                                px: 0.9,
                                py: 0.25,
                                borderRadius: 1,
                                fontSize: "0.72rem",
                                letterSpacing: 0.6,
                                fontWeight: 700,
                                bgcolor: "warning.main",
                                color: "warning.contrastText",
                            }}
                        >
                            DEV
                        </Box>
                    ) : null}
                </Stack>
            </Toolbar>
            <Divider />
            <List>
                <ListItemButton component={RouterLink} to="/templates" onClick={() => setMobileNavOpen(false)}>
                    <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Templates"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/designs" onClick={() => setMobileNavOpen(false)}>
                    <CollectionsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Designs"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/certificates" onClick={() => setMobileNavOpen(false)}>
                    <WorkspacePremiumOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Certificates"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/portal/certificates" onClick={() => setMobileNavOpen(false)}>
                    <WorkspacePremiumOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="My Certificates"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/institutions" onClick={() => setMobileNavOpen(false)}>
                    <BusinessOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Institutions"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                {currentUserAdmin ? (
                    <ListItemButton component={RouterLink} to="/users" onClick={() => setMobileNavOpen(false)}>
                        <ManageAccountsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                        <ListItemText
                            primary="Users"
                            primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                        />
                    </ListItemButton>
                ) : null}
            </List>
        </>
    );
    const selectedSqlStats = sqlStatsFeed[selectedSqlIndex] ?? null;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
            <BrowserTabTitle />
            <Drawer
                variant={isOverlayNav ? "temporary" : "permanent"}
                open={isOverlayNav ? mobileNavOpen : !sidebarHidden}
                onClose={() => setMobileNavOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    width: isOverlayNav ? sidebarWidth : effectiveSidebarWidth,
                    flexShrink: 0,
                    ["& .MuiDrawer-paper"]: {
                        width: isOverlayNav ? sidebarWidth : effectiveSidebarWidth,
                        boxSizing: "border-box",
                        borderRight: sidebarHidden ? "none" : `1px solid ${theme.palette.divider}`,
                    },
                }}
            >
                {navContent}
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 1,
                        px: { xs: 1.5, sm: 2, md: 3 },
                        pr: { md: isEditorRoute ? `${editorInspectorOffsetPx}px` : undefined },
                        pt: { xs: 1, sm: 1.5 },
                        pb: 0.5,
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ mr: 0.5, maxWidth: { xs: 180, sm: 260, md: 360 } }}
                    >
                        Workspace: {activeWorkspaceLabel}
                    </Typography>
                    <Tooltip title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                        <IconButton onClick={onToggleTheme} aria-label="Toggle theme" size="small">
                            {themeMode === "light" ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    {isDevMode && sqlPanelClosed ? (
                        <AntBtn
                            antType="text"
                            onClick={() => {
                                setSqlPanelClosed(false);
                                setSqlPanelMinimized(false);
                            }}
                        >
                            Open SQL
                        </AntBtn>
                    ) : null}
                    <IconButton
                        aria-label="Open profile menu"
                        onClick={(event) => setProfileMenuAnchor(event.currentTarget)}
                        size="small"
                    >
                        <Avatar sx={{ width: 32, height: 32, fontSize: "0.9rem" }}>{avatarLabel}</Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={profileMenuAnchor}
                        open={profileMenuOpen}
                        onClose={() => {
                            setProfileMenuAnchor(null);
                            setToolsMenuAnchor(null);
                        }}
                    >
                        <MenuItem onClick={(event) => setToolsMenuAnchor(event.currentTarget)}>
                            <Box sx={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between", gap: 2 }}>
                                <span>Tools</span>
                                <ChevronRightIcon fontSize="small" />
                            </Box>
                        </MenuItem>
                        <Divider />
                        <MenuItem component={RouterLink} to="/profile" onClick={() => setProfileMenuAnchor(null)}>
                            Profile
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/audits" onClick={() => setProfileMenuAnchor(null)}>
                            Audit Logs
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/workspaces" onClick={() => setProfileMenuAnchor(null)}>
                            Workspaces
                        </MenuItem>
                        {currentUserAdmin ? (
                            <MenuItem component={RouterLink} to="/users" onClick={() => setProfileMenuAnchor(null)}>
                                Users
                            </MenuItem>
                        ) : null}
                        <MenuItem component={RouterLink} to="/logout" onClick={() => setProfileMenuAnchor(null)}>
                            Logout
                        </MenuItem>
                    </Menu>
                    <Menu
                        anchorEl={toolsMenuAnchor}
                        open={toolsMenuOpen}
                        onClose={() => setToolsMenuAnchor(null)}
                        anchorOrigin={{ vertical: "top", horizontal: "left" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                        <MenuItem
                            component={RouterLink}
                            to="/qr-decoder"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            QR Code
                        </MenuItem>
                        <MenuItem
                            component={RouterLink}
                            to="/password-generator"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            Password Generator
                        </MenuItem>
                        <MenuItem
                            component={RouterLink}
                            to="/base64-image"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            Bas64 Image
                        </MenuItem>
                        <MenuItem
                            component={RouterLink}
                            to="/svg-to-png"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            SVG to PNG
                        </MenuItem>
                        <MenuItem
                            component={RouterLink}
                            to="/signature"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            Signature
                        </MenuItem>
                        {isDevMode ? (
                            <MenuItem
                                component={RouterLink}
                                to="/dev/swagger"
                                onClick={() => {
                                    setToolsMenuAnchor(null);
                                    setProfileMenuAnchor(null);
                                }}
                            >
                                Swagger
                            </MenuItem>
                        ) : null}
                    </Menu>
                </Box>
                {isOverlayNav && (
                    <AppBar position="sticky" color="default" elevation={1}>
                        <Toolbar variant="dense">
                            <IconButton edge="start" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Certificates
                            </Typography>
                            <Box sx={{ ml: "auto" }} />
                        </Toolbar>
                    </AppBar>
                )}
                <Routes>
                    <Route path="/" element={<Navigate to="/templates" replace />} />
                    <Route path="/login" element={<Navigate to="/templates" replace />} />
                    <Route path="/magic-login" element={<Navigate to="/templates" replace />} />
                    <Route path="/register" element={<Navigate to="/templates" replace />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/app/setup" element={<Navigate to="/templates" replace />} />
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/designs" element={<DesignsPage />} />
                    <Route path="/designs/:id" element={<DesignDetailsPage />} />
                    <Route path="/signature" element={<SignaturePage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/portal/certificates" element={<CredentialHolderCertificatesPage />} />
                    <Route path="/institutions" element={<InstitutionsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/workspaces" element={<WorkspacesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/audits" element={<AuditLogsPage />} />
                    <Route path="/logout" element={<LogoutPage />} />
                    <Route path="/certificates/:id/view" element={<CertificateViewerPage />} />
                    <Route path="/portal/certificates/:id/view" element={<CredentialHolderCertificateViewerPage />} />
                    <Route path="/base64-image" element={<Base64ImageViewerPage />} />
                    <Route path="/qr-decoder" element={<QrDecoderPage />} />
                    <Route path="/password-generator" element={<PasswordGeneratorPage />} />
                    <Route path="/svg-to-png" element={<SvgToPngPage />} />
                    <Route path="/dev/swagger" element={isDevMode ? <SwaggerDocsPage /> : <Navigate to="/templates" replace />} />
                    <Route
                        path="/templates/new"
                        element={
                            <EditorPage
                                mode="new"
                                sidebarWidth={sidebarWidth}
                                appSidebarHidden={sidebarHidden}
                                onToggleAppSidebar={() => setSidebarHidden((v) => !v)}
                            />
                        }
                    />
                    <Route
                        path="/templates/:id/edit"
                        element={
                            <EditorPage
                                mode="edit"
                                sidebarWidth={sidebarWidth}
                                appSidebarHidden={sidebarHidden}
                                onToggleAppSidebar={() => setSidebarHidden((v) => !v)}
                            />
                        }
                    />
                    <Route path="/templates/:id/batch-creator" element={<TemplateBatchCreatorPage />} />
                </Routes>
            </Box>
            <Dialog
                open={onboardingOpen}
                onClose={() => {}}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{`Onboarding: ${onboardingSteps[onboardingStep].title}`}</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">{onboardingSteps[onboardingStep].body}</Typography>
                </DialogContent>
                <DialogActions>
                    {onboardingStep > 0 ? (
                        <AntBtn onClick={() => setOnboardingStep((value) => Math.max(0, value - 1))}>Back</AntBtn>
                    ) : null}
                    {onboardingStep < onboardingSteps.length - 1 ? (
                        <AntBtn antType="primary" onClick={() => setOnboardingStep((value) => Math.min(onboardingSteps.length - 1, value + 1))}>
                            Next
                        </AntBtn>
                    ) : (
                        <AntBtn
                            antType="primary"
                            onClick={async () => {
                                await updateAuthPreferences({ onboardingCompleted: true });
                                setOnboardingOpen(false);
                            }}
                        >
                            Start Using App
                        </AntBtn>
                    )}
                </DialogActions>
            </Dialog>
            {!cookieConsentCompleted ? (
                <Paper
                    elevation={2}
                    sx={{
                        position: "fixed",
                        left: 16,
                        right: 16,
                        bottom: 16,
                        p: 2,
                        zIndex: (muiTheme) => muiTheme.zIndex.modal + 1,
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                            This app uses cookies for session and preference persistence. Accept to continue.
                        </Typography>
                        <AntBtn
                            antType="primary"
                            onClick={async () => {
                                await updateAuthPreferences({ cookieConsentCompleted: true });
                                document.cookie = "cookie-consent=completed; Max-Age=31536000; Path=/; SameSite=Lax";
                                setCookieConsentCompleted(true);
                            }}
                        >
                            Accept Cookies
                        </AntBtn>
                    </Stack>
                </Paper>
            ) : null}
            {isDevMode && sqlPanelPos && !sqlPanelMinimized && !sqlPanelClosed ? (
                <Rnd
                    size={sqlPanelSize}
                    position={sqlPanelPos}
                    onDragStop={(_, data) => setSqlPanelPos({ x: data.x, y: data.y })}
                    onResizeStop={(_, __, ref, ___, position) => {
                        setSqlPanelSize({
                            width: Math.max(320, Math.min(window.innerWidth - 16, ref.offsetWidth)),
                            height: Math.max(240, Math.min(window.innerHeight - 16, ref.offsetHeight)),
                        });
                        setSqlPanelPos(position);
                    }}
                    minWidth={320}
                    minHeight={240}
                    maxWidth={Math.max(320, window.innerWidth - 16)}
                    maxHeight={Math.max(240, window.innerHeight - 16)}
                    enableResizing={{
                        bottom: true,
                        bottomLeft: true,
                        bottomRight: true,
                        left: true,
                        right: true,
                        top: true,
                        topLeft: true,
                        topRight: true,
                    }}
                    bounds="window"
                    dragHandleClassName="sql-stats-drag-handle"
                    style={{ zIndex: theme.zIndex.modal + 1, position: "fixed" }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            px: 1.5,
                            py: 1,
                            height: "100%",
                            overflow: "auto",
                            border: "1px solid",
                            borderColor: "divider",
                            cursor: "default",
                        }}
                    >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} className="sql-stats-drag-handle" sx={{ cursor: "move" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            SQL Stats (dev)
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                            <AntBtn antType="text" onClick={() => setSqlPanelMinimized(true)}>
                                Minimize
                            </AntBtn>
                            <AntBtn antType="text" onClick={() => setSqlPanelClosed(true)}>
                                Close
                            </AntBtn>
                            <AntBtn
                                antType="text"
                                onClick={() => {
                                    setSqlStatsFeed([]);
                                    setSelectedSqlIndex(0);
                                }}
                                disabled={sqlStatsFeed.length === 0}
                            >
                                Clear
                            </AntBtn>
                        </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Requests captured: {sqlStatsFeed.length}
                    </Typography>
                    <Box
                        sx={{
                            mt: 0.8,
                            maxHeight: 180,
                            overflowY: "auto",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 0.2,
                            bgcolor: "background.default",
                        }}
                    >
                        {sqlStatsFeed.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ p: 0.8, display: "block" }}>
                                No requests captured yet.
                            </Typography>
                        ) : (
                            <Stack spacing={0}>
                                {sqlStatsFeed.map((stats, reqIdx) => (
                                    (() => {
                                        const dbElapsedMs = stats.sqlElapsedMs;
                                        const nonDbMs = stats.otherElapsedMs;
                                        const severity = getRequestSeverity(nonDbMs, stats.statements);
                                        return (
                                    <Box
                                        key={`${stats.capturedAt}-${reqIdx}`}
                                        onClick={() => setSelectedSqlIndex(reqIdx)}
                                        sx={{
                                            cursor: "pointer",
                                            px: 0.8,
                                            py: 0.6,
                                            borderBottom: reqIdx === sqlStatsFeed.length - 1 ? "none" : "1px solid",
                                            borderColor: "divider",
                                            borderLeft: "4px solid",
                                            borderLeftColor: severity === "critical" ? "error.main" : severity === "warn" ? "warning.main" : "transparent",
                                            bgcolor: reqIdx === selectedSqlIndex ? "action.selected" : "transparent",
                                            "&:hover": { bgcolor: reqIdx === selectedSqlIndex ? "action.selected" : "action.hover" },
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>
                                            {stats.method} {shortPath(stats.url)}
                                        </Typography>
                                        <Typography variant="caption" color={severityColor(severity)} sx={{ display: "block" }}>
                                            HTTP {stats.status} | {stats.statements} SQL stmts | {stats.elapsedMs} ms total
                                            {severity === "warn" ? " | Warning" : severity === "critical" ? " | Critical" : ""}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                            SQL {dbElapsedMs} ms | App {nonDbMs} ms
                                        </Typography>
                                    </Box>
                                        );
                                    })()
                                ))}
                            </Stack>
                        )}
                    </Box>
                    {selectedSqlStats ? (
                        <Box sx={{ mt: 0.8, border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}>
                            <Tabs value={sqlDetailTab} onChange={(_, value) => setSqlDetailTab(value)} variant="fullWidth">
                                <Tab label="Overview" />
                                <Tab label="SQL" />
                                <Tab label="Request" />
                                <Tab label="Response" />
                            </Tabs>
                            <Box sx={{ p: 0.8, maxHeight: 220, overflowY: "auto" }}>
                                {sqlDetailTab === 0 ? (
                                    (() => {
                                        const dbElapsedMs = selectedSqlStats.sqlElapsedMs;
                                        const serializationMs = selectedSqlStats.serializationElapsedMs;
                                        const nonDbMs = selectedSqlStats.otherElapsedMs;
                                        const severity = getRequestSeverity(nonDbMs, selectedSqlStats.statements);
                                        const rows: [string, string, string?][] = [
                                            ["Health", severity === "normal" ? "Normal" : severity === "warn" ? "Warning" : "Critical", severityColor(severity)],
                                            ["SQL time", `${dbElapsedMs} ms`],
                                            ["Serialize time", `${serializationMs} ms`],
                                            ["App time", `${nonDbMs} ms`, severityColor(nonDbMs >= 1500 ? "critical" : nonDbMs >= 500 ? "warn" : "normal")],
                                            ["Endpoint", `${selectedSqlStats.method} ${shortPath(selectedSqlStats.url)}`],
                                            ["HTTP status", String(selectedSqlStats.status)],
                                            ["SQL count", String(selectedSqlStats.statements)],
                                            ["Total time", `${selectedSqlStats.elapsedMs} ms`],
                                        ];
                                        return (
                                            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.75rem" }}>
                                                <tbody>
                                                    {rows.map(([label, value, color]) => (
                                                        <tr key={label}>
                                                            <td style={{ paddingRight: "1em", whiteSpace: "nowrap", color: "inherit", opacity: 0.6 }}>{label}</td>
                                                            <td style={{ color: color ?? "inherit" }}>{value}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        );
                                    })()
                                ) : sqlDetailTab === 1 && selectedSqlStats.sqlDetails.length > 0 ? (
                                    <Stack spacing={0.6}>
                                        {selectedSqlStats.sqlDetails.map((entry, idx) => (
                                            <Box key={`${idx}-${entry.sql.slice(0, 24)}`}>
                                                {(() => {
                                                    const severity = getStatementSeverity(entry.elapsedMs);
                                                    return (
                                                        <Typography variant="caption" color={severityColor(severity)} sx={{ display: "block", fontFamily: "monospace" }}>
                                                            {`Query ${idx + 1}: ${entry.elapsedMs != null ? `${entry.elapsedMs} ms` : "n/a"}${severity === "warn" ? " | Warning" : severity === "critical" ? " | Critical" : ""}`}
                                                        </Typography>
                                                    );
                                                })()}
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        fontFamily: "monospace",
                                                        whiteSpace: "pre-wrap",
                                                        overflowWrap: "anywhere",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {formatSqlForCard(entry.sql)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : sqlDetailTab === 2 ? (
                                    <Stack spacing={0.6}>
                                        <Typography variant="caption"><strong>HTTP method:</strong> {selectedSqlStats.request.method}</Typography>
                                        <Typography variant="caption"><strong>Request URL:</strong> {selectedSqlStats.request.url}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Request headers</Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                fontFamily: "monospace",
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "anywhere",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {formatHeaders(selectedSqlStats.request.headers)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Request body</Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                fontFamily: "monospace",
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "anywhere",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {selectedSqlStats.request.body ?? "(empty)"}
                                        </Typography>
                                    </Stack>
                                ) : sqlDetailTab === 3 ? (
                                    <Stack spacing={0.6}>
                                        <Typography variant="caption"><strong>HTTP status:</strong> {selectedSqlStats.response.status}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Response headers</Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                fontFamily: "monospace",
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "anywhere",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {formatHeaders(selectedSqlStats.response.headers)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Response body</Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                fontFamily: "monospace",
                                                whiteSpace: "pre-wrap",
                                                overflowWrap: "anywhere",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {selectedSqlStats.response.body ?? "(empty)"}
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography variant="caption" color="text.secondary">
                                        No detail captured.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    ) : null}
                    </Paper>
                </Rnd>
            ) : null}
            {isDevMode && sqlPanelPos && sqlPanelMinimized && !sqlPanelClosed ? (
                <Rnd
                    size={{ width: 190, height: 48 }}
                    position={sqlPanelPos}
                    onDragStop={(_, data) => setSqlPanelPos({ x: data.x, y: data.y })}
                    enableResizing={false}
                    bounds="window"
                    dragHandleClassName="sql-stats-minimized-drag-handle"
                    style={{ zIndex: theme.zIndex.modal + 1, position: "fixed" }}
                >
                    <Paper
                        elevation={3}
                        className="sql-stats-minimized-drag-handle"
                        sx={{
                            px: 1,
                            py: 0.6,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid",
                            borderColor: "divider",
                            cursor: "move",
                        }}
                    >
                        <AntBtn antType="text" onClick={() => setSqlPanelMinimized(false)}>
                            SQL Stats ({sqlStatsFeed.length})
                        </AntBtn>
                    </Paper>
                </Rnd>
            ) : null}
        </Box>
    );
}
