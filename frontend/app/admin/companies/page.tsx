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
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

interface Company {
  id?: number;
  name: string;
  logo_base64?: string | null;
  display_order?: number;
}

function CompaniesContent() {
  const { fetchWithAuth } = useAdmin();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCompany, setNewCompany] = useState<Company>({ name: '', display_order: 0 });
  const [saving, setSaving] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState<{ user_email: string; google_email?: string; role: 'member'|'admin'; approved: boolean }>({ user_email: '', google_email: '', role: 'member', approved: false });

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

  async function loadCompanyUsers(companyId: number) {
    try {
      setUsersLoading(true);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${companyId}/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setCompanyUsers(data.users || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }

  async function addCompanyUser() {
    if (!selectedCompanyId || !userForm.user_email) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${selectedCompanyId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      setUserForm({ user_email: '', google_email: '', role: 'member', approved: false });
      await loadCompanyUsers(selectedCompanyId);
    } catch (e: any) {
      setError(e?.message || 'Failed to add user');
    }
  }

  async function updateCompanyUser(userId: number, patch: any) {
    if (!selectedCompanyId) return;
    const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${selectedCompanyId}/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    await loadCompanyUsers(selectedCompanyId);
  }

  async function deleteCompanyUser(userId: number) {
    if (!selectedCompanyId) return;
    if (!confirm('Delete this user from company?')) return;
    const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${selectedCompanyId}/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    await loadCompanyUsers(selectedCompanyId);
  }

  async function addCase(userId: number, caseId: string, notes?: string) {
    if (!selectedCompanyId || !caseId) return;
    const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${selectedCompanyId}/users/${userId}/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case_id: caseId, notes }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add case');
    await loadCompanyUsers(selectedCompanyId);
  }

  async function deleteCase(userId: number, caseRowId: number) {
    if (!selectedCompanyId) return;
    const res = await fetchWithAuth(`${API_BASE}/api/admin/companies/${selectedCompanyId}/users/${userId}/cases/${caseRowId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete case');
    await loadCompanyUsers(selectedCompanyId);
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
                  <TableRow key={c.id || c.name} hover selected={selectedCompanyId === c.id}
                    onClick={() => { if (c.id) { setSelectedCompanyId(c.id); loadCompanyUsers(c.id); } }}
                    style={{ cursor: 'pointer' }}
                  >
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

      {/* Company Users Management */}
      {selectedCompanyId && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Users for company #{selectedCompanyId}</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField label="User Email" value={userForm.user_email} onChange={(e) => setUserForm({ ...userForm, user_email: e.target.value })} />
            <TextField label="Google Email (optional)" value={userForm.google_email} onChange={(e) => setUserForm({ ...userForm, google_email: e.target.value })} />
            <TextField select SelectProps={{ native: true }} label="Role" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}>
              <option value="member">member</option>
              <option value="case_manager">case_manager</option>
              <option value="admin">admin</option>
            </TextField>
            <TextField select SelectProps={{ native: true }} label="Approved" value={String(userForm.approved)} onChange={(e) => setUserForm({ ...userForm, approved: e.target.value === 'true' })}>
              <option value="false">false</option>
              <option value="true">true</option>
            </TextField>
            <Button variant="contained" onClick={addCompanyUser}>Add User</Button>
          </Stack>

          {usersLoading ? (
            <CircularProgress />
          ) : companyUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No users yet.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Google Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Approved</TableCell>
                    <TableCell>Cases</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companyUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.user_email}</TableCell>
                      <TableCell>
                        <TextField size="small" defaultValue={u.google_email || ''} onBlur={(e) => updateCompanyUser(u.id, { google_email: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" select SelectProps={{ native: true }} defaultValue={u.role} onChange={(e) => updateCompanyUser(u.id, { role: e.target.value })}>
                          <option value="member">member</option>
                          <option value="case_manager">case_manager</option>
                          <option value="admin">admin</option>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField size="small" select SelectProps={{ native: true }} defaultValue={String(u.approved)} onChange={(e) => updateCompanyUser(u.id, { approved: e.target.value === 'true' })}>
                          <option value="false">false</option>
                          <option value="true">true</option>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={1}>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                            <TextField size="small" placeholder="New case ID" onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) { await addCase(u.id, val); (e.target as HTMLInputElement).value=''; }
                              }
                            }} />
                            <Button size="small" variant="outlined" onClick={async () => {
                              const input = (document.activeElement as HTMLInputElement);
                              const val = input?.value?.trim();
                              if (val) { await addCase(u.id, val); input.value=''; }
                            }}>Add</Button>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            {(u.cases || []).map((c: any) => (
                              <Button key={c.id} size="small" variant="outlined" onClick={() => deleteCase(u.id, c.id)}>
                                {c.case_id} ✕
                              </Button>
                            ))}
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Button color="error" size="small" onClick={() => deleteCompanyUser(u.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
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
