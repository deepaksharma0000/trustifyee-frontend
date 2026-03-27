import { useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';

import Iconify from 'src/components/iconify';
import { HOST_API } from 'src/config-global';
import TrustifyeChart from 'src/components/chart/trustifye-chart';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// ----------------------------------------------------------------------

export default function MarketAnalysisView() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [interval, setInterval] = useState('ONE_DAY');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorical = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${HOST_API}/api/market/historical`, {
        params: { symbol, interval, exchange: 'NSE' }
      });
      if (response.data.ok) {
        setData(response.data.data.reverse()); // Show latest first in table
      } else {
        setError(response.data.error || 'Failed to fetch historical data');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Broker session inactive or API error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, pb: 10 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight="900" sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
           <Iconify icon="solar:chart-square-bold-duotone" width={28} color="primary.main" />
           MARKET ANALYSIS
        </Typography>
        <Typography variant="caption" color="text.secondary">Professional historical depth and algo-ready trends</Typography>
      </Box>

      {/* Toolbox */}
      <Card sx={{ p: 1.5, mb: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
        <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} md={3}>
                <TextField 
                  fullWidth 
                  size="small"
                  label="Search Symbol" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
            </Grid>
            <Grid item xs={12} md={2}>
                <TextField 
                  fullWidth 
                  select 
                  size="small"
                  label="Interval" 
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                >
                    <MenuItem value="ONE_MINUTE">1 Minute</MenuItem>
                    <MenuItem value="FIVE_MINUTE">5 Minute</MenuItem>
                    <MenuItem value="FIFTEEN_MINUTE">15 Minute</MenuItem>
                    <MenuItem value="ONE_HOUR">1 Hour</MenuItem>
                    <MenuItem value="ONE_DAY">Daily</MenuItem>
                </TextField>
            </Grid>
            <Grid item xs={12} md={1.5}>
                <Button 
                   fullWidth 
                   variant="contained" 
                   size="medium" 
                   onClick={fetchHistorical}
                   disabled={loading}
                   startIcon={loading ? <CircularProgress size={18} /> : <Iconify icon="solar:play-bold-duotone" />}
                >
                    {loading ? '...' : 'ANALYZE'}
                </Button>
            </Grid>
        </Grid>
      </Card>

      {error && (
        <Card sx={{ p: 2, mb: 4, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.main' }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:danger-bold-duotone" color="error.main" />
                <Typography variant="subtitle2" color="error.darker">{error}</Typography>
            </Stack>
        </Card>
      )}

      {/* 📈 REAL TRUSTIFYE CHART AREA */}
      {data.length > 0 && (
         <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
                <Card sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', boxShadow: (theme) => theme.customShadows.z12 }}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
                        <ToggleButtonGroup
                            size="small"
                            value={chartType}
                            exclusive
                            onChange={(e, next) => next && setChartType(next)}
                            aria-label="chart type"
                            sx={{ bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider' }}
                        >
                            <ToggleButton value="candle" aria-label="candle chart" sx={{ px: 1.5, gap: 1 }}>
                                <Iconify icon="solar:chart-2-bold-duotone" width={18} />
                                <Typography variant="caption" fontWeight="bold">CANDLES</Typography>
                            </ToggleButton>
                            <ToggleButton value="line" aria-label="line chart" sx={{ px: 1.5, gap: 1 }}>
                                <Iconify icon="solar:chart-line-duotone-bold" width={18} />
                                <Typography variant="caption" fontWeight="bold">LINE</Typography>
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    
                    <Box sx={{ borderRadius: 1 }}>
                        <TrustifyeChart data={data} chartType={chartType} symbol={symbol} />
                    </Box>
                </Card>
            </Grid>
         </Grid>
      )}

      {/* Main Analysis Results */}
      <Grid container spacing={3}>
         {/* Price Trends Table */}
         <Grid item xs={12}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
               <Box sx={{ p: 2, bgcolor: 'background.neutral', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight="900">HISTORICAL FLOW & OHLC</Typography>
               </Box>
               <TableContainer sx={{ height: 500, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                     <TableHead>
                        <TableRow>
                           <TableCell>TIME / DATE</TableCell>
                           <TableCell align="right">OPEN</TableCell>
                           <TableCell align="right">HIGH</TableCell>
                           <TableCell align="right">LOW</TableCell>
                           <TableCell align="right">CLOSE</TableCell>
                           <TableCell align="right">VOL</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {data.map((row, i) => (
                           <TableRow key={i} hover>
                              <TableCell sx={{ fontSize: 11, fontWeight: 'bold' }}>{new Date(row[0]).toLocaleString()}</TableCell>
                              <TableCell align="right">{row[1]}</TableCell>
                              <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{row[2]}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>{row[3]}</TableCell>
                              <TableCell align="right">{row[4]}</TableCell>
                              <TableCell align="right" sx={{ color: 'text.disabled' }}>{row[5]}</TableCell>
                           </TableRow>
                        ))}
                        {data.length === 0 && !loading && (
                          <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}>Search a symbol to start deep analysis</TableCell></TableRow>
                        )}
                     </TableBody>
                  </Table>
               </TableContainer>
            </Card>
         </Grid>

         {/* Smart Insights Sidebar */}
         <Grid item xs={12}>
            <Card sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
               <Typography variant="subtitle2" fontWeight="900" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Iconify icon="solar:lightbulb-bold-duotone" color="warning.main" />
                  SMART INDICATORS
               </Typography>
               
               <Stack spacing={2.5}>
                  <Card sx={{ p: 2 }}>
                     <Typography variant="caption" color="text.secondary">SYMBOL IN FOCUS</Typography>
                     <Typography variant="h4" fontWeight="1000" color="primary.main">{symbol}</Typography>
                  </Card>

                  <Card sx={{ p: 2, bgcolor: 'primary.lighter' }}>
                     <Typography variant="caption" color="primary.darker" fontWeight="900">ALGO TIP:</Typography>
                     <Typography variant="body2" color="primary.darker" sx={{ mt: 0.5 }}>
                        Use <b>ONE_DAY</b> interval for structural support/resistance analysis. Use <b>FIVE_MINUTE</b> for trend confirmation.
                     </Typography>
                  </Card>

                  <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                     <Typography variant="subtitle2" sx={{ mb: 1 }}>Analysis Range:</Typography>
                     <Typography variant="caption" color="text.secondary">Currently analyzing pichle 1 saal ka data (Historical Candle Data).</Typography>
                  </Box>
               </Stack>
            </Card>
         </Grid>
      </Grid>
    </Container>
  );
}
