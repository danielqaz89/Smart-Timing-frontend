'use client';

import { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
} from '@mui/material';
import { Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material';
import AdminLayout from '../../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

type Submission = {
  id: number;
  page_id: string;
  form_id: string;
  fields: Record<string, any>;
  status: 'new' | 'processed' | 'error';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
};

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<'new' | 'processed' | 'error'>('new');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [filterStatus]);

  async function fetchSubmissions() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams({ limit: '100' });
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`${API_BASE}/api/admin/cms/contact/submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: number, status: 'new' | 'processed' | 'error', errorMessage?: string) {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/api/admin/cms/contact/submissions/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, error_message: errorMessage || null }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchSubmissions();
      setEditOpen(false);
    } catch (e: any) {
      alert('Update failed: ' + e.message);
    }
  }

  function openDetails(submission: Submission) {
    setSelectedSubmission(submission);
    setDetailsOpen(true);
  }

  function openEdit(submission: Submission) {
    setSelectedSubmission(submission);
    setEditStatus(submission.status);
    setEditErrorMsg(submission.error_message || '');
    setEditOpen(true);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'processed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom>Contact Form Submissions</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              label="Filter by Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="processed">Processed</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchSubmissions}>Refresh</Button>
        </Stack>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Loading...</TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No submissions found</TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.id}</TableCell>
                    <TableCell>{sub.fields.name || '—'}</TableCell>
                    <TableCell>{sub.fields.email || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.fields.message || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={sub.status} color={getStatusColor(sub.status)} size="small" />
                    </TableCell>
                    <TableCell>{new Date(sub.created_at).toLocaleString('no-NO')}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openDetails(sub)}><ViewIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(sub)}><EditIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Submission Details #{selectedSubmission?.id}</DialogTitle>
          <DialogContent>
            {selectedSubmission && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Form ID</Typography>
                  <Typography>{selectedSubmission.form_id}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip label={selectedSubmission.status} color={getStatusColor(selectedSubmission.status)} size="small" sx={{ mt: 0.5 }} />
                </Box>
                {selectedSubmission.error_message && (
                  <Alert severity="error">{selectedSubmission.error_message}</Alert>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Fields</Typography>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
                    {JSON.stringify(selectedSubmission.fields, null, 2)}
                  </pre>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography>{selectedSubmission.ip_address || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">User Agent</Typography>
                  <Typography sx={{ fontSize: 12, wordBreak: 'break-all' }}>{selectedSubmission.user_agent || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Submitted At</Typography>
                  <Typography>{new Date(selectedSubmission.created_at).toLocaleString('no-NO')}</Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Update Submission #{selectedSubmission?.id}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                >
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="processed">Processed</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
              {editStatus === 'error' && (
                <TextField
                  label="Error Message"
                  multiline
                  rows={3}
                  value={editErrorMsg}
                  onChange={(e) => setEditErrorMsg(e.target.value)}
                  fullWidth
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => selectedSubmission && handleUpdateStatus(selectedSubmission.id, editStatus, editErrorMsg)}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}
