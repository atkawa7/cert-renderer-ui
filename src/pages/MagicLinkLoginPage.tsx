import { useEffect, useState } from "react";
import { Box, Chip, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import { appSetupStatus, consumeMagicLink, ensureActiveWorkspace, type AppSetupStatus, type PreferredAuthMode } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function MagicLinkLoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const notifications = useNotifications();
    const [username, setUsername] = useState("");
    const [magicToken, setMagicToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [preferredAuthMode, setPreferredAuthMode] = useState<PreferredAuthMode>("API_KEY");
    const [, setSetupStatus] = useState<AppSetupStatus | null>(null);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);

    useEffect(() => {
        setUsername((searchParams.get("username") || "").trim());
        setMagicToken((searchParams.get("magicToken") || "").trim());
    }, [searchParams]);

    useEffect(() => {
        let cancelled = false;
        async function loadPreferredAuthMode() {
            try {
                const status = await appSetupStatus();
                const mode = (status.preferredAuthMode ?? "").toUpperCase();
                if (cancelled) return;
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
        if (!magicToken) {
            notifications.error("Magic token is missing or invalid", { title: "Auth" });
            return;
        }
        setLoading(true);
        try {
            const response = await consumeMagicLink({
                token: magicToken,
                twoFactorCode: twoFactorRequired ? twoFactorCode : undefined,
                twoFactorChallengeToken: twoFactorRequired ? (twoFactorChallengeToken || undefined) : undefined,
            }, preferredAuthMode);
            if (response.requiresTwoFactor) {
                setTwoFactorRequired(true);
                setTwoFactorChallengeToken(response.twoFactorChallengeToken || null);
                setUsername(response.username || username);
                notifications.info("2FA is enabled. Enter authenticator or backup code.", { title: "Auth" });
                return;
            }
            await ensureActiveWorkspace();
            notifications.success("Signed in");
            navigate("/templates", { replace: true });
        } catch (err: any) {
            notifications.error(err?.message || "Magic link login failed", { title: "Auth" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 420, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h5">Magic Link Sign In</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Continue with your emailed magic link.
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip size="small" label={`Auth Mode: ${setupStatusLoaded ? preferredAuthMode : "..."}`} />
                        </Box>
                    </Box>
                    <TextField
                        fullWidth
                        label="Username"
                        size="small"
                        value={username || "(hidden until verified)"}
                        InputProps={{ readOnly: true }}
                    />
                    {twoFactorRequired ? (
                        <TextField
                            fullWidth
                            label="2FA Code or Backup Code"
                            size="small"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void submit();
                            }}
                        />
                    ) : null}
                    <AntBtn antType="primary" onClick={() => void submit()} disabled={loading || !magicToken}>
                        {loading ? "Signing in..." : twoFactorRequired ? "Verify 2FA" : "Continue"}
                    </AntBtn>
                    <Typography variant="body2" color="text.secondary">
                        Prefer password?{" "}
                        <Link component={RouterLink} to="/login">
                            Go to standard login
                        </Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}
