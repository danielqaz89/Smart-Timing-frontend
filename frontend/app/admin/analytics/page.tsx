"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function AnalyticsContent() {
  const { fetchWithAuth } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/analytics`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics');
      } finally { setLoading(false); }
    })();
  }, [fetchWithAuth]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Analytics</Typography>
      <Paper sx={{ p: 2 }}>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>
      </Paper>
    </Box>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <AnalyticsContent />
      </AdminLayout>
    </AdminProvider>
  );
}
