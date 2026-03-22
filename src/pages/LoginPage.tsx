import { useState } from "react";
import { Box, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { login } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function LoginPage() {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit() {
        setLoading(true);
        try {
            await login({ username, password });
            notifications.success("Signed in");
            navigate("/workspaces", { replace: true });
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
                            Login with your username and password.
                        </Typography>
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
                        {" | "}
                        <Link component={RouterLink} to="/app/setup">
                            Setup app
                        </Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
