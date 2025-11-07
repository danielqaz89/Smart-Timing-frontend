'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  MailOutline as InviteIcon,
  Folder as CasesIcon,
  Description as TemplateIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useCompany } from '../contexts/CompanyContext';

const DRAWER_WIDTH = 240;

const menuItems = [
  { label: 'Dashboard', path: '/portal', icon: <DashboardIcon /> },
  { label: 'Invites', path: '/portal/invites', icon: <InviteIcon />, adminOnly: true },
  { label: 'Users', path: '/portal/users', icon: <PeopleIcon />, adminOnly: true },
  { label: 'Cases', path: '/portal/cases', icon: <CasesIcon />, adminOnly: true },
  { label: 'Templates', path: '/portal/templates', icon: <TemplateIcon />, adminOnly: true },
  { label: 'Reports', path: '/portal/reports', icon: <ReportIcon /> },
  { label: 'Settings', path: '/portal/settings', icon: <SettingsIcon />, adminOnly: true },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { token, company, user, loading, login, logout } = useCompany();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!loading && !token) {
      // Not logged in, show login prompt
    }
  }, [token, loading]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
        <BusinessIcon sx={{ fontSize: 80, color: 'primary.main' }} />
        <Typography variant="h4">Company Portal</Typography>
        <Typography variant="body1" color="text.secondary">Sign in with your company Google account</Typography>
        <button onClick={login} style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer' }}>
          Sign in with Google
        </button>
      </Box>
    );
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    router.push('/portal');
  };

  const isAdmin = user?.role === 'admin';
  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <BusinessIcon sx={{ mr: 2 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {company?.name || 'Company Portal'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2">
                {user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role}
              </Typography>
            </Box>
            <IconButton onClick={handleProfileMenuOpen} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2">{user?.email}</Typography>
                <Chip label={user?.role} size="small" sx={{ mt: 0.5 }} />
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {filteredMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  onClick={() => router.push(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
