"use client";

import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { CompanyProvider, useCompany } from '../../../contexts/CompanyContext';
import PortalLayout from '../../../components/PortalLayout';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function DashboardContent() {
  const { fetchWithAuth, company, user } = useCompany();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch multiple endpoints to build stats
        const [usersRes, invitesRes, logsRes] = await Promise.all([
          fetchWithAuth(`${API_BASE}/api/company/users`),
          fetchWithAuth(`${API_BASE}/api/company/invites`),
          fetchWithAuth(`${API_BASE}/api/company/logs?limit=100`),
        ]);

        const users = usersRes.ok ? await usersRes.json() : { users: [] };
        const invites = invitesRes.ok ? await invitesRes.json() : { invites: [] };
        const logs = logsRes.ok ? await logsRes.json() : { logs: [] };

        const pendingInvites = invites.invites?.filter((i: any) => !i.used_at && new Date(i.expires_at) > new Date()).length || 0;
        const totalCases = [...new Set(logs.logs?.map((l: any) => l.case_id).filter(Boolean))].length || 0;

        setStats({
          totalUsers: users.users?.length || 0,
          pendingInvites,
          totalLogs: logs.logs?.length || 0,
          totalCases,
        });
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWithAuth]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const statsCards = [
    { title: 'Total Users', value: stats?.totalUsers || 0, icon: <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />, color: '#1976d2' },
    { title: 'Pending Invites', value: stats?.pendingInvites || 0, icon: <MailOutlineIcon sx={{ fontSize: 40, color: 'warning.main' }} />, color: '#ed6c02' },
    { title: 'Total Cases', value: stats?.totalCases || 0, icon: <FolderIcon sx={{ fontSize: 40, color: 'success.main' }} />, color: '#2e7d32' },
    { title: 'Total Logs', value: stats?.totalLogs || 0, icon: <AssessmentIcon sx={{ fontSize: 40, color: 'secondary.main' }} />, color: '#9c27b0' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {company?.name || 'Company'} Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Welcome, {user?.email} ({user?.role})
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4">{card.value}</Typography>
                  </Box>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardHeader title="Quick Links" />
          <CardContent>
            <Stack spacing={1}>
              {user?.role === 'admin' && (
                <>
                  <Typography variant="body2">
                    • <a href="/portal/invites">Manage Invites</a> - Invite new users to your company
                  </Typography>
                  <Typography variant="body2">
                    • <a href="/portal/users">Manage Users</a> - Approve users and assign cases
                  </Typography>
                  <Typography variant="body2">
                    • <a href="/portal/cases">Manage Cases</a> - Create and edit case numbers
                  </Typography>
                  <Typography variant="body2">
                    • <a href="/portal/templates">Templates</a> - Design timesheets and reports
                  </Typography>
                  <Typography variant="body2">
                    • <a href="/portal/settings">Settings</a> - Configure company policies
                  </Typography>
                </>
              )}
              <Typography variant="body2">
                • <a href="/portal/reports">View Reports</a> - See time logs by case
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default function PortalDashboardPage() {
  return (
    <CompanyProvider>
      <PortalLayout>
        <DashboardContent />
      </PortalLayout>
    </CompanyProvider>
  );
}
