"use client";

import React from "react";
import { CompanyProvider, useCompany } from "../../contexts/CompanyContext";
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Container, Stack, TextField, Typography, MenuItem, Select, FormControl, InputLabel } from "@mui/material";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

function AuditCard() {
  const { fetchWithAuth } = useCompany();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { (async ()=>{ const res = await fetchWithAuth(`${API_BASE}/api/company/audit`); const d = await res.json(); if (res.ok) setLogs(d.logs||[]); setLoading(false); })(); }, []);
  return (
    <Card>
      <CardHeader title="Audit logg" subheader="Siste 100 hendelser" />
      <CardContent>
        {loading ? <CircularProgress size={20} /> : logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Ingen hendelser.</Typography>
        ) : (
          <Stack spacing={1}>
            {logs.map((l:any)=>(
              <Box key={l.id} sx={{ p:1, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                <Typography variant="caption" color="text.secondary">{new Date(l.created_at).toLocaleString()} • {l.actor_email || 'system'}</Typography>
                <Typography variant="body2"><strong>{l.action}</strong> {l.target_type ? `• ${l.target_type}` : ''} {l.target_id || ''}</Typography>
                {l.details && <Typography variant="caption" sx={{ display:'block' }}>{JSON.stringify(l.details)}</Typography>}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function InvitesList() {
  const { fetchWithAuth } = useCompany();
  const [invites, setInvites] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { (async ()=>{ const res = await fetchWithAuth(`${API_BASE}/api/company/invites`); const d = await res.json(); if (res.ok) setInvites(d.invites||[]); setLoading(false); })(); }, []);
  if (loading) return <CircularProgress size={16} />;
  if (invites.length === 0) return <Typography variant="body2" color="text.secondary">Ingen ventende invitasjoner.</Typography>;
  return (
    <Stack spacing={1}>
      {invites.map((i:any)=>{
        const link = `${API_BASE}/api/company/invites/accept?token=${encodeURIComponent(i.token)}`;
        const expired = i.expires_at && new Date(i.expires_at) < new Date();
        return (
          <Box key={i.id} sx={{ p:1, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
            <Typography variant="body2">
              {i.invited_email} • rolle: {i.role} • utløper: {new Date(i.expires_at).toLocaleDateString()} {i.used_at ? '• BRUKT' : expired ? '• UTLØPT' : ''}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt:0.5 }}>
              <Button size="small" onClick={async ()=>{ await navigator.clipboard.writeText(link); }}>Kopier lenke</Button>
              {!i.used_at && !expired && (
                <Button size="small" onClick={async ()=>{ await fetchWithAuth(`${API_BASE}/api/company/invites/${i.id}/resend`, { method:'POST' }); const res = await fetchWithAuth(`${API_BASE}/api/company/invites`); const d = await res.json(); setInvites(d.invites||[]); }}>Send på nytt</Button>
              )}
              {!i.used_at && (
                <Button size="small" color="error" onClick={async ()=>{ await fetchWithAuth(`${API_BASE}/api/company/invites/${i.id}`, { method:'DELETE' }); const res = await fetchWithAuth(`${API_BASE}/api/company/invites`); const d = await res.json(); setInvites(d.invites||[]); }}>Opphev</Button>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function LogsCard() {
  const { fetchWithAuth } = useCompany();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [caseId, setCaseId] = React.useState('');
  const [refresh, setRefresh] = React.useState(0);
  const API = `${API_BASE}/api/company/logs`;
  React.useEffect(() => { (async ()=>{
    setLoading(true);
    const qs = new URLSearchParams();
    if (caseId) qs.set('case_id', caseId);
    const res = await fetchWithAuth(`${API}${qs.toString() ? '?' + qs.toString() : ''}`);
    const data = await res.json();
    if (res.ok) setLogs(data.logs || []);
    setLoading(false);
  })(); }, [caseId, refresh]);
  return (
    <Card>
      <CardHeader title="Tidslogger" subheader="Filtrer på saksnummer (Klient ID)" />
      <CardContent>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField size="small" label="Saksnummer (Klient ID)" value={caseId} onChange={(e)=>setCaseId(e.target.value)} placeholder="f.eks. KLIENT-123" />
          <Button size="small" variant="outlined" onClick={()=>setRefresh(x=>x+1)}>Oppdater</Button>
        </Stack>
        {loading ? <CircularProgress size={20} /> : logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Ingen logger funnet.</Typography>
        ) : (
          <Stack spacing={1}>
            {logs.map((lr:any)=> (
              <Box key={lr.id} sx={{ p:1, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(lr.date).toLocaleDateString()} • {String(lr.start_time).slice(0,5)}–{String(lr.end_time).slice(0,5)} • {lr.user_email}
                </Typography>
                <Typography variant="body2">
                  {lr.activity || ''} {lr.title ? `• ${lr.title}` : ''} {lr.project ? `• ${lr.project}` : ''} {lr.place ? `• ${lr.place}` : ''} {lr.case_id ? `• Case: ${lr.case_id}` : ''}
                </Typography>
                {lr.notes && <Typography variant="caption" sx={{ display:'block' }}>{lr.notes}</Typography>}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function LogTimeCard() {
  const { fetchWithAuth, user } = useCompany();
  const [cases, setCases] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0,10), start: '09:00', end: '17:00', breakHours: 0,
    activity: 'Work', title: '', case_id: ''
  });
  React.useEffect(()=>{ (async ()=>{
    const res = await fetchWithAuth(`${API_BASE}/api/company/my-cases`);
    const data = await res.json();
    if (res.ok) setCases(data.cases || []);
  })(); }, []);
  async function submit() {
    setBusy(true);
    try {
      const payload:any = { ...form, breakHours: Number(form.breakHours)||0 };
      if (user?.id) payload.company_user_id = user.id;
      const res = await fetch(`${API_BASE}/api/logs`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Kunne ikke lagre');
      setForm({ ...form, title: '', case_id: '' });
    } catch (e:any) { /* ignore or show toast */ } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader title="Logg tid (portal)" subheader="Velg saksnummer og registrer timer" />
      <CardContent>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
          <TextField label="Dato" type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} InputLabelProps={{ shrink: true }} />
          <TextField label="Inn" value={form.start} onChange={(e)=>setForm({...form, start: e.target.value})} placeholder="HH:MM" />
          <TextField label="Ut" value={form.end} onChange={(e)=>setForm({...form, end: e.target.value})} placeholder="HH:MM" />
          <TextField label="Pause (timer)" type="number" value={form.breakHours} onChange={(e)=>setForm({...form, breakHours: e.target.value as any})} />
        </Stack>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mt:2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Saksnummer</InputLabel>
            <Select label="Saksnummer" value={form.case_id} onChange={(e)=>setForm({...form, case_id: String(e.target.value) })} displayEmpty renderValue={(val)=> val || 'Velg saksnummer'}>
              {cases.map((c:any)=> (
                <MenuItem key={c.id} value={c.case_id}>{c.case_id}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Aktivitet</InputLabel>
            <Select label="Aktivitet" value={form.activity} onChange={(e)=>setForm({...form, activity: String(e.target.value) })}>
              <MenuItem value="Work">Arbeid</MenuItem>
              <MenuItem value="Meeting">Møte</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Tittel" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} fullWidth />
          <Button variant="contained" onClick={submit} disabled={busy}>Registrer</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReportsCard() {
  const { fetchWithAuth } = useCompany();
  const [month, setMonth] = React.useState(() => {
    const d = new Date();
    const m = String(d.getMonth()+1).padStart(2,'0');
    return `${d.getFullYear()}${m}`;
  });
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(()=>{ (async ()=>{
    setLoading(true);
    const res = await fetchWithAuth(`${API_BASE}/api/company/reports/case-monthly?month=${month}`);
    const data = await res.json();
    if (res.ok) setRows(data.totals||[]);
    setLoading(false);
  })(); }, [month]);
  return (
    <Card>
      <CardHeader title="Rapport: Timer per saksnummer" />
      <CardContent>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField label="Måned (YYYYMM)" value={month} onChange={(e)=>setMonth(e.target.value)} />
        </Stack>
        {loading ? <CircularProgress size={20} /> : (
          <Stack spacing={1}>
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Ingen data.</Typography>
            ) : rows.map((r:any)=>(
              <Box key={r.case_id} sx={{ p:1, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                <Typography variant="body2"><strong>{r.case_id}</strong> — {Number(r.hours).toFixed(2)} t</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function TemplatesCard() {
  const { fetchWithAuth } = useCompany();
  const [type, setType] = React.useState<'timesheet'|'report'>('timesheet');
  const [html, setHtml] = React.useState('<style>body{font-family:Arial}</style>\n<h1>{{company.name}}</h1>');
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  React.useEffect(()=>{ (async ()=>{
    const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}`);
    const data = await res.json();
    if (res.ok && data?.template_html) setHtml(data.template_html);
  })(); }, [type]);
  async function save() {
    await fetchWithAuth(`${API_BASE}/api/company/templates/${type}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ template_html: html, is_active: true }) });
  }
  async function preview() {
    setLoading(true);
    const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}/preview`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ template_html: html }) });
    const data = await res.json();
    if (res.ok) setPreviewHtml(data.html);
    setLoading(false);
  }
  async function downloadPdf() {
    const res = await fetchWithAuth(`${API_BASE}/api/company/templates/${type}/pdf`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ template_html: html }) });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}.pdf`; a.click(); URL.revokeObjectURL(url);
    }
  }
  return (
    <Card>
      <CardHeader title="Dokumentmaler (HTML/CSS)" subheader="Bruk handlebars-plassholdere som {{company.name}}, {{period.month_label}}, {{totals.total_hours}}, {{#each rows}}{{/each}}" />
      <CardContent>
        <Stack spacing={2}>
          <FormControl sx={{ maxWidth: 240 }}>
            <InputLabel>Dokumenttype</InputLabel>
            <Select label="Dokumenttype" value={type} onChange={(e)=>setType(e.target.value as any)}>
              <MenuItem value="timesheet">Timeliste</MenuItem>
              <MenuItem value="report">Rapport</MenuItem>
            </Select>
          </FormControl>
          <TextField label="HTML-mal" multiline minRows={16} value={html} onChange={(e)=>setHtml(e.target.value)} fullWidth />
          <Stack direction="row" spacing={1}>
            <Button onClick={save} variant="contained">Lagre</Button>
            <Button onClick={preview} variant="outlined" disabled={loading}>{loading ? 'Forhåndsviser...' : 'Forhåndsvis'}</Button>
            <Button onClick={downloadPdf} variant="outlined">Last ned PDF</Button>
          </Stack>
          <Typography variant="subtitle2">Forhåndsvisning</Typography>
          <Box sx={{ border:'1px solid', borderColor:'divider', borderRadius:1, height: 400, overflow:'auto' }}>
            <iframe title="preview" style={{ width:'100%', height:400, border:'none' }} srcDoc={previewHtml}></iframe>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PolicyCard() {
  const { fetchWithAuth } = useCompany();
  const [enforce, setEnforce] = React.useState(false);
  const [rate, setRate] = React.useState<string>('');
  React.useEffect(()=>{ (async ()=>{
    const res = await fetchWithAuth(`${API_BASE}/api/company/policy`);
    const data = await res.json();
    if (res.ok) { setEnforce(!!data.enforce_hourly_rate); setRate(data.hourly_rate ? String(data.hourly_rate) : ''); }
  })(); }, []);
  async function save() {
    await fetchWithAuth(`${API_BASE}/api/company/policy`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ enforce_hourly_rate: enforce, hourly_rate: rate ? Number(rate) : null }) });
  }
  return (
    <Card>
      <CardHeader title="Bedriftspolicy" subheader="Overstyr timesats for alle brukere i bedriften" />
      <CardContent>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Overstyr timesats</InputLabel>
            <Select label="Overstyr timesats" value={enforce ? 'yes' : 'no'} onChange={(e)=>setEnforce(e.target.value==='yes')}>
              <MenuItem value="no">Nei</MenuItem>
              <MenuItem value="yes">Ja</MenuItem>
            </Select>
          </FormControl>
          <TextField type="number" label="Timesats (kr/t)" value={rate} onChange={(e)=>setRate(e.target.value)} disabled={!enforce} />
          <Button variant="contained" onClick={save}>Lagre policy</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PortalContent() {
  const { loading, token, company, user, login, logout, fetchWithAuth } = useCompany();
  const [users, setUsers] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ user_email: "", google_email: "", role: "member", approved: false });

  React.useEffect(() => {
    if (!token) return;
    (async () => {
      setBusy(true);
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/company/users`);
        const data = await res.json();
        if (res.ok) setUsers(data.users || []);
      } finally { setBusy(false); }
    })();
  }, [token]);

  if (loading) return <CircularProgress />;

  if (!token) {
    return (
      <Card>
        <CardHeader title="Bedriftsportal" subheader="Logg inn med Google for å administrere brukere og saksnummer" />
        <CardContent>
          <Button variant="contained" onClick={login}>Logg inn med Google</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader title={company?.name || "Din bedrift"} subheader={`Innlogget som ${user?.email} (${user?.role})`} />
        <CardContent>
          <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems="center">
            <Button variant="outlined" size="small" onClick={logout}>Logg ut</Button>
            {/* Logo uploader (admin) */}
            {user?.role === 'admin' && (
              <>
                <input id="logo-input" type="file" accept="image/*" style={{ display:'none' }} onChange={async (e)=>{
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async ()=>{
                    const b64 = String(reader.result);
                    await fetchWithAuth(`${API_BASE}/api/company/logo`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ logo_base64: b64 }) });
                    window.location.reload();
                  };
                  reader.readAsDataURL(file);
                }} />
                <label htmlFor="logo-input">
                  <Button variant="outlined" size="small" component="span">Last opp logo</Button>
                </label>
                {company?.logo_base64 && <img src={company.logo_base64} alt="Logo" style={{ height:32 }} />}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Inviter bruker (e‑post)" />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="E‑post" value={form.user_email} onChange={(e)=>setForm({ ...form, user_email: e.target.value })} />
            <TextField select SelectProps={{ native: true }} label="Rolle" value={form.role} onChange={(e)=>setForm({ ...form, role: e.target.value })}>
              <option value="member">member</option>
              <option value="case_manager">case_manager</option>
              <option value="admin">admin</option>
            </TextField>
            <Button variant="contained" onClick={async ()=>{
              const res = await fetchWithAuth(`${API_BASE}/api/company/invites`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ invited_email: form.user_email, role: form.role }) });
              if (res.ok) {
                setForm({ user_email: '', google_email: '', role: 'member', approved: false });
                const inv = await fetchWithAuth(`${API_BASE}/api/company/invites`); const d = await inv.json(); (window as any)._invites = d.invites; // stored
              }
            }}>Send invitasjon</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Ventende invitasjoner" />
        <CardContent>
          <InvitesList />
        </CardContent>
      </Card>

      <AuditCard />

      <PolicyCard />

      <TemplatesCard />

      <LogTimeCard />

      <LogsCard />

      <ReportsCard />

      <Card>
        <CardHeader title="Brukere" />
        <CardContent>
          {busy ? <CircularProgress /> : users.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Ingen brukere ennå.</Typography>
          ) : (
            <Stack spacing={2}>
              {users.map((u:any) => (
                <Box key={u.id} sx={{ p:2, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                  <Typography variant="body2"><strong>{u.user_email}</strong> • Google: {u.google_email || '—'} • Rolle: {u.role} • Godkjent: {String(u.approved)}</Typography>
                  {(user?.role === 'admin' || user?.role === 'case_manager') && (
                    <>
                      <Stack direction={{ xs:'column', md:'row' }} spacing={1} sx={{ mt:1 }}>
                        <TextField size="small" label="Ny saksnr" onKeyDown={async (e)=>{
                          if (e.key==='Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (!val) return; await fetchWithAuth(`${API_BASE}/api/company/users/${u.id}/cases`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ case_id: val }) });
                            (e.target as HTMLInputElement).value=''; const reload = await fetchWithAuth(`${API_BASE}/api/company/users`); const d = await reload.json(); setUsers(d.users||[]);
                          }
                        }} />
                        <Button size="small" variant="outlined" onClick={async ()=>{
                          const input = (document.activeElement as HTMLInputElement); const val = input?.value?.trim(); if (!val) return;
                          await fetchWithAuth(`${API_BASE}/api/company/users/${u.id}/cases`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ case_id: val }) });
                          input.value=''; const reload = await fetchWithAuth(`${API_BASE}/api/company/users`); const d = await reload.json(); setUsers(d.users||[]);
                        }}>Legg til</Button>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
                        {(u.cases||[]).map((c:any)=>(
                          <Button key={c.id} size="small" variant="outlined" onClick={async ()=>{
                            await fetchWithAuth(`${API_BASE}/api/company/users/${u.id}/cases/${c.id}`, { method:'DELETE' });
                            const reload = await fetchWithAuth(`${API_BASE}/api/company/users`); const d = await reload.json(); setUsers(d.users||[]);
                          }}>{c.case_id} ✕</Button>
                        ))}
                      </Stack>
                    </>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function PortalPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <CompanyProvider>
        <PortalContent />
      </CompanyProvider>
    </Container>
  );
}
