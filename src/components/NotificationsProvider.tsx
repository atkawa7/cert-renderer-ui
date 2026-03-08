import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Box, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type NotificationSeverity = "success" | "error" | "info" | "warning";

export type NotificationOptions = {
    title?: string;
    severity?: NotificationSeverity;
    autoCloseMs?: number;
};

type NotificationItem = {
    id: number;
    message: string;
    title?: string;
    severity: NotificationSeverity;
    autoCloseMs: number;
};

type NotificationsApi = {
    notify: (message: string, options?: NotificationOptions) => number;
    success: (message: string, options?: Omit<NotificationOptions, "severity">) => number;
    error: (message: string, options?: Omit<NotificationOptions, "severity">) => number;
    info: (message: string, options?: Omit<NotificationOptions, "severity">) => number;
    warning: (message: string, options?: Omit<NotificationOptions, "severity">) => number;
    dismiss: (id: number) => void;
    clear: () => void;
};

const DEFAULT_AUTO_CLOSE_MS = 4000;

const NotificationsContext = createContext<NotificationsApi | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const nextIdRef = useRef(1);
    const timersRef = useRef<Map<number, number>>(new Map());

    const dismiss = useCallback((id: number) => {
        setItems((prev) => prev.filter((n) => n.id !== id));
        const timer = timersRef.current.get(id);
        if (timer !== undefined) {
            window.clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const scheduleDismiss = useCallback((id: number, autoCloseMs: number) => {
        if (autoCloseMs <= 0) return;
        const timer = window.setTimeout(() => {
            setItems((prev) => prev.filter((n) => n.id !== id));
            timersRef.current.delete(id);
        }, autoCloseMs);
        timersRef.current.set(id, timer);
    }, []);

    const notify = useCallback(
        (message: string, options?: NotificationOptions) => {
            const id = nextIdRef.current++;
            const item: NotificationItem = {
                id,
                message,
                title: options?.title,
                severity: options?.severity ?? "info",
                autoCloseMs: options?.autoCloseMs ?? DEFAULT_AUTO_CLOSE_MS,
            };
            setItems((prev) => [...prev, item]);
            scheduleDismiss(id, item.autoCloseMs);
            return id;
        },
        [scheduleDismiss]
    );

    const clear = useCallback(() => {
        timersRef.current.forEach((timer) => window.clearTimeout(timer));
        timersRef.current.clear();
        setItems([]);
    }, []);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((timer) => window.clearTimeout(timer));
            timersRef.current.clear();
        };
    }, []);

    const api = useMemo<NotificationsApi>(
        () => ({
            notify,
            success: (message, options) => notify(message, { ...options, severity: "success" }),
            error: (message, options) => notify(message, { ...options, severity: "error" }),
            info: (message, options) => notify(message, { ...options, severity: "info" }),
            warning: (message, options) => notify(message, { ...options, severity: "warning" }),
            dismiss,
            clear,
        }),
        [notify, dismiss, clear]
    );

    return (
        <NotificationsContext.Provider value={api}>
            {children}
            <Box
                sx={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    zIndex: 3000,
                    width: "min(420px, calc(100vw - 32px))",
                    pointerEvents: "none",
                }}
            >
                <Stack spacing={1}>
                    {items.map((item) => (
                        <Alert
                            key={item.id}
                            severity={item.severity}
                            variant="filled"
                            action={
                                <IconButton
                                    size="small"
                                    color="inherit"
                                    aria-label="close"
                                    onClick={() => dismiss(item.id)}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            }
                            sx={{ pointerEvents: "auto", alignItems: "flex-start" }}
                        >
                            {item.title && (
                                <Typography variant="subtitle2" sx={{ lineHeight: 1.2, mb: 0.25 }}>
                                    {item.title}
                                </Typography>
                            )}
                            <Typography variant="body2">{item.message}</Typography>
                        </Alert>
                    ))}
                </Stack>
            </Box>
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsApi {
    const ctx = useContext(NotificationsContext);
    if (!ctx) {
        throw new Error("useNotifications must be used within NotificationsProvider");
    }
    return ctx;
}
