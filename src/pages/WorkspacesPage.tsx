import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Divider, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import AntBtn from "../components/AntBtn";
import {
    addWorkspaceMember,
    createWorkspace,
    getCurrentUserId,
    getCurrentWorkspaceId,
    listWorkspaceMembers,
    listWorkspaces,
    removeWorkspaceMember,
    setCurrentUserId,
    setCurrentWorkspaceId,
    type WorkspaceMembership,
    type WorkspaceSummary,
} from "../templateApi";
import { useNotifications } from "../components/NotificationsProvider";

export default function WorkspacesPage() {
    const theme = useTheme();
    const notifications = useNotifications();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userId, setUserIdInput] = useState(getCurrentUserId());
    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
    const [workspaceId, setWorkspaceId] = useState(getCurrentWorkspaceId() ?? "");
    const [members, setMembers] = useState<WorkspaceMembership[]>([]);
    const [memberUserId, setMemberUserId] = useState("");
    const [memberRole, setMemberRole] = useState<"OWNER" | "MEMBER">("MEMBER");

    const selectedWorkspace = useMemo(() => workspaces.find((w) => w.id === workspaceId) ?? null, [workspaces, workspaceId]);

    async function refreshWorkspaces() {
        setLoading(true);
        try {
            const items = await listWorkspaces();
            setWorkspaces(items);
            if (!workspaceId && items.length > 0) {
                setWorkspaceId(items[0].id);
                setCurrentWorkspaceId(items[0].id);
            }
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load workspaces", { title: "Workspaces" });
        } finally {
            setLoading(false);
        }
    }

    async function refreshMembers(targetWorkspaceId: string) {
        if (!targetWorkspaceId) {
            setMembers([]);
            return;
        }
        setLoading(true);
        try {
            setMembers(await listWorkspaceMembers(targetWorkspaceId));
        } catch (err: any) {
            notifications.error(err?.message || "Failed to load workspace members", { title: "Workspaces" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refreshWorkspaces();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (workspaceId) {
            setCurrentWorkspaceId(workspaceId);
            void refreshMembers(workspaceId);
        } else {
            setCurrentWorkspaceId(null);
            setMembers([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    function applyUserIdentity() {
        setCurrentUserId(userId);
        notifications.success("User identity updated", { title: "Workspaces" });
        void refreshWorkspaces();
    }

    async function createNewWorkspace() {
        if (!workspaceName.trim()) return;
        setSaving(true);
        try {
            const created = await createWorkspace({ name: workspaceName.trim() });
            setWorkspaceName("");
            await refreshWorkspaces();
            setWorkspaceId(created.id);
            notifications.success("Workspace created", { title: "Workspaces" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to create workspace", { title: "Workspaces" });
        } finally {
            setSaving(false);
        }
    }

    async function addMember() {
        if (!workspaceId || !memberUserId.trim()) return;
        setSaving(true);
        try {
            await addWorkspaceMember(workspaceId, { userId: memberUserId.trim(), role: memberRole });
            setMemberUserId("");
            await refreshMembers(workspaceId);
            notifications.success("Member added", { title: "Workspaces" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to add member", { title: "Workspaces" });
        } finally {
            setSaving(false);
        }
    }

    async function removeMember(user: string) {
        if (!workspaceId) return;
        setSaving(true);
        try {
            await removeWorkspaceMember(workspaceId, user);
            await refreshMembers(workspaceId);
            notifications.success("Member removed", { title: "Workspaces" });
        } catch (err: any) {
            notifications.error(err?.message || "Failed to remove member", { title: "Workspaces" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1180, mx: "auto" }}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5">Org Workspaces</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Set your user identity, select active workspace, and manage workspace members.
                    </Typography>
                </Box>

                <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                        <TextField
                            label="User ID"
                            size="small"
                            fullWidth
                            value={userId}
                            onChange={(e) => setUserIdInput(e.target.value)}
                            helperText="Sent as X-User-Id on all API calls."
                        />
                        <AntBtn onClick={applyUserIdentity}>Apply User</AntBtn>
                    </Stack>
                </Box>

                <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.2 }}>
                        Workspace selection
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Active workspace"
                            value={workspaceId}
                            onChange={(e) => setWorkspaceId(e.target.value)}
                        >
                            {workspaces.map((workspace) => (
                                <MenuItem key={workspace.id} value={workspace.id}>
                                    {workspace.name} ({workspace.slug})
                                </MenuItem>
                            ))}
                        </TextField>
                        <AntBtn onClick={() => void refreshWorkspaces()} disabled={loading}>
                            Refresh
                        </AntBtn>
                    </Stack>
                </Box>

                <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.2 }}>
                        Create workspace
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Workspace name"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                        />
                        <AntBtn antType="primary" onClick={() => void createNewWorkspace()} disabled={saving}>
                            Create
                        </AntBtn>
                    </Stack>
                </Box>

                <Divider />

                {!workspaceId ? (
                    <Alert severity="info">Select or create a workspace first.</Alert>
                ) : (
                    <Stack spacing={1.5}>
                        <Typography variant="h6">
                            Members: {selectedWorkspace?.name || workspaceId}
                        </Typography>

                        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Member user ID"
                                    value={memberUserId}
                                    onChange={(e) => setMemberUserId(e.target.value)}
                                />
                                <TextField
                                    select
                                    size="small"
                                    label="Role"
                                    value={memberRole}
                                    onChange={(e) => setMemberRole((e.target.value as "OWNER" | "MEMBER") || "MEMBER")}
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="MEMBER">MEMBER</MenuItem>
                                    <MenuItem value="OWNER">OWNER</MenuItem>
                                </TextField>
                                <AntBtn antType="primary" onClick={() => void addMember()} disabled={saving}>
                                    Add member
                                </AntBtn>
                            </Stack>
                        </Box>

                        {loading ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={18} />
                                <Typography>Loading members...</Typography>
                            </Stack>
                        ) : members.length === 0 ? (
                            <Typography color="text.secondary">No members found.</Typography>
                        ) : (
                            <Stack spacing={1}>
                                {members.map((member) => (
                                    <Box key={member.id} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: "background.paper" }}>
                                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                                            <Box>
                                                <Typography variant="subtitle2">{member.userId}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Role: {member.role}
                                                </Typography>
                                            </Box>
                                            <AntBtn danger onClick={() => void removeMember(member.userId)} disabled={saving}>
                                                Remove
                                            </AntBtn>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}

