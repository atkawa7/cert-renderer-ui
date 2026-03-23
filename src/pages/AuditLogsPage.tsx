import { useEffect, useState } from "react";
import { Box, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AntBtn from "../components/AntBtn";
import { listAuditEvents, type AuditEventSummary } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function AuditLogsPage() {
    const notifications = useNotifications();
    const [items, setItems] = useState<AuditEventSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [actorUserId, setActorUserId] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    async function load() {
        setLoading(true);
        try {
            const data = await listAuditEvents({
                action: action || undefined,
                entityType: entityType || undefined,
                actorUserId: actorUserId || undefined,
                page,
                size: 50,
            });
            setItems(data.items);
            setTotalPages(data.totalPages);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load audit logs", { title: "Audit Logs" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    return (
        <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">Audit Logs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        List, view, update and delete events by authenticated users.
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                    <TextField
                        select
                        label="Action"
                        size="small"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="LIST">LIST</MenuItem>
                        <MenuItem value="VIEW">VIEW</MenuItem>
                        <MenuItem value="UPDATE">UPDATE</MenuItem>
                        <MenuItem value="DELETE">DELETE</MenuItem>
                    </TextField>
                    <TextField
                        label="Entity Type"
                        size="small"
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                    />
                    <TextField
                        label="Actor User ID"
                        size="small"
                        value={actorUserId}
                        onChange={(e) => setActorUserId(e.target.value)}
                        fullWidth
                    />
                    <AntBtn
                        onClick={() => {
                            setPage(0);
                            void load();
                        }}
                        disabled={loading}
                    >
                        Search
                    </AntBtn>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>Entity</TableCell>
                                <TableCell>Entity ID</TableCell>
                                <TableCell>Actor</TableCell>
                                <TableCell>Workspace</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Path</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{item.action}</TableCell>
                                    <TableCell>{item.entityType}</TableCell>
                                    <TableCell>{item.entityId || "-"}</TableCell>
                                    <TableCell>{item.actorUserId || "-"}</TableCell>
                                    <TableCell>{item.workspaceId || "-"}</TableCell>
                                    <TableCell>{item.statusCode}</TableCell>
                                    <TableCell sx={{ maxWidth: 420, wordBreak: "break-all" }}>{item.requestPath}</TableCell>
                                </TableRow>
                            ))}
                            {!loading && items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <Typography color="text.secondary">No audit events found.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Stack direction="row" spacing={1} alignItems="center">
                    <AntBtn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || page <= 0}>
                        Prev
                    </AntBtn>
                    <Typography variant="body2">Page {page + 1} / {Math.max(totalPages, 1)}</Typography>
                    <AntBtn
                        onClick={() => setPage((p) => p + 1)}
                        disabled={loading || totalPages === 0 || page + 1 >= totalPages}
                    >
                        Next
                    </AntBtn>
                </Stack>
            </Stack>
        </Box>
    );
}
