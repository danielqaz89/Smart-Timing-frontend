"use client";
import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Card, CardContent, CardHeader, Container, Stack, TextField, Typography, CircularProgress, Autocomplete, Fade, Tabs, Tab, Tooltip, InputAdornment } from "@mui/material";
import GroupIcon from '@mui/icons-material/Group';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SportsIcon from '@mui/icons-material/Sports';
import NatureIcon from '@mui/icons-material/Nature';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Image from "next/image";
import { useProjectInfo } from "../../lib/hooks";
import { searchBrregCompany, getBrregCompanyByOrgnr, KINOA_TILTAK_AS, type BrregCompany } from "../../lib/brreg";
import { createOrUpdateCompany, submitCompanyRequest } from "../../lib/api";

interface Company {
  id: number;
  name: string;
  logo_base64: string | null;
  display_order: number;
}

export default function Setup() {
  const router = useRouter();
  const { projectInfo, createProjectInfo, updateProjectInfo, isLoading } = useProjectInfo();
  const [tab, setTab] = useState<0 | 1>(0); // 0: Konsulent, 1: Bedrift
  const [form, setForm] = useState({
    konsulent: "",
    bedrift: "",
    oppdragsgiver: "",
    tiltak: "",
    periode: "",
    klientId: "",
    mottakerEpost: "",
  });
  const [companyForm, setCompanyForm] = useState({
    name: "",
    orgnr: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);
  // BRREG (konsulent)
  const [brregOptions, setBrregOptions] = useState<BrregCompany[]>([]);
  const [brregLoading, setBrregLoading] = useState(false);
  // BRREG (bedrift tab)
  const [companyBrregOptions, setCompanyBrregOptions] = useState<BrregCompany[]>([]);
  const [companyBrregLoading, setCompanyBrregLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Fetch companies from API
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${apiBase}/api/companies`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (e) {
        console.error('Failed to fetch companies:', e);
      }
    }
    fetchCompanies();
  }, []);

  // Load existing project info from database
  useEffect(() => {
    if (projectInfo) {
      setForm({
        konsulent: projectInfo.konsulent || "",
        bedrift: projectInfo.bedrift || "",
        oppdragsgiver: projectInfo.oppdragsgiver || "",
        tiltak: projectInfo.tiltak || "",
        periode: projectInfo.periode || "",
        klientId: projectInfo.klient_id || "",
        mottakerEpost: "", // Email moved to user_settings
      });
    }
  }, [projectInfo]);

  // Update logo when company changes
  useEffect(() => {
    // Check if it's Kinoa - use Imgur hosted logo
    if (form.bedrift.toLowerCase().includes('kinoa')) {
      setCompanyLogo('https://i.imgur.com/rNb7JRX.png');
    } else {
      // Try to find logo from database for other companies
      const matchedCompany = companies.find(
        c => form.bedrift.toLowerCase().includes(c.name.toLowerCase())
      );
      setCompanyLogo(matchedCompany?.logo_base64 || null);
    }
  }, [form.bedrift, companies]);

// BRREG search with debounce (konsulent form)
useEffect(() => {
  const timer = setTimeout(async () => {
    if (form.bedrift && form.bedrift.length >= 2) {
      setBrregLoading(true);
      const results = await searchBrregCompany(form.bedrift);
      const kinoaMatches = KINOA_TILTAK_AS.navn.toLowerCase().includes(form.bedrift.toLowerCase());
      setBrregOptions(kinoaMatches ? [KINOA_TILTAK_AS, ...results] : results);
      setBrregLoading(false);
    } else {
      setBrregOptions([KINOA_TILTAK_AS]);
    }
  }, 400);
  return () => clearTimeout(timer);
}, [form.bedrift]);

// BRREG search with debounce (bedrift tab)
useEffect(() => {
  const timer = setTimeout(async () => {
    if (companyForm.name && companyForm.name.length >= 2) {
      setCompanyBrregLoading(true);
      const results = await searchBrregCompany(companyForm.name);
      const kinoaMatches = KINOA_TILTAK_AS.navn.toLowerCase().includes(companyForm.name.toLowerCase());
      setCompanyBrregOptions(kinoaMatches ? [KINOA_TILTAK_AS, ...results] : results);
      setCompanyBrregLoading(false);
    } else {
      setCompanyBrregOptions([KINOA_TILTAK_AS]);
    }
  }, 400);
  return () => clearTimeout(timer);
}, [companyForm.name]);

async function save() {
  setSaving(true);
  try {
    if (projectInfo?.id) {
      await updateProjectInfo(projectInfo.id, {
        konsulent: form.konsulent,
        bedrift: form.bedrift,
        oppdragsgiver: form.oppdragsgiver,
        tiltak: form.tiltak,
        periode: form.periode,
        klient_id: form.klientId,
      });
    } else {
      await createProjectInfo({
        konsulent: form.konsulent,
        bedrift: form.bedrift,
        oppdragsgiver: form.oppdragsgiver,
        tiltak: form.tiltak,
        periode: form.periode,
        klient_id: form.klientId,
      });
    }
    router.replace("/");
  } catch (e) {
    console.error("Failed to save project info:", e);
    alert("Kunne ikke lagre prosjektinfo. Prøv igjen.");
  } finally {
    setSaving(false);
  }
}

async function saveCompany() {
  if (!companyForm.name || !companyForm.orgnr) {
    alert('Fyll inn bedriftnavn og org.nr');
    return;
  }
  setSaving(true);
  try {
    await submitCompanyRequest({
      name: companyForm.name,
      orgnr: companyForm.orgnr.replace(/\s/g, ''),
      contact_email: companyForm.email || undefined,
      contact_phone: companyForm.phone || undefined,
      address_line: companyForm.address || undefined,
      postal_code: companyForm.postalCode || undefined,
      city: companyForm.city || undefined,
    });
    alert('Forespørsel sendt til admin. Du får beskjed når den er behandlet.');
  } catch (e) {
    console.error('Failed to submit company request:', e);
    alert('Kunne ikke sende forespørsel. Prøv igjen.');
  } finally {
    setSaving(false);
  }
}

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Update browser tab title dynamically
  useEffect(() => {
    document.title = (tab === 0 ? 'Kom i gang som konsulent' : 'Forespør bedriftstilgang') + ' - Smart Timing';
  }, [tab]);

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%', bgcolor: 'rgba(13,17,23,0.7)', backdropFilter: 'blur(8px)', borderRadius: 3 }}>
        <CardHeader
          sx={{ textAlign: 'center' }}
          title={tab === 0 ? 'Kom i gang som konsulent' : 'Forespør bedriftstilgang'}
          subheader={tab === 0 ? 'Fyll ut prosjektinformasjon for å komme i gang.' : 'Oppgi org.nr så henter vi bedriftsinfo (BRREG), og send forespørsel.'}
        />
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2 }}>
            <Tab label="Konsulent" />
            <Tab label="Bedrift" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={2}>
              {companyLogo && (
                <Fade in={Boolean(companyLogo)}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    py: 2,
                    px: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                    mb: 1
                  }}>
                    <img 
                      src={companyLogo} 
                      alt="Company Logo" 
                      style={{ 
                        maxWidth: '300px', 
                        maxHeight: '120px', 
                        objectFit: 'contain',
                        filter: 'brightness(0.95) contrast(1.05)',
                        mixBlendMode: 'lighten'
                      }}
                    />
                  </Box>
                </Fade>
              )}
              <TextField 
                label="Konsulent" 
                value={form.konsulent} 
                onChange={(e)=>setForm({ ...form, konsulent: e.target.value })} 
                fullWidth 
                required
                aria-label="Konsulent navn"
              />
              <Autocomplete
                freeSolo
                options={brregOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.navn} (${option.organisasjonsnummer})`}
                inputValue={form.bedrift}
                onInputChange={(_, newValue) => setForm({ ...form, bedrift: newValue })}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'object' && newValue) {
                    setForm({ ...form, bedrift: newValue.navn });
                  }
                }}
                loading={brregLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Hvilken bedrift jobber du for?"
                    placeholder="Søk etter bedrift..."
                    required
                    aria-label="Bedrift søk"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {brregLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.organisasjonsnummer}>
                    <Stack>
                      <Typography variant="body2">{option.navn}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Org.nr: {option.organisasjonsnummer}
                        {option.organisasjonsform && ` • ${option.organisasjonsform.beskrivelse}`}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              />
              <TextField 
                label="Oppdragsgiver" 
                value={form.oppdragsgiver} 
                onChange={(e)=>setForm({ ...form, oppdragsgiver: e.target.value })} 
                fullWidth 
                required
                aria-label="Oppdragsgiver navn"
              />
              <Autocomplete<{ label: string; icon: ReactNode } | string, false, false, true>
                freeSolo
                options={[
                  { label: 'Miljøarbeider', icon: <GroupIcon /> },
                  { label: 'Sosialarbeider', icon: <PsychologyIcon /> },
                  { label: 'Aktivitør', icon: <SportsIcon /> },
                  { label: 'Miljøterapeut', icon: <NatureIcon /> },
                  { label: 'Tiltaksleder', icon: <ManageAccountsIcon /> },
                ]}
                value={form.tiltak}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'object' && newValue && 'label' in newValue) {
                    setForm({ ...form, tiltak: newValue.label });
                  } else if (typeof newValue === 'string') {
                    setForm({ ...form, tiltak: newValue });
                  } else {
                    setForm({ ...form, tiltak: '' });
                  }
                }}
                onInputChange={(_, newValue) => setForm({ ...form, tiltak: newValue })}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                renderOption={(props, option) => {
                  if (typeof option === 'string') {
                    return (
                      <Box component="li" {...props} key={option}>
                        <Typography>{option}</Typography>
                      </Box>
                    );
                  }
                  return (
                    <Box component="li" {...props} key={option.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon}
                      <Typography>{option.label}</Typography>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tiltak / Rolle"
                    placeholder="Velg eller skriv din rolle..."
                    aria-label="Tiltak eller rolle"
                    helperText="Velg rolle fra listen eller skriv egen. Påvirker rapportmal."
                  />
                )}
              />
              <TextField 
                label="Periode" 
                value={form.periode} 
                onChange={(e)=>setForm({ ...form, periode: e.target.value })} 
                fullWidth
                placeholder="f.eks. Q1 2025"
                aria-label="Periode"
              />
              <TextField 
                label="Klient ID / Saks nr" 
                value={form.klientId} 
                onChange={(e)=>setForm({ ...form, klientId: e.target.value })} 
                fullWidth
                aria-label="Klient ID eller saksnummer"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Du vil få tildelt et Klient ID/Saks nr fra din tiltaksleder">
                        <HelpOutlineIcon fontSize="small" color="action" />
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              <Typography variant="caption" color="text.secondary">
                E-postinnstillinger konfigureres i hovedvinduet under innstillinger.
              </Typography>
              <Button 
                variant="contained" 
                onClick={save} 
                disabled={saving || !form.konsulent || !form.bedrift || !form.oppdragsgiver}
                sx={{ mt: 1 }}
                aria-label={projectInfo ? 'Oppdater prosjektinfo' : 'Opprett prosjekt'}
              >
                {saving ? <CircularProgress size={24} /> : (projectInfo ? 'Oppdater' : 'Opprett prosjekt')}
              </Button>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
              <TextField
                label="Organisasjonsnummer"
                value={companyForm.orgnr}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setCompanyForm({ ...companyForm, orgnr: digits });
                }}
                onBlur={async () => {
                  const c = companyForm.orgnr.replace(/\s/g, '');
                  if (/^\d{9}$/.test(c)) {
                    const data = await getBrregCompanyByOrgnr(c);
                    if (data) {
                      setCompanyForm((f) => ({
                        ...f,
                        name: data.navn || f.name,
                        address: (data.forretningsadresse?.adresse?.join(', ') || ''),
                        postalCode: data.forretningsadresse?.postnummer || '',
                        city: data.forretningsadresse?.poststed || '',
                      }));
                    }
                  }
                }}
                placeholder="9 siffer"
                fullWidth
                required
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 9 }}
                error={companyForm.orgnr.length > 0 && companyForm.orgnr.length !== 9}
                helperText={companyForm.orgnr.length > 0 && companyForm.orgnr.length !== 9 
                  ? 'Org.nr må være 9 siffer'
                  : 'Skriv org.nr og gå ut av feltet for å hente fra Brønnøysundregistrene'}
              />

              <Autocomplete
                freeSolo
                options={companyBrregOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.navn} (${option.organisasjonsnummer})`}
                inputValue={companyForm.name}
                onInputChange={(_, newValue) => setCompanyForm({ ...companyForm, name: newValue })}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'object' && newValue) {
                    setCompanyForm({
                      ...companyForm,
                      name: newValue.navn,
                      orgnr: newValue.organisasjonsnummer,
                      address: (newValue.forretningsadresse?.adresse?.join(', ') || ''),
                      postalCode: newValue.forretningsadresse?.postnummer || '',
                      city: newValue.forretningsadresse?.poststed || '',
                    });
                  }
                }}
                loading={companyBrregLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Bedrift"
                    placeholder="Søk etter bedrift (BRREG)..."
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {companyBrregLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.organisasjonsnummer}>
                    <Stack>
                      <Typography variant="body2">{option.navn}</Typography>
                      <Typography variant="caption" color="text.secondary">Org.nr: {option.organisasjonsnummer}</Typography>
                    </Stack>
                  </Box>
                )}
              />

              {/* Auto-fylte adressefelt fra BRREG */}
              <TextField
                label="Adresse"
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Postnummer"
                  value={companyForm.postalCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Poststed"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  sx={{ flex: 2 }}
                />
              </Stack>

              <TextField
                label="E-post"
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="Telefon nummer"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                fullWidth
              />

              <Button
                variant="contained"
                onClick={saveCompany}
                disabled={saving || !companyForm.name || !companyForm.orgnr}
              >
                {saving ? <CircularProgress size={24} /> : 'Send forespørsel'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Forespørselen sendes til Smart Timing.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
