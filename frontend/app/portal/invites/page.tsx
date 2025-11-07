"use client";

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Stack,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function InvitesContent() {
  const { fetchWithAuth } = useCompany();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ invited_email: '', role: 'member' });
  const [actionLoading, setActionLoading] = useState(false);

  async function loadInvites() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/invites`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invites');
      setInvites(data.invites || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function handleCreate() {
    if (!form.invited_email) {
      setError('Email is required');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');

      setDialogOpen(false);
      setForm({ invited_email: '', role: 'member' });
      await loadInvites();
    } catch (e: any) {
      setError(e?.message || 'Failed to create invite');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResend(id: number) {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/invites/${id}/resend`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to resend invite');
      await loadInvites();
    } catch (e: any) {
      setError(e?.message || 'Failed to resend invite');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this invite?')) return;

    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/invites/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete invite');
      await loadInvites();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete invite');
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusChip(invite: any) {
    const expired = invite.expires_at && new Date(invite.expires_at) < new Date();
    if (invite.used_at) return <Chip label="Used" color="success" size="small" />;
    if (expired) return <Chip label="Expired" color="error" size="small" />;
    return <Chip label="Pending" color="warning" size="small" />;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Invites</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Create Invite
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : invites.length === 0 ? (
        <Alert severity="info">No invites yet. Create one to invite users to your company.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.map((invite) => {
                const expired = invite.expires_at && new Date(invite.expires_at) < new Date();
                return (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.invited_email}</TableCell>
                    <TableCell>{invite.role}</TableCell>
                    <TableCell>{getStatusChip(invite)}</TableCell>
                    <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      {!invite.used_at && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {!expired && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleResend(invite.id)}
                              disabled={actionLoading}
                            >
                              Resend
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(invite.id)}
                            disabled={actionLoading}
                          >
                            Delete
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => !actionLoading && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Invite</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={form.invited_email}
              onChange={(e) => setForm({ ...form, invited_email: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                label="Role"
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="case_manager">Case Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={actionLoading}>
            {actionLoading ? 'Creating...' : 'Create Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function PortalInvitesPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <InvitesContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
