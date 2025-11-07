"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button as MuiButton, FormControlLabel, Switch, Select, MenuItem } from '@mui/material';
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';
import dynamic from 'next/dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const EChartsLine = dynamic(() => import('../../../components/EChartsLine'), { ssr: false });
const UPlotLine = dynamic(() => import('../../../components/UPlotLine'), { ssr: false });

function AnalyticsContent() {
  const { fetchWithAuth } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [ga, setGa] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUPlotOpen, setDialogUPlotOpen] = useState(false);
  const [uPlotPrefsOpen, setUPlotPrefsOpen] = useState(false);
  const [uPlotPrefs, setUPlotPrefs] = useState<{ lineType: 'line'|'step'|'points'; log: boolean; filename: string; dpi: number; transparent: boolean }>({
    lineType: 'step', log: false, filename: 'aktive-brukere', dpi: 300, transparent: false,
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem('adminAnalytics.uplotPrefs');
      if (s) {
        const p = JSON.parse(s);
        setUPlotPrefs((prev)=>({
          lineType: ['line','step','points'].includes(p?.lineType) ? p.lineType : prev.lineType,
          log: !!p?.log,
          filename: typeof p?.filename==='string' && p.filename ? p.filename : prev.filename,
          dpi: (()=>{ const v = Number(p?.dpi); if (!isFinite(v)) return prev.dpi; return v <= 10 ? Math.round(v*96) : Math.max(72, Math.min(600, v)); })(),
          transparent: !!p?.transparent,
        }));
      }
    } catch {}
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/analytics`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics');
      }
      try {
        const res2 = await fetchWithAuth(`${API_BASE}/api/admin/analytics/ga4?days=${days}`);
        const json2 = await res2.json();
        if (res2.ok) setGa(json2);
      } catch {}
      setLoading(false);
    })();
  }, [fetchWithAuth, days]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Analytics</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">App-statistikk</Typography>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ flex: 1 }}>Google Analytics (GA4)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField type="number" size="small" label="Dager" value={days} onChange={(e)=> setDays(Math.max(1, Math.min(400, Number(e.target.value)||30)))} sx={{ width: 120 }} />
              <MuiButton size="small" variant="outlined" onClick={()=> setDialogOpen(true)}>Åpne avansert graf</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={()=> setDialogUPlotOpen(true)}>Åpne lettvektsgraf (uPlot)</MuiButton>
              <MuiButton size="small" onClick={()=> setUPlotPrefsOpen(true)}>Innstillinger (uPlot)</MuiButton>
            </Stack>
          </Stack>
          {!ga ? (
            <Typography variant="body2" color="text.secondary">Ingen GA4‑data (mangler endpoint eller property).</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Dato</TableCell>
                  <TableCell align="right">Aktive brukere</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(ga.timeseries || []).map((r: any, i: number)=> (
                  <TableRow key={i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell align="right">{r.activeUsers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={()=> setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Avansert graf (ECharts)</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {ga ? (
              <EChartsLine labels={(ga.timeseries || []).map((d:any)=> d.date)} data={(ga.timeseries || []).map((d:any)=> Number(d.activeUsers||0))} height={480} />
            ) : (
              <Typography variant="body2" color="text.secondary">Ingen data</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={()=> setDialogOpen(false)}>Lukk</MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogUPlotOpen} onClose={()=> setDialogUPlotOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Lettvektsgraf (uPlot)</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {ga ? (
              <UPlotLine labels={(ga.timeseries || []).map((d:any)=> d.date)} data={(ga.timeseries || []).map((d:any)=> Number(d.activeUsers||0))} height={360} defaultLineType={uPlotPrefs.lineType} defaultLog={uPlotPrefs.log} exportFilenameDefault={uPlotPrefs.filename} exportDpiDefault={uPlotPrefs.dpi} exportTransparentDefault={uPlotPrefs.transparent} />
            ) : (
              <Typography variant="body2" color="text.secondary">Ingen data</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={()=> setDialogUPlotOpen(false)}>Lukk</MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={uPlotPrefsOpen} onClose={()=> setUPlotPrefsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>uPlot standarder</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControlLabel control={<Switch checked={uPlotPrefs.log} onChange={(e)=> setUPlotPrefs(p=> ({...p, log: e.target.checked}))} />} label="Start i log skala" />
              <Box sx={{ flex: 1 }} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ minWidth: 160 }}>Standard linjetype</Box>
              <Select size="small" value={uPlotPrefs.lineType} onChange={(e)=> setUPlotPrefs(p=> ({...p, lineType: e.target.value as any}))} sx={{ minWidth: 160 }}>
                <MenuItem value="line">Linje</MenuItem>
                <MenuItem value="step">Steg</MenuItem>
                <MenuItem value="points">Punkter</MenuItem>
              </Select>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField size="small" label="Standard filnavn" value={uPlotPrefs.filename} onChange={(e)=> setUPlotPrefs(p=> ({...p, filename: e.target.value}))} sx={{ minWidth: 240 }} />
              <TextField size="small" type="number" label="Standard DPI (72–600)" value={uPlotPrefs.dpi} onChange={(e)=> setUPlotPrefs(p=> ({...p, dpi: Math.max(72, Math.min(600, Number(e.target.value)||96))}))} sx={{ width: 200 }} />
              <FormControlLabel control={<Switch checked={uPlotPrefs.transparent} onChange={(e)=> setUPlotPrefs(p=> ({...p, transparent: e.target.checked}))} />} label="Transparent bakgrunn" />
            </Stack>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
              Disse brukes som startverdier i uPlot‑dialogen. Du kan fortsatt endre dem inne i grafen.
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={()=> setUPlotPrefsOpen(false)}>Avbryt</MuiButton>
          <MuiButton variant="contained" onClick={()=> { try { localStorage.setItem('adminAnalytics.uplotPrefs', JSON.stringify(uPlotPrefs)); } catch {}; setUPlotPrefsOpen(false); }}>Lagre</MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <AnalyticsContent />
      </AdminLayout>
    </AdminProvider>
  );
}
