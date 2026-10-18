import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet } from 'react-router';

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees' },
  { to: '/insights', label: 'Insights' },
];

export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            ACME Salary Management
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
        <Outlet />
      </Container>
    </Box>
  );
}
