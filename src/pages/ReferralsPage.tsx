import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AntBtn from "../components/AntBtn";
import {
    currentUser,
    listAdminReferralStats,
    listAdminReferralUsers,
    listAdminUsers,
    type AdminReferralStats,
    type AdminReferralUser,
    type AdminUser,
    type ReferralMilestone
} from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

function fallbackReferralLink(code?: string | null): string {
    const safe = String(code ?? "").trim();
    if (!safe) return "";
    return `${window.location.origin}/register?ref=${encodeURIComponent(safe)}`;
}

export default function ReferralsPage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminReferralStats[]>([]);
    const [query, setQuery] = useState("");
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsTitle, setDetailsTitle] = useState("");
    const [detailRows, setDetailRows] = useState<AdminReferralUser[]>([]);
    const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
    const [detailsMilestone, setDetailsMilestone] = useState<ReferralMilestone>("SIGNUP");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    async function load() {
        setLoading(true);
        try {
            const me = await currentUser();
            setIsAdmin(Boolean(me.admin));
            if (!me.admin) {
                setUsers([]);
                return;
            }
            const [rows, statsRows] = await Promise.all([listAdminUsers(), listAdminReferralStats()]);
            setUsers(rows);
            setStats(statsRows);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load referrals", { title: "Referrals" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter((item) => (
            item.username.toLowerCase().includes(q)
            || String(item.email ?? "").toLowerCase().includes(q)
            || String(item.referralCode ?? "").toLowerCase().includes(q)
        ));
    }, [query, users]);

    const statsByUser = useMemo(() => {
        const map = new Map<string, AdminReferralStats>();
        stats.forEach((item) => map.set(item.referrerUserId, item));
        return map;
    }, [stats]);

    const totals = useMemo(() => {
        return stats.reduce(
            (acc, item) => ({
                signupUsers: acc.signupUsers + item.signupUsers,
                subscriptionPaidUsers: acc.subscriptionPaidUsers + item.subscriptionPaidUsers,
                fullPeriodCompletedUsers: acc.fullPeriodCompletedUsers + item.fullPeriodCompletedUsers,
            }),
            { signupUsers: 0, subscriptionPaidUsers: 0, fullPeriodCompletedUsers: 0 }
        );
    }, [stats]);

    async function copy(value: string, what: string) {
        if (!value.trim()) return;
        try {
            await navigator.clipboard.writeText(value);
            notifications.success(`${what} copied`, { title: "Referrals" });
        } catch {
            notifications.error(`Could not copy ${what.toLowerCase()}`, { title: "Referrals" });
        }
    }

    function milestoneLabel(value: ReferralMilestone): string {
        if (value === "FULL_PERIOD_COMPLETED") return "Completed";
        if (value === "SUBSCRIPTION_PAID") return "Paid";
        return "Signup";
    }

    function formatDate(value?: string | null): string {
        if (!value) return "-";
        const time = new Date(value).getTime();
        if (Number.isNaN(time)) return "-";
        return new Date(time).toLocaleString();
    }

    async function loadDetails(
        user: AdminUser,
        milestone: ReferralMilestone,
        title: string,
        nextFromDate: string,
        nextToDate: string
    ) {
        setDetailsLoading(true);
        setDetailsTitle(`${user.username} - ${title}`);
        try {
            const rows = await listAdminReferralUsers(user.userId, milestone, nextFromDate, nextToDate);
            setDetailRows(rows);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load referred users", { title: "Referrals" });
            setDetailsOpen(false);
        } finally {
            setDetailsLoading(false);
        }
    }

    async function openDetails(user: AdminUser, milestone: ReferralMilestone, title: string) {
        setDetailsOpen(true);
        setDetailsUser(user);
        setDetailsMilestone(milestone);
        setFromDate("");
        setToDate("");
        setDetailRows([]);
        await loadDetails(user, milestone, title, "", "");
    }

    async function applyDateFilter() {
        if (!detailsUser) return;
        const title = detailsMilestone === "FULL_PERIOD_COMPLETED"
            ? "Completed"
            : detailsMilestone === "SUBSCRIPTION_PAID"
                ? "Paid"
                : "Signups";
        await loadDetails(detailsUser, detailsMilestone, title, fromDate, toDate);
    }

    async function clearDateFilter() {
        if (!detailsUser) return;
        setFromDate("");
        setToDate("");
        const title = detailsMilestone === "FULL_PERIOD_COMPLETED"
            ? "Completed"
            : detailsMilestone === "SUBSCRIPTION_PAID"
                ? "Paid"
                : "Signups";
        await loadDetails(detailsUser, detailsMilestone, title, "", "");
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1240, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">Referrals</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Admin view of users and referral links.
                    </Typography>
                </Box>

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading referrals...</Typography>
                    </Stack>
                ) : !isAdmin ? (
                    <Alert severity="warning">Admin role is required to view referrals.</Alert>
                ) : (
                    <>
                        <TextField
                            fullWidth
                            size="small"
                            label="Search by username, email, or referral code"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                            <TextField size="small" label="Total Signup Users" value={String(totals.signupUsers)} InputProps={{ readOnly: true }} />
                            <TextField size="small" label="Subscription Paid Users" value={String(totals.subscriptionPaidUsers)} InputProps={{ readOnly: true }} />
                            <TextField size="small" label="Full Period Completed Users" value={String(totals.fullPeriodCompletedUsers)} InputProps={{ readOnly: true }} />
                        </Stack>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Username</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Referral Code</TableCell>
                                        <TableCell>Referral Link</TableCell>
                                        <TableCell align="right">Signups</TableCell>
                                        <TableCell align="right">Paid</TableCell>
                                        <TableCell align="right">Completed</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map((item) => {
                                        const code = String(item.referralCode ?? "").trim();
                                        const link = String(item.referralLink ?? "").trim() || fallbackReferralLink(code);
                                        const stat = statsByUser.get(item.userId);
                                        return (
                                            <TableRow key={item.userId} hover>
                                                <TableCell>{item.username}</TableCell>
                                                <TableCell>{item.email || "-"}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Typography variant="body2">{code || "-"}</Typography>
                                                        {code ? (
                                                            <Tooltip title="Copy code">
                                                                <IconButton size="small" onClick={() => void copy(code, "Referral code")}>
                                                                    <ContentCopyIcon fontSize="inherit" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : null}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{link || "-"}</Typography>
                                                        {link ? (
                                                            <Tooltip title="Copy link">
                                                                <IconButton size="small" onClick={() => void copy(link, "Referral link")}>
                                                                    <ContentCopyIcon fontSize="inherit" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : null}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(stat?.signupUsers ?? 0) > 0 ? (
                                                        <AntBtn
                                                            antType="text"
                                                            size="small"
                                                            onClick={() => void openDetails(item, "SIGNUP", "Signups")}
                                                        >
                                                            {stat?.signupUsers ?? 0}
                                                        </AntBtn>
                                                    ) : "0"}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(stat?.subscriptionPaidUsers ?? 0) > 0 ? (
                                                        <AntBtn
                                                            antType="text"
                                                            size="small"
                                                            onClick={() => void openDetails(item, "SUBSCRIPTION_PAID", "Paid")}
                                                        >
                                                            {stat?.subscriptionPaidUsers ?? 0}
                                                        </AntBtn>
                                                    ) : "0"}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(stat?.fullPeriodCompletedUsers ?? 0) > 0 ? (
                                                        <AntBtn
                                                            antType="text"
                                                            size="small"
                                                            onClick={() => void openDetails(item, "FULL_PERIOD_COMPLETED", "Completed")}
                                                        >
                                                            {stat?.fullPeriodCompletedUsers ?? 0}
                                                        </AntBtn>
                                                    ) : "0"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                            <DialogTitle>{detailsTitle || "Referred Users"}</DialogTitle>
                            <DialogContent dividers>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    sx={{ mb: 2 }}
                                    alignItems={{ sm: "center" }}
                                >
                                    <TextField
                                        size="small"
                                        type="date"
                                        label="From"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        size="small"
                                        type="date"
                                        label="To"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <AntBtn antType="primary" size="small" onClick={() => void applyDateFilter()}>
                                        Apply
                                    </AntBtn>
                                    <AntBtn antType="text" size="small" onClick={() => void clearDateFilter()}>
                                        Clear
                                    </AntBtn>
                                </Stack>
                                {detailsLoading ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <CircularProgress size={18} />
                                        <Typography>Loading referred users...</Typography>
                                    </Stack>
                                ) : detailRows.length === 0 ? (
                                    <Typography color="text.secondary">No referred users found for this filter.</Typography>
                                ) : (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Username</TableCell>
                                                    <TableCell>Email</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Signed Up</TableCell>
                                                    <TableCell>Paid</TableCell>
                                                    <TableCell>Completed</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {detailRows.map((row) => (
                                                    <TableRow key={row.referralId} hover>
                                                        <TableCell>{row.referredUsername}</TableCell>
                                                        <TableCell>{row.referredEmail || "-"}</TableCell>
                                                        <TableCell>{milestoneLabel(row.status)}</TableCell>
                                                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                                                        <TableCell>{formatDate(row.subscriptionPaidAt)}</TableCell>
                                                        <TableCell>{formatDate(row.fullPeriodCompletedAt)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </Stack>
        </Box>
    );
}
