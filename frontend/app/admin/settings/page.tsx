"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button } from '@mui/material';
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function SettingsContent() {
  const { fetchWithAuth } = useAdmin();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load settings');
        setSettings(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load settings');
      } finally { setLoading(false); }
    })();
  }, [fetchWithAuth]);

  async function saveSetting(key: string, value: string, description: string) {
    try {
      setSavingKey(key);
      const res = await fetchWithAuth(`${API_BASE}/api/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value ? JSON.parse(value) : null, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save setting');
    } catch (e) {
      setError((e as any).message || 'Failed to save setting');
    } finally { setSavingKey(null); }
  }

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>System Settings</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Value (JSON)</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.map((s: any) => (
              <TableRow key={s.setting_key}>
                <TableCell>{s.setting_key}</TableCell>
                <TableCell sx={{ minWidth: 300 }}>
                  <TextField
                    fullWidth
                    multiline
                    defaultValue={s.setting_value}
                    onChange={(e) => (s._new_value = e.target.value)}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 240 }}>
                  <TextField
                    fullWidth
                    defaultValue={s.description || ''}
                    onChange={(e) => (s._new_description = e.target.value)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => saveSetting(s.setting_key, s._new_value ?? s.setting_value, s._new_description ?? s.description)}
                    disabled={savingKey === s.setting_key}
                  >
                    {savingKey === s.setting_key ? 'Saving...' : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <SettingsContent />
      </AdminLayout>
    </AdminProvider>
  );
}
