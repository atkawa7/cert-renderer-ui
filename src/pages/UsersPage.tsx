import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import AntBtn from "../components/AntBtn";
import {
    adminMarkReferralFullPeriodCompleted,
    adminMarkReferralSubscriptionPaid,
    createAdminUser,
    currentUser,
    disableAdminUser,
    enableAdminUser,
    listAdminUsers,
    resetAdminUserPassword,
    updateAdminUser,
    type AdminUser,
} from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function UsersPage() {
    const notifications = useNotifications();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [resetSubmitting, setResetSubmitting] = useState(false);
    const [actionUserId, setActionUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState<AdminUser[]>([]);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [admin, setAdmin] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState<"FREE" | "PRO">("FREE");
    const [createOpen, setCreateOpen] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editAdmin, setEditAdmin] = useState(false);
    const [editActive, setEditActive] = useState(true);
    const [editSubscriptionTier, setEditSubscriptionTier] = useState<"FREE" | "PRO">("FREE");

    const [resetOpen, setResetOpen] = useState(false);
    const [resetUserId, setResetUserId] = useState<string | null>(null);
    const [resetUsername, setResetUsername] = useState("");
    const [resetPassword, setResetPassword] = useState("");

    async function load() {
        setLoading(true);
        try {
            const me = await currentUser();
            setIsAdmin(Boolean(me.admin));
            if (!me.admin) {
                setUsers([]);
                return;
            }
            const rows = await listAdminUsers();
            setUsers(rows);
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load users", { title: "Users" });
        } finally {
            setLoading(false);
        }
    }

    async function submit() {
        if (!username.trim() || !password.trim()) return;
        setSubmitting(true);
        try {
            await createAdminUser({
                username: username.trim(),
                password: password.trim(),
                email: email.trim() || undefined,
                admin,
                subscriptionTier,
            });
            notifications.success("User created", { title: "Users" });
            setUsername("");
            setPassword("");
            setEmail("");
            setAdmin(false);
            setSubscriptionTier("FREE");
            setCreateOpen(false);
            await load();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to create user", { title: "Users" });
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function openEditUser(user: AdminUser) {
        setEditUserId(user.userId);
        setEditUsername(user.username);
        setEditEmail(user.email || "");
        setEditAdmin(user.admin);
        setEditActive(user.active);
        setEditSubscriptionTier((user.subscriptionTier === "PRO" ? "PRO" : "FREE"));
        setEditOpen(true);
    }

    async function submitEdit() {
        if (!editUserId || !editUsername.trim()) return;
        setEditSubmitting(true);
        try {
            await updateAdminUser(editUserId, {
                username: editUsername.trim(),
                email: editEmail.trim() || undefined,
                admin: editAdmin,
                active: editActive,
                subscriptionTier: editSubscriptionTier,
            });
            notifications.success("User updated", { title: "Users" });
            setEditOpen(false);
            await load();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to update user", { title: "Users" });
        } finally {
            setEditSubmitting(false);
        }
    }

    function openResetPassword(user: AdminUser) {
        setResetUserId(user.userId);
        setResetUsername(user.username);
        setResetPassword("");
        setResetOpen(true);
    }

    async function submitResetPassword() {
        if (!resetUserId || !resetPassword.trim()) return;
        setResetSubmitting(true);
        try {
            await resetAdminUserPassword(resetUserId, resetPassword.trim());
            notifications.success("Password reset", { title: "Users" });
            setResetOpen(false);
            setResetPassword("");
        } catch (err: any) {
            notifications.error(err?.message || "Failed to reset password", { title: "Users" });
        } finally {
            setResetSubmitting(false);
        }
    }

    async function toggleActive(user: AdminUser) {
        setActionUserId(user.userId);
        try {
            if (user.active) {
                await disableAdminUser(user.userId);
                notifications.success("User disabled", { title: "Users" });
            } else {
                await enableAdminUser(user.userId);
                notifications.success("User enabled", { title: "Users" });
            }
            await load();
        } catch (err: any) {
            notifications.error(err?.message || "Failed to update user status", { title: "Users" });
        } finally {
            setActionUserId(null);
        }
    }

    async function markReferralPaid(user: AdminUser) {
        setActionUserId(user.userId);
        try {
            await adminMarkReferralSubscriptionPaid(user.userId);
            notifications.success("Referral milestone marked: subscription paid", { title: "Users" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to mark subscription-paid milestone", { title: "Users" });
        } finally {
            setActionUserId(null);
        }
    }

    async function markReferralFullPeriod(user: AdminUser) {
        setActionUserId(user.userId);
        try {
            await adminMarkReferralFullPeriodCompleted(user.userId);
            notifications.success("Referral milestone marked: full period completed", { title: "Users" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to mark full-period milestone", { title: "Users" });
        } finally {
            setActionUserId(null);
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="h5">Users</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Admin-only user management.
                    </Typography>
                </Box>

                {loading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <Typography>Loading users...</Typography>
                    </Stack>
                ) : !isAdmin ? (
                    <Alert severity="warning">Admin role is required to manage users.</Alert>
                ) : (
                    <>
                        <Stack direction="row" justifyContent="flex-end">
                            <AntBtn antType="primary" onClick={() => setCreateOpen(true)}>
                                Add User
                            </AntBtn>
                        </Stack>

                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Username</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Admin</TableCell>
                                        <TableCell>Active</TableCell>
                                        <TableCell>Tier</TableCell>
                                        <TableCell>Created</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.userId} hover>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.email || "-"}</TableCell>
                                            <TableCell>{user.admin ? "Yes" : "No"}</TableCell>
                                            <TableCell>{user.active ? "Yes" : "No"}</TableCell>
                                            <TableCell>{user.subscriptionTier}</TableCell>
                                            <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <AntBtn antType="default" onClick={() => openEditUser(user)}>
                                                        Edit
                                                    </AntBtn>
                                                    <AntBtn antType="default" onClick={() => openResetPassword(user)}>
                                                        Reset Password
                                                    </AntBtn>
                                                    <AntBtn
                                                        antType={user.active ? "default" : "primary"}
                                                        onClick={() => void toggleActive(user)}
                                                        disabled={actionUserId === user.userId}
                                                    >
                                                        {user.active ? "Disable" : "Enable"}
                                                    </AntBtn>
                                                    <AntBtn
                                                        antType="default"
                                                        onClick={() => void markReferralPaid(user)}
                                                        disabled={actionUserId === user.userId}
                                                    >
                                                        Mark Paid
                                                    </AntBtn>
                                                    <AntBtn
                                                        antType="default"
                                                        onClick={() => void markReferralFullPeriod(user)}
                                                        disabled={actionUserId === user.userId}
                                                    >
                                                        Mark Full Period
                                                    </AntBtn>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Drawer
                            anchor="right"
                            open={createOpen}
                            onClose={() => !submitting && setCreateOpen(false)}
                            PaperProps={{
                                sx: { width: { xs: "100%", sm: 420 }, p: 2 },
                            }}
                        >
                            <Stack spacing={1.2}>
                                <Typography variant="h6">Add User</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Create a new user account and assign role/tier.
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Email (optional)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Subscription Tier"
                                    value={subscriptionTier}
                                    onChange={(e) => setSubscriptionTier((e.target.value as "FREE" | "PRO") || "FREE")}
                                >
                                    <MenuItem value="FREE">FREE</MenuItem>
                                    <MenuItem value="PRO">PRO</MenuItem>
                                </TextField>
                                <FormControlLabel
                                    control={<Checkbox checked={admin} onChange={(e) => setAdmin(e.target.checked)} />}
                                    label="Admin user"
                                />
                                <Stack direction="row" spacing={1}>
                                    <AntBtn
                                        antType="default"
                                        onClick={() => setCreateOpen(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </AntBtn>
                                    <AntBtn
                                        antType="primary"
                                        onClick={() => void submit()}
                                        disabled={submitting || !username.trim() || !password.trim()}
                                    >
                                        {submitting ? "Creating..." : "Create User"}
                                    </AntBtn>
                                </Stack>
                            </Stack>
                        </Drawer>

                        <Drawer
                            anchor="right"
                            open={editOpen}
                            onClose={() => !editSubmitting && setEditOpen(false)}
                            PaperProps={{
                                sx: { width: { xs: "100%", sm: 420 }, p: 2 },
                            }}
                        >
                            <Stack spacing={1.2}>
                                <Typography variant="h6">Edit User</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Update profile, role, status and subscription tier.
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Username"
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Email (optional)"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                />
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Subscription Tier"
                                    value={editSubscriptionTier}
                                    onChange={(e) => setEditSubscriptionTier((e.target.value as "FREE" | "PRO") || "FREE")}
                                >
                                    <MenuItem value="FREE">FREE</MenuItem>
                                    <MenuItem value="PRO">PRO</MenuItem>
                                </TextField>
                                <FormControlLabel
                                    control={<Checkbox checked={editAdmin} onChange={(e) => setEditAdmin(e.target.checked)} />}
                                    label="Admin user"
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />}
                                    label="Active"
                                />
                                <Stack direction="row" spacing={1}>
                                    <AntBtn antType="default" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                                        Cancel
                                    </AntBtn>
                                    <AntBtn
                                        antType="primary"
                                        onClick={() => void submitEdit()}
                                        disabled={editSubmitting || !editUsername.trim()}
                                    >
                                        {editSubmitting ? "Saving..." : "Save Changes"}
                                    </AntBtn>
                                </Stack>
                            </Stack>
                        </Drawer>

                        <Dialog
                            open={resetOpen}
                            onClose={() => !resetSubmitting && setResetOpen(false)}
                            fullWidth
                            maxWidth="xs"
                        >
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogContent>
                                <Stack spacing={1.2} sx={{ pt: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Set a new password for <strong>{resetUsername}</strong>.
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="New Password"
                                        type="password"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                    />
                                </Stack>
                            </DialogContent>
                            <DialogActions>
                                <AntBtn antType="default" onClick={() => setResetOpen(false)} disabled={resetSubmitting}>
                                    Cancel
                                </AntBtn>
                                <AntBtn
                                    antType="primary"
                                    onClick={() => void submitResetPassword()}
                                    disabled={resetSubmitting || !resetPassword.trim()}
                                >
                                    {resetSubmitting ? "Resetting..." : "Reset Password"}
                                </AntBtn>
                            </DialogActions>
                        </Dialog>
                    </>
                )}
            </Stack>
        </Box>
    );
}
