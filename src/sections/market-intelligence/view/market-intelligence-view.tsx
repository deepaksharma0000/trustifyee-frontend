import { useState, useEffect } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';

import Iconify from 'src/components/iconify';

import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

export default function MarketIntelligenceView() {
  const [searchSymbol, setSearchSymbol] = useState('NSE:NIFTY');
  const [input, setInput] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFullQuote = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const [exchange, tradingsymbol] = symbol.split(':');
      const response = await axios.get(`${HOST_API}/api/market/full-quote`, {
        params: { symbol: tradingsymbol, exchange: exchange || 'NSE' }
      });
      if (response.data.ok) {
        setQuote(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch quote');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Broker session inactive or symbol not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullQuote(searchSymbol);
  }, [searchSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      let normalized = input.replace(/\s+/g, '').toUpperCase();
      if (normalized === "NIFTY") normalized = "NSE:NIFTY";
      if (normalized === "BANKNIFTY") normalized = "NSE:BANKNIFTY";
      const formatted = normalized.includes(':') ? normalized : `NSE:${normalized}`;
      setSearchSymbol(formatted);
    }
  };

  const handleChipClick = (s: string) => {
    setInput(s);
    setSearchSymbol(s.includes(':') ? s : `NSE:${s}`);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, pb: 10 }}>
      {/* 🚀 Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h2" fontWeight="1000" sx={{ letterSpacing: -1, background: 'linear-gradient(90deg, #1C252E 0%, #007AFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TFY EXPLORER
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ opacity: 0.7, mt: -0.5 }}>India's Real-Time Stock Analysis & Depth Engine</Typography>
      </Box>

      {/* 🔍 Search Bar */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 6, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          width: '100%', maxWidth: 750, position: 'relative', display: 'flex', alignItems: 'center', boxShadow: (theme) => `0 20px 40px -10px ${theme.palette.primary.main}30`,
          borderRadius: '50px', bgcolor: 'background.paper', border: '2px solid', borderColor: 'primary.lighter', p: 1, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus-within': { borderColor: 'primary.main', boxShadow: (theme) => `0 25px 50px -12px ${theme.palette.primary.main}50`, transform: 'translateY(-2px)' }
        }}>
          <Iconify icon="solar:magnifer-bold-duotone" width={32} sx={{ ml: 2, color: 'primary.main' }} />
          <input type="text" placeholder="Search NSE Stocks (e.g. NIFTY, TATA STEEL, SBI)" value={input} onChange={(e) => setInput(e.target.value)}
            style={{ width: '100%', height: 60, border: 'none', outline: 'none', padding: '0 20px', fontSize: 18, fontWeight: '600', background: 'transparent', color: 'inherit' }} />
          <Button type="submit" variant="contained" sx={{ borderRadius: '50px', height: 50, px: 4, position: 'absolute', right: 8, fontSize: 13, fontWeight: '900' }}>
            EXPLORE
          </Button>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          {['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL'].map((s) => (
            <Chip key={s} label={s} size="small" variant="soft" onClick={() => handleChipClick(s)} sx={{ fontWeight: '800', fontSize: 10, bgcolor: 'primary.lighter', color: 'primary.darker', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }} />
          ))}
        </Stack>
      </Box>

      {/* 📊 ANALYTICS AREA (TradingView + AngelOne) */}
      <Box sx={{ mb: 6 }}>
        <Grid container spacing={3}>
          {/* 🎯 MARKET DEPTH (ANGEL ONE REAL-TIME) */}
          <Grid item xs={12} md={12}>
            <Card sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Iconify icon="solar:bolt-circle-bold-duotone" width={24} color="error.main" />
                <Typography variant="h6" fontWeight="900">MARKET DEPTH & REAL-TIME QUOTES</Typography>
              </Stack>

              {loading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 150 }}><CircularProgress /></Stack>
              ) : error ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 150, textAlign: 'center', p: 2 }}>
                  <Iconify icon="solar:shield-warning-bold-duotone" width={48} color="warning.main" />
                  <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>{error}</Typography>
                </Stack>
              ) : quote ? (
                <Box sx={{ px: 1 }}>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="h3" color="success.main" fontWeight="900">₹{quote.lastPrice || quote.ltp}</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" color={quote.change >= 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                            {quote.change >= 0 ? '+' : ''}{quote.change} ({quote.pChange}%)
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Open</Typography><Typography variant="subtitle2" fontWeight="bold">{quote.open}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">High</Typography><Typography variant="subtitle2" fontWeight="bold">{quote.high}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Low</Typography><Typography variant="subtitle2" fontWeight="bold">{quote.low}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="text.secondary">Close</Typography><Typography variant="subtitle2" fontWeight="bold">{quote.close}</Typography></Grid>
                        <Grid item xs={12}><Typography variant="caption" color="text.secondary">Volume</Typography><Typography variant="subtitle2" fontWeight="bold">{quote.volume}</Typography></Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" fontWeight="900" sx={{ mb: 1, display: 'block' }}>BEST BIDS (BUY)</Typography>
                      <Stack spacing={0.5}>
                        {quote.depth?.buy?.slice(0, 5).map((bid: any, i: number) => (
                          <Stack key={i} direction="row" justifyContent="space-between" sx={{ bgcolor: 'success.lighter', px: 1, py: 0.5, borderRadius: 0.5 }}>
                            <Typography variant="caption" fontWeight="bold">{bid.price}</Typography>
                            <Typography variant="caption">{bid.quantity}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" fontWeight="900" sx={{ mb: 1, display: 'block' }}>BEST ASKS (SELL)</Typography>
                      <Stack spacing={0.5}>
                        {quote.depth?.sell?.slice(0, 5).map((ask: any, i: number) => (
                          <Stack key={i} direction="row" justifyContent="space-between" sx={{ bgcolor: 'error.lighter', px: 1, py: 0.5, borderRadius: 0.5 }}>
                            <Typography variant="caption" fontWeight="bold">{ask.price}</Typography>
                            <Typography variant="caption">{ask.quantity}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Typography variant="caption">Search a symbol to see depth</Typography>
              )}
            </Card>
          </Grid>

          {/* Additional Symbols News / Analytics */}
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, height: 420, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Iconify icon="solar:notes-bold-duotone" width={24} color="primary.main" />
                <Typography variant="h6" fontWeight="900">{searchSymbol.split(":")[1]} LIVE NEWS</Typography>
              </Stack>
              <Box sx={{ height: 340 }}>
                <iframe key={`news-${searchSymbol}`} title="symbol-news" src={`https://www.tradingview-widget.com/embed-widget/timeline/?locale=in#%7B%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22adaptive%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22${encodeURIComponent(searchSymbol)}%22%7D`} style={{ width: '100%', height: '100%', border: 'none' }} />
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ p: 2, height: 420, border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Iconify icon="solar:compass-bold-duotone" width={24} color="warning.main" />
                <Typography variant="h6" fontWeight="900">TECHNICAL GAUGE</Typography>
              </Stack>
              <Box sx={{ height: 340 }}>
                <iframe key={`gauge-${searchSymbol}`} title="analysis-gauge" src={`https://www.tradingview-widget.com/embed-widget/technical-analysis/?locale=in#%7B%22symbol%22%3A%22${encodeURIComponent(searchSymbol)}%22%2C%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22multiple%22%2C%22interval%22%3A%221D%22%7D`} style={{ width: '100%', height: '100%', border: 'none' }} />
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
