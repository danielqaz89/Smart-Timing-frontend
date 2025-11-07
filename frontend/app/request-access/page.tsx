"use client";

import { useState } from 'react';
import { Box, Container, Typography, Paper, TextField, Button, Alert, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export default function RequestAccessPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    orgnr: '',
    contact_email: '',
    contact_phone: '',
    address_line: '',
    postal_code: '',
    city: '',
    requester_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!formData.name || !formData.requester_email) {
      setError('Company name and requester email are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/company/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit request');
      
      setSuccess(true);
      setFormData({
        name: '',
        orgnr: '',
        contact_email: '',
        contact_phone: '',
        address_line: '',
        postal_code: '',
        city: '',
        requester_email: '',
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Request Company Access</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Submit a request to get your company registered on Smart Timing. Our admin team will review and approve your request.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Request submitted successfully! You will be notified once it has been reviewed.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Company Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Organization Number (Org.nr)"
              value={formData.orgnr}
              onChange={(e) => handleChange('orgnr', e.target.value)}
              fullWidth
              helperText="Optional"
            />
            <TextField
              label="Contact Email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              fullWidth
              helperText="Optional"
            />
            <TextField
              label="Contact Phone"
              value={formData.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              fullWidth
              helperText="Optional"
            />
            <TextField
              label="Address"
              value={formData.address_line}
              onChange={(e) => handleChange('address_line', e.target.value)}
              fullWidth
              helperText="Optional"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Postal Code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                fullWidth
                helperText="Optional"
              />
              <TextField
                label="City"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                fullWidth
                helperText="Optional"
              />
            </Stack>
            <TextField
              label="Your Email (Requester)"
              type="email"
              value={formData.requester_email}
              onChange={(e) => handleChange('requester_email', e.target.value)}
              required
              fullWidth
              helperText="We will notify you at this address"
            />
            <Stack direction="row" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
