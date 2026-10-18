import { Alert, Button } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

/**
 * Catches rendering errors in a page so the HR manager sees a way out
 * instead of a blank screen. The layout keys it by route, so navigating
 * away clears the error.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      >
        Something went wrong on this page. Reload to try again, or use the menu to go elsewhere.
      </Alert>
    );
  }
}
