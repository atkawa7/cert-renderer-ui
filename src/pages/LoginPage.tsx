import { useEffect, useState } from "react";
import { Box, Chip, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import AntBtn from "../components/AntBtn";
import {
    appSetupStatus,
    consumeMagicLink,
    ensureActiveWorkspace,
    login,
    requestMagicLink,
    type AppSetupStatus,
    type PreferredAuthMode,
} from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const notifications = useNotifications();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(null);
    const [magicToken, setMagicToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [magicSending, setMagicSending] = useState(false);
    const [preferredAuthMode, setPreferredAuthMode] = useState<PreferredAuthMode>("API_KEY");
    const [setupStatus, setSetupStatus] = useState<AppSetupStatus | null>(null);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);
    const isDevMode = import.meta.env.DEV;
    const swaggerUiUrl = `${window.location.origin}${import.meta.env.BASE_URL}api/swagger-ui/index.html`;
    const openApiUrl = `${window.location.origin}${import.meta.env.BASE_URL}api/v3/api-docs`;
    const verifyEmailLinkExample = `${window.location.origin}${import.meta.env.BASE_URL}verify-email?token=<token>`;

    useEffect(() => {
        const token = (searchParams.get("magicToken") || "").trim();
        if (!token) return;
        setMagicToken(token);
        setTwoFactorRequired(false);
        setTwoFactorCode("");
        setTwoFactorChallengeToken(null);
        notifications.info("Magic link detected. Click continue to sign in.", { title: "Auth" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

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
            const response = magicToken
                ? await consumeMagicLink({
                    token: magicToken,
                    twoFactorCode: twoFactorRequired ? twoFactorCode : undefined,
                    twoFactorChallengeToken: twoFactorRequired ? (twoFactorChallengeToken || undefined) : undefined,
                }, preferredAuthMode)
                : await login({
                    username,
                    password,
                    twoFactorCode: twoFactorRequired ? twoFactorCode : undefined,
                    twoFactorChallengeToken: twoFactorRequired ? (twoFactorChallengeToken || undefined) : undefined,
                }, preferredAuthMode);
            if (response.requiresTwoFactor) {
                setTwoFactorRequired(true);
                setTwoFactorChallengeToken(response.twoFactorChallengeToken || null);
                notifications.info("2FA is enabled. Enter authenticator or backup code.", { title: "Auth" });
                return;
            }
            if (magicToken) {
                const next = new URLSearchParams(searchParams);
                next.delete("magicToken");
                setSearchParams(next, { replace: true });
                setMagicToken("");
            }
            await ensureActiveWorkspace();
            notifications.success("Signed in");
            navigate("/templates", { replace: true });
        } catch (err: any) {
            notifications.error(err?.message || "Login failed", { title: "Auth" });
        } finally {
            setLoading(false);
        }
    }

    async function sendMagicLink() {
        if (!username.trim()) {
            notifications.warning("Enter username or email first", { title: "Auth" });
            return;
        }
        setMagicSending(true);
        try {
            const response = await requestMagicLink({ usernameOrEmail: username.trim() });
            notifications.success(response.message || "If the account exists, a magic login link has been sent", { title: "Auth" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to send magic link", { title: "Auth" });
        } finally {
            setMagicSending(false);
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
                        {magicToken ? (
                            <Typography variant="body2" color="success.main">
                                Magic link mode enabled.
                            </Typography>
                        ) : null}
                        {twoFactorRequired ? (
                            <Typography variant="body2" color="warning.main">
                                Enter your 2FA code to complete sign-in.
                            </Typography>
                        ) : null}
                        <Box sx={{ mt: 1 }}>
                            <Chip size="small" label={`Auth Mode: ${setupStatusLoaded ? preferredAuthMode : "..."}`} />
                        </Box>
                    </Box>
                    {!magicToken ? (
                        <TextField
                            fullWidth
                            label="Username"
                            size="small"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    ) : null}
                    {!magicToken ? (
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
                    ) : null}
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
                    <AntBtn antType="primary" onClick={() => void submit()} disabled={loading}>
                        {loading ? "Signing in..." : twoFactorRequired ? "Verify 2FA" : magicToken ? "Continue with Magic Link" : "Login"}
                    </AntBtn>
                    {!magicToken ? (
                        <AntBtn onClick={() => void sendMagicLink()} disabled={magicSending || !username.trim()}>
                            {magicSending ? "Sending..." : "Email Magic Link"}
                        </AntBtn>
                    ) : (
                        <AntBtn
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete("magicToken");
                                setSearchParams(next, { replace: true });
                                setMagicToken("");
                                setTwoFactorRequired(false);
                                setTwoFactorCode("");
                                setTwoFactorChallengeToken(null);
                            }}
                            disabled={loading}
                        >
                            Use Password Instead
                        </AntBtn>
                    )}
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
                    {isDevMode ? (
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
                            <Stack spacing={0.7}>
                                <Typography variant="subtitle2">Dev Tools</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Swagger and email verification helpers are shown only in dev mode.
                                </Typography>
                                <Typography variant="body2">
                                    <Link href={swaggerUiUrl} target="_blank" rel="noreferrer">
                                        Swagger UI
                                    </Link>
                                    {" | "}
                                    <Link href={openApiUrl} target="_blank" rel="noreferrer">
                                        OpenAPI JSON
                                    </Link>
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                                    Email verify page: <Link component={RouterLink} to="/verify-email">/verify-email</Link>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                                    Example verify link format: {verifyEmailLinkExample}
                                </Typography>
                            </Stack>
                        </Paper>
                    ) : null}
                </Stack>
            </Paper>
        </Box>
    );
}
