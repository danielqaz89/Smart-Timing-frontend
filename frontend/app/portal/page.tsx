"use client";

import React from "react";
import { CompanyProvider, useCompany } from "../../contexts/CompanyContext";
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Container, Stack, TextField, Typography } from "@mui/material";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

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
          <Button variant="outlined" size="small" onClick={logout}>Logg ut</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Legg til bruker" />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Bruker e‑post" value={form.user_email} onChange={(e)=>setForm({ ...form, user_email: e.target.value })} />
            <TextField label="Google e‑post (valgfritt)" value={form.google_email} onChange={(e)=>setForm({ ...form, google_email: e.target.value })} />
            <TextField select SelectProps={{ native: true }} label="Rolle" value={form.role} onChange={(e)=>setForm({ ...form, role: e.target.value })}>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </TextField>
            <TextField select SelectProps={{ native: true }} label="Godkjent" value={String(form.approved)} onChange={(e)=>setForm({ ...form, approved: e.target.value === 'true' })}>
              <option value="false">false</option>
              <option value="true">true</option>
            </TextField>
            <Button variant="contained" onClick={async ()=>{
              const res = await fetchWithAuth(`${API_BASE}/api/company/users`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
              if (res.ok) {
                setForm({ user_email: '', google_email: '', role: 'member', approved: false });
                const reload = await fetchWithAuth(`${API_BASE}/api/company/users`);
                const data = await reload.json(); setUsers(data.users||[]);
              }
            }}>Legg til</Button>
          </Stack>
        </CardContent>
      </Card>

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
