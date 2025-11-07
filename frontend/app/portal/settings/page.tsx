"use client";

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function SettingsContent() {
  const { fetchWithAuth } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [enforceHourlyRate, setEnforceHourlyRate] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  
  const [enforceRecipient, setEnforceRecipient] = useState(false);
  const [enforcedTo, setEnforcedTo] = useState('');
  const [enforcedCc, setEnforcedCc] = useState('');
  const [enforcedBcc, setEnforcedBcc] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/company/policy`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load settings');

        setEnforceHourlyRate(!!data.enforce_hourly_rate);
        setHourlyRate(data.hourly_rate ? String(data.hourly_rate) : '');
        setEnforceRecipient(!!data.enforce_timesheet_recipient);
        setEnforcedTo(data.enforced_timesheet_to || '');
        setEnforcedCc(data.enforced_timesheet_cc || '');
        setEnforcedBcc(data.enforced_timesheet_bcc || '');
      } catch (e: any) {
        setError(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWithAuth]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enforce_hourly_rate: enforceHourlyRate,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
          enforce_timesheet_recipient: enforceRecipient,
          enforced_timesheet_to: enforcedTo || null,
          enforced_timesheet_cc: enforcedCc || null,
          enforced_timesheet_bcc: enforcedBcc || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess('Settings saved successfully');
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Configure company-wide policies that apply to all users
      </Typography>

      {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ my: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Hourly Rate Policy</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enforce a standard hourly rate for all users in your company
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormControl sx={{ maxWidth: 300 }}>
            <InputLabel>Enforce Hourly Rate</InputLabel>
            <Select
              value={enforceHourlyRate ? 'yes' : 'no'}
              label="Enforce Hourly Rate"
              onChange={(e) => setEnforceHourlyRate(e.target.value === 'yes')}
            >
              <MenuItem value="no">No - Users set their own rate</MenuItem>
              <MenuItem value="yes">Yes - Enforce company rate</MenuItem>
            </Select>
          </FormControl>

          {enforceHourlyRate && (
            <TextField
              type="number"
              label="Hourly Rate (kr/h)"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              sx={{ maxWidth: 300 }}
              required
            />
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Timesheet Recipient Policy</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enforce standard recipients for all timesheet emails sent from templates
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormControl sx={{ maxWidth: 300 }}>
            <InputLabel>Enforce Recipients</InputLabel>
            <Select
              value={enforceRecipient ? 'yes' : 'no'}
              label="Enforce Recipients"
              onChange={(e) => setEnforceRecipient(e.target.value === 'yes')}
            >
              <MenuItem value="no">No - Admin chooses recipients</MenuItem>
              <MenuItem value="yes">Yes - Enforce company recipients</MenuItem>
            </Select>
          </FormControl>

          {enforceRecipient && (
            <>
              <TextField
                label="To (required)"
                value={enforcedTo}
                onChange={(e) => setEnforcedTo(e.target.value)}
                placeholder="recipient@example.com"
                fullWidth
                required
                helperText="Primary recipient email address"
              />
              <TextField
                label="CC (optional)"
                value={enforcedCc}
                onChange={(e) => setEnforcedCc(e.target.value)}
                placeholder="cc@example.com"
                fullWidth
                helperText="Carbon copy recipient"
              />
              <TextField
                label="BCC (optional)"
                value={enforcedBcc}
                onChange={(e) => setEnforcedBcc(e.target.value)}
                placeholder="bcc@example.com"
                fullWidth
                helperText="Blind carbon copy recipient"
              />
            </>
          )}
        </Stack>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
}

export default function PortalSettingsPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <SettingsContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
