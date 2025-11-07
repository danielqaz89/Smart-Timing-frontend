'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import AdminLayout from '../../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const PAGE_IDS = ['landing', 'about', 'pricing', 'contact', 'faq'];

export default function CmsPagesPage() {
  const [pageId, setPageId] = useState('landing');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPage(pageId);
  }, [pageId]);

  async function fetchPage(id: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/cms/pages/${id}`);
      if (!res.ok) throw new Error('Failed to fetch page');
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
      if (!token) throw new Error('Not authenticated');

      // Validate JSON
      const parsed = JSON.parse(content);

      const res = await fetch(`${API_BASE}/api/admin/cms/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error('Failed to save page');
      setSuccess(`Page "${pageId}" saved successfully!`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom>CMS Pages Editor</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Edit page content in JSON format. Changes are reflected immediately on the public pages.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Page</InputLabel>
            <Select
              label="Page"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            >
              {PAGE_IDS.map((id) => (
                <MenuItem key={id} value={id}>{id}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            Save
          </Button>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={30}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Loading..."
            disabled={loading}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: 13 },
            }}
          />
        </Paper>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Editing Tips:
          </Typography>
          <Typography variant="body2" component="div">
            • The landing page has sections: hero, features, cta, testimonials, partners, contact_form, footer<br />
            • Each section has an id, type, order, and content object<br />
            • Partners section: items are objects with name, logo_url, website_url<br />
            • Form section: fields array defines form inputs (name, type, label, required, placeholder)<br />
            • Validate JSON before saving to avoid errors
          </Typography>
        </Alert>
      </Box>
    </AdminLayout>
  );
}
