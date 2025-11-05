"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, Pagination } from '@mui/material';
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function AuditContent() {
  const { fetchWithAuth } = useAdmin();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const url = new URL(`${API_BASE}/api/admin/audit-log`);
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('offset', String((page - 1) * limit));
        const res = await fetchWithAuth(url.toString());
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load audit log');
        setLogs(json.logs || []);
        setError('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load audit log');
      } finally { setLoading(false); }
    })();
  }, [fetchWithAuth, page]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Audit Log</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((l, idx) => (
              <TableRow key={idx}>
                <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{l.admin_username} ({l.admin_email})</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>{l.target_type} {l.target_id}</TableCell>
                <TableCell>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2)}</pre>
                </TableCell>
                <TableCell>{l.ip_address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Pagination count={10} page={page} onChange={(e, p) => setPage(p)} />
      </Box>
    </Box>
  );
}

export default function AdminAuditPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <AuditContent />
      </AdminLayout>
    </AdminProvider>
  );
}
