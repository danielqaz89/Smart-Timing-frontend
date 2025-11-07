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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  BarChart as AnalyticsIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  Language as TranslateIcon,
  Palette as ThemeIcon,
  Pages as PagesIcon,
  ContactMail as ContactIcon,
} from '@mui/icons-material';
import { useAdmin } from '../contexts/AdminContext';

const DRAWER_WIDTH = 240;

const menuItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Companies', path: '/admin/companies', icon: <BusinessIcon /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <AnalyticsIcon /> },
  { label: 'Audit Log', path: '/admin/audit', icon: <HistoryIcon /> },
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

const cmsMenuItems = [
  { label: 'Translations', path: '/admin/cms/translations', icon: <TranslateIcon /> },
  { label: 'Themes', path: '/admin/cms/themes', icon: <ThemeIcon /> },
  { label: 'Pages', path: '/admin/cms/pages', icon: <PagesIcon /> },
  { label: 'Contact Submissions', path: '/admin/cms/submissions', icon: <ContactIcon /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!loading && !admin && pathname !== '/admin') {
      router.push('/admin');
    }
  }, [admin, loading, router, pathname]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!admin) {
    return null; // Will redirect
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
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <AdminIcon sx={{ mr: 2 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Smart Timing Admin
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {admin.username} ({admin.role})
            </Typography>
            <IconButton onClick={handleProfileMenuOpen} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {admin.username[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
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
            {menuItems.map((item) => (
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
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
            CMS
          </Typography>
          <List>
            {cmsMenuItems.map((item) => (
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
