import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from './ErrorBoundary';

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees' },
  { to: '/insights', label: 'Insights' },
];

export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            ACME
            {/* Shortened on phones so the title and navigation fit on one line. */}
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {' '}
              Salary Management
            </Box>
          </Typography>
          <Box component="nav" sx={{ display: 'flex', gap: 1 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                sx={{ opacity: 0.8, '&.active': { opacity: 1, bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </Container>
    </Box>
  );
}
