import { useState } from "react";
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Tooltip, Typography, useMediaQuery, useTheme, type PaletteMode } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
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

const SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_COMPACT = 196;

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
    const effectiveSidebarWidth = sidebarHidden ? 0 : sidebarWidth;

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
                <ListItemButton component={RouterLink} to="/signature" onClick={() => setMobileNavOpen(false)}>
                    <BorderColorOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Signature"
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
                <ListItemButton component={RouterLink} to="/base64-image" onClick={() => setMobileNavOpen(false)}>
                    <ImageOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="Base64 Image"
                        primaryTypographyProps={{ fontSize: isCompactNav ? "0.9rem" : "1rem" }}
                    />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/qr-decoder" onClick={() => setMobileNavOpen(false)}>
                    <QrCode2OutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                        primary="QR Decoder"
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
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/designs" element={<DesignsPage />} />
                    <Route path="/designs/:id" element={<DesignDetailsPage />} />
                    <Route path="/signature" element={<SignaturePage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
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
        </Box>
    );
}
