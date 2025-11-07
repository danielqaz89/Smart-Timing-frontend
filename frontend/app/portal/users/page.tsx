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
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function UsersContent() {
  const { fetchWithAuth } = useCompany();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newCase, setNewCase] = useState<Record<number, string>>({});

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleApprove(userId: number, approved: boolean) {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddCase(userId: number) {
    const caseId = newCase[userId]?.trim();
    if (!caseId) return;

    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/users/${userId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId }),
      });
      if (!res.ok) throw new Error('Failed to add case');
      
      setNewCase({ ...newCase, [userId]: '' });
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Failed to add case');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveCase(userId: number, caseDbId: number) {
    if (!confirm('Remove this case assignment?')) return;

    setActionLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/users/${userId}/cases/${caseDbId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove case');
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Failed to remove case');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Users</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Alert severity="info">No users yet. Invite users from the Invites page.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Google Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned Cases</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.user_email}</TableCell>
                  <TableCell>{user.google_email || '—'}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {user.approved ? (
                      <Chip label="Approved" color="success" size="small" />
                    ) : (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {(user.cases || []).map((c: any) => (
                          <Chip
                            key={c.id}
                            label={c.case_id}
                            size="small"
                            onDelete={() => handleRemoveCase(user.id, c.id)}
                            disabled={actionLoading}
                          />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          placeholder="Add case ID"
                          value={newCase[user.id] || ''}
                          onChange={(e) => setNewCase({ ...newCase, [user.id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCase(user.id)}
                          sx={{ minWidth: 150 }}
                        />
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleAddCase(user.id)}
                          disabled={actionLoading || !newCase[user.id]?.trim()}
                        >
                          <AddIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {!user.approved ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleApprove(user.id, true)}
                        disabled={actionLoading}
                      >
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleApprove(user.id, false)}
                        disabled={actionLoading}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function PortalUsersPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <UsersContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
