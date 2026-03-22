import { useEffect, useState } from "react";
import { AppBar, Box, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme, type PaletteMode } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
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
import { ensureActiveWorkspace, getCurrentApiKey, getCurrentUserId, getCurrentWorkspaceId, setCurrentApiKey, subscribeSessionChange } from "./templateApi";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_COMPACT = 196;
const ONBOARDING_KEY_PREFIX = "renderer:onboarding:v1:";

type AppProps = {
    themeMode: PaletteMode;
    onToggleTheme: () => void;
};

export default function App({ themeMode, onToggleTheme }: AppProps) {
    const theme = useTheme();
    const isOverlayNav = useMediaQuery(theme.breakpoints.down("md"));
    const isCompactNav = useMediaQuery(theme.breakpoints.down("lg"));
    const sidebarWidth = isCompactNav ? SIDEBAR_WIDTH_COMPACT : SIDEBAR_WIDTH;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [sidebarHidden, setSidebarHidden] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(true);
    const [sessionVersion, setSessionVersion] = useState(0);
    const [workspaceReady, setWorkspaceReady] = useState(false);
    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const effectiveSidebarWidth = sidebarHidden ? 0 : sidebarWidth;
    const activeUserId = getCurrentUserId();
    const activeWorkspaceId = getCurrentWorkspaceId();
    const isAuthenticated = Boolean(getCurrentApiKey());
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
    }, [isAuthenticated, sessionVersion]);

    useEffect(() => {
        if (!isAuthenticated || !workspaceReady) return;
        const key = `${ONBOARDING_KEY_PREFIX}${activeUserId}`;
        const completed = window.localStorage.getItem(key) === "true";
        if (!completed) {
            setOnboardingStep(0);
            setOnboardingOpen(true);
        }
    }, [isAuthenticated, workspaceReady, activeUserId]);

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

    if (!workspaceReady) {
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
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    {activeUserId} / {activeWorkspaceId ?? "no-workspace"}
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
                <ListItemButton component={RouterLink} to="/workspaces" onClick={() => setMobileNavOpen(false)}>
                    <GroupsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Workspaces"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/profile" onClick={() => setMobileNavOpen(false)}>
                    <PersonOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Profile"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/logout" onClick={() => setMobileNavOpen(false)}>
                    <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Logout"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
            </List>
            <Divider />
            <List>
                <ListItemButton onClick={() => setToolsOpen((v) => !v)}>
                    <BuildOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Tools"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                    {toolsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemButton>
                <Collapse in={toolsOpen} timeout="auto" unmountOnExit>
                    <List disablePadding>
                        <ListItemButton component={RouterLink} to="/signature" onClick={() => setMobileNavOpen(false)} sx={{ pl: 4 }}>
                            <BorderColorOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                            <ListItemText
                                primary="Signature"
                                primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                            />
                        </ListItemButton>
                        <ListItemButton component={RouterLink} to="/base64-image" onClick={() => setMobileNavOpen(false)} sx={{ pl: 4 }}>
                            <ImageOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                            <ListItemText
                                primary="Base64 Image"
                                primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                            />
                        </ListItemButton>
                        <ListItemButton component={RouterLink} to="/qr-decoder" onClick={() => setMobileNavOpen(false)} sx={{ pl: 4 }}>
                            <QrCode2OutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                            <ListItemText
                                primary="QR Decoder"
                                primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                            />
                        </ListItemButton>
                    </List>
                </Collapse>
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
                {isOverlayNav && (
                    <AppBar position="sticky" color="default" elevation={1}>
                        <Toolbar variant="dense">
                            <IconButton edge="start" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Certificates
                            </Typography>
                            <Box sx={{ ml: "auto" }}>
                                <Tooltip title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                                    <IconButton onClick={onToggleTheme} aria-label="Toggle theme">
                                        {themeMode === "light" ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
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
                            onClick={() => {
                                window.localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${activeUserId}`, "true");
                                setOnboardingOpen(false);
                            }}
                        >
                            Start Using App
                        </AntBtn>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
