import { useEffect, useState } from "react";
import { Alert, Box, Link, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { appSetupStatus, initializeAppSetup } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function AppSetupPage() {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [registrationMode, setRegistrationMode] = useState<"self" | "invitation">("self");
    const [setupEnabled, setSetupEnabled] = useState(false);
    const [setupCompleted, setSetupCompleted] = useState(false);

    async function loadStatus() {
        setStatusLoading(true);
        try {
            const status = await appSetupStatus();
            setSetupEnabled(status.setupEnabled);
            setSetupCompleted(status.setupCompleted);
            if (status.registrationMode === "invitation") {
                setRegistrationMode("invitation");
            } else {
                setRegistrationMode("self");
            }
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load setup status", { title: "Setup" });
        } finally {
            setStatusLoading(false);
        }
    }

    useEffect(() => {
        void loadStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function submit() {
        setLoading(true);
        try {
            await initializeAppSetup({ username, password, registrationMode });
            notifications.success("App setup complete. Admin created.");
            navigate("/workspaces", { replace: true });
        } catch (err: any) {
            notifications.error(err?.message || "Setup failed", { title: "Setup" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 500, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h5">App Setup</Typography>
                        <Typography variant="body2" color="text.secondary">
                            One-time setup for initial admin and registration mode.
                        </Typography>
                    </Box>

                    {statusLoading ? (
                        <Typography variant="body2" color="text.secondary">Loading setup status...</Typography>
                    ) : !setupEnabled ? (
                        <Alert severity="warning">Setup is disabled. Set `app.setup.enabled=true` to run setup.</Alert>
                    ) : setupCompleted ? (
                        <Alert severity="info">Setup already completed.</Alert>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                label="Admin Username"
                                size="small"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                label="Admin Password"
                                size="small"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <TextField
                                select
                                fullWidth
                                label="Registration Mode"
                                size="small"
                                value={registrationMode}
                                onChange={(e) => setRegistrationMode((e.target.value as "self" | "invitation") || "self")}
                            >
                                <MenuItem value="self">self</MenuItem>
                                <MenuItem value="invitation">invitation</MenuItem>
                            </TextField>
                            <AntBtn antType="primary" onClick={() => void submit()} disabled={loading}>
                                {loading ? "Setting up..." : "Initialize App"}
                            </AntBtn>
                        </>
                    )}

                    <Typography variant="body2" color="text.secondary">
                        <Link component={RouterLink} to="/login">Back to login</Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}

