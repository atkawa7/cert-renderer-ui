import { useEffect, useState } from "react";
import { Alert, Box, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import QRCode from "qrcode";
import AntBtn from "../components/AntBtn";
import {
    getMyReferralDashboard,
    appSetupStatus,
    beginTwoFactorSetup,
    confirmTwoFactorSetup,
    createInvitation,
    currentUser,
    getCurrentApiKey,
    getCurrentAuthMode,
    getCurrentWorkspaceId,
    getTwoFactorStatus,
    listTwoFactorDevices,
    regenerateTwoFactorBackupCodes,
    removeTwoFactorDevice,
    type ReferralDashboard,
    type TwoFactorDevice,
    updateMyEmail,
    verifyMyEmail,
} from "../templateApi";
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
    const [preferredAuthMode, setPreferredAuthMode] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [sendInviteEmail, setSendInviteEmail] = useState(false);
    const [inviteeEmail, setInviteeEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFactorDevices, setTwoFactorDevices] = useState<TwoFactorDevice[]>([]);
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
    const [twoFactorLabel, setTwoFactorLabel] = useState("My Authenticator");
    const [twoFactorSetupDeviceId, setTwoFactorSetupDeviceId] = useState<string | null>(null);
    const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState("");
    const [twoFactorSetupUri, setTwoFactorSetupUri] = useState("");
    const [twoFactorSetupQr, setTwoFactorSetupQr] = useState("");
    const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
    const [twoFactorBusy, setTwoFactorBusy] = useState(false);
    const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);
    const [referralDashboard, setReferralDashboard] = useState<ReferralDashboard | null>(null);

    const apiKey = getCurrentApiKey() || "";
    const currentAuthMode = getCurrentAuthMode();
    const workspaceId = getCurrentWorkspaceId() || "";
    const maskedToken = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}` : "";

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
            setPreferredAuthMode(setup.preferredAuthMode || "API_KEY");
            const [status, devices] = await Promise.all([getTwoFactorStatus(), listTwoFactorDevices()]);
            setTwoFactorEnabled(Boolean(status.enabled));
            setBackupCodesRemaining(status.backupCodesRemaining || 0);
            setTwoFactorDevices(devices);
            const referral = await getMyReferralDashboard();
            setReferralDashboard(referral);
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

    async function startTwoFactorSetup() {
        if (!twoFactorLabel.trim()) return;
        setTwoFactorBusy(true);
        try {
            const setup = await beginTwoFactorSetup(twoFactorLabel.trim());
            setTwoFactorSetupDeviceId(setup.deviceId);
            setTwoFactorSetupSecret(setup.secretBase32);
            setTwoFactorSetupUri(setup.otpauthUri);
            try {
                const qr = await QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 240 });
                setTwoFactorSetupQr(qr);
            } catch {
                setTwoFactorSetupQr("");
            }
            setTwoFactorSetupCode("");
            notifications.success("2FA device created. Add it to your authenticator app, then confirm code.", { title: "2FA" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to start 2FA setup", { title: "2FA" });
        } finally {
            setTwoFactorBusy(false);
        }
    }

    async function confirmSetupCode() {
        if (!twoFactorSetupDeviceId || !twoFactorSetupCode.trim()) return;
        setTwoFactorBusy(true);
        try {
            await confirmTwoFactorSetup(twoFactorSetupDeviceId, twoFactorSetupCode.trim());
            const [status, devices] = await Promise.all([getTwoFactorStatus(), listTwoFactorDevices()]);
            setTwoFactorEnabled(Boolean(status.enabled));
            setBackupCodesRemaining(status.backupCodesRemaining || 0);
            setTwoFactorDevices(devices);
            setTwoFactorSetupDeviceId(null);
            setTwoFactorSetupSecret("");
            setTwoFactorSetupUri("");
            setTwoFactorSetupQr("");
            setTwoFactorSetupCode("");
            notifications.success("2FA enabled for this device", { title: "2FA" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to confirm 2FA code", { title: "2FA" });
        } finally {
            setTwoFactorBusy(false);
        }
    }

    async function removeDevice(deviceId: string) {
        setTwoFactorBusy(true);
        try {
            await removeTwoFactorDevice(deviceId);
            const [status, devices] = await Promise.all([getTwoFactorStatus(), listTwoFactorDevices()]);
            setTwoFactorEnabled(Boolean(status.enabled));
            setBackupCodesRemaining(status.backupCodesRemaining || 0);
            setTwoFactorDevices(devices);
            notifications.success("2FA device removed", { title: "2FA" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to remove 2FA device", { title: "2FA" });
        } finally {
            setTwoFactorBusy(false);
        }
    }

    async function regenerateCodes() {
        setTwoFactorBusy(true);
        try {
            const response = await regenerateTwoFactorBackupCodes();
            setGeneratedBackupCodes(response.codes || []);
            const status = await getTwoFactorStatus();
            setBackupCodesRemaining(status.backupCodesRemaining || 0);
            notifications.success("Backup codes regenerated. Save them now.", { title: "2FA" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to regenerate backup codes", { title: "2FA" });
        } finally {
            setTwoFactorBusy(false);
        }
    }

    async function copyReferralLink() {
        if (!referralDashboard?.referralLink) return;
        try {
            await navigator.clipboard.writeText(referralDashboard.referralLink);
            notifications.success("Referral link copied", { title: "Referrals" });
        } catch {
            notifications.error("Could not copy referral link", { title: "Referrals" });
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
                        <TextField fullWidth size="small" label="Preferred Auth Mode" value={preferredAuthMode || "API_KEY"} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Current Session Auth" value={currentAuthMode} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Session Token" value={maskedToken} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Active Workspace" value={workspaceId} InputProps={{ readOnly: true }} />
                        <Typography variant="subtitle2">Referrals</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Referral Code"
                            value={referralDashboard?.referralCode || ""}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Referral Link"
                            value={referralDashboard?.referralLink || ""}
                            InputProps={{ readOnly: true }}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Earned"
                                value={
                                    referralDashboard
                                        ? `${(referralDashboard.totalEarnedCents / 100).toFixed(2)} ${referralDashboard.currency}`
                                        : "0.00 USD"
                                }
                                InputProps={{ readOnly: true }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                label="Paid Out"
                                value={
                                    referralDashboard
                                        ? `${(referralDashboard.totalPaidCents / 100).toFixed(2)} ${referralDashboard.currency}`
                                        : "0.00 USD"
                                }
                                InputProps={{ readOnly: true }}
                            />
                        </Stack>
                        <TextField
                            fullWidth
                            size="small"
                            label="Referred Users"
                            value={String(referralDashboard?.referrals?.length ?? 0)}
                            InputProps={{ readOnly: true }}
                        />
                        <Box>
                            <AntBtn onClick={() => void copyReferralLink()} disabled={!referralDashboard?.referralLink}>
                                Copy Referral Link
                            </AntBtn>
                        </Box>
                        <TextField fullWidth size="small" label="2FA Status" value={twoFactorEnabled ? "Enabled" : "Disabled"} InputProps={{ readOnly: true }} />
                        <TextField fullWidth size="small" label="Backup Codes Remaining" value={String(backupCodesRemaining)} InputProps={{ readOnly: true }} />
                        <Alert severity="info">
                            Use Workspaces page to switch workspace. Session auth is applied automatically.
                        </Alert>
                        <Box>
                            <AntBtn onClick={() => void loadProfile()} disabled={loading}>
                                Refresh
                            </AntBtn>
                        </Box>
                        <Stack spacing={1.2}>
                            <Typography variant="subtitle2">Two-factor authentication</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="New Device Label"
                                value={twoFactorLabel}
                                onChange={(e) => setTwoFactorLabel(e.target.value)}
                            />
                            <Box>
                                <AntBtn onClick={() => void startTwoFactorSetup()} disabled={twoFactorBusy || !twoFactorLabel.trim()}>
                                    Add 2FA Device
                                </AntBtn>
                            </Box>
                            {twoFactorSetupDeviceId ? (
                                <Stack spacing={1}>
                                    <Alert severity="info">
                                        Scan this QR code (or use secret/URI) in your authenticator app, then enter the 6-digit code.
                                    </Alert>
                                    {twoFactorSetupQr ? (
                                        <Box
                                            component="img"
                                            src={twoFactorSetupQr}
                                            alt="2FA QR code"
                                            sx={{
                                                width: 220,
                                                height: 220,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                                p: 1,
                                                bgcolor: "background.paper",
                                            }}
                                        />
                                    ) : null}
                                    <TextField fullWidth size="small" label="Secret (Base32)" value={twoFactorSetupSecret} InputProps={{ readOnly: true }} />
                                    <TextField fullWidth size="small" label="OTPAuth URI" value={twoFactorSetupUri} InputProps={{ readOnly: true }} />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Authenticator Code"
                                        value={twoFactorSetupCode}
                                        onChange={(e) => setTwoFactorSetupCode(e.target.value)}
                                    />
                                    <Box>
                                        <AntBtn onClick={() => void confirmSetupCode()} disabled={twoFactorBusy || !twoFactorSetupCode.trim()}>
                                            Confirm Device
                                        </AntBtn>
                                    </Box>
                                </Stack>
                            ) : null}
                            {twoFactorDevices.length > 0 ? (
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2">Linked devices</Typography>
                                    {twoFactorDevices.map((device) => (
                                        <Stack key={device.deviceId} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label={device.label}
                                                value={`${device.active ? "Active" : "Pending"} | Added ${new Date(device.createdAt).toLocaleString()}`}
                                                InputProps={{ readOnly: true }}
                                            />
                                            <AntBtn onClick={() => void removeDevice(device.deviceId)} disabled={twoFactorBusy}>
                                                Remove
                                            </AntBtn>
                                        </Stack>
                                    ))}
                                </Stack>
                            ) : null}
                            <Box>
                                <AntBtn onClick={() => void regenerateCodes()} disabled={twoFactorBusy}>
                                    Regenerate Backup Codes
                                </AntBtn>
                            </Box>
                            {generatedBackupCodes.length > 0 ? (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Backup Codes (save now)"
                                    value={generatedBackupCodes.join("\n")}
                                    multiline
                                    minRows={4}
                                    InputProps={{ readOnly: true }}
                                />
                            ) : null}
                        </Stack>
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
