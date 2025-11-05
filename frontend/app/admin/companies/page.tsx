"use client";

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  CircularProgress,
  Alert,
} from '@mui/material';
import { AdminProvider } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

interface Company {
  id?: number;
  name: string;
  logo_base64?: string | null;
  display_order?: number;
}

function CompaniesContent() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCompany, setNewCompany] = useState<Company>({ name: '', display_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/companies`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load companies');
      setCompanies(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleCreateOrUpdate(company: Company) {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save company');
      setNewCompany({ name: '', display_order: 0 });
      await loadCompanies();
    } catch (e: any) {
      setError(e?.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Companies
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add / Update Company
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Name"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
          />
          <TextField
            type="number"
            label="Display Order"
            value={newCompany.display_order ?? 0}
            onChange={(e) => setNewCompany({ ...newCompany, display_order: Number(e.target.value) || 0 })}
          />
          <Button
            variant="outlined"
            component="label"
          >
            Upload Logo
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const base64 = await fileToBase64(file);
                setNewCompany({ ...newCompany, logo_base64: base64 });
              }}
            />
          </Button>
          <Button
            variant="contained"
            onClick={() => handleCreateOrUpdate(newCompany)}
            disabled={saving || !newCompany.name}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </Stack>
        {newCompany.logo_base64 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">Logo preview:</Typography>
            <Box component="img" src={newCompany.logo_base64} alt="Logo preview" sx={{ maxHeight: 60, display: 'block', mt: 1 }} />
          </Box>
        )}
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Logo</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Display Order</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No companies
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id || c.name} hover>
                    <TableCell>
                      {c.logo_base64 ? (
                        <Box component="img" src={c.logo_base64} alt={c.name} sx={{ maxHeight: 40 }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">No logo</Typography>
                      )}
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.display_order ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default function AdminCompaniesPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <CompaniesContent />
      </AdminLayout>
    </AdminProvider>
  );
}
