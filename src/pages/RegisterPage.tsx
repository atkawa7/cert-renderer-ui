import { useState } from "react";
import { Box, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { ensureActiveWorkspace, register } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function RegisterPage() {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [invitationToken, setInvitationToken] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit() {
        setLoading(true);
        try {
            await register({ username, password, invitationToken: invitationToken.trim() || undefined });
            await ensureActiveWorkspace();
            notifications.success("Account created");
            navigate("/templates", { replace: true });
        } catch (err: any) {
            notifications.error(err?.message || "Registration failed", { title: "Auth" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 420, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h5">Create Account</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Register to receive an API key session.
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
                    <TextField
                        fullWidth
                        label="Invitation Token (if required)"
                        size="small"
                        value={invitationToken}
                        onChange={(e) => setInvitationToken(e.target.value)}
                    />
                    <AntBtn antType="primary" onClick={() => void submit()} disabled={loading}>
                        {loading ? "Creating..." : "Register"}
                    </AntBtn>
                    <Typography variant="body2" color="text.secondary">
                        Already have an account?{" "}
                        <Link component={RouterLink} to="/login">
                            Sign in
                        </Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
