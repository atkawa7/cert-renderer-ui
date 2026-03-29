import { useEffect, useState } from "react";
import { Alert, Box, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { appSetupStatus, createInvitation, currentUser, getCurrentApiKey, getCurrentWorkspaceId, updateMyEmail, verifyMyEmail } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function ProfilePage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");
    const [admin, setAdmin] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState("");
    const [email, setEmail] = useState("");
    const [verifiedEmail, setVerifiedEmail] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [emailBusy, setEmailBusy] = useState(false);
    const [registrationMode, setRegistrationMode] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [sendInviteEmail, setSendInviteEmail] = useState(false);
    const [inviteeEmail, setInviteeEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");

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
            setEmail(profile.email || "");
            setVerifiedEmail(Boolean(profile.verifiedEmail));
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
            const response = await createInvitation({
                username: inviteUsername.trim(),
                inviteeEmail: sendInviteEmail ? inviteeEmail.trim() : undefined,
                sendEmail: sendInviteEmail,
            });
            setInviteLink(response.invitationLink || "");
            notifications.success(sendInviteEmail ? "Invitation created and emailed" : "Invitation created", { title: "Profile" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to create invitation", { title: "Profile" });
        }
    }

    async function saveEmail() {
        if (!email.trim()) return;
        setEmailBusy(true);
        try {
            const status = await updateMyEmail(email.trim());
            setEmail(status.email || "");
            setVerifiedEmail(Boolean(status.verifiedEmail));
            notifications.success("Verification link sent to email", { title: "Profile" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to set email", { title: "Profile" });
        } finally {
            setEmailBusy(false);
        }
    }

    async function verifyEmailCode() {
        if (!verificationCode.trim()) return;
        setEmailBusy(true);
        try {
            const status = await verifyMyEmail(verificationCode.trim());
            setEmail(status.email || "");
            setVerifiedEmail(Boolean(status.verifiedEmail));
            if (status.verifiedEmail) {
                notifications.success("Email verified", { title: "Profile" });
                setVerificationCode("");
            } else {
                notifications.warning("Email is not verified yet", { title: "Profile" });
            }
        } catch (err: any) {
            notifications.error(err?.message || "Failed to verify email", { title: "Profile" });
        } finally {
            setEmailBusy(false);
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
                        <TextField
                            fullWidth
                            size="small"
                            label="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Email Verification"
                            value={verifiedEmail ? "Verified" : "Not verified"}
                            InputProps={{ readOnly: true }}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <AntBtn onClick={() => void saveEmail()} disabled={emailBusy || !email.trim()}>
                                Save Email
                            </AntBtn>
                            {!verifiedEmail && email.trim() ? (
                                <>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Verification Code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                    />
                                    <AntBtn onClick={() => void verifyEmailCode()} disabled={emailBusy || !verificationCode.trim()}>
                                        Verify Email
                                    </AntBtn>
                                </>
                            ) : null}
                        </Stack>
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
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={sendInviteEmail}
                                            onChange={(e) => setSendInviteEmail(e.target.checked)}
                                        />
                                    }
                                    label="Send via email"
                                />
                                {sendInviteEmail ? (
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Invitee email"
                                        type="email"
                                        value={inviteeEmail}
                                        onChange={(e) => setInviteeEmail(e.target.value)}
                                    />
                                ) : null}
                                <Box>
                                    <AntBtn onClick={() => void invite()} disabled={!inviteUsername.trim() || (sendInviteEmail && !inviteeEmail.trim())}>
                                        Generate Invite
                                    </AntBtn>
                                </Box>
                                {inviteLink ? (
                                    <TextField fullWidth size="small" label="Invitation Link" value={inviteLink} InputProps={{ readOnly: true }} />
                                ) : null}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}
