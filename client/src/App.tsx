import { AppBar, Container, Toolbar, Typography } from '@mui/material';

export function App() {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="h1">
            ACME Salary Management
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">Employees and pay insights are coming soon.</Typography>
      </Container>
    </>
  );
}
