import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    CircularProgress,
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
import { getMyReferralDashboard, type ReferralDashboard } from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

function formatMoney(cents: number, currency: string): string {
    return `${(cents / 100).toFixed(2)} ${currency}`;
}

function formatDate(value?: string | null): string {
    if (!value) return "-";
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return "-";
    return new Date(time).toLocaleString();
}

export default function MyReferralsPage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);

    async function load() {
        setLoading(true);
        setErrorMsg(null);
        try {
            const data = await getMyReferralDashboard();
            setDashboard(data);
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to load referral portal");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const referralCount = dashboard?.referrals?.length ?? 0;
    const payoutCount = dashboard?.payouts?.length ?? 0;

    const payoutTotals = useMemo(() => {
        const rows = dashboard?.payouts ?? [];
        let earned = 0;
        let paid = 0;
        for (const row of rows) {
            earned += row.amountCents || 0;
            if (row.status === "PAID") {
                paid += row.amountCents || 0;
            }
        }
        return { earned, paid };
    }, [dashboard]);

    async function copy(value: string, label: string) {
        if (!value.trim()) return;
        try {
            await navigator.clipboard.writeText(value);
            notifications.success(`${label} copied`, { title: "My Referrals" });
        } catch {
            notifications.error(`Could not copy ${label.toLowerCase()}`, { title: "My Referrals" });
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1240, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">My Referrals</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track your referral link, signups, milestones, and payouts.
                    </Typography>
                </Box>

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading referral portal...</Typography>
                    </Stack>
                ) : errorMsg ? (
                    <Alert severity="error">{errorMsg}</Alert>
                ) : (
                    <>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Referral Code"
                                value={dashboard?.referralCode || ""}
                                InputProps={{ readOnly: true }}
                            />
                            <Tooltip title="Copy code">
                                <span>
                                    <IconButton
                                        onClick={() => void copy(dashboard?.referralCode || "", "Referral code")}
                                        disabled={!dashboard?.referralCode}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Referral Link"
                                value={dashboard?.referralLink || ""}
                                InputProps={{ readOnly: true }}
                            />
                            <Tooltip title="Copy link">
                                <span>
                                    <IconButton
                                        onClick={() => void copy(dashboard?.referralLink || "", "Referral link")}
                                        disabled={!dashboard?.referralLink}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                            <TextField size="small" label="Total Referrals" value={String(referralCount)} InputProps={{ readOnly: true }} />
                            <TextField size="small" label="Total Payouts" value={String(payoutCount)} InputProps={{ readOnly: true }} />
                            <TextField
                                size="small"
                                label="Earned"
                                value={formatMoney(dashboard?.totalEarnedCents ?? payoutTotals.earned, dashboard?.currency ?? "USD")}
                                InputProps={{ readOnly: true }}
                            />
                            <TextField
                                size="small"
                                label="Paid"
                                value={formatMoney(dashboard?.totalPaidCents ?? payoutTotals.paid, dashboard?.currency ?? "USD")}
                                InputProps={{ readOnly: true }}
                            />
                            <AntBtn onClick={() => void load()} disabled={loading}>Refresh</AntBtn>
                        </Stack>

                        <Typography variant="subtitle1">Referred Users</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Username</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Signed Up</TableCell>
                                        <TableCell>Paid</TableCell>
                                        <TableCell>Completed</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(dashboard?.referrals ?? []).map((row) => (
                                        <TableRow key={row.referralId} hover>
                                            <TableCell>{row.referredUsername}</TableCell>
                                            <TableCell>{row.status}</TableCell>
                                            <TableCell>{formatDate(row.createdAt)}</TableCell>
                                            <TableCell>{formatDate(row.subscriptionPaidAt)}</TableCell>
                                            <TableCell>{formatDate(row.fullPeriodCompletedAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(dashboard?.referrals?.length ?? 0) === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography color="text.secondary">No referrals yet.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="subtitle1">Payouts</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Milestone</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Earned</TableCell>
                                        <TableCell>Paid</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(dashboard?.payouts ?? []).map((row) => (
                                        <TableRow key={row.payoutId} hover>
                                            <TableCell>{row.milestone}</TableCell>
                                            <TableCell align="right">{formatMoney(row.amountCents, row.currency)}</TableCell>
                                            <TableCell>{row.status}</TableCell>
                                            <TableCell>{formatDate(row.earnedAt)}</TableCell>
                                            <TableCell>{formatDate(row.paidAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {(dashboard?.payouts?.length ?? 0) === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography color="text.secondary">No payout entries yet.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Stack>
        </Box>
    );
}
