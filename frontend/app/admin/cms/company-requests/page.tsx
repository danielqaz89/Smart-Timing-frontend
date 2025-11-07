"use client";

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { AdminProvider, useAdmin } from '../../../../contexts/AdminContext';
import AdminLayout from '../../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

interface CompanyRequest {
  id: number;
  name: string;
  orgnr?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line?: string;
  postal_code?: string;
  city?: string;
  requester_email?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  processed_by_username?: string;
  processed_at?: string;
  created_at: string;
}

function CompanyRequestsContent() {
  const { fetchWithAuth } = useAdmin();
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CompanyRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [actionStatus, setActionStatus] = useState<'approved' | 'rejected'>('approved');

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  async function loadRequests() {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/company-requests?status=${filterStatus}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load company requests');
      setRequests(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load company requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess(request: CompanyRequest, status: 'approved' | 'rejected') {
    setSelectedRequest(request);
    setActionStatus(status);
    setNotes('');
    setDialogOpen(true);
  }

  async function submitProcessing() {
    if (!selectedRequest) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/company-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: actionStatus, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');

      setDialogOpen(false);
      await loadRequests();
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to process request');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Company Registration Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter Status</InputLabel>
          <Select
            value={filterStatus}
            label="Filter Status"
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Company Name</TableCell>
                <TableCell>Org Nr</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No company requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {req.name}
                      </Typography>
                      {req.address_line && (
                        <Typography variant="caption" color="text.secondary">
                          {req.address_line}, {req.postal_code} {req.city}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{req.orgnr || 'N/A'}</TableCell>
                    <TableCell>
                      {req.contact_email && (
                        <Typography variant="body2">{req.contact_email}</Typography>
                      )}
                      {req.contact_phone && (
                        <Typography variant="caption" color="text.secondary">
                          {req.contact_phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{req.requester_email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        color={getStatusColor(req.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(req.created_at).toLocaleDateString('no-NO')}
                    </TableCell>
                    <TableCell align="right">
                      {req.status === 'pending' && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={() => handleProcess(req, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CloseIcon />}
                            onClick={() => handleProcess(req, 'rejected')}
                          >
                            Reject
                          </Button>
                        </Stack>
                      )}
                      {req.status !== 'pending' && req.notes && (
                        <Typography variant="caption" color="text.secondary">
                          Note: {req.notes}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Processing Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionStatus === 'approved' ? 'Approve' : 'Reject'} Company Request
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <>
              <Typography variant="body2" gutterBottom>
                Company: <strong>{selectedRequest.name}</strong>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mt: 2 }}
                placeholder="Add any notes about this decision..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={submitProcessing}
            variant="contained"
            color={actionStatus === 'approved' ? 'success' : 'error'}
          >
            Confirm {actionStatus === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function CompanyRequestsPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <CompanyRequestsContent />
      </AdminLayout>
    </AdminProvider>
  );
}
