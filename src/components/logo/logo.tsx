import { forwardRef } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import Link from '@mui/material/Link';
import Box, { BoxProps } from '@mui/material/Box';
// routes
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export interface LogoProps extends BoxProps {
  disabledLink?: boolean;
  single?: boolean;
}

const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ disabledLink = false, single = true, sx, ...other }, ref) => {
    const theme = useTheme();

    const logo = (
      <Box
        ref={ref}
        component="img"
        src={single ? '/favicon/android-chrome-192x192.png' : '/logo/logo_full.png'}
        sx={{
          width: single ? 40 : 120,
          height: 40,
          display: 'inline-flex',
          cursor: 'pointer',
          borderRadius: 0.5,
          objectFit: 'contain',
          ...sx,
        }}
        {...other}
      />
    );

    if (disabledLink) {
      return logo;
    }

    return (
      <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
        {logo}
      </Link>
    );
  }
);

export default Logo;
