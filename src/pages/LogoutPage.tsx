import { useEffect } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { logout } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function LogoutPage() {
    const navigate = useNavigate();
    const notifications = useNotifications();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await logout();
            } catch (err: any) {
                if (!cancelled) {
                    notifications.error(err?.message || "Logout failed", { title: "Auth" });
                }
            } finally {
                if (!cancelled) {
                    navigate("/login", { replace: true });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [navigate, notifications]);

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography>Signing out...</Typography>
            </Stack>
        </Box>
    );
}

