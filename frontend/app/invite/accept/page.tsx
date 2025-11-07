"use client";

import { useEffect, useState } from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';

export default function InviteAcceptPage() {
  const [status, setStatus] = useState<'success'|'error'|'unknown'>('unknown');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status') as any;
    const m = params.get('message') || '';
    if (s === 'success' || s === 'error') setStatus(s);
    else setStatus('unknown');
    setMessage(m);
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 3 }}>
        {status === 'success' && (
          <Stack spacing={2}>
            <Typography variant="h5">Invitasjon bekreftet</Typography>
            <Typography variant="body1">Du er nå lagt til i bedriften. Fortsett til bedriftsportalen for å logge inn og starte.</Typography>
            <Box>
              <Button component={Link} href="/portal" variant="contained">Gå til bedriftsportalen</Button>
            </Box>
          </Stack>
        )}
        {status === 'error' && (
          <Stack spacing={2}>
            <Typography variant="h5" color="error">Kunne ikke bekrefte invitasjon</Typography>
            <Typography variant="body1">{message || 'Ugyldig eller utløpt invitasjon.'}</Typography>
            <Box>
              <Button component={Link} href="/" variant="outlined">Til forsiden</Button>
            </Box>
          </Stack>
        )}
        {status === 'unknown' && (
          <Stack spacing={2}>
            <Typography variant="h6">Venter på invitasjonsstatus ...</Typography>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
