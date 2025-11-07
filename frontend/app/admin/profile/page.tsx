"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Stack, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { AdminProvider, useAdmin } from '../../../contexts/AdminContext';
import AdminLayout from '../../../components/AdminLayout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function ProfileContent() {
  const { fetchWithAuth, admin } = useAdmin();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/profile`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load profile');
        setProfile(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWithAuth]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setPasswordLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/profile/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to change password');
      
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Profile</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Account Information</Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">Username</Typography>
            <Typography variant="body1">{profile?.username || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{profile?.email || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Role</Typography>
            <Typography variant="body1">{profile?.role || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Last login</Typography>
            <Typography variant="body1">
              {profile?.last_login ? new Date(profile.last_login).toLocaleString('nb-NO') : 'Never'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Change Password</Typography>
        
        {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
        {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
        
        <form onSubmit={handleChangePassword}>
          <Stack spacing={2}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
              helperText="At least 6 characters"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={passwordLoading}
              >
                {passwordLoading ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default function ProfilePage() {
  return (
    <AdminProvider>
      <AdminLayout>
        <ProfileContent />
      </AdminLayout>
    </AdminProvider>
  );
}
