import { Box, Divider, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import { Link as RouterLink, Navigate, Route, Routes } from "react-router-dom";
import BrowserTabTitle from "./components/BrowserTabTitle";
import DesignsPage from "./pages/DesignsPage";
import DesignDetailsPage from "./pages/DesignDetailsPage";
import EditorPage from "./pages/EditorPage";
import TemplatesListPage from "./pages/TemplatesListPage";
import SignaturePage from "./pages/SignaturePage";

const SIDEBAR_WIDTH = 260;

export default function App() {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6fb" }}>
            <BrowserTabTitle />
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
                    <ListItemButton component={RouterLink} to="/signature">
                        <BorderColorOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                        <ListItemText primary="Signature" />
                    </ListItemButton>
                </List>
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
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
