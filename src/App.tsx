import { useState } from "react";
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import BrowserTabTitle from "./components/BrowserTabTitle";
import DesignsPage from "./pages/DesignsPage";
import DesignDetailsPage from "./pages/DesignDetailsPage";
import EditorPage from "./pages/EditorPage";
import TemplatesListPage from "./pages/TemplatesListPage";
import SignaturePage from "./pages/SignaturePage";

const SIDEBAR_WIDTH = 260;

export default function App() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const navContent = (
        <>
            <Toolbar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Renderer UI
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                <ListItemButton component={RouterLink} to="/templates" onClick={() => setMobileNavOpen(false)}>
                    <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText primary="Templates" />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/designs" onClick={() => setMobileNavOpen(false)}>
                    <CollectionsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText primary="Designs" />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/signature" onClick={() => setMobileNavOpen(false)}>
                    <BorderColorOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText primary="Signature" />
                </ListItemButton>
            </List>
        </>
    );

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6fb" }}>
            <BrowserTabTitle />
            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={isMobile ? mobileNavOpen : true}
                onClose={() => setMobileNavOpen(false)}
                ModalProps={{ keepMounted: true }}
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
                {navContent}
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
                {isMobile && (
                    <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: "#ffffff" }}>
                        <Toolbar variant="dense">
                            <IconButton edge="start" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Renderer UI
                            </Typography>
                        </Toolbar>
                    </AppBar>
                )}
                <Routes>
                    <Route path="/" element={<Navigate to="/templates" replace />} />
                    <Route path="/templates" element={<TemplatesListPage />} />
                    <Route path="/designs" element={<DesignsPage />} />
                    <Route path="/designs/:id" element={<DesignDetailsPage />} />
                    <Route path="/signature" element={<SignaturePage />} />
                    <Route path="/templates/new" element={<EditorPage mode="new" sidebarWidth={SIDEBAR_WIDTH} />} />
                    <Route path="/templates/:id/edit" element={<EditorPage mode="edit" sidebarWidth={SIDEBAR_WIDTH} />} />
                </Routes>
            </Box>
        </Box>
    );
}
