import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AntBtn from "./AntBtn";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

type ConfirmOptions = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

type PendingConfirm = {
    resolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const [pending, setPending] = useState<PendingConfirm | null>(null);
    const [open, setOpen] = useState(false);
    const [dialogOptions, setDialogOptions] = useState<ConfirmOptions | null>(null);
    const resolverRef = useRef<(value: boolean) => void>(() => {});

    const confirm = useCallback<ConfirmFn>((options) => {
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setPending({ resolve });
            setDialogOptions(options);
            setOpen(true);
        });
    }, []);

    const close = useCallback((result: boolean) => {
        if (!open) return;
        const resolve = pending?.resolve ?? resolverRef.current;
        setOpen(false);
        resolve(result);
        resolverRef.current = () => {};
        setPending(null);
    }, [open, pending]);

    const contextValue = useMemo(() => confirm, [confirm]);

    const title = dialogOptions?.title ?? "Please Confirm";
    const message = dialogOptions?.message ?? "Are you sure?";
    const confirmText = dialogOptions?.confirmText ?? "Confirm";
    const cancelText = dialogOptions?.cancelText ?? "Cancel";
    const destructive = dialogOptions?.destructive ?? false;

    return (
        <ConfirmDialogContext.Provider value={contextValue}>
            {children}
            <Dialog
                open={open}
                onClose={() => close(false)}
                TransitionProps={{
                    onExited: () => setDialogOptions(null),
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: `0 24px 80px ${alpha(theme.palette.primary.dark, 0.35)}`,
                    },
                }}
            >
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        backgroundColor: destructive ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.primary.main, 0.08),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                display: "grid",
                                placeItems: "center",
                                bgcolor: destructive ? alpha(theme.palette.error.main, 0.14) : alpha(theme.palette.primary.main, 0.14),
                                color: destructive ? theme.palette.error.dark : theme.palette.primary.dark,
                            }}
                        >
                            <WarningAmberRoundedIcon fontSize="small" />
                        </Box>
                        <DialogTitle sx={{ p: 0, m: 0, fontSize: "1.02rem", fontWeight: 700 }}>
                            {title}
                        </DialogTitle>
                    </Stack>
                </Box>
                <DialogContent sx={{ pt: 2.2, pb: 1.2 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.55 }}>
                        {message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.2, pt: 0.5 }}>
                    <AntBtn antType="text" onClick={() => close(false)}>
                        {cancelText}
                    </AntBtn>
                    <AntBtn antType="primary" danger={destructive} onClick={() => close(true)}>
                        {confirmText}
                    </AntBtn>
                </DialogActions>
            </Dialog>
        </ConfirmDialogContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmDialogContext);
    if (!ctx) {
        throw new Error("useConfirm must be used inside ConfirmDialogProvider");
    }
    return ctx;
}
