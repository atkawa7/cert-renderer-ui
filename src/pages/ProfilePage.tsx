import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { currentUser, getCurrentApiKey, getCurrentWorkspaceId } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function ProfilePage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");

    const apiKey = getCurrentApiKey() || "";
    const workspaceId = getCurrentWorkspaceId() || "";
    const maskedApiKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}` : "";

    async function loadProfile() {
        setLoading(true);
        try {
            const profile = await currentUser();
            setUsername(profile.username);
            setUserId(profile.userId);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load profile", { title: "Profile" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: 840, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">Profile</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Authenticated user and active session details.
                    </Typography>
                </Box>

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading profile...</Typography>
                    </Stack>
                ) : (
                    <Stack spacing={1.2}>
                        <TextField fullWidth size="small" label="User ID" value={userId} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Username" value={username} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="API Key" value={maskedApiKey} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Active Workspace" value={workspaceId} InputProps={{ readOnly: true }} />
                        <Alert severity="info">
                            Use Workspaces page to switch workspace. Current API key is sent automatically.
                        </Alert>
                        <Box>
                            <AntBtn onClick={() => void loadProfile()} disabled={loading}>
                                Refresh
                            </AntBtn>
                        </Box>
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}

