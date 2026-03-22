import { useEffect, useState } from "react";
import { AppBar, Avatar, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Paper, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme, type PaletteMode } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import BrowserTabTitle from "./components/BrowserTabTitle";
import DesignsPage from "./pages/DesignsPage";
import DesignDetailsPage from "./pages/DesignDetailsPage";
import EditorPage from "./pages/EditorPage";
import TemplatesListPage from "./pages/TemplatesListPage";
import SignaturePage from "./pages/SignaturePage";
import Base64ImageViewerPage from "./pages/Base64ImageViewerPage";
import QrDecoderPage from "./pages/QrDecoderPage";
import CertificatesPage from "./pages/CertificatesPage";
import CertificateViewerPage from "./pages/CertificateViewerPage";
import InstitutionsPage from "./pages/InstitutionsPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LogoutPage from "./pages/LogoutPage";
import ProfilePage from "./pages/ProfilePage";
import AppSetupPage from "./pages/AppSetupPage";
import AntBtn from "./components/AntBtn";
import { ensureActiveWorkspace, getAuthPreferences, getCurrentApiKey, getCurrentUserId, getCurrentWorkspaceId, listWorkspaces, setCurrentApiKey, subscribeSessionChange, updateAuthPreferences } from "./templateApi";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_COMPACT = 196;
type AppProps = {
    themeMode: PaletteMode;
    onToggleTheme: () => void;
};

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
    const [activeWorkspaceLabel, setActiveWorkspaceLabel] = useState<string>("none");
    const effectiveSidebarWidth = sidebarHidden ? 0 : sidebarWidth;
    const activeUserId = getCurrentUserId();
    const activeWorkspaceId = getCurrentWorkspaceId();
    const isAuthenticated = Boolean(getCurrentApiKey());
    const profileMenuOpen = Boolean(profileMenuAnchor);
    const toolsMenuOpen = Boolean(toolsMenuAnchor);
    const avatarLabel = (activeUserId || "U").slice(0, 1).toUpperCase();
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
        let cancelled = false;
        async function prepareWorkspace() {
            if (!isAuthenticated) {
                setWorkspaceReady(false);
                return;
            }
            setWorkspaceReady(false);
            try {
                await ensureActiveWorkspace();
                if (!cancelled) {
                    setWorkspaceReady(true);
                }
            } catch {
                if (!cancelled) {
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
                    <Route path="/register" element={<RegisterPage />} />
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
                <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
                    Certificates
                </Typography>
                <Tooltip title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                    <IconButton onClick={onToggleTheme} aria-label="Toggle theme">
                        {themeMode === "light" ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
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
                <ListItemButton component={RouterLink} to="/institutions" onClick={() => setMobileNavOpen(false)}>
                    <BusinessOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Institutions"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
            </List>
        </>
    );

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
                        <MenuItem component={RouterLink} to="/workspaces" onClick={() => setProfileMenuAnchor(null)}>
                            Workspaces
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/logout" onClick={() => setProfileMenuAnchor(null)}>
                            Logout
                        </MenuItem>
                    </Menu>
                    <Menu
                        anchorEl={toolsMenuAnchor}
                        open={toolsMenuOpen}
                        onClose={() => setToolsMenuAnchor(null)}
                        anchorOrigin={{ vertical: "top", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "left" }}
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
                            to="/signature"
                            onClick={() => {
                                setToolsMenuAnchor(null);
                                setProfileMenuAnchor(null);
                            }}
                        >
                            Signature
                        </MenuItem>
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
                    <Route path="/register" element={<Navigate to="/templates" replace />} />
                    <Route path="/app/setup" element={<Navigate to="/templates" replace />} />
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/designs" element={<DesignsPage />} />
                    <Route path="/designs/:id" element={<DesignDetailsPage />} />
                    <Route path="/signature" element={<SignaturePage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/institutions" element={<InstitutionsPage />} />
                    <Route path="/workspaces" element={<WorkspacesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/logout" element={<LogoutPage />} />
                    <Route path="/certificates/:id/view" element={<CertificateViewerPage />} />
                    <Route path="/base64-image" element={<Base64ImageViewerPage />} />
                    <Route path="/qr-decoder" element={<QrDecoderPage />} />
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
        </Box>
    );
}
