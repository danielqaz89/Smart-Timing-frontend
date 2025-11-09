"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCmsPage, submitContactForm, API_BASE } from '../../lib/api';
import { Box, Button, Container, Grid, Link as MuiLink, Stack, TextField, Typography, Checkbox, FormControlLabel, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab } from '@mui/material';
import { useTranslations } from '../../contexts/TranslationsContext';
import { useAuth } from '../../contexts/AuthContext';

export default function LandingPage() {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginType, setLoginType] = useState<'user' | 'portal'>('user');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCmsPage('landing');
        setPage(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Container sx={{ py: 6 }}><Typography>{t('landing.loading', 'Laster...')}</Typography></Container>;
  if (error) return <Container sx={{ py: 6 }}><Typography color="error">{error || t('landing.error', 'Kunne ikke laste siden')}</Typography></Container>;

  const sections: any[] = Array.isArray(page?.sections) ? page.sections : [];

  const handleCTAClick = (href: string, e: React.MouseEvent) => {
    // Intercept clicks to /app and /portal/login to show dialogs
    if (href === '/app' || href === '#app' || href === '#kom-i-gang') {
      e.preventDefault();
      setLoginType('user');
      setLoginDialogOpen(true);
    } else if (href === '/portal/login' || href === '#portal' || href === '#bedriftsportal') {
      e.preventDefault();
      setLoginType('portal');
      setLoginDialogOpen(true);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {sections.sort((a,b)=> (a.order||0)-(b.order||0)).map((s) => (
        <Box key={s.id} sx={{ py: 6 }}>
          {renderSection(s, t, handleCTAClick)}
        </Box>
      ))}
      
      <LoginDialog 
        open={loginDialogOpen} 
        onClose={() => setLoginDialogOpen(false)}
        type={loginType}
      />
    </Container>
  );
}

function renderSection(s: any, t: any, onCTAClick: (href: string, e: React.MouseEvent) => void) {
  const c = s?.content || {};
  switch (s?.type) {
    case 'hero':
      return (
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h2" fontWeight={800}>{c.title}</Typography>
          {c.subtitle && <Typography variant="h6" color="text.secondary">{c.subtitle}</Typography>}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {c.cta_primary_text && (
              <Button 
                onClick={(e) => onCTAClick(c.cta_primary_link || '#', e)}
                variant="contained" 
                size="large"
              >
                {c.cta_primary_text}
              </Button>
            )}
            {c.cta_secondary_text && (
              <Button 
                onClick={(e) => onCTAClick(c.cta_secondary_link || '#', e)}
                variant="outlined" 
                size="large"
              >
                {c.cta_secondary_text}
              </Button>
            )}
          </Stack>
        </Stack>
      );
    case 'features':
      return (
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={700}>{c.title}</Typography>
          <Grid container spacing={2}>
            {(c.features || []).map((f: any, i: number) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <Stack spacing={1} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="h3" component="div">{f.icon}</Typography>
                  <Typography variant="h6" fontWeight={700}>{f.title}</Typography>
                  <Typography color="text.secondary">{f.description}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      );
    case 'cta':
      return (
        <Stack spacing={2} alignItems="center" textAlign="center" sx={{ p: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h4" fontWeight={800}>{c.title}</Typography>
          <Stack direction="row" spacing={2}>
            {c.primary?.text && (
              <Button 
                onClick={(e) => onCTAClick(c.primary?.href || '#', e)}
                variant="contained"
              >
                {c.primary.text}
              </Button>
            )}
            {c.secondary?.text && (
              <Button 
                onClick={(e) => onCTAClick(c.secondary?.href || '#', e)}
                variant="outlined"
              >
                {c.secondary.text}
              </Button>
            )}
          </Stack>
        </Stack>
      );
    case 'testimonials':
      return (
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>{c.title}</Typography>
          <Grid container spacing={2}>
            {(c.items || []).map((t: any, i: number) => (
              <Grid key={i} item xs={12} md={4}>
                <Stack spacing={1} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body1">“{t.quote}”</Typography>
                  <Typography variant="body2" color="text.secondary">— {t.name}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      );
    case 'logos':
      return (
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>{c.title}</Typography>
          <Grid container spacing={2}>
            {(c.items || []).map((src: string, i: number) => (
              <Grid key={i} item xs={6} sm={4} md={2}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="logo" src={src} style={{ width: '100%', height: 56, objectFit: 'contain' }} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      );
    case 'partners':
      return (
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>{c.title}</Typography>
          <Grid container spacing={2}>
            {(c.items || []).map((p: any, i: number) => (
              <Grid key={i} item xs={6} sm={4} md={2}>
                <a href={p.website_url || '#'} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={p.name || 'partner'} src={p.logo_url} style={{ width: '100%', height: 56, objectFit: 'contain' }} />
                </a>
              </Grid>
            ))}
          </Grid>
        </Stack>
      );
    case 'contact':
      return (
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>{c.title || t('landing.contact_us', 'Kontakt oss')}</Typography>
          {c.subtitle && <Typography color="text.secondary">{c.subtitle}</Typography>}
          {c.email && <Typography>{t('landing.email', 'E-post')}: <MuiLink href={`mailto:${c.email}`}>{c.email}</MuiLink></Typography>}
          {c.phone && <Typography>{t('landing.phone', 'Telefon')}: {c.phone}</Typography>}
          {c.address && <Typography>{t('landing.address', 'Adresse')}: {c.address}</Typography>}
        </Stack>
      );
    case 'form':
      return <ContactForm section={s} />;
    case 'footer':
      return (
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {(c.links || []).map((l: any, i: number) => (
            <MuiLink key={i} href={l.href} underline="hover">{l.label}</MuiLink>
          ))}
        </Stack>
      );
    default:
      return <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(s, null, 2)}</pre>;
  }
}

function ContactForm({ section }: { section: any }) {
  const { t } = useTranslations();
  const c = section?.content || {};
  const fields: any[] = Array.isArray(c.fields) ? c.fields : [];
  const [values, setValues] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(name: string, val: any) {
    setValues((v) => ({ ...v, [name]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await submitContactForm({ page_id: 'landing', form_id: section.id, values });
      setDone(true);
      } catch (e: any) {
        setError(e?.message || t('landing.form_failed', 'Kunne ikke sende'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <Alert severity="success">{c.success_message || t('landing.form_success', 'Takk! Vi har mottatt meldingen din.')}</Alert>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Stack spacing={2}>
        {c.title && <Typography variant="h4" fontWeight={700}>{c.title}</Typography>}
        {c.description && <Typography color="text.secondary">{c.description}</Typography>}
        {fields.map((f) => {
          const name = String(f.name || '').trim();
          const label = f.label || name;
          if (!name) return null;
          if (f.type === 'checkbox') {
            return (
              <FormControlLabel key={name} control={<Checkbox checked={!!values[name]} onChange={(e)=>handleChange(name, e.target.checked)} />} label={label} />
            );
          }
          return (
            <TextField
              key={name}
              type={f.type === 'email' ? 'email' : 'text'}
              label={label}
              placeholder={f.placeholder || ''}
              required={!!f.required}
              value={values[name] || ''}
              onChange={(e)=>handleChange(name, e.target.value)}
              multiline={f.type === 'textarea'}
              minRows={f.type === 'textarea' ? 4 : undefined}
              fullWidth
            />
          );
        })}
        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={busy}>{c.submit_text || t('common.send', 'Send')}</Button>
          {c.privacy_link && <MuiLink href={c.privacy_link} underline="hover">{t('landing.privacy', 'Personvern')}</MuiLink>}
        </Stack>
        {error && <Typography color="error">{error}</Typography>}
      </Stack>
    </Box>
  );
}

function LoginDialog({ open, onClose, type }: { open: boolean; onClose: () => void; type: 'user' | 'portal' }) {
  const { t } = useTranslations();
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    orgnr: '',
    contact_email: '',
    contact_phone: '',
    address_line: '',
    postal_code: '',
    city: '',
    requester_email: '',
  });

  const handleGoogleLogin = () => {
    if (type === 'portal') {
      window.location.href = `${API_BASE}/api/auth/google/portal`;
    } else {
      login(); // Uses regular Google OAuth
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = type === 'portal' ? '/api/portal/auth/email' : '/api/auth/email';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Failed to send login email');
      setEmailSent(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to send login email');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = type === 'portal' ? '/api/portal/auth/login' : '/api/auth/login';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      
      // Store auth and redirect
      if (type === 'portal') {
        localStorage.setItem('portal_token', data.token);
        router.push('/portal/dashboard');
      } else {
        localStorage.setItem('smart_timing_user', JSON.stringify(data.user));
        router.push('/app');
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCompanyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/company-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });
      if (!response.ok) throw new Error('Failed to submit company request');
      setRequestSubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request');
    } finally {
      setBusy(false);
    }
  };

  const title = type === 'portal' 
    ? (mode === 'register' ? t('portal.register.title', 'Registrer ny bedrift') : t('portal.login.title', 'Bedriftsportal - Logg inn'))
    : t('login.title', 'Logg inn');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          {type === 'portal' && !requestSubmitted && !emailSent && (
            <Button size="small" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t('portal.new_company', 'Ny bedrift?') : t('common.back_to_login', 'Tilbake til innlogging')}
            </Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {requestSubmitted ? (
            <Alert severity="success">
              {t('portal.request_submitted', 'Takk! Vi har mottatt forespørselen din. Du vil få svar på e-post når bedriften din er godkjent.')}
            </Alert>
          ) : emailSent ? (
            <Alert severity="success">
              {t('login.email_sent', 'Vi har sendt deg en innloggingslenke på e-post. Sjekk innboksen din.')}
            </Alert>
          ) : mode === 'register' && type === 'portal' ? (
            <Box component="form" onSubmit={handleCompanyRequest}>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('portal.register_hint', 'Fyll ut skjemaet under for å registrere din bedrift. Vi vil gjennomgå forespørselen og kontakte deg.')}
                </Typography>
                <TextField
                  label={t('fields.company_name', 'Bedriftsnavn')}
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label={t('fields.org_number', 'Organisasjonsnummer')}
                  value={companyForm.orgnr}
                  onChange={(e) => setCompanyForm({ ...companyForm, orgnr: e.target.value })}
                  fullWidth
                  helperText={t('fields.org_number_optional', 'Valgfritt')}
                />
                <TextField
                  type="email"
                  label={t('fields.contact_email', 'Kontakt e-post')}
                  value={companyForm.contact_email}
                  onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={t('fields.contact_phone', 'Telefon')}
                  value={companyForm.contact_phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, contact_phone: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={t('fields.address', 'Adresse')}
                  value={companyForm.address_line}
                  onChange={(e) => setCompanyForm({ ...companyForm, address_line: e.target.value })}
                  fullWidth
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('fields.postal_code', 'Postnummer')}
                    value={companyForm.postal_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, postal_code: e.target.value })}
                    sx={{ width: '30%' }}
                  />
                  <TextField
                    label={t('fields.city', 'By')}
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <TextField
                  type="email"
                  label={t('fields.your_email', 'Din e-post')}
                  value={companyForm.requester_email}
                  onChange={(e) => setCompanyForm({ ...companyForm, requester_email: e.target.value })}
                  required
                  fullWidth
                  helperText={t('fields.your_email_hint', 'Vi sender bekreftelse og oppdateringer til denne e-posten')}
                />
                <Button type="submit" variant="contained" fullWidth disabled={busy}>
                  {t('portal.submit_request', 'Send forespørsel')}
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} centered>
                <Tab label={t('login.google', 'Google')} />
                <Tab label={t('login.email', 'E-post')} />
                <Tab label={t('login.password', 'Passord')} />
              </Tabs>
              
              {tabValue === 0 && (
                <Stack spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {t('login.google_hint', 'Logg inn med Google-kontoen din')}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleGoogleLogin}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('login.continue_google', 'Fortsett med Google')}
                  </Button>
                </Stack>
              )}

              {tabValue === 1 && (
                <Box component="form" onSubmit={handleEmailLogin}>
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      {t('login.email_hint', 'Vi sender deg en magisk lenke for å logge inn')}
                    </Typography>
                    <TextField
                      type="email"
                      label={t('fields.email', 'E-post')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      fullWidth
                      autoFocus
                    />
                    <Button type="submit" variant="contained" fullWidth disabled={busy}>
                      {t('login.send_link', 'Send innloggingslenke')}
                    </Button>
                  </Stack>
                </Box>
              )}

              {tabValue === 2 && (
                <Box component="form" onSubmit={handlePasswordLogin}>
                  <Stack spacing={2}>
                    <TextField
                      type="email"
                      label={t('fields.email', 'E-post')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      fullWidth
                      autoFocus
                    />
                    <TextField
                      type="password"
                      label={t('fields.password', 'Passord')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                    />
                    <Button type="submit" variant="contained" fullWidth disabled={busy}>
                      {t('common.login', 'Logg inn')}
                    </Button>
                  </Stack>
                </Box>
              )}

              {error && <Alert severity="error">{error}</Alert>}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Avbryt')}</Button>
      </DialogActions>
    </Dialog>
  );
}
