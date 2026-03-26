import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { appSetupStatus, createInvitation, currentUser, getCurrentApiKey, getCurrentWorkspaceId } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function ProfilePage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");
    const [admin, setAdmin] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState("");
    const [registrationMode, setRegistrationMode] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [inviteToken, setInviteToken] = useState("");

    const apiKey = getCurrentApiKey() || "";
    const workspaceId = getCurrentWorkspaceId() || "";
    const maskedApiKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}` : "";

    async function loadProfile() {
        setLoading(true);
        try {
            const profile = await currentUser();
            setUsername(profile.username);
            setUserId(profile.userId);
            setAdmin(profile.admin);
            setSubscriptionTier(profile.subscriptionTier || "FREE");
            const setup = await appSetupStatus();
            setRegistrationMode(setup.registrationMode);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load profile", { title: "Profile" });
        } finally {
            setLoading(false);
        }
    }

    async function invite() {
        if (!inviteUsername.trim()) return;
        try {
            const response = await createInvitation(inviteUsername.trim());
            setInviteToken(response.invitationToken);
            notifications.success("Invitation created", { title: "Profile" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to create invitation", { title: "Profile" });
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
                        <TextField fullWidth size="small" label="Admin" value={admin ? "Yes" : "No"} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Subscription Tier" value={subscriptionTier || "FREE"} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Registration Mode" value={registrationMode} InputProps={{ readOnly: true }} />
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
                        {admin && registrationMode === "invitation" && (
                            <Stack spacing={1.2}>
                                <Typography variant="subtitle2">Create invitation</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Username to invite"
                                    value={inviteUsername}
                                    onChange={(e) => setInviteUsername(e.target.value)}
                                />
                                <Box>
                                    <AntBtn onClick={() => void invite()}>Generate Invite</AntBtn>
                                </Box>
                                {inviteToken ? (
                                    <TextField fullWidth size="small" label="Invitation Token" value={inviteToken} InputProps={{ readOnly: true }} />
                                ) : null}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
