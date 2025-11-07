"use client";
import { useEffect, useMemo, useState, forwardRef, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useUserSettings, useQuickTemplates, useProjectInfo } from "../lib/hooks";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Skeleton,
  Menu,
  MenuItem as MuiMenuItem,
  useMediaQuery,
  useTheme,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
} from "@mui/material";
import { useSnackbar } from "notistack";
const ActionsMenuItem = MuiMenuItem;
import SettingsDrawer from "../components/SettingsDrawer";
import MigrationBanner from "../components/MigrationBanner";
import MobileBottomNav from "../components/MobileBottomNav";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SettingsIcon from "@mui/icons-material/Settings";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BarChartIcon from "@mui/icons-material/BarChart";
import dayjs from "dayjs";
import { API_BASE, createLog, deleteLog, fetchLogs, createLogsBulk, webhookTestRelay, deleteLogsMonth, deleteLogsAll, updateLog, sendTimesheet, sendTimesheetViaGmail, getGoogleAuthStatus, initiateGoogleAuth, generateMonthlyReport, archiveLog, unarchiveLog, archiveLogsByMonth, syncToGoogleSheets, exportUserData, deleteUserAccount, type LogRow } from "../lib/api";
import { exportToPDF } from "../lib/pdfExport";
import { useThemeMode } from "../components/ThemeRegistry";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import QuickStampFAB from "../components/QuickStampFAB";
import TemplateManager from "../components/TemplateManager";

// Locale-safe helpers for Timesats input (Norwegian)
const nbFormatter = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function sanitizeRateInput(raw: string) {
  let out = ""; let seenSep = false;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if ((ch === ',' || ch === '.') && !seenSep) { out += ','; seenSep = true; }
  }
  return out;
}
function parseRate(text: string) {
  // Norwegian format uses comma as decimal separator (e.g., "1.234,56" or "500,00")
  // Remove any dots (thousand separator), then replace comma with dot for parseFloat
  const normalized = (text || "").replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}
function formatRate(n: number) {
  try { return nbFormatter.format(n || 0); } catch { return String(n || 0); }
}

// Helper to format YYYYMM as "Month YYYY" in Norwegian
function formatMonthLabel(yyyymm: string): string {
  if (!yyyymm || yyyymm.length !== 6) return yyyymm;
  const year = yyyymm.slice(0, 4);
  const month = yyyymm.slice(4, 6);
  const monthNames = [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember"
  ];
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[monthIndex] || month;
  return `${monthName} ${year}`;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [] as any[];
  const header = lines[0].split(/,|;|\t/).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iDate = idx(["dato","date"]);
  const iStart = idx(["inn","start","start_time"]);
  const iEnd = idx(["ut","end","end_time"]);
  const iPause = idx(["pause","break","break_hours"]);
  const iActivity = idx(["aktivitet","activity"]);
  const iTitle = idx(["tittel","title"]);
  const iProject = idx(["prosjekt","project"]);
  const iPlace = idx(["sted","place"]);
  const iNotes = idx(["notater","notes"]);

  const rows = lines.slice(1).map((ln) => ln.split(/,|;|\t/));
  const out = rows.map((cols) => {
    const d = cols[iDate]?.trim();
    const st = cols[iStart]?.trim();
    const et = cols[iEnd]?.trim();
    const bh = Number(cols[iPause] || 0) || 0;
    const act = cols[iActivity]?.trim();
    return {
      date: dayjs(d).format("YYYY-MM-DD"),
      start: st?.slice(0,5),
      end: et?.slice(0,5),
      breakHours: bh,
      activity: act === "Møte" ? "Meeting" : act === "Arbeid" ? "Work" : (act as any),
      title: cols[iTitle]?.trim() || undefined,
      project: cols[iProject]?.trim() || undefined,
      place: cols[iPlace]?.trim() || undefined,
      notes: cols[iNotes]?.trim() || undefined,
    };
  }).filter(r => r.date && r.start && r.end);

  return out;
}

