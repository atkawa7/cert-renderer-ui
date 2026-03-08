import { Box, Typography } from "@mui/material";
import SignaturePad from "../components/SignaturePad";

export default function SignaturePage() {
    return (
        <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Signature Creator</Typography>
            <SignaturePad />
        </Box>
    );
}
