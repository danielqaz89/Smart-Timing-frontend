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

type Recipients = { to: string; cc?: string; bcc?: string };

function SendButton({ 
  onSend, 
  month, 
  enforceRecipients, 
  enforced 
}: { 
  onSend: (rcp: Recipients) => Promise<boolean>; 
  month: string; 
  enforceRecipients?: boolean; 
  enforced?: Partial<Recipients>;
}) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [busy, setBusy] = useState(false);
  const disabled = !!enforceRecipients;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ width: '100%' }}>
      <TextField
        size="small"
        label={disabled ? `To (enforced: ${enforced?.to || 'policy'})` : 'Send to (email)'}
        value={disabled ? (enforced?.to || '') : to}
        onChange={(e) => setTo(e.target.value)}
        sx={{ minWidth: 240, flex: 1 }}
        disabled={disabled}
      />
      <TextField
        size="small"
        label={disabled ? 'CC (enforced)' : 'CC (optional)'}
        value={disabled ? (enforced?.cc || '') : cc}
        onChange={(e) => setCc(e.target.value)}
        sx={{ minWidth: 200, flex: 1 }}
        disabled={disabled}
      />
      <TextField
        size="small"
        label={disabled ? 'BCC (enforced)' : 'BCC (optional)'}
        value={disabled ? (enforced?.bcc || '') : bcc}
        onChange={(e) => setBcc(e.target.value)}
        sx={{ minWidth: 200, flex: 1 }}
        disabled={disabled}
      />
      <Button
        variant="contained"
        disabled={busy || (!disabled && !to)}
        onClick={async () => {
          setBusy(true);
          await onSend({ to: disabled ? enforced?.to || '' : to, cc, bcc });
          setBusy(false);
        }}
      >
        {busy ? 'Sending…' : `Send (${month})`}
      </Button>
    </Stack>
  );
}

function TemplatesContent() {
  const { fetchWithAuth } = useCompany();
  const [type, setType] = useState<'timesheet' | 'report'>('timesheet');
  const [html, setHtml] = useState('<h1>{{company.name}}</h1>');
  const [css, setCss] = useState('body{font-family:Arial}');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}${m}`;
  });
  
  const [users, setUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | ''>('');
  const [policy, setPolicy] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await fetchWithAuth(`${API_BASE}/api/company/users`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    })();
  }, [fetchWithAuth]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/company/policy`);
        const p = await res.json();
        if (res.ok) setPolicy(p);
      } catch {}
    })();
  }, [fetchWithAuth]);

  useEffect(() => {
    (async () => {
      const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}`);
      const data = await res.json();
      if (res.ok) {
        if (data?.template_html) setHtml(data.template_html);
        if (data?.template_css) setCss(data.template_css);
      }
    })();
  }, [type, fetchWithAuth]);

  async function save() {
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_html: html, template_css: css, is_active: true }),
      });
      if (!res.ok) throw new Error('Failed to save template');
      setSuccess('Template saved successfully');
    } catch (e: any) {
      setError(e?.message || 'Failed to save template');
    }
  }

  async function preview() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_html: html, template_css: css, month, company_user_id: userId || undefined }),
      });
      const data = await res.json();
      if (res.ok) setPreviewHtml(data.html);
      else throw new Error(data.error || 'Preview failed');
    } catch (e: any) {
      setError(e?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_html: html, template_css: css, month, company_user_id: userId || undefined }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${month}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (e: any) {
      setError(e?.message || 'PDF generation failed');
    }
  }

  async function sendDesigned(rcp: Recipients) {
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: rcp.to,
          cc: rcp.cc || undefined,
          bcc: rcp.bcc || undefined,
          month,
          company_user_id: userId || undefined,
          template_html: html,
          template_css: css,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSuccess('Email sent successfully');
      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
      return false;
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Templates</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Design HTML/CSS templates for timesheets and reports. Use Handlebars placeholders like{' '}
        <code>{'{{company.name}}'}</code>, <code>{'{{period.month_label}}'}</code>, <code>{'{{totals.total_hours}}'}</code>
      </Typography>

      {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ my: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={2}>
          <FormControl sx={{ maxWidth: 240 }}>
            <InputLabel>Document Type</InputLabel>
            <Select label="Document Type" value={type} onChange={(e) => setType(e.target.value as any)}>
              <MenuItem value="timesheet">Timesheet</MenuItem>
              <MenuItem value="report">Report</MenuItem>
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Month (YYYYMM)"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              sx={{ maxWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel>Filter by User (optional)</InputLabel>
              <Select
                label="Filter by User (optional)"
                value={userId === '' ? '' : String(userId)}
                onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
                displayEmpty
              >
                <MenuItem value="">All Users</MenuItem>
                {users.map((u: any) => (
                  <MenuItem key={u.id} value={u.id}>{u.user_email}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="HTML Template"
            multiline
            minRows={12}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            fullWidth
          />

          <TextField
            label="CSS (print CSS supported)"
            multiline
            minRows={6}
            value={css}
            onChange={(e) => setCss(e.target.value)}
            fullWidth
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} flexWrap="wrap">
            <Button onClick={save} variant="contained">Save</Button>
            <Button onClick={preview} variant="outlined" disabled={loading}>
              {loading ? 'Loading...' : 'Preview'}
            </Button>
            <Button onClick={downloadPdf} variant="outlined">Download PDF</Button>
          </Stack>

          <SendButton
            onSend={sendDesigned}
            month={month}
            enforceRecipients={!!policy?.enforce_timesheet_recipient}
            enforced={{
              to: policy?.enforced_timesheet_to,
              cc: policy?.enforced_timesheet_cc,
              bcc: policy?.enforced_timesheet_bcc,
            }}
          />

          {policy?.enforce_timesheet_recipient ? (
            <Alert severity="info">
              Recipients are enforced by company policy: {policy?.enforced_timesheet_to || '—'}
              {policy?.enforced_timesheet_cc ? ` • CC: ${policy.enforced_timesheet_cc}` : ''}
              {policy?.enforced_timesheet_bcc ? ` • BCC: ${policy.enforced_timesheet_bcc}` : ''}
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Specify To/CC/BCC freely. Company policy can override this if enabled.
            </Typography>
          )}

          <Typography variant="subtitle2">Preview</Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: 400, overflow: 'auto' }}>
            <iframe title="preview" style={{ width: '100%', height: 400, border: 'none' }} srcDoc={previewHtml}></iframe>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

export default function PortalTemplatesPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <TemplatesContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
