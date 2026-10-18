import { Link } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

interface Props {
  to: string;
  children: ReactNode;
  /**
   * `quiet` (default) reads as text and underlines on hover: right inside dense
   * tables. `subtle` keeps a faint underline so a link in running text is
   * discoverable without hovering.
   */
  variant?: 'quiet' | 'subtle';
}

export function TableLink({ to, children, variant = 'quiet' }: Props) {
  return (
    <Link
      component={RouterLink}
      to={to}
      color="inherit"
      underline={variant === 'subtle' ? 'always' : 'hover'}
      sx={{
        fontWeight: 500,
        textDecorationColor: variant === 'subtle' ? 'rgba(11, 11, 11, 0.3)' : undefined,
        '&:hover': { textDecorationColor: 'currentColor' },
        '&:focus-visible': { textDecoration: 'underline' },
      }}
    >
      {children}
    </Link>
  );
}
