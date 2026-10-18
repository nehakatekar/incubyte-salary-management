import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Notify = (message: string) => void;

const NotificationContext = createContext<Notify>(() => {});

/** App-wide success toasts, e.g. "Salary updated". */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const notify = useCallback<Notify>((text) => setMessage(text), []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={message !== null}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export const useNotify = () => useContext(NotificationContext);
