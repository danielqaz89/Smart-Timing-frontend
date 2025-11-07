"use client";

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
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
} from '@mui/material';
import { useAdmin } from '../../../contexts/AdminContext';

interface CompanyRequest {
  id: number;
  name: string;
  orgnr: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  requester_email: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  processed_by: number | null;
  processed_at: string | null;
  created_at: string;
}

export default function CompanyRequestsPage() {
  const { fetchWithAuth } = useAdmin();
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CompanyRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchRequests() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithAuth('/api/admin/company-requests');
      setRequests(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function handleApprove(request: CompanyRequest) {
    if (!confirm(`Approve request from ${request.name}?\n\nThis will create a new company account.`)) return;
    
    setActionLoading(true);
    setError('');
    try {
      await fetchWithAuth(`/api/admin/company-requests/${request.id}/approve`, {
        method: 'POST',
      });
      await fetchRequests();
    } catch (e: any) {
      setError(e?.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectConfirm() {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    setError('');
    try {
      await fetchWithAuth(`/api/admin/company-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes || undefined }),
      });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectNotes('');
      await fetchRequests();
    } catch (e: any) {
      setError(e?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectDialog(request: CompanyRequest) {
    setSelectedRequest(request);
    setRejectNotes('');
    setRejectDialogOpen(true);
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
      <Typography variant="h4" gutterBottom>Company Access Requests</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Alert severity="info">No company requests found</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company Name</TableCell>
                <TableCell>Org.nr</TableCell>
                <TableCell>Requester Email</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight={500}>{req.name}</Typography>
                  </TableCell>
                  <TableCell>{req.orgnr || '—'}</TableCell>
                  <TableCell>{req.requester_email}</TableCell>
                  <TableCell>
                    {req.contact_email || req.contact_phone ? (
                      <Stack spacing={0.5}>
                        {req.contact_email && <Typography variant="body2">{req.contact_email}</Typography>}
                        {req.contact_phone && <Typography variant="body2">{req.contact_phone}</Typography>}
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {req.address_line || req.city ? (
                      <Stack spacing={0.5}>
                        {req.address_line && <Typography variant="body2">{req.address_line}</Typography>}
                        {(req.postal_code || req.city) && (
                          <Typography variant="body2">
                            {req.postal_code} {req.city}
                          </Typography>
                        )}
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={req.status}
                      color={getStatusColor(req.status)}
                      size="small"
                    />
                    {req.notes && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {req.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(req.created_at).toLocaleDateString()}
                    </Typography>
                    {req.processed_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Processed: {new Date(req.processed_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleApprove(req)}
                          disabled={actionLoading}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => openRejectDialog(req)}
                          disabled={actionLoading}
                        >
                          Reject
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Rejecting request from {selectedRequest?.name}
          </Typography>
          <TextField
            label="Reason (optional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 2 }}
            placeholder="Provide a reason for rejection (will be visible to the requester)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
