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
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function CasesContent() {
  const { fetchWithAuth } = useCompany();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch all users with their cases
        const res = await fetchWithAuth(`${API_BASE}/api/company/users`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load data');

        // Build case list from user assignments
        const caseMap = new Map<string, any>();
        (data.users || []).forEach((user: any) => {
          (user.cases || []).forEach((c: any) => {
            if (!caseMap.has(c.case_id)) {
              caseMap.set(c.case_id, {
                case_id: c.case_id,
                assignedUsers: [],
                notes: c.notes,
              });
            }
            caseMap.get(c.case_id).assignedUsers.push({
              email: user.user_email,
              role: user.role,
              approved: user.approved,
            });
          });
        });

        setCases(Array.from(caseMap.values()).sort((a, b) => a.case_id.localeCompare(b.case_id)));
      } catch (e: any) {
        setError(e?.message || 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWithAuth]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Cases</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        All case numbers assigned across users. Manage case assignments in the Users page.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : cases.length === 0 ? (
        <Alert severity="info">No cases yet. Assign cases to users from the Users page.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Case ID</TableCell>
                <TableCell>Assigned Users</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.case_id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight={500}>{c.case_id}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.assignedUsers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    ) : (
                      c.assignedUsers.map((u: any, i: number) => (
                        <Chip
                          key={i}
                          label={`${u.email} (${u.role})`}
                          size="small"
                          color={u.approved ? 'success' : 'warning'}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))
                    )}
                  </TableCell>
                  <TableCell>{c.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function PortalCasesPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <CasesContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
