"use client";
import { useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Stack,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { exportUserData, deleteUserAccount } from "../../lib/api";
import { useSnackbar } from "notistack";

export default function GDPRPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleExportData() {
    setExportLoading(true);
    try {
      const data = await exportUserData();
      
      // Create JSON file and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart-timing-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      enqueueSnackbar("Dine data er lastet ned", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(`Eksport feilet: ${e?.message || e}`, { variant: "error" });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmationText !== "DELETE_MY_ACCOUNT") {
      enqueueSnackbar("Feil bekreftelsestekst", { variant: "error" });
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteUserAccount("default", confirmationText);
      enqueueSnackbar("Kontoen din er permanent slettet", { variant: "success" });
      
      // Wait a bit then redirect to home
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (e: any) {
      enqueueSnackbar(`Sletting feilet: ${e?.message || e}`, { variant: "error" });
      setDeleteLoading(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/")}
        sx={{ mb: 3 }}
      >
        Tilbake til hjem
      </Button>

      <Typography variant="h3" gutterBottom>
        GDPR og Personvern
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        I henhold til GDPR (General Data Protection Regulation) har du full kontroll over dine
        personopplysninger. På denne siden kan du eksportere eller slette alle dine data.
      </Typography>

      <Stack spacing={3} sx={{ mt: 4 }}>
        {/* Export Data */}
        <Card>
          <CardHeader
            title="📦 Eksporter dine data"
            subheader="GDPR Artikkel 20: Rett til dataportabilitet"
          />
          <CardContent>
            <Typography variant="body2" paragraph>
              Last ned en komplett kopi av alle dine data i JSON-format. Dette inkluderer:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Alle timelogger med dato, tidspunkt og detaljer" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Prosjektinformasjon og klientdata" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Dine innstillinger og preferanser" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Maler og hurtigvalg" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Synkroniseringshistorikk (siste 100)" />
              </ListItem>
            </List>
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Sensitive data som passord og OAuth-tokens blir ikke inkludert i eksporten.
            </Alert>
            <Button
              variant="contained"
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={handleExportData}
              disabled={exportLoading}
              size="large"
            >
              {exportLoading ? "Eksporterer..." : "Last ned mine data (JSON)"}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card>
          <CardHeader
            title="🗑️ Slett kontoen din"
            subheader="GDPR Artikkel 17: Rett til sletting (Right to be Forgotten)"
          />
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                ⚠️ ADVARSEL: Denne handlingen kan IKKE angres!
              </Typography>
              <Typography variant="body2">
                Ved å slette kontoen din vil følgende permanent fjernes:
              </Typography>
            </Alert>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Alle timelogger"
                  secondary="Alle registrerte arbeidstimer og møter"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Alle innstillinger"
                  secondary="Timesats, skatteprosent, e-postinnstillinger"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Prosjektinformasjon"
                  secondary="Alle prosjekter og klientdata"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Maler og integrasjoner"
                  secondary="Alle hurtigmaler, webhook-konfigurasjoner og synkroniseringsdata"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" paragraph>
              Vi anbefaler at du først eksporterer dine data før du sletter kontoen din.
            </Typography>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              size="large"
            >
              Slett kontoen min permanent
            </Button>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Dine rettigheter under GDPR
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Rett til innsyn:</strong> Du kan når som helst eksportere dine data.
              </Typography>
              <Typography variant="body2">
                <strong>Rett til retting:</strong> Du kan når som helst redigere dine data i
                applikasjonen.
              </Typography>
              <Typography variant="body2">
                <strong>Rett til sletting:</strong> Du kan når som helst slette kontoen din
                permanent.
              </Typography>
              <Typography variant="body2">
                <strong>Rett til dataportabilitet:</strong> Du kan eksportere dine data i et
                maskinlesbart format (JSON).
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              For spørsmål om personvern, kontakt: privacy@smarttiming.no
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="error" />
            <span>Bekreft sletting av konto</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Dette vil PERMANENT slette alle dine data. Denne handlingen kan IKKE angres!
          </Alert>
          <Typography variant="body2" paragraph>
            For å bekrefte at du forstår konsekvensene, skriv inn følgende tekst nøyaktig:
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
              mb: 2,
              fontFamily: "monospace",
            }}
          >
            DELETE_MY_ACCOUNT
          </Box>
          <TextField
            fullWidth
            label="Bekreftelsestekst"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Skriv: DELETE_MY_ACCOUNT"
            disabled={deleteLoading}
            autoComplete="off"
            error={confirmationText !== "" && confirmationText !== "DELETE_MY_ACCOUNT"}
            helperText={
              confirmationText !== "" && confirmationText !== "DELETE_MY_ACCOUNT"
                ? "Teksten må være nøyaktig: DELETE_MY_ACCOUNT"
                : ""
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Avbryt
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={confirmationText !== "DELETE_MY_ACCOUNT" || deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteForeverIcon />}
          >
            {deleteLoading ? "Sletter..." : "Slett permanent"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
