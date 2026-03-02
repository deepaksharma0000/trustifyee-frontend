import {
  Box,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

interface AlgoRiskDisclaimerProps {
  /** 
   * 'footer' = full SEBI regulatory footer
   * 'simple' = one-line awareness + one-line copyright (User Side)
   */
  variant?: 'footer' | 'simple';
  sx?: object;
}

// ── SIMPLE MINIMALIST VARIANT (User Side) ──────────────────────────────────
function SimpleVariant({ sx }: { sx?: object }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mt: 4,
        pt: 3,
        pb: 3,
        textAlign: 'center',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        ...sx,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 600 }}>
        <Box component="span" sx={{ color: 'error.main', fontWeight: 800 }}>Awareness: </Box>
        Investments in securities market are subject to market risks. Read all the related documents carefully before investing.
      </Typography>
      
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
        © {new Date().getFullYear()} Finvesta Algo Solutions Pvt. Ltd. All rights reserved.
      </Typography>
    </Box>
  );
}

// ── FULL FOOTER VARIANT (Admin / Regulatory) ───────────────────────────────
function FullFooterVariant({ sx }: { sx?: object }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mt: 8,
        pt: 4,
        pb: 4,
        borderTop: `1.5px solid ${alpha(theme.palette.divider, 0.7)}`,
        ...sx,
      }}
    >
      <Box sx={{
        mb: 4, px: 3, py: 2.5, borderRadius: 2,
        bgcolor: alpha('#ef4444', 0.05),
        border: `1.5px solid ${alpha('#ef4444', 0.15)}`,
      }}>
        <Typography variant="subtitle2" fontWeight={900} sx={{ color: '#ef4444', mb: 1 }}>
          SEBI Advisory — Risk Disclosure on Derivatives
        </Typography>
        <Typography variant="caption" sx={{ color: '#991b1b', fontSize: 11, fontWeight: 700 }}>
          9 out of 10 individual traders in equity Cash/F&O segment incurred net losses. Average loss makers registered net loss close to ₹50,000.
        </Typography>
      </Box>

      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        Finvesta Algo Solutions Pvt. Ltd.
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 3 }}>
        SEBI Registered Research Analyst · Member: NSE / BSE / MCX · SEBI Reg: INH000XXXXXX
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        Investments in securities market are subject to market risks, read all the related documents carefully before investing.
        Registration granted by SEBI in no way guarantees performance of the intermediary.
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
        © {new Date().getFullYear()} Finvesta Algo Solutions Pvt. Ltd. All rights reserved.
      </Typography>
    </Box>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function AlgoRiskDisclaimer({
  variant = 'footer',
  sx,
}: AlgoRiskDisclaimerProps) {
  if (variant === 'simple') return <SimpleVariant sx={sx} />;
  return <FullFooterVariant sx={sx} />;
}
