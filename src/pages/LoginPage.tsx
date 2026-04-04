import { useEffect, useState } from "react";
import { Box, Chip, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { appSetupStatus, ensureActiveWorkspace, login, type AppSetupStatus, type PreferredAuthMode } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function LoginPage() {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [preferredAuthMode, setPreferredAuthMode] = useState<PreferredAuthMode>("API_KEY");
    const [setupStatus, setSetupStatus] = useState<AppSetupStatus | null>(null);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function loadPreferredAuthMode() {
            try {
                const status = await appSetupStatus();
                const mode = (status.preferredAuthMode ?? "").toUpperCase();
                if (cancelled) {
                    return;
                }
                if (mode === "JWT" || mode === "DPOP" || mode === "API_KEY") {
                    setPreferredAuthMode(mode);
                } else {
                    setPreferredAuthMode("API_KEY");
                }
                setSetupStatus(status);
                setSetupStatusLoaded(true);
            } catch {
                if (!cancelled) {
                    setPreferredAuthMode("API_KEY");
                    setSetupStatus(null);
                    setSetupStatusLoaded(true);
                }
            }
        }
        void loadPreferredAuthMode();
        return () => {
            cancelled = true;
        };
    }, []);

    async function submit() {
        setLoading(true);
        try {
            await login({ username, password }, preferredAuthMode);
            await ensureActiveWorkspace();
            notifications.success("Signed in");
            navigate("/templates", { replace: true });
        } catch (err: any) {
            notifications.error(err?.message || "Login failed", { title: "Auth" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 420, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h5">Sign In</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Login with your username and password. Preferred auth mode is applied automatically.
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip size="small" label={`Auth Mode: ${setupStatusLoaded ? preferredAuthMode : "..."}`} />
                        </Box>
                    </Box>
                    <TextField
                        fullWidth
                        label="Username"
                        size="small"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        size="small"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void submit();
                        }}
                    />
                    <AntBtn antType="primary" onClick={() => void submit()} disabled={loading}>
                        {loading ? "Signing in..." : "Login"}
                    </AntBtn>
                    <Typography variant="body2" color="text.secondary">
                        New here?{" "}
                        <Link component={RouterLink} to="/register">
                            Create account
                        </Link>
                        {setupStatus?.setupEnabled && !setupStatus?.setupCompleted ? (
                            <>
                                {" | "}
                                <Link component={RouterLink} to="/app/setup">
                                    Setup app
                                </Link>
                            </>
                        ) : null}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
