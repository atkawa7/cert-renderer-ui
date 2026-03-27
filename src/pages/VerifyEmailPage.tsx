import { useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailByLink } from "../templateApi";
import AntBtn from "../components/AntBtn";

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string>("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setSuccess(false);
            setMessage("Verification token is missing.");
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const result = await verifyEmailByLink(token);
                if (cancelled) return;
                if (result.verifiedEmail) {
                    setSuccess(true);
                    setMessage("Email verified successfully.");
                } else {
                    setSuccess(false);
                    setMessage("Email is not verified.");
                }
            } catch (err: any) {
                if (cancelled) return;
                setSuccess(false);
                setMessage(err?.message || "Email verification failed.");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 520, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack spacing={2}>
                    <Typography variant="h5">Email Verification</Typography>
                    {loading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={18} />
                            <Typography>Verifying...</Typography>
                        </Stack>
                    ) : (
                        <Typography color={success ? "success.main" : "error.main"}>{message}</Typography>
                    )}
                    <Stack direction="row" spacing={1}>
                        <AntBtn onClick={() => navigate("/login")}>
                            Go to Login
                        </AntBtn>
                        <AntBtn onClick={() => navigate("/register")}>
                            Go to Register
                        </AntBtn>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
