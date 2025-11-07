'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, TextField, Alert } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import AdminLayout from '../../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default function CmsThemesPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTheme();
  }, []);

  async function fetchTheme() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/cms/themes/global`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContent(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('admin_token');
      const parsed = JSON.parse(content);
      const res = await fetch(`${API_BASE}/api/admin/cms/themes/global`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Theme saved!');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom>Global Theme</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edit colors, typography, spacing for the global theme.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading} sx={{ mb: 2 }}>
          Save
        </Button>
        <Paper sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={30}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        </Paper>
      </Box>
    </AdminLayout>
  );
}
