import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { appConfig } from "../appConfig";
import { getDesignById, type DesignDetail } from "../templateApi";

function formatDate(value?: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export default function DesignDetailsPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [design, setDesign] = useState<DesignDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setErrorMsg("Missing design id");
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setErrorMsg(null);

        getDesignById(id)
            .then((item) => {
                if (!cancelled) setDesign(item);
            })
            .catch((err: any) => {
                if (!cancelled) setErrorMsg(err?.message || "Failed to load design");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5">Design Detail</Typography>
                <Button variant="outlined" onClick={() => navigate("/designs")}>Back to designs</Button>
            </Stack>

            {loading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography>Loading design...</Typography>
                </Stack>
            ) : errorMsg ? (
                <Alert severity="error">{errorMsg}</Alert>
            ) : !design ? (
                <Alert severity="warning">Design not found.</Alert>
            ) : (
                <Stack spacing={2}>
                    <Box
                        component="img"
                        src={`${appConfig.assetBaseUrl}${design.thumbnailUrl}`}
                        alt={design.name}
                        sx={{ width: "100%", maxHeight: 460, objectFit: "contain", bgcolor: "#f1f4f8", borderRadius: 2 }}
                    />
                    <Typography variant="h6">{design.name}</Typography>
                    <Typography color="text.secondary">{design.description || "-"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Updated: {formatDate(design.updatedAt)} | Created: {formatDate(design.createdAt)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={() => navigate(`/templates/new?design=${encodeURIComponent(design.id)}`)}>
                            Use Design
                        </Button>
                    </Stack>
                </Stack>
            )}
        </Box>
    );
}
