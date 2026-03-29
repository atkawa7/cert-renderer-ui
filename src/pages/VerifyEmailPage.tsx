import { useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailByLink } from "../templateApi";
import AntBtn from "../components/AntBtn";

type VerificationResult = {
    success: boolean;
    message: string;
};

const verificationRequestByToken = new Map<string, Promise<VerificationResult>>();

function verifyEmailTokenOnce(token: string): Promise<VerificationResult> {
    const cached = verificationRequestByToken.get(token);
    if (cached) {
        return cached;
    }
    const request = (async () => {
        try {
            const result = await verifyEmailByLink(token);
            if (result.verifiedEmail) {
                return { success: true, message: "Email verified successfully." };
            }
            return { success: false, message: "Email is not verified." };
        } catch (err: any) {
            return { success: false, message: err?.message || "Email verification failed." };
        }
    })();
    verificationRequestByToken.set(token, request);
    return request;
}

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
                const verification = await verifyEmailTokenOnce(token);
                if (cancelled) return;
                setSuccess(verification.success);
                setMessage(verification.message);
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
