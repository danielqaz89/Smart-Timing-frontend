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

  const exampleTemplates = {
    timesheet: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Timeliste</title>
</head>
<body>
  <div class="header">
    <h1>{{company.name}}</h1>
    <p>Timeliste for {{period.month_label}}</p>
  </div>

  <div class="summary">
    <p><strong>Totale timer:</strong> {{totals.total_hours}}</p>
    <p><strong>Antall dager:</strong> {{totals.days_count}}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Dato</th>
        <th>Inn</th>
        <th>Ut</th>
        <th>Pause</th>
        <th>Timer</th>
        <th>Aktivitet</th>
        <th>Notater</th>
      </tr>
    </thead>
    <tbody>
      {{#each rows}}
      <tr>
        <td>{{this.date}}</td>
        <td>{{this.start_time}}</td>
        <td>{{this.end_time}}</td>
        <td>{{this.break_hours}}</td>
        <td>{{this.hours}}</td>
        <td>{{this.activity}}</td>
        <td>{{this.notes}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <p>Generert: {{generated_at}}</p>
  </div>
</body>
</html>`,
      css: `body {
  font-family: Arial, sans-serif;
  margin: 20px;
  color: #333;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #1976d2;
  padding-bottom: 10px;
}

.header h1 {
  margin: 0;
  color: #1976d2;
}

.summary {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #1976d2;
  color: white;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

.footer {
  text-align: center;
  color: #666;
  font-size: 0.9em;
  margin-top: 30px;
}

@media print {
  body { margin: 0; }
  .header { page-break-after: avoid; }
}`
    },
    report: {
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport</title>
</head>
<body>
  <div class="header">
    <h1>{{company.name}}</h1>
    <h2>Månedlig rapport - {{period.month_label}}</h2>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Totale timer</h3>
      <p class="big-number">{{totals.total_hours}}</p>
    </div>
    <div class="summary-card">
      <h3>Antall saker</h3>
      <p class="big-number">{{totals.case_count}}</p>
    </div>
  </div>

  <h3>Timer per saksnummer</h3>
  <table>
    <thead>
      <tr>
        <th>Saksnummer</th>
        <th>Timer</th>
        <th>Andel</th>
      </tr>
    </thead>
    <tbody>
      {{#each rows}}
      <tr>
        <td>{{this.case_id}}</td>
        <td>{{this.hours}}</td>
        <td>{{this.percentage}}%</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <p>Generert: {{generated_at}}</p>
  </div>
</body>
</html>`,
      css: `body {
  font-family: Arial, sans-serif;
  margin: 20px;
  color: #333;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #2e7d32;
  padding-bottom: 15px;
}

.header h1 {
  margin: 0;
  color: #2e7d32;
}

.header h2 {
  margin: 10px 0 0 0;
  color: #666;
  font-weight: normal;
}

.summary {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  flex: 1;
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.summary-card h3 {
  margin: 0 0 10px 0;
  font-size: 0.9em;
}

.big-number {
  font-size: 2.5em;
  font-weight: bold;
  margin: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background-color: #2e7d32;
  color: white;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

.footer {
  text-align: center;
  color: #666;
  font-size: 0.9em;
  margin-top: 30px;
}

@media print {
  body { margin: 0; }
  .summary { page-break-after: avoid; }
}`
    }
  };

  function loadExample() {
    const example = exampleTemplates[type];
    setHtml(example.html);
    setCss(example.css);
    setSuccess('Example template loaded');
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Rapportgenerator</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Skreddersy dine egne timelister og rapporter med HTML/CSS. Bruk Handlebars-variabler for å vise data.
      </Typography>

      {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ my: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Tilgjengelige variabler:</Typography>
        <Typography variant="caption" component="div">
          <strong>Bedriftsinfo:</strong> <code>{'{{company.name}}'}</code>, <code>{'{{company.orgnr}}'}</code><br/>
          <strong>Periode:</strong> <code>{'{{period.month_label}}'}</code>, <code>{'{{period.year}}'}</code>, <code>{'{{generated_at}}'}</code><br/>
          <strong>Totaler:</strong> <code>{'{{totals.total_hours}}'}</code>, <code>{'{{totals.days_count}}'}</code>, <code>{'{{totals.case_count}}'}</code><br/>
          <strong>Loop (timer):</strong> <code>{'{{#each rows}} {{this.date}} {{this.hours}} {{/each}}'}</code><br/>
          <strong>Felter:</strong> date, start_time, end_time, break_hours, hours, activity, title, case_id, notes, user_email
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <FormControl sx={{ maxWidth: 240 }}>
              <InputLabel>Document Type</InputLabel>
              <Select label="Document Type" value={type} onChange={(e) => setType(e.target.value as any)}>
                <MenuItem value="timesheet">Timesheet</MenuItem>
                <MenuItem value="report">Report</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={loadExample} startIcon={<Typography>📝</Typography>}>
              Last eksempelmal
            </Button>
          </Stack>

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
