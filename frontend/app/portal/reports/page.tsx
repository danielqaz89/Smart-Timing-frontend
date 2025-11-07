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
  TextField,
  Stack,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function ReportsContent() {
  const { fetchWithAuth } = useCompany();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}${m}`;
  });
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/company/reports/case-monthly?month=${month}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load report');
        setRows(data.totals || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [month, fetchWithAuth]);

  const totalHours = rows.reduce((sum, r) => sum + Number(r.hours || 0), 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Reports</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Monthly summary of logged hours by case
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ my: 3 }}>
        <TextField
          label="Month (YYYYMM)"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="202501"
          sx={{ maxWidth: 200 }}
        />
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Total Hours</Typography>
            <Typography variant="h4">{totalHours.toFixed(2)} h</Typography>
          </CardContent>
        </Card>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No data for this month</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Case ID</TableCell>
                <TableCell align="right">Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.case_id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight={500}>{r.case_id}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">{Number(r.hours).toFixed(2)} h</Typography>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell align="right"><strong>{totalHours.toFixed(2)} h</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function PortalReportsPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <ReportsContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