function CsvImport({ onImported, onToast }: { onImported: () => Promise<void> | void, onToast: (msg: string, sev?: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [ignoreWeekend, setIgnoreWeekend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  function validateRow(r: any) {
    const validDate = dayjs(r.date, "YYYY-MM-DD", true).isValid();
    const time = /^\d{2}:\d{2}$/;
    const validStart = time.test(r.start || "");
    const validEnd = time.test(r.end || "");
    const validBreak = typeof r.breakHours === "number" && r.breakHours >= 0;
    return validDate && validStart && validEnd && validBreak;
  }

  useEffect(() => {
    (async () => {
      if (!file) { setPreview([]); setInvalidCount(0); setTotalCount(0); return; }
      const text = await file.text();
      const rows = parseCsv(text);
      const invalid = rows.filter((r) => !validateRow(r)).length;
      setInvalidCount(invalid);
      setTotalCount(rows.length);
      setPreview(rows.slice(0, 10));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      let rows = parseCsv(text);
      if (ignoreWeekend) rows = rows.filter((r) => {
        const d = dayjs(r.date).day();
        return d !== 0 && d !== 6; // exclude Sun(0) and Sat(6)
      });
      if (rows.length === 0) { onToast("Ingen rader å importere", "warning"); return; }
      await createLogsBulk(rows);
      await onImported();
      onToast(`Import fullført: ${rows.length} rader`, "success");
      setFile(null);
    } catch (e:any) {
      onToast(`Import feilet: ${e?.message || e}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2">Format: Dato, Inn, Ut, Pause, Aktivitet, Tittel, Prosjekt, Sted, Notater</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" component="label">
          Velg fil
          <input hidden type="file" accept=".csv,text/csv,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Button>
        <Typography sx={{ alignSelf: "center" }}>{file?.name ?? "Ingen fil valgt"}</Typography>
      </Stack>
      {file && (
        <>
          <Stack direction="row" spacing={2}>
            <Chip label={`Totalt: ${totalCount}`} />
            <Chip color={invalidCount ? "error" : "success"} label={`Ugyldige: ${invalidCount}`} />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dato</TableCell>
                <TableCell>Inn</TableCell>
                <TableCell>Ut</TableCell>
                <TableCell>Pause</TableCell>
                <TableCell>Aktivitet</TableCell>
                <TableCell>Tittel</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.map((r, i) => (
                <TableRow key={i} sx={{ bgcolor: validateRow(r) ? undefined : "rgba(255,0,0,0.08)" }}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.start}</TableCell>
                  <TableCell>{r.end}</TableCell>
                  <TableCell>{r.breakHours}</TableCell>
                  <TableCell>{r.activity}</TableCell>
                  <TableCell>{r.title}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <Stack direction="row" spacing={2}>
        <Chip label={ignoreWeekend ? "Ignorer helg: På" : "Ignorer helg: Av"} onClick={() => setIgnoreWeekend(!ignoreWeekend)} />
        <Button disabled={!file || busy || invalidCount > 0} variant="contained" onClick={handleImport}>Importer</Button>
      </Stack>
    </Stack>
  );
}

function WebhookSection({ onImported, onToast, settings, updateSettings, monthNav }: { onImported: () => Promise<void> | void, onToast: (msg: string, sev?: any) => void, settings: any, updateSettings: any, monthNav: string }) {
  const [busy, setBusy] = useState(false);
  const active = settings?.webhook_active || false;
  const webhookUrl = settings?.webhook_url || '';
  const sheetUrl = settings?.sheet_url || '';

  async function sendTest() {
    if (!webhookUrl) return;
    setBusy(true);
    try {
      await webhookTestRelay(webhookUrl, { type: "test", message: "Smart Timing testrad" });
    } finally {
      setBusy(false);
    }
  }

  function makeCsvUrl(url: string) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("docs.google.com") && u.pathname.includes("/spreadsheets/d/")) {
        const id = u.pathname.split("/spreadsheets/d/")[1]?.split("/")[0];
        const gidMatch = u.hash.match(/gid=(\d+)/) || u.search.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      }
      return url;
    } catch { return url; }
  }

  async function importFromSheet() {
    if (!sheetUrl) return;
    setBusy(true);
    try {
      const csvUrl = makeCsvUrl(sheetUrl);
      const resp = await fetch(`${API_BASE}/api/proxy/fetch-csv?url=${encodeURIComponent(csvUrl)}`);
      const text = await resp.text();
      const rows = parseCsv(text);
      if (rows.length) await createLogsBulk(rows);
      await onImported();
    } finally {
      setBusy(false);
    }
  }

  async function syncToSheets() {
    if (!sheetUrl) return;
    setBusy(true);
    try {
      const result = await syncToGoogleSheets({ month: monthNav });
      onToast(`Synkronisert ${result.rowsAdded || 0} logger til Google Sheets`, "success");
      await onImported();
    } catch (e: any) {
      onToast(`Synkronisering feilet: ${e?.message || e}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Webhook URL" fullWidth value={webhookUrl} onChange={(e) => updateSettings({webhook_url: e.target.value})} />
        <TextField label="Google Sheets URL (valgfritt)" fullWidth value={sheetUrl} onChange={(e) => updateSettings({sheet_url: e.target.value})} />
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Chip label={active ? "Aktiver synk: På" : "Aktiver synk: Av"} onClick={() => updateSettings({webhook_active: !active})} />
        <Button disabled={!webhookUrl || busy} variant="outlined" onClick={async () => { await sendTest(); onToast("Webhook testrad sendt"); }}>Send testrad</Button>
        <Button disabled={!sheetUrl || busy} variant="outlined" onClick={importFromSheet}>Importer FRA Sheets</Button>
        <Button disabled={!sheetUrl || busy} variant="contained" color="primary" onClick={syncToSheets}>Synkroniser TIL Sheets</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Import krever at arket er delt "Anyone with the link". Synkronisering krever Google OAuth tilkobling og fungerer kun for Kinoa Tiltak AS.
      </Typography>
    </Stack>
  );
}


function MonthBulk({ onDone, onToast }: { onDone: () => Promise<void> | void, onToast: (msg: string, sev?: any) => void }) {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [breakHours, setBreakHours] = useState(0.5);
  const [activity, setActivity] = useState<"Work" | "Meeting">("Work");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);

  function generateRows() {
    const base = dayjs(month + "-01");
    const days = base.daysInMonth();
    const rows: any[] = [];
    for (let d = 1; d <= days; d++) {
      const dd = base.date(d);
      const dow = dd.day();
      if (dow === 0 || dow === 6) continue; // weekdays only
      rows.push({
        date: dd.format("YYYY-MM-DD"),
        start,
        end,
        breakHours,
        activity,
        title: title || undefined,
        project: project || undefined,
        place: place || undefined,
      });
    }
    return rows;
  }

  async function handleInsert() {
    setBusy(true);
    try {
      const rows = generateRows();
      if (rows.length === 0) { onToast("Ingen hverdager i valgt måned", "warning"); return; }
      await createLogsBulk(rows);
      onToast(`Lagt inn ${rows.length} hverdager`, "success");
      await onDone();
    } catch (e:any) {
      onToast(`Feil ved innlegging: ${e?.message || e}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField type="month" label="Måned" InputLabelProps={{ shrink: true }} value={month} onChange={(e) => setMonth(e.target.value)} />
        <TextField type="time" label="Inn" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField type="time" label="Ut" InputLabelProps={{ shrink: true }} value={end} onChange={(e) => setEnd(e.target.value)} />
        <TextField type="number" label="Pause (timer)" value={breakHours} onChange={(e) => setBreakHours(Number(e.target.value) || 0)} />
        <FormControl>
          <InputLabel>Aktivitet</InputLabel>
          <Select label="Aktivitet" value={activity} onChange={(e) => setActivity(e.target.value as any)}>
            <MenuItem value="Work">Arbeid</MenuItem>
            <MenuItem value="Meeting">Møte</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField label="Tittel / Møte" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
        <TextField label="Prosjekt / Kunde" value={project} onChange={(e) => setProject(e.target.value)} fullWidth />
        <TextField label="Sted / Modus" value={place} onChange={(e) => setPlace(e.target.value)} fullWidth />
      </Stack>
      <Button variant="contained" onClick={handleInsert} disabled={busy}>Legg inn for hele måneden</Button>
    </Stack>
  );
}

function ReportGenerator({ month, onToast }: { month: string; onToast: (msg: string, sev?: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [template, setTemplate] = useState<'auto' | 'standard' | 'miljøarbeider'>('auto');
  const [showComposer, setShowComposer] = useState(false);
  const [customIntro, setCustomIntro] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  // Structured sections (Miljøarbeider)
  const [bgTiltak, setBgTiltak] = useState('');
  const [arbeidTiltak, setArbeidTiltak] = useState('');
  const [utviklingEndring, setUtviklingEndring] = useState('');
  const [utfordringer, setUtfordringer] = useState('');
  const [interesserPavirkn, setInteresserPavirkn] = useState('');
  const [fagligVurdering, setFagligVurdering] = useState('');
  const [anbefalinger, setAnbefalinger] = useState('');
  const [detectedNames, setDetectedNames] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<{ original: string; corrected: string; replacements: Array<{ from: string; to: string }> }>({ original: '', corrected: '', replacements: [] });

  // Function to detect potential names in text
  function detectPotentialNames(text: string): string[] {
    if (!text) return [];
    
    // Common Norwegian first names pattern: Capitalized word 2-15 chars
    const words = text.split(/\s+/);
    const potentialNames: string[] = [];
    
    // Norwegian name patterns
    const namePattern = /^[A-ZÆØÅ][a-zæøå]{1,14}$/;
    
    // Common words to exclude (not names)
    const excludeWords = new Set([
      'Dette', 'Denne', 'Gutten', 'Jenta', 'Brukeren', 'Deltakeren', 'Klienten',
      'Personen', 'Ungdom', 'Barnet', 'Familien', 'Gruppen', 'Aktivitet',
      'Møte', 'Arbeid', 'Rapport', 'Periode', 'Måned', 'I', 'Vi', 'De', 'Det',
      'En', 'Et', 'Og', 'Men', 'For', 'Med', 'Hos', 'Til', 'Fra', 'Om',
    ]);
    
    for (const word of words) {
      // Check if word matches name pattern and is not an excluded word
      if (namePattern.test(word) && !excludeWords.has(word)) {
        // Additional check: if followed by another capitalized word, likely a full name
        const index = words.indexOf(word);
        if (index < words.length - 1 && namePattern.test(words[index + 1])) {
          potentialNames.push(`${word} ${words[index + 1]}`);
        } else {
          potentialNames.push(word);
        }
      }
    }
    
    return [...new Set(potentialNames)];
  }

  // Check for names when text changes (miljøarbeider template only)
  useEffect(() => {
    if (template === 'miljøarbeider' || template === 'auto') {
      const introNames = detectPotentialNames(customIntro);
      const notesNames = detectPotentialNames(customNotes);
      setDetectedNames([...new Set([...introNames, ...notesNames])]);
    } else {
      setDetectedNames([]);
    }
  }, [customIntro, customNotes, template]);

  // Show preview of corrections
  function showCorrectionPreview() {
    let correctedIntro = customIntro;
    let correctedNotes = customNotes;
    const replacements: Array<{ from: string; to: string }> = [];
    
    // Function to determine appropriate replacement based on context
    function getReplacementTerm(name: string, context: string): string {
      const lowerContext = context.toLowerCase();
      const lowerName = name.toLowerCase();
      
      // Check if it's a full name (two words)
      const isFullName = name.split(' ').length === 2;
      
      // Context-based replacements
      if (lowerContext.includes('gutt') || lowerContext.includes('han ') || lowerContext.includes('hans ')) {
        return 'gutten';
      }
      if (lowerContext.includes('jent') || lowerContext.includes('hun ') || lowerContext.includes('hennes ')) {
        return 'jenta';
      }
      if (lowerContext.includes('barn')) {
        return 'barnet';
      }
      if (lowerContext.includes('ungdom')) {
        return 'ungdommen';
      }
      if (lowerContext.includes('familie')) {
        return 'familien';
      }
      if (lowerContext.includes('klient') || lowerContext.includes('bruker')) {
        return 'brukeren';
      }
      if (lowerContext.includes('deltaker')) {
        return 'deltakeren';
      }
      
      // Default replacements based on name characteristics
      // Try to preserve capitalization of first letter if at sentence start
      const isStartOfSentence = context.match(new RegExp(`[\.\?\!]\\s*${name}`));
      const defaultTerm = isFullName ? 'Brukeren' : 'personen';
      
      return isStartOfSentence ? defaultTerm.charAt(0).toUpperCase() + defaultTerm.slice(1) : defaultTerm;
    }
    
    // Replace names and track changes
    detectedNames.forEach(name => {
      const introContextMatch = customIntro.match(new RegExp(`.{0,50}${name}.{0,50}`, 'i'));
      const introContext = introContextMatch ? introContextMatch[0] : '';
      const introReplacement = getReplacementTerm(name, introContext);
      
      if (correctedIntro.includes(name)) {
        replacements.push({ from: name, to: introReplacement });
        correctedIntro = correctedIntro.replace(new RegExp(name, 'g'), introReplacement);
      }
    });
    
    detectedNames.forEach(name => {
      const notesContextMatch = customNotes.match(new RegExp(`.{0,50}${name}.{0,50}`, 'i'));
      const notesContext = notesContextMatch ? notesContextMatch[0] : '';
      const notesReplacement = getReplacementTerm(name, notesContext);
      
      if (correctedNotes.includes(name)) {
        if (!replacements.find(r => r.from === name)) {
          replacements.push({ from: name, to: notesReplacement });
        }
        correctedNotes = correctedNotes.replace(new RegExp(name, 'g'), notesReplacement);
      }
    });
    
    // Combine intro and notes for preview
    const originalText = `${customIntro}\n\n${customNotes}`.trim();
    const correctedText = `${correctedIntro}\n\n${correctedNotes}`.trim();
    
    setPreviewChanges({ original: originalText, corrected: correctedText, replacements });
    setShowPreview(true);
  }
  
  // Apply the corrections
  function applyCorrections() {
    const lines = previewChanges.corrected.split('\n\n');
    setCustomIntro(lines[0] || '');
    setCustomNotes(lines[1] || '');
    setShowPreview(false);
    onToast('Navn erstattet med generelle betegnelser', 'success');
  }

  // Check Google auth status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await getGoogleAuthStatus();
        setGoogleConnected(status.isConnected && !status.needsReauth);
      } catch (e) {
        console.error('Failed to check Google auth:', e);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  async function handleGenerateReport() {
    setBusy(true);
    try {
      // Build combined notes (append structured sections)
      const sections: string[] = [];
      if ((template === 'miljøarbeider' || template === 'auto')) {
        const s = [
          { h: 'Arbeid og tiltak som er gjennomført', v: arbeidTiltak },
          { h: 'Utvikling og endring siden oppstart', v: utviklingEndring },
          { h: 'Nåværende utfordringer', v: utfordringer },
          { h: 'Interesser og påvirkningsfaktorer', v: interesserPavirkn },
          { h: 'Faglig vurdering', v: fagligVurdering },
          { h: 'Anbefalinger videre', v: anbefalinger },
        ];
        s.forEach(({h,v}) => { if ((v||'').trim()) sections.push(`## ${h}\n${v.trim()}`); });
      }
      const combinedNotes = [customNotes.trim(), ...sections].filter(Boolean).join('\n\n') || undefined;

      const result = await generateMonthlyReport({
        month,
        template,
        customIntro: customIntro.trim() || (bgTiltak.trim() || undefined),
        customNotes: combinedNotes,
      });
      onToast(`Rapport opprettet! Åpnes i ny fane...`, 'success');
      // Open document in new tab
      window.open(result.documentUrl, '_blank');
      // Reset composer
      setShowComposer(false);
      setCustomIntro('');
      setCustomNotes('');
    } catch (e: any) {
      onToast(`Kunne ikke generere rapport: ${e?.message || e}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return <CircularProgress size={24} />;
  }

  if (!googleConnected) {
    return (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Koble til Google-kontoen din for å generere rapporter automatisk i Google Docs.
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={async () => {
            try {
              const authUrl = await initiateGoogleAuth();
              window.location.href = authUrl;
            } catch (e: any) {
              onToast(`Kunne ikke starte Google-pålogging: ${e?.message || e}`, 'error');
            }
          }}
        >
          🔗 Koble til Google-konto
        </Button>
        <Typography variant="caption" color="text.secondary">
          Sikker pålogging via Google OAuth. Vi får tilgang til å lage dokumenter og sende e-post på dine vegne.
        </Typography>
      </Stack>
    );
  }

  if (!showComposer) {
    return (
      <Stack spacing={2}>
        <Typography variant="body2">
          Generer en profesjonell månedsrapport i Google Docs med prosjektinfo, statistikk og detaljert logg.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => setShowComposer(true)}
        >
          Skriv rapport
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h6" sx={{ flex: 1 }}>Rapportsammenstilling</Typography>
        <Button size="small" onClick={() => setShowComposer(false)}>Avbryt</Button>
      </Stack>

      {/* Template Selection */}
      <FormControl fullWidth>
        <InputLabel>Rapportmal</InputLabel>
        <Select
          label="Rapportmal"
          value={template}
          onChange={(e) => setTemplate(e.target.value as any)}
        >
          <MenuItem value="auto">Automatisk (basert på prosjekt)</MenuItem>
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="miljøarbeider">Miljøarbeider / Sosialarbeider</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="caption" color="text.secondary">
        {template === 'auto' && 'Malen velges automatisk basert på din rolle i prosjektet.'}
        {template === 'standard' && 'Standard rapport med fokus på arbeidstimer og møter.'}
        {template === 'miljøarbeider' && 'Aktivitetsrapport med fokus på klientmøter og sosiale aktiviteter.'}
      </Typography>
      
      {/* Privacy Guidelines for Miljøarbeider */}
      {(template === 'miljøarbeider' || (template === 'auto' && true)) && (
        <Stack spacing={1} sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>⚠️ Personvernretningslinjer for miljøarbeider</Typography>
          <Typography variant="body2" component="div">
            <strong>Viktig:</strong> Rapporter skal ikke inneholde personopplysninger.
          </Typography>
          <Typography variant="body2" component="div">
            • <strong>Ikke bruk navn</strong> på klienter<br/>
            • Bruk heller generelle betegnelser: "Gutten", "Jenta", "Brukeren", "Deltakeren"<br/>
            • Unngå detaljer som kan identifisere personer (alder, adresse, spesifikke situasjoner)<br/>
            • Fokuser på aktiviteter og utvikling, ikke identitet<br/>
            • Vurder anonymisering av steder hvis nødvendig
          </Typography>
          <Typography variant="caption" sx={{ fontStyle: 'italic', mt: 1 }}>
            Disse retningslinjene sikrer GDPR-etterlevelse og beskytter klientenes personvern.
          </Typography>
        </Stack>
      )}
      
      {/* Name Detection Warning */}
      {detectedNames.length > 0 && (template === 'miljøarbeider' || template === 'auto') && (
        <Stack spacing={2} sx={{ 
          p: 2, 
          bgcolor: 'error.light', 
          borderRadius: 1, 
          border: '2px solid', 
          borderColor: 'error.main',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.8 },
          },
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
            🚨 ADVARSEL: Mulige navn oppdaget!
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.dark' }}>
            Teksten din ser ut til å inneholde navn som kan identifisere personer:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
            {detectedNames.map((name, idx) => (
              <Chip 
                key={idx} 
                label={name} 
                color="error" 
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            ))}
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
            Skal vi automatisk erstatte disse navnene med generelle betegnelser?
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              color="success"
              size="small"
              onClick={showCorrectionPreview}
              sx={{ fontWeight: 'bold' }}
            >
              ✅ Fiks automatisk
            </Button>
            <Typography variant="caption" sx={{ alignSelf: 'center', color: 'error.dark', fontStyle: 'italic' }}>
              Eksempel: "{detectedNames[0]}" → "Gutten" / "Jenta" / "Brukeren"
            </Typography>
          </Stack>
        </Stack>
      )}

      <Divider />

      {/* Privacy Guidelines (Miljøarbeider) */}
      {(template === 'miljøarbeider' || template === 'auto') && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <AlertTitle>⚠️ Personvernretningslinjer for miljøarbeider</AlertTitle>
          <Stack spacing={0.5} component="div">
            <Typography variant="body2"><strong>Viktig:</strong> Rapporter skal ikke inneholde personopplysninger.</Typography>
            <Typography variant="body2">• Ikke bruk navn på klienter</Typography>
            <Typography variant="body2">• Bruk generelle betegnelser: «Gutten», «Jenta», «Brukeren», «Deltakeren»</Typography>
            <Typography variant="body2">• Unngå detaljer som kan identifisere personer (alder, adresse, spesifikke situasjoner)</Typography>
            <Typography variant="body2">• Fokuser på aktiviteter og utvikling, ikke identitet</Typography>
            <Typography variant="body2">• Vurder anonymisering av steder ved behov</Typography>
            <Typography variant="caption" color="text.secondary">
              Disse retningslinjene sikrer GDPR‑etterlevelse og beskytter klientenes personvern.
            </Typography>
          </Stack>
        </Alert>
      )}

      {/* Report Contents Info */}
      <Stack spacing={1} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2">Rapporten vil inneholde:</Typography>
        <Typography variant="body2" component="div">
          • Tittel og måned ({month.slice(0,4)}-{month.slice(4,6)})<br/>
          • Prosjektinformasjon<br/>
          • Sammendrag (timer, dager, aktiviteter)<br/>
          • Detaljert logg med alle registreringer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rapporten skal inneholde følgende: Klient informasjon, Oppdragsgiver, Tidsperiode, Miljøarbeider.
        </Typography>
      </Stack>

      {/* Custom Introduction */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">Bakgrunn for tiltaket</Typography>
        <TextField
          multiline
          rows={4}
          placeholder={
            template === 'miljøarbeider' ?
            "Beskriv bakgrunnen for tiltaket og målsettingen.\n\nHusk: Unngå navn og identifiserbar informasjon." :
            "Beskriv bakgrunnen for tiltaket..."
          }
          value={customIntro}
          onChange={(e) => setCustomIntro(e.target.value)}
          fullWidth
          inputProps={{
            spellCheck: true,
            lang: 'nb-NO',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Innledningen vises øverst i rapporten, før prosjektinformasjonen.
          {template === 'miljøarbeider' && ' Husk å anonymisere all informasjon.'}
        </Typography>
      </Stack>


      {/* Structured Sections for Miljøarbeider */}
      {(template === 'miljøarbeider' || template === 'auto') && (
        <Stack spacing={2}>
          <TextField label="Arbeid og tiltak som er gjennomført" multiline rows={3} value={arbeidTiltak} onChange={(e)=>setArbeidTiltak(e.target.value)} fullWidth />
          <TextField label="Utvikling og endring siden oppstart" multiline rows={3} value={utviklingEndring} onChange={(e)=>setUtviklingEndring(e.target.value)} fullWidth />
          <TextField label="Nåværende utfordringer" multiline rows={3} value={utfordringer} onChange={(e)=>setUtfordringer(e.target.value)} fullWidth />
          <TextField label="Interesser og påvirkningsfaktorer" multiline rows={3} value={interesserPavirkn} onChange={(e)=>setInteresserPavirkn(e.target.value)} fullWidth />
          <TextField label="Faglig vurdering" multiline rows={3} value={fagligVurdering} onChange={(e)=>setFagligVurdering(e.target.value)} fullWidth />
          <TextField label="Anbefalinger videre" multiline rows={3} value={anbefalinger} onChange={(e)=>setAnbefalinger(e.target.value)} fullWidth />
        </Stack>
      )}

      {/* Custom Notes */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">Tilleggsnotater (valgfritt)</Typography>
        <TextField
          multiline
          rows={4}
          placeholder={
            template === 'miljøarbeider' ?
            "Legg til notater på slutten av rapporten...\n\nEksempel: Generelle observasjoner om fremgang, utfordringer i arbeidet, behov for oppfølging, samarbeidspartnere involvert, etc.\n\nHusk: Ikke inkluder personidentifiserbar informasjon." :
            "Legg til notater på slutten av rapporten...\n\nEksempel: Refleksjoner, utfordringer, planlagte tiltak for neste måned, etc."
          }
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          fullWidth
          inputProps={{
            spellCheck: true,
            lang: 'nb-NO',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Notater vises nederst i rapporten, etter den detaljerte loggen.
          {template === 'miljøarbeider' && ' Fokuser på generelle mønstre og utvikling, ikke individuelle detaljer.'}
        </Typography>
      </Stack>

      {/* Generate Button */}
      <Stack direction="row" spacing={2}>
        <Button 
          variant="contained" 
          onClick={handleGenerateReport} 
          disabled={busy || (detectedNames.length > 0 && (template === 'miljøarbeider' || template === 'auto'))}
          startIcon={busy ? <CircularProgress size={16} /> : null}
          fullWidth
          color={detectedNames.length > 0 && (template === 'miljøarbeider' || template === 'auto') ? 'error' : 'primary'}
        >
          {busy ? 'Genererer...' : detectedNames.length > 0 && (template === 'miljøarbeider' || template === 'auto') ? 'Fjern navn før generering' : 'Generer Google Docs rapport'}
        </Button>
      </Stack>
      
      {detectedNames.length > 0 && (template === 'miljøarbeider' || template === 'auto') && (
        <Typography variant="caption" color="error" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
          ⚠️ Kan ikke generere rapport med personidentifiserbar informasjon
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        Rapporten opprettes som et nytt Google Docs-dokument som du kan redigere videre.
      </Typography>
      
      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">🔍 Forhåndsvisning av endringer</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="body2">
              Følgende navn vil bli erstattet med generelle betegnelser:
            </Typography>
            
            {/* Replacements list */}
            <Stack spacing={1}>
              {previewChanges.replacements.map((replacement, idx) => (
                <Stack key={idx} direction="row" spacing={2} alignItems="center" sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Chip label={replacement.from} color="error" size="small" sx={{ textDecoration: 'line-through' }} />
                  <Typography>→</Typography>
                  <Chip label={replacement.to} color="success" size="small" sx={{ fontWeight: 'bold' }} />
                </Stack>
              ))}
            </Stack>
            
            {/* Text preview with highlighting */}
            <Stack spacing={2}>
              <Typography variant="subtitle2">Tekst med endringer markert:</Typography>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', maxHeight: 300, overflow: 'auto' }}>
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                  {previewChanges.corrected.split(new RegExp(`(${previewChanges.replacements.map(r => r.to).join('|')})`, 'g')).map((part, idx) => {
                    const isReplacement = previewChanges.replacements.some(r => r.to === part);
                    return isReplacement ? (
                      <span key={idx} style={{ backgroundColor: '#4caf50', color: 'white', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                        {part}
                      </span>
                    ) : (
                      <span key={idx}>{part}</span>
                    );
                  })}
                </Typography>
              </Box>
            </Stack>
            
            {/* Action buttons */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setShowPreview(false)} variant="outlined">
                Avbryt
              </Button>
              <Button onClick={applyCorrections} variant="contained" color="success">
                ✅ Godta endringer
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function SendTimesheet({ month, onToast, settings, updateSettings }: { month: string; onToast: (msg: string, sev?: any) => void; settings: any; updateSettings: any }) {
  const [busy, setBusy] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const recipient = settings?.timesheet_recipient || '';
  const format = settings?.timesheet_format || 'xlsx';

  // Check Google auth status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await getGoogleAuthStatus();
        setGoogleConnected(status.isConnected && !status.needsReauth);
      } catch (e) {
        console.error('Failed to check Google auth:', e);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  async function handleSendGmail() {
    setBusy(true);
    try {
      await sendTimesheetViaGmail({ month, recipientEmail: recipient, format });
      onToast('Timeliste sendt via Gmail', 'success');
    } catch (e:any) {
      onToast(`Kunne ikke sende: ${e?.message || e}`, 'error');
    } finally { setBusy(false); }
  }


  if (checkingAuth) {
    return <CircularProgress size={24} />;
  }

  return (
    <Stack spacing={2}>
      {googleConnected ? (
        <>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Tittel" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} fullWidth />
          <TextField label="Saksnummer (Klient ID)" value={manualCaseId} onChange={(e)=>setManualCaseId(e.target.value)} fullWidth placeholder="f.eks. KLIENT-123" InputProps={{ list: 'case-suggestions' }} />
          <datalist id="case-suggestions">
            {myCases.map((c)=> (<option key={c} value={c} />))}
          </datalist>
            <FormControl>
              <InputLabel>Format</InputLabel>
              <Select label="Format" value={format} onChange={(e)=>updateSettings({timesheet_format: e.target.value})}>
                <MenuItem value="xlsx">XLSX</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Button variant="contained" onClick={handleSendGmail} disabled={busy || !recipient}>Send via Gmail</Button>
          <Typography variant="caption" color="text.secondary">E-posten sendes fra din tilkoblede Google-konto.</Typography>
        </>
      ) : (
        <Stack spacing={1.5} sx={{ p: 2, bgcolor: 'rgba(25,118,210,0.08)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" fontWeight="bold">
            Send timelisten raskere – koble til Google
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={async () => {
              try {
                const authUrl = await initiateGoogleAuth();
                window.location.href = authUrl;
              } catch (e: any) {
                onToast(`Kunne ikke starte Google-pålogging: ${e?.message || e}`, 'error');
              }
            }}
            aria-label="Fortsett med Google"
            sx={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#FFFFFF',
              color: '#1F1F1F',
              border: '1px solid #747775',
              textTransform: 'none',
              fontWeight: 500,
              fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              boxShadow: 'none',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#F7F8F8', boxShadow: 'none' },
            }}
          >
            <Box component="svg" viewBox="0 0 48 48" sx={{ width: 18, height: 18, display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </Box>
            <Typography sx={{ fontSize: 14, lineHeight: '20px' }}>Fortsett med Google</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Vi bruker din Google‑konto for å sende timelisten (Gmail). Du kan koble fra senere i Innstillinger.
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const showToast = (msg: string, sev: any = "success") => enqueueSnackbar(msg, { variant: sev });
  
  // Section refs for mobile navigation
  const stemplingRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const [mobileDialogContent, setMobileDialogContent] = useState<"stamp-work" | "stamp-meeting" | "manual-entry" | "import" | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Onboarding
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onbRateInput, setOnbRateInput] = useState("");
  const [onbStart, setOnbStart] = useState("09:00");
  const [onbEnd, setOnbEnd] = useState("17:00");
  const [onbDays, setOnbDays] = useState<{ [k: number]: boolean }>({ 1: true, 2: true, 3: true, 4: true, 5: true });
  const [onbApplyNow, setOnbApplyNow] = useState(false);
  const [onbBusy, setOnbBusy] = useState(false);
  const [onbChecked, setOnbChecked] = useState(false);
  
  // Database-backed settings
  const { settings, updateSettings: updateSettingsDb, mutate: mutateSettings } = useUserSettings();
  const { templates, createTemplate, deleteTemplate } = useQuickTemplates();
  const { projectInfo, isLoading: projectLoading } = useProjectInfo();
  const canAddWeekends = useMemo(() => (projectInfo?.tiltak || '').toLowerCase().includes('miljøarbeider'), [projectInfo?.tiltak]);
  
  // Wrapper to update settings with toast
  const updateSettings = async (partial: any) => {
    try {
      await updateSettingsDb(partial);
    } catch (e: any) {
      showToast(`Feil ved lagring: ${e?.message || e}`, 'error');
    }
  };

  type UndoAction =
    | { type: "delete"; row: LogRow }
    | { type: "update"; id: string; prev: Partial<LogRow & { start: string; end: string; breakHours: number }> };
  const [undo, setUndo] = useState<UndoAction | null>(null);
  async function handleUndo() {
    if (!undo) return;
    if (undo.type === "delete") {
      const r = undo.row as any;
      await createLog({
        date: r.date,
        start: (r.start_time || "").slice(0,5),
        end: (r.end_time || "").slice(0,5),
        breakHours: Number(r.break_hours || 0),
        activity: (r.activity as any) || "Work",
        title: r.title || undefined,
        project: r.project || undefined,
        place: r.place || undefined,
        notes: r.notes || undefined,
      });
      await mutate();
      showToast("Sletting angret");
    } else if (undo.type === "update") {
      const { id, prev } = undo;
      await updateLog(id, {
        date: prev.date as any,
        start: (prev.start || (prev as any).start_time || "") as any,
        end: (prev.end || (prev as any).end_time || "") as any,
        breakHours: (prev.breakHours as any) ?? (prev.break_hours as any),
        activity: prev.activity as any,
        title: (prev.title as any) ?? null,
        project: (prev.project as any) ?? null,
        place: (prev.place as any) ?? null,
        notes: (prev.notes as any) ?? null,
      });
      await mutate();
      showToast("Endring angret");
    }
    setUndo(null);
  }

  const [quickActivity, setQuickActivity] = useState<"Work" | "Meeting">("Work");
  const [quickProject, setQuickProject] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPlace, setQuickPlace] = useState("");
  const [quickNotes, setQuickNotes] = useState("");

  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [start, setStart] = useState(dayjs().format("HH:mm"));
  const [end, setEnd] = useState(dayjs().format("HH:mm")); // Auto-fill same as start
  const [breakHours, setBreakHours] = useState(0);
  const [expenseCoverage, setExpenseCoverage] = useState(0);
  const [manualActivity, setManualActivity] = useState<"Work" | "Meeting">("Work");
  const [manualTitle, setManualTitle] = useState("");
  const [manualProject, setManualProject] = useState("");
  const [manualPlace, setManualPlace] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualCaseId, setManualCaseId] = useState("");
  const [myCases, setMyCases] = useState<string[]>([]);
  useEffect(() => {
    try {
      const token = localStorage.getItem('company_token');
      if (!token) return;
      (async () => {
        const res = await fetch(`${API_BASE}/api/company/my-cases`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && Array.isArray(data.cases)) setMyCases(data.cases.map((c:any)=>c.case_id));
      })();
    } catch {}
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>(settings?.view_mode || 'month');
  
  // Sync view mode from settings
  useEffect(() => {
    if (settings?.view_mode) {
      setViewMode(settings.view_mode as 'month' | 'week');
    }
  }, [settings?.view_mode]);
  
  // Update view mode in database
  const updateViewMode = async (mode: 'month' | 'week') => {
    setViewMode(mode);
    try {
      await updateSettings({ view_mode: mode });
    } catch (e) {
      console.error('Failed to save view mode:', e);
    }
  };

  // Settings from database with fallbacks
  const rate = settings?.hourly_rate || 0;
  // Open onboarding once if not completed
  useEffect(() => {
    if (!onbChecked && settings && projectInfo !== undefined) {
      setOnbChecked(true);
      if (!settings.onboarding_done) {
        setOnbRateInput(formatRate(rate));
        setOnboardingOpen(true);
      }
    }
  }, [settings, projectInfo, rate, onbChecked]);
  const [rateInput, setRateInput] = useState<string>("");
  useEffect(() => { setRateInput(formatRate(rate)); }, [rate]);
  const paidBreak = settings?.paid_break || false;
  const taxPct = Number(settings?.tax_pct) || 35;
  // Month navigation: local state for instant UI, persisted to settings
  const [monthNavLocal, setMonthNavLocal] = useState<string>(settings?.month_nav || dayjs().format("YYYYMM"));
  useEffect(() => {
    if (settings?.month_nav && settings.month_nav !== monthNavLocal) {
      setMonthNavLocal(settings.month_nav);
    }
  }, [settings?.month_nav]);

  const [calcBusy, setCalcBusy] = useState(false);
  const getKey = (index: number) => {
    const m = dayjs(monthNavLocal + "01").subtract(index, "month").format("YYYYMM");
    return ["logs", m] as const;
  };
  const { data, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite(
    getKey,
    ([, m]) => fetchLogs(m, showArchived),
    { revalidateOnFocus: false }
  );
  const allLogs: LogRow[] = (data || []).flat();
  
  // Filter logs based on search query and view mode
  const logs = useMemo(() => {
    let filtered = allLogs;
    
    // Apply week filter if in week mode
    if (viewMode === 'week') {
      const startOfWeek = dayjs().startOf('week');
      const endOfWeek = dayjs().endOf('week');
      filtered = filtered.filter(l => {
        const logDate = dayjs(l.date);
        return logDate.isAfter(startOfWeek.subtract(1, 'day')) && logDate.isBefore(endOfWeek.add(1, 'day'));
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.title?.toLowerCase().includes(q) ||
        l.project?.toLowerCase().includes(q) ||
        l.place?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q) ||
        l.activity?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [allLogs, searchQuery, viewMode]);
  
  // Detect active stamp (today's entry with same start/end time)
  const activeStamp = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return logs.find(l => l.date === today && l.start_time === l.end_time);
  }, [logs]);

  // Timer for active stamp
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  useEffect(() => {
    if (!activeStamp) {
      setElapsedTime("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      const start = dayjs(`${activeStamp.date} ${activeStamp.start_time}`);
      const now = dayjs();
      const diff = now.diff(start, 'second');
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeStamp]);

  // Live clock (Europe/Oslo, fallback to local)
  const [nowTime, setNowTime] = useState<string>(dayjs().format('HH:mm:ss'));
  useEffect(() => {
    const update = () => {
      try {
        const s = new Intl.DateTimeFormat('nb-NO', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          timeZone: 'Europe/Oslo'
        }).format(new Date());
        // Ensure HH:MM:SS
        setNowTime(s.replace(/\./g, ':'));
      } catch {
        setNowTime(dayjs().format('HH:mm:ss'));
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  
  const totalHours = useMemo(() => {
    return logs.reduce((sum, r) => {
      const d = dayjs(r.date);
      const dow = d.day();
      if (dow === 0 || dow === 6) return sum; // Mon–Fri only
      const start = dayjs(`${r.date} ${r.start_time}`);
      const end = dayjs(`${r.date} ${r.end_time}`);
      const breakUsed = paidBreak ? 0 : Number(r.break_hours || 0);
      const diff = end.diff(start, "minute") / 60 - breakUsed;
      return sum + Math.max(0, diff);
    }, 0);
  }, [logs, paidBreak]);
  
  const totalExpenses = useMemo(() => {
    return logs.reduce((sum, r) => {
      const d = dayjs(r.date);
      const dow = d.day();
      if (dow === 0 || dow === 6) return sum; // Mon–Fri only
      return sum + Number(r.expense_coverage || 0);
    }, 0);
  }, [logs]);

  // Extra expenses added by user (not per-row), nb-NO formatted input
  const [extraExpensesInput, setExtraExpensesInput] = useState<string>("");
  const extraExpenses = useMemo(() => {
    const n = parseRate(extraExpensesInput);
    return Number.isFinite(n) ? n : 0;
  }, [extraExpensesInput]);
  useEffect(() => {
    setCalcBusy(true);
    const t = setTimeout(() => setCalcBusy(false), 150);
    return () => clearTimeout(t);
  }, [taxPct, rate, paidBreak, logs]);

  // Only show skeleton if busy persists to avoid flicker
  const [showCalcSkeleton, setShowCalcSkeleton] = useState(false);
  useEffect(() => {
    if (calcBusy) {
      const h = setTimeout(() => setShowCalcSkeleton(true), 400);
      return () => { clearTimeout(h); setShowCalcSkeleton(false); };
    } else {
      setShowCalcSkeleton(false);
    }
  }, [calcBusy]);

  async function handleQuickStamp() {
    await createLog({
      date: dayjs().format("YYYY-MM-DD"),
      start: dayjs().format("HH:mm"),
      end: dayjs().format("HH:mm"),
      breakHours: 0,
      activity: quickActivity,
      title: quickTitle || undefined,
      project: quickProject || undefined,
      place: quickPlace || undefined,
      notes: quickNotes || undefined,
    });
    setQuickNotes("");
    await mutate();
    showToast("Stempling registrert");
  }

  // Archive handlers
  async function handleArchive(row: LogRow) {
    try {
      await archiveLog(row.id);
      await mutate();
      showToast("Logg arkivert");
    } catch (e: any) {
      showToast(`Arkivering feilet: ${e?.message || e}`, "error");
    }
  }

  // Row action menu (mobile)
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);
  const [actionRow, setActionRow] = useState<LogRow | null>(null);
  const openActions = (e: React.MouseEvent<HTMLElement>, row: LogRow) => { setActionAnchor(e.currentTarget); setActionRow(row); };
  const closeActions = () => { setActionAnchor(null); setActionRow(null); };

  async function handleUnarchive(row: LogRow) {
    try {
      await unarchiveLog(row.id);
      await mutate();
      showToast("Logg gjenopprettet");
    } catch (e: any) {
      showToast(`Gjenoppretting feilet: ${e?.message || e}`, "error");
    }
  }

  async function handleArchiveMonth() {
    try {
      await archiveLogsByMonth(monthNavLocal);
      await mutate();
      showToast(`Alle logger for ${formatMonthLabel(monthNavLocal)} arkivert`, "success");
    } catch (e: any) {
      showToast(`Arkivering feilet: ${e?.message || e}`, "error");
    }
  }

  // Quick stamp from FAB
  async function handleQuickStampFromFAB(template: any, caseId?: string) {
    await createLog({
      date: dayjs().format("YYYY-MM-DD"),
      start: dayjs().format("HH:mm"),
      end: dayjs().format("HH:mm"),
      breakHours: 0,
      activity: template.activity,
      title: template.title || undefined,
      project: template.project || undefined,
      place: template.place || undefined,
      notes: undefined,
      caseId: caseId || undefined,
    });
    await mutate();
    showToast(`Stemplet inn: ${template.activity === 'Work' ? 'Arbeid' : 'Møte'}`);
  }

  // Stamp out from FAB
  async function handleStampOutFromFAB() {
    if (!activeStamp) return;
    await updateLog(activeStamp.id, {
      date: activeStamp.date,
      start: activeStamp.start_time?.slice(0,5),
      end: dayjs().format("HH:mm"),
      breakHours: 0,
      activity: activeStamp.activity as any,
      title: activeStamp.title || null,
      project: activeStamp.project || null,
      place: activeStamp.place || null,
      notes: activeStamp.notes || null,
      expenseCoverage: 0,
    });
    await mutate();
    showToast("Stemplet ut");
  }

  async function handleAddManual() {
    // Validation
    if (!dayjs(date, "YYYY-MM-DD", true).isValid()) {
      showToast("Ugyldig dato format. Bruk YYYY-MM-DD", "error");
      return;
    }

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(start)) {
      showToast("Ugyldig tidsformat for 'Inn'. Bruk HH:MM", "error");
      return;
    }
    if (!timePattern.test(end)) {
      showToast("Ugyldig tidsformat for 'Ut'. Bruk HH:MM", "error");
      return;
    }

    if (end < start) {
      showToast("'Ut' må være etter 'Inn'", "error");
      return;
    }

    if (breakHours < 0) {
      showToast("Pause kan ikke være negativ", "error");
      return;
    }

    if (expenseCoverage < 0) {
      showToast("Utgiftsdekning kan ikke være negativ", "error");
      return;
    }

    // All validation passed, submit
    try {
      await createLog({
        date,
        start,
        end,
        breakHours: Number(breakHours) || 0,
        expenseCoverage: Number(expenseCoverage) || 0,
        activity: manualActivity,
        title: manualTitle || undefined,
        project: manualProject || undefined,
        place: manualPlace || undefined,
        notes: manualNotes || undefined,
        caseId: manualCaseId || undefined,
      });
      // Clear form after submit
      setDate(dayjs().format("YYYY-MM-DD"));
      setStart(dayjs().format("HH:mm"));
      setEnd(dayjs().format("HH:mm"));
      setBreakHours(0);
      setExpenseCoverage(0);
      setManualTitle("");
      setManualProject("");
      setManualPlace("");
      setManualNotes("");
      await mutate();
      showToast("Rad lagt til");
    } catch (e: any) {
      showToast(`Feil ved lagring: ${e?.message || e}`, "error");
    }
  }

  async function handleDelete(row: LogRow) {
    await deleteLog(row.id);
    await mutate();
    setUndo({ type: "delete", row });
    const key = enqueueSnackbar("Rad slettet", {
      variant: "info",
      autoHideDuration: 5000,
      action: () => (
        <Button color="secondary" size="small" onClick={async () => { await handleUndo(); closeSnackbar(key as any); }}>Angre</Button>
      )
    } as any);
  }

  async function handleBulkDelete() {
    if (!confirm(`Sikker på at du vil slette ${selectedIds.size} rader?`)) return;
    for (const id of selectedIds) {
      await deleteLog(id);
    }
    await mutate();
    showToast(`${selectedIds.size} rader slettet`, "success");
    setSelectedIds(new Set());
    setBulkMode(false);
  }

  function toggleSelection(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  function selectAll() {
    setSelectedIds(new Set(logs.map(l => l.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const parentRef = useMemo(() => ({ current: null as any }), []);

  // Responsive helpers
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));

  function weekdayShort(dateStr: string) {
    if (!dateStr) return '';
    const d = dayjs(dateStr).day();
    const names = ['Søn','Man','Tir','Ons','Tor','Fre','Lør'];
    return names[d] || '';
  }

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  function startEdit(r: LogRow) {
    setEditingId(r.id);
    setEditForm({
      date: r.date,
      start: r.start_time?.slice(0,5) || "",
      end: r.end_time?.slice(0,5) || "",
      breakHours: Number(r.break_hours || 0),
      expenseCoverage: Number(r.expense_coverage || 0),
      activity: (r.activity as any) || "Work",
      title: r.title || "",
      project: r.project || "",
      place: r.place || "",
      notes: r.notes || "",
    });
  }
  function cancelEdit() { setEditingId(null); setEditForm({}); }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel edit
      if (e.key === 'Escape' && editingId) {
        cancelEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId]);
  async function saveEdit(id: string, prevRow?: LogRow) {
    if (prevRow) {
      setUndo({ type: "update", id, prev: prevRow as any });
      const key = enqueueSnackbar("Endring lagret", {
        variant: "success",
        autoHideDuration: 5000,
        action: () => (
          <Button color="secondary" size="small" onClick={async () => { await handleUndo(); closeSnackbar(key as any); }}>Angre</Button>
        )
      } as any);
    }
    await updateLog(id, {
      ...editForm,
      title: editForm.title || null,
      project: editForm.project || null,
      place: editForm.place || null,
      notes: editForm.notes || null,
      expenseCoverage: editForm.expenseCoverage || 0,
    });
    await mutate();
    showToast("Rad oppdatert");
    cancelEdit();
  }

  // Infinite scroll: load previous month when near bottom
  useEffect(() => {
    const el = parentRef.current as HTMLElement | null;
    if (!el) return;
    function onScroll() {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && !isValidating) {
        setSize((s) => s + 1);
      }
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [parentRef, isValidating, setSize]);

  // Keyboard shortcuts for month navigation (only when not typing in input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === "ArrowLeft") {
        const prev = dayjs(monthNavLocal + "01").subtract(1, "month").format("YYYYMM");
        setMonthNavLocal(prev);
        updateSettings({month_nav: prev});
      }
      if (e.key === "ArrowRight") {
        const next = dayjs(monthNavLocal + "01").add(1, "month").format("YYYYMM");
        setMonthNavLocal(next);
        updateSettings({month_nav: next});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [monthNavLocal, updateSettings]);

  // Setup gate: redirect to /setup if no project info in database
  const router = useRouter();
  const [hasCheckedSetup, setHasCheckedSetup] = useState(false);
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false);
  
  useEffect(() => {
    // Only check once when loading is complete
    if (!projectLoading && !hasCheckedSetup) {
      setHasCheckedSetup(true);
      if (!projectInfo) {
        router.replace('/setup');
      }
    }
  }, [projectInfo, projectLoading, router, hasCheckedSetup]);

  // Initialize month_nav from project periode if not set
  useEffect(() => {
    if (projectInfo && !hasInitializedMonth && (!monthNavLocal || monthNavLocal === dayjs().format("YYYYMM"))) {
      const periode = projectInfo.periode;
      if (periode) {
        // Try to parse periode like "Desember 2024", "Q1 2025", "Januar 2025", etc.
        const parsed = parsePeriodeToYYYYMM(periode);
        if (parsed && parsed !== monthNavLocal) {
          setMonthNavLocal(parsed);
          updateSettings({ month_nav: parsed });
        }
      }
      setHasInitializedMonth(true);
    }
  }, [projectInfo, monthNavLocal, hasInitializedMonth, updateSettings]);

  // Helper to parse periode text to YYYYMM format
  function parsePeriodeToYYYYMM(periode: string): string | null {
    const lower = periode.toLowerCase().trim();
    
    // Norwegian month names
    const months: Record<string, string> = {
      'januar': '01', 'jan': '01',
      'februar': '02', 'feb': '02',
      'mars': '03', 'mar': '03',
      'april': '04', 'apr': '04',
      'mai': '05', 'may': '05',
      'juni': '06', 'jun': '06',
      'juli': '07', 'jul': '07',
      'august': '08', 'aug': '08',
      'september': '09', 'sep': '09',
      'oktober': '10', 'okt': '10', 'oct': '10',
      'november': '11', 'nov': '11',
      'desember': '12', 'des': '12', 'dec': '12',
    };
    
    // Extract year (4 digits)
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : dayjs().format('YYYY');
    
    // Try to find month name
    for (const [name, num] of Object.entries(months)) {
      if (lower.includes(name)) {
        return `${year}${num}`;
      }
    }
    
    // Check for Q1, Q2, Q3, Q4 format
    if (lower.match(/q[1-4]/)) {
      const quarter = lower.match(/q([1-4])/)?.[1];
      if (quarter) {
        const monthMap: Record<string, string> = { '1': '01', '2': '04', '3': '07', '4': '10' };
        return `${year}${monthMap[quarter]}`;
      }
    }
    
    return null;
  }

  // Mobile navigation handlers
  const handleMobileNavigate = (section: "home" | "logs" | "stats" | "settings") => {
    if (section === "settings") {
      setSettingsOpen(true);
      return;
    }
    const refs = {
      home: stemplingRef,
      logs: logsRef,
      stats: statsRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMobileQuickAction = (action: "stamp-work" | "stamp-meeting" | "manual-entry" | "import") => {
    if (action === "stamp-work") {
      setQuickActivity("Work");
      stemplingRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "stamp-meeting") {
      setQuickActivity("Meeting");
      stemplingRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "manual-entry") {
      setManualOpen(true);
    } else if (action === "import") {
      importRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Show loading state while checking project info to prevent flicker
  if (projectLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only" 
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        {isLoading ? 'Laster data...' : `${logs.length} loggføringer lastet for ${monthNavLocal}`}
      </div>
      <MigrationBanner onComplete={() => mutateSettings()} />
      <Stack 
        direction={{ xs: "column", sm: "row" }} 
        justifyContent="space-between" 
        alignItems={{ xs: "stretch", sm: "center" }} 
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Smart Stempling</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: "center", sm: "flex-end" }}>
          <IconButton onClick={useThemeMode().toggleMode} size="small" title="Bytt tema">
            {useThemeMode().mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Link href="/reports" passHref legacyBehavior>
            <Button 
              variant="outlined" 
              size="small"
              aria-label="Se rapporter"
              title="Se rapporter"
            >
              Rapporter
            </Button>
          </Link>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<BarChartIcon fontSize="small" />}
            aria-label="Åpne nøkkeltall"
            title="Månedsfilter og nøkkeltall"
            onClick={() => setStatsOpen(true)}
          >
            Nøkkeltall
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            aria-label="Åpne avanserte verktøy"
            title="Avanserte verktøy"
            onClick={() => setAdvancedOpen(true)}
          >
            Avanserte verktøy
          </Button>
          <Link href="/setup" passHref legacyBehavior>
            <Button 
              variant="outlined" 
              size="small"
              aria-label="Rediger prosjektinformasjon"
              title="Rediger prosjektinformasjon"
            >
              Prosjekt
            </Button>
          </Link>
          <SettingsDrawer />
        </Stack>
      </Stack>

      {/* Project Info Banner */}
      {projectInfo && (
        <Card sx={{ mb: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Konsulent</Typography>
                <Typography variant="body1" fontWeight="medium">{projectInfo.konsulent}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Bedrift</Typography>
                <Typography variant="body1" fontWeight="medium">{projectInfo.bedrift}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">Oppdragsgiver</Typography>
                <Typography variant="body1" fontWeight="medium">{projectInfo.oppdragsgiver}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack direction="row" spacing={1}>
                  {projectInfo.tiltak && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Tiltak</Typography>
                      <Typography variant="body2">{projectInfo.tiltak}</Typography>
                    </Box>
                  )}
                  {projectInfo.periode && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Periode</Typography>
                      <Typography variant="body2">{projectInfo.periode}</Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} md={8} lg={6} ref={stemplingRef}>
          <Card>
            <CardHeader title="Stempling" />
            <CardContent>
              <Stack spacing={2} alignItems="center">
                {/* Timer display */}
                <Box sx={{ p: 2, bgcolor: activeStamp ? 'success.light' : 'action.hover', borderRadius: 1, width: '100%' }}>
                  <Stack spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      Tid
                    </Typography>
                    <Typography variant="h3" fontWeight="bold" color={activeStamp ? 'success.dark' : 'text.primary'}>
                      {activeStamp ? elapsedTime : nowTime}
                    </Typography>
                    {activeStamp && (
                      <Typography variant="caption" color="success.dark">
                        Stemplet inn: {activeStamp.start_time?.slice(0,5)} · {activeStamp.activity === 'Work' ? 'Arbeid' : 'Møte'}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* Aktivitet */}
                <FormControl fullWidth>
                  <InputLabel>Aktivitet</InputLabel>
                  <Select
                    label="Aktivitet"
                    value={quickActivity}
                    onChange={(e) => setQuickActivity(e.target.value as any)}
                  >
                    <MenuItem value="Work">Arbeid</MenuItem>
                    <MenuItem value="Meeting">Møte</MenuItem>
                  </Select>
                </FormControl>

                {/* Periode: Måned */}
                <TextField
                  type="month"
                  label="Periode (Måned)"
                  InputLabelProps={{ shrink: true }}
                  value={dayjs(monthNavLocal + '01').format('YYYY-MM')}
                  onChange={(e) => {
                    const val = (e.target.value || '').replace(/[^0-9-]/g, '');
                    const yyyymm = val.replace('-', '').slice(0,6);
                    if (yyyymm.length === 6) { setMonthNavLocal(yyyymm); updateSettings({ month_nav: yyyymm }); }
                  }}
                  fullWidth
                />

                {/* Stamp button */}
                {activeStamp ? (
                  <Button variant="contained" color="error" onClick={handleStampOutFromFAB} size="large" sx={{ py: 1.5, width: '100%' }}>
                    Stemple UT
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleQuickStamp} size="large" sx={{ py: 1.5, width: '100%' }}>
                    Stemple INN
                  </Button>
                )}

                {/* Manual entry opener */}
                <Button variant="outlined" onClick={() => setManualOpen(true)} sx={{ width: '100%' }}>
                  Legg til manuelt
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Nøkkeltall (Dialog) */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Månedsfilter og nøkkeltall</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" onClick={() => { const next = dayjs(monthNavLocal+"01").subtract(1, "month").format("YYYYMM"); setMonthNavLocal(next); updateSettings({ month_nav: next }); }}>{"<"}</Button>
              <TextField 
                type="month"
                label="Måned"
                InputLabelProps={{ shrink: true }}
                value={dayjs(monthNavLocal + '01').format('YYYY-MM')}
                onChange={(e) => {
                  const val = (e.target.value || '').replace(/[^0-9-]/g, '');
                  const yyyymm = val.replace('-', '').slice(0,6);
                  if (yyyymm.length === 6) { setMonthNavLocal(yyyymm); updateSettings({ month_nav: yyyymm }); }
                }}
              />
              <Button size="small" onClick={() => { const next = dayjs(monthNavLocal+"01").add(1, "month").format("YYYYMM"); setMonthNavLocal(next); updateSettings({ month_nav: next }); }}>{">"}</Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Chip 
                label="Uke"
                size="small" 
                onClick={() => updateViewMode('week')}
                color={viewMode === 'week' ? "primary" : "default"}
                variant={viewMode === 'week' ? "filled" : "outlined"}
              />
              <Chip 
                label="Måned"
                size="small" 
                onClick={() => updateViewMode('month')}
                color={viewMode === 'month' ? "primary" : "default"}
                variant={viewMode === 'month' ? "filled" : "outlined"}
              />
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Chip 
                label="Denne måneden" 
                size="small" 
                onClick={() => { updateViewMode('month'); const cur = dayjs().format("YYYYMM"); setMonthNavLocal(cur); updateSettings({month_nav: cur}); }}
                color={monthNavLocal === dayjs().format("YYYYMM") ? "primary" : "default"}
              />
              <Chip 
                label="Forrige måned" 
                size="small" 
                onClick={() => { updateViewMode('month'); const prev = dayjs().subtract(1, "month").format("YYYYMM"); setMonthNavLocal(prev); updateSettings({month_nav: prev}); }}
                color={monthNavLocal === dayjs().subtract(1, "month").format("YYYYMM") ? "primary" : "default"}
              />
              <Chip 
                label="Dette året" 
                size="small" 
                onClick={() => { updateViewMode('month'); const start = dayjs().startOf("year").format("YYYYMM"); setMonthNavLocal(start); updateSettings({month_nav: start}); }}
              />
            </Stack>
            <Divider />
            <Typography variant="body2">Totale timer (man–fre)</Typography>
            <Typography variant="h4">{totalHours.toFixed(2)}</Typography>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="body2">Arbeid</Typography>
                <Typography variant="h6">{logs.filter(l => l.activity === "Work").length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2">Møter</Typography>
                <Typography variant="h6">{logs.filter(l => l.activity === "Meeting").length}</Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip label={paidBreak ? "Betalt pause" : "Ubetalt pause"} onClick={() => updateSettings({paid_break: !paidBreak})} />
              <Typography variant="caption" color="text.secondary">Ved betalt pause trekkes ikke pause fra timene.</Typography>
            </Stack>
            <TextField
              label="Timesats (kr/t)"
              value={rateInput}
              inputMode="decimal"
              onChange={(e) => {
                const v = sanitizeRateInput(e.target.value);
                setRateInput(v);
                const n = parseRate(v);
                if (!isNaN(n)) updateSettings({ hourly_rate: n });
              }}
              onBlur={() => setRateInput(formatRate(rate))}
            />
            <Typography variant="body2">Estimert lønn (man–fre)</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {showCalcSkeleton ? (
                <Skeleton variant="text" width={140} height={32} />
              ) : (
                <Typography variant="h5">{(rate * totalHours).toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })}</Typography>
              )}
            </Stack>
            <Typography variant="body2">Utgiftsdekning</Typography>
            <Typography variant="h6">{totalExpenses.toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })}</Typography>
            <TextField 
              label="Ekstra utgifter (kr)"
              value={extraExpensesInput}
              inputMode="decimal"
              onChange={(e) => setExtraExpensesInput(sanitizeRateInput(e.target.value))}
              onBlur={() => {
                const n = parseRate(extraExpensesInput);
                if (!isNaN(n)) setExtraExpensesInput(formatRate(n));
              }}
            />
            <Typography variant="body2">Total utbetaling</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {showCalcSkeleton ? (
                <Skeleton variant="text" width={180} height={32} />
              ) : (
                <Typography variant="h5" color="primary">{(rate * totalHours + totalExpenses + extraExpenses).toLocaleString("no-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })}</Typography>
              )}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button variant="outlined" color="info" startIcon={<Inventory2Icon />} onClick={handleArchiveMonth}>Arkiver denne måneden</Button>
              <Button variant="outlined" color="warning" onClick={async () => { await deleteLogsMonth(dayjs().format("YYYYMM")); showToast("Denne måneden nullstilt", "success"); await mutate(); }}>Nullstill denne måneden</Button>
              <Button variant="outlined" color="error" onClick={async () => { if (confirm("Sikker på at du vil slette hele datasettet?")) { await deleteLogsAll(); showToast("Hele datasettet er nullstilt", "success"); await mutate(); } }}>Nullstill hele datasettet</Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Send inn timeliste" />
            <CardContent>
              <SendTimesheet month={monthNavLocal} onToast={showToast} settings={settings} updateSettings={updateSettings} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Skriv en rapport for måneden" />
            <CardContent>
              <ReportGenerator month={monthNavLocal} onToast={showToast} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} ref={logsRef}>
        <Card>
          <CardHeader 
            title={`Logg for ${formatMonthLabel(monthNavLocal)}`}
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Vis arkiverte</Typography>
                  <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={(e) => setShowArchived(e.target.checked)}
                    style={{ cursor: 'pointer', width: 18, height: 18 }}
                  />
                </Stack>
                {bulkMode && selectedIds.size > 0 && (
                  <Button 
                    variant="contained" 
                    color="error"
                    size="small" 
                    onClick={handleBulkDelete}
                  >
                    Slett {selectedIds.size}
                  </Button>
                )}
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedIds(new Set());
                  }}
                >
                  {bulkMode ? 'Avbryt' : 'Velg flere'}
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => exportToPDF(allLogs, monthNavLocal, projectInfo, settings)}
                  disabled={allLogs.length === 0}
                >
                  Eksporter PDF
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
              <TextField 
                placeholder="Søk i logger (tittel, prosjekt, sted, notater, aktivitet)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                size="small"
              />
              {bulkMode && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={selectAll}>Velg alle</Button>
                  <Button size="small" onClick={deselectAll}>Fjern alle</Button>
                </Stack>
              )}
            </Stack>
            <div style={{ height: 360, overflow: 'auto' }} ref={parentRef}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                <TableRow>
                  {bulkMode && <TableCell padding="checkbox" />}
                  <TableCell sx={{ width: 64 }}>Dag</TableCell>
                  <TableCell sx={{ width: 80 }}>Dato</TableCell>
                  <TableCell sx={{ width: 84 }}>Inn</TableCell>
                  <TableCell sx={{ width: 84 }}>Ut</TableCell>
                  <TableCell sx={{ width: 72 }}>Pause</TableCell>
                  <TableCell sx={{ width: 100 }}>Aktivitet</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Tittel</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Prosjekt</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Sted</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Notater</TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>Utgifter</TableCell>
                  <TableCell align="right" sx={{ width: { xs: 56, md: 140 } }}>Handlinger</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((vi) => {
                    const r = logs[vi.index];
                    return (
                      <div key={r.id} style={{ position: 'absolute', top: vi.start, left: 0, right: 0 }}>
                        <TableRow hover sx={{ bgcolor: vi.index % 2 ? 'action.hover' : undefined }}>
                          {bulkMode && editingId !== r.id && (
                            <TableCell padding="checkbox">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(r.id)} 
                                onChange={() => toggleSelection(r.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </TableCell>
                          )}
                          {editingId === r.id ? (
                            <>
                              {bulkMode && <TableCell />}
                              <TableCell>{weekdayShort(editForm.date)}</TableCell>
                              <TableCell><TextField type="date" value={editForm.date} onChange={(e)=>setEditForm({...editForm, date: e.target.value})} size="small" /></TableCell>
                              <TableCell><TextField type="time" value={editForm.start} onChange={(e)=>setEditForm({...editForm, start: e.target.value})} size="small" sx={{ maxWidth: 96 }} /></TableCell>
                              <TableCell><TextField type="time" value={editForm.end} onChange={(e)=>setEditForm({...editForm, end: e.target.value})} size="small" sx={{ maxWidth: 96 }} /></TableCell>
                              <TableCell><TextField type="number" value={editForm.breakHours} onChange={(e)=>setEditForm({...editForm, breakHours: Number(e.target.value)})} size="small" sx={{ maxWidth: 96 }} /></TableCell>
                              <TableCell>
                                <FormControl size="small" fullWidth>
                                  <Select value={editForm.activity} onChange={(e)=>setEditForm({...editForm, activity: e.target.value})}>
                                    <MenuItem value="Work">Arbeid</MenuItem>
                                    <MenuItem value="Meeting">Møte</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}><TextField value={editForm.title} onChange={(e)=>setEditForm({...editForm, title: e.target.value})} size="small" /></TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}><TextField value={editForm.project} onChange={(e)=>setEditForm({...editForm, project: e.target.value})} size="small" /></TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}><TextField value={editForm.place} onChange={(e)=>setEditForm({...editForm, place: e.target.value})} size="small" /></TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}><TextField value={editForm.notes} onChange={(e)=>setEditForm({...editForm, notes: e.target.value})} size="small" /></TableCell>
                              <TableCell align="right"><TextField type="number" value={editForm.expenseCoverage} onChange={(e)=>setEditForm({...editForm, expenseCoverage: Number(e.target.value)||0})} size="small" InputProps={{inputProps:{min:0}}} sx={{ maxWidth: 110 }} /></TableCell>
                              <TableCell align="right">
                                <IconButton aria-label="Lagre endringer" size="small" onClick={() => saveEdit(r.id, r)}><SaveIcon fontSize="small" /></IconButton>
                                <IconButton aria-label="Avbryt redigering" size="small" onClick={() => cancelEdit()}><CloseIcon fontSize="small" /></IconButton>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{weekdayShort(r.date)}</TableCell>
                              <TableCell>{dayjs(r.date).format('DD.MM')}</TableCell>
                              <TableCell>{r.start_time?.slice(0,5)}</TableCell>
                              <TableCell>{r.end_time?.slice(0,5)}</TableCell>
                              <TableCell>{r.break_hours}</TableCell>
                              <TableCell>
                                <Chip label={r.activity === 'Work' ? 'Arbeid' : 'Møte'} size="small" color={r.activity === 'Work' ? 'primary' : 'secondary'} />
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                <Typography noWrap title={r.title || ''}>{r.title}</Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                <Typography noWrap title={r.project || ''}>{r.project}</Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                <Typography noWrap title={r.place || ''}>{r.place}</Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                <Typography noWrap title={r.notes || ''}>{r.notes}</Typography>
                              </TableCell>
                              <TableCell align="right">{r.expense_coverage ? `${Number(r.expense_coverage).toLocaleString('no-NO')} kr` : '—'}</TableCell>
                              <TableCell align="right">
                                {isMdDown ? (
                                  <IconButton aria-label="Mer" size="small" onClick={(e) => openActions(e, r)}>
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <>
                                    <IconButton aria-label="Rediger rad" size="small" onClick={() => startEdit(r)}><EditIcon fontSize="small" /></IconButton>
                                    {r.is_archived ? (
                                      <IconButton aria-label="Gjenopprett fra arkiv" size="small" onClick={() => handleUnarchive(r)}>
                                        <UnarchiveIcon fontSize="small" />
                                      </IconButton>
                                    ) : (
                                      <IconButton aria-label="Arkiver rad" size="small" onClick={() => handleArchive(r)}>
                                        <ArchiveIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                    <IconButton aria-label="Slett rad" size="small" onClick={() => handleDelete(r)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </div>
                    );
                  })}
                </div>
                {!isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <Typography variant="body2">Ingen rader i denne måneden enda.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Box>

      {/* Actions Menu (mobile) */}
      <Menu anchorEl={actionAnchor} open={Boolean(actionAnchor)} onClose={closeActions} keepMounted>
        <ActionsMenuItem onClick={() => { if (actionRow) startEdit(actionRow); closeActions(); }}>Rediger</ActionsMenuItem>
        {actionRow?.is_archived ? (
          <ActionsMenuItem onClick={async () => { if (actionRow) await handleUnarchive(actionRow); closeActions(); }}>Gjenopprett</ActionsMenuItem>
        ) : (
          <ActionsMenuItem onClick={async () => { if (actionRow) await handleArchive(actionRow); closeActions(); }}>Arkiver</ActionsMenuItem>
        )}
        <ActionsMenuItem onClick={async () => { if (actionRow) await handleDelete(actionRow); closeActions(); }}>
          Slett
        </ActionsMenuItem>
      </Menu>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <MobileBottomNav
        onNavigate={handleMobileNavigate}
        onQuickAction={handleMobileQuickAction}
        currentSection="home"
      />

      {/* Add bottom padding for mobile nav */}
      <Box sx={{ height: 70, display: { xs: 'block', md: 'none' } }} />
      
      {/* Quick Stamp FAB (Mobile Only) */}
      <QuickStampFAB
        templates={templates}
        activeStamp={activeStamp}
        onStampIn={handleQuickStampFromFAB}
        onStampInWithCase={handleQuickStampFromFAB}
        onStampOut={handleStampOutFromFAB}
      />

      {/* Manuell registrering (Dialog) */}
      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Legg til manuelt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField type="date" label="Dato" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }} />
              <Chip label="I dag" size="small" onClick={() => setDate(dayjs().format("YYYY-MM-DD"))} />
              <Chip label="I går" size="small" onClick={() => setDate(dayjs().subtract(1, 'day').format("YYYY-MM-DD"))} />
            </Stack>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => {
                const lastEntry = logs.find(l => dayjs(l.date).isBefore(dayjs()));
                if (lastEntry) {
                  setManualActivity(lastEntry.activity as any);
                  setStart(lastEntry.start_time?.slice(0,5) || "");
                  setEnd(lastEntry.end_time?.slice(0,5) || "");
                  setBreakHours(Number(lastEntry.break_hours || 0));
                  setManualTitle(lastEntry.title || "");
                  setManualProject(lastEntry.project || "");
                  setManualPlace(lastEntry.place || "");
                  showToast("Forrige rad kopiert");
                } else {
                  showToast("Ingen tidligere rader funnet", "warning");
                }
              }}
            >
              Kopier forrige rad
            </Button>
            <FormControl fullWidth>
              <InputLabel>Aktivitet</InputLabel>
              <Select
                label="Aktivitet"
                value={manualActivity}
                onChange={(e) => setManualActivity(e.target.value as any)}
              >
                <MenuItem value="Work">Arbeid</MenuItem>
                <MenuItem value="Meeting">Møte</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField type="time" label="Inn" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} fullWidth />
              <TextField 
                type="time" 
                label="Ut" 
                InputLabelProps={{ shrink: true }} 
                value={end} 
                onChange={(e) => setEnd(e.target.value)} 
                fullWidth 
                error={end < start && end !== "" && start !== ""}
                helperText={end < start && end !== "" && start !== "" ? "Ut må være etter Inn" : ""}
              />
            </Stack>
            <TextField 
              type="number" 
              label="Pause (timer)" 
              value={breakHours} 
              onChange={(e) => setBreakHours(Number(e.target.value))} 
              fullWidth 
              error={breakHours < 0}
              helperText={breakHours < 0 ? "Pause kan ikke være negativ" : ""}
              InputProps={{ inputProps: { min: 0, step: 0.5 } }}
            />
            <TextField 
              type="number" 
              label="Utgiftsdekning (kr)" 
              value={expenseCoverage} 
              onChange={(e) => setExpenseCoverage(Number(e.target.value) || 0)} 
              fullWidth 
              InputProps={{ inputProps: { min: 0, step: 10 } }}
              aria-label="Utgiftsdekning i kroner"
            />
            <TextField label="Tittel / Møte" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} fullWidth />
            <TextField label="Prosjekt / Kunde" value={manualProject} onChange={(e) => setManualProject(e.target.value)} fullWidth />
            <TextField label="Sted / Modus" value={manualPlace} onChange={(e) => setManualPlace(e.target.value)} fullWidth />
            <TextField label="Notater" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} multiline minRows={2} fullWidth />
            <Button 
              variant="contained" 
              onClick={async () => { await handleAddManual(); setManualOpen(false); }}
              size="large"
              sx={{ py: 1.5 }}
            >
              Legg til
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Avanserte verktøy (Dialog) */}
      <Dialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Avanserte verktøy</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Importer timeplan (CSV)" />
                <CardContent>
                  <CsvImport onImported={async () => { await mutate(); }} onToast={showToast} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Google Sheets Webhook (toveis)" />
                <CardContent>
                  <WebhookSection onImported={async () => { await mutate(); }} onToast={showToast} settings={settings} updateSettings={updateSettings} monthNav={monthNavLocal} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Onboarding (first time) */}
      <Dialog open={onboardingOpen} onClose={() => setOnboardingOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Velkommen til Smart Timing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Slik setter du opp din Smart Timing-løsning. Du kan endre dette senere i Innstillinger.
            </Typography>

            {canAddWeekends && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <AlertTitle>Viktig informasjon for deg som er miljøarbeider</AlertTitle>
                <Stack spacing={0.5} component="div">
                  <Typography variant="body2"><strong>Ikke</strong> bruk navn eller detaljer som kan identifisere personer.</Typography>
                  <Typography variant="body2">Bruk generelle betegnelser som «Gutten», «Jenta», «Brukeren», «Deltakeren».</Typography>
                  <Typography variant="body2">Fokuser på aktiviteter og utvikling, ikke identitet. Anonymiser steder ved behov.</Typography>
                  <Typography variant="caption" color="text.secondary">Dette sikrer GDPR‑etterlevelse og beskytter klientenes personvern.</Typography>
                </Stack>
              </Alert>
            )}

            <TextField
              label={`Hvilken timesats har du avtalt med ${projectInfo?.bedrift || 'bedriften'}?`}
              value={onbRateInput}
              onChange={(e) => setOnbRateInput(e.target.value)}
              onBlur={() => {
                const n = parseRate(onbRateInput);
                if (!isNaN(n)) setOnbRateInput(formatRate(n));
              }}
              inputMode="decimal"
              placeholder="f.eks. 500,00"
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Hvordan er arbeidsdagen din?</Typography>
              <FormGroup row>
                {[1,2,3,4,5].map(d => (
                  <FormControlLabel key={d} control={<Checkbox checked={!!onbDays[d]} onChange={(e) => setOnbDays({ ...onbDays, [d]: e.target.checked })} />} label={["Man","Tir","Ons","Tor","Fre"][d-1]} />
                ))}
                {canAddWeekends && (
                  <>
                    <FormControlLabel control={<Checkbox checked={!!onbDays[6]} onChange={(e) => setOnbDays({ ...onbDays, 6: e.target.checked })} />} label="Lør" />
                    <FormControlLabel control={<Checkbox checked={!!onbDays[0]} onChange={(e) => setOnbDays({ ...onbDays, 0: e.target.checked })} />} label="Søn" />
                  </>
                )}
              </FormGroup>
              {canAddWeekends && (
                <Typography variant="caption" color="text.secondary">Som miljøarbeider i bolig kan helger også legges til.</Typography>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField type="time" label="Inn (klokkeslett)" InputLabelProps={{ shrink: true }} value={onbStart} onChange={(e) => setOnbStart(e.target.value)} fullWidth />
              <TextField type="time" label="Ut (klokkeslett)" InputLabelProps={{ shrink: true }} value={onbEnd} onChange={(e) => setOnbEnd(e.target.value)} fullWidth />
            </Stack>

            <FormControlLabel
              control={<Checkbox checked={onbApplyNow} onChange={(e) => setOnbApplyNow(e.target.checked)} />}
              label="Ønsker du at alle valgte hverdager legges inn for denne måneden nå?"
            />

            <Stack direction="row" spacing={1}>
              <Button onClick={async () => {
                // Skip (mark done)
                await updateSettings({ onboarding_done: true });
                await mutateSettings();
                setOnboardingOpen(false);
              }}>Hopp over</Button>
              <Button variant="contained" disabled={onbBusy} onClick={async () => {
                setOnbBusy(true);
                try {
                  // Save settings in one call
                  const n = parseRate(onbRateInput);
                  const payload: any = { onboarding_done: true };
                  if (!isNaN(n)) payload.hourly_rate = n;
                  await updateSettings(payload);
                  await mutateSettings();
                  // Optionally insert weekdays
                  if (onbApplyNow) {
                    const base = dayjs(monthNavLocal + "01");
                    const days = base.daysInMonth();
                    const rows: any[] = [];
                    for (let d = 1; d <= days; d++) {
                      const dd = base.date(d);
                      const dow = dd.day();
                      if (onbDays[dow]) {
                        rows.push({ date: dd.format('YYYY-MM-DD'), start: onbStart, end: onbEnd, breakHours: 0, activity: 'Work' });
                      }
                    }
                    if (rows.length) await createLogsBulk(rows);
                    await mutate();
                  }
                  setOnboardingOpen(false);
                } finally {
                  setOnbBusy(false);
                }
              }}>Fullfør</Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
