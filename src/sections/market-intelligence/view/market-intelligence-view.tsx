import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function MarketIntelligenceView() {
  const [searchSymbol, setSearchSymbol] = useState('NSE:NIFTY');
  const [input, setInput] = useState('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      let normalized = input.replace(/\s+/g, '').toUpperCase();
      // Special logic for common indices
      if (normalized === "NIFTY") normalized = "NSE:NIFTY";
      if (normalized === "BANKNIFTY") normalized = "NSE:BANKNIFTY";
      if (normalized === "FINNIFTY") normalized = "NSE:FINNIFTY";
      
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
      {/* 🚀 Market Explorer Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h2" fontWeight="1000" sx={{ letterSpacing: -1, background: 'linear-gradient(90deg, #1C252E 0%, #007AFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MARKET EXPLORER
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ opacity: 0.7, mt: -0.5 }}>India's Real-Time Stock Analysis & News Engine</Typography>
      </Box>

      {/* 🔍 Google-style Smart Search Bar */}
      <Box 
        component="form" 
        onSubmit={handleSearch}
        sx={{ 
          mb: 6, 
          display: 'flex', 
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box sx={{ 
          width: '100%', 
          maxWidth: 750, 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          boxShadow: (theme) => `0 20px 40px -10px ${theme.palette.primary.main}30`,
          borderRadius: '50px',
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: 'primary.lighter',
          p: 1,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus-within': { 
            borderColor: 'primary.main', 
            boxShadow: (theme) => `0 25px 50px -12px ${theme.palette.primary.main}50`,
            transform: 'translateY(-2px)'
          }
        }}>
          <Iconify icon="solar:magnifer-bold-duotone" width={32} sx={{ ml: 2, color: 'primary.main' }} />
          <input 
            type="text" 
            placeholder="Search NSE Stocks (e.g. NIFTY, TATA STEEL, RELIANCE)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ 
              width: '100%', 
              height: 60, 
              border: 'none', 
              outline: 'none', 
              padding: '0 20px', 
              fontSize: 18,
              fontWeight: '600',
              background: 'transparent',
              color: 'inherit'
            }} 
          />
          <Button 
            type="submit"
            variant="contained" 
            sx={{ borderRadius: '50px', height: 50, px: 4, position: 'absolute', right: 8, fontSize: 13, fontWeight: '900' }}
          >
            EXPLORE
          </Button>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          {['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TATASTEEL'].map((s) => (
            <Chip 
              key={s} 
              label={s} 
              size="small" 
              variant="soft" 
              onClick={() => handleChipClick(s)}
              sx={{ fontWeight: '800', fontSize: 10, bgcolor: 'primary.lighter', color: 'primary.darker', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }} 
            />
          ))}
        </Stack>
      </Box>

      {/* 📊 RESULTS AREA: 100% REAL INDIAN MARKET DATA */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="overline" color="primary.main" fontWeight="900" sx={{ mb: 2, display: 'block', letterSpacing: 2 }}>RESULTS FOR: {searchSymbol}</Typography>
        
        <Grid container spacing={3}>
          {/* Main REAL-TIME CHART (NSE Optimized) */}
          <Grid item xs={12} md={9}>
            <Card sx={{ p: 2, height: 620, border: '1px solid', borderColor: 'divider', boxShadow: (theme) => theme.customShadows.z12 }}>
               <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Iconify icon="solar:graph-bold-duotone" width={24} color="primary.main" />
                  <Typography variant="h6" fontWeight="900">PRO REAL-TIME CHART (NSE)</Typography>
               </Stack>
               <Box sx={{ height: 540 }}>
                  {/* Using s.tradingview.com which is robust for NSE symbols */}
                  <iframe 
                    key={`chart-${searchSymbol}`}
                    title="pro-chart-nse"
                    src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(searchSymbol)}&interval=D&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=Asia%2FKolkata&studies_overrides=%7B%22volume.volume.color.0%22%3A%22%23fb4d5d%22%2C%22volume.volume.color.1%22%3A%22%23398c25%22%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${searchSymbol}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
               </Box>
            </Card>
          </Grid>

          {/* Technical Analysis Gauge (Sized-Up) */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, height: 620, border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
               <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Iconify icon="solar:compass-bold-duotone" width={24} color="warning.main" />
                  <Typography variant="h6" fontWeight="900">GAUGE</Typography>
               </Stack>
               <Box sx={{ height: 540 }}>
                  <iframe 
                    key={`gauge-${searchSymbol}`}
                    title="analysis-gauge"
                    src={`https://www.tradingview-widget.com/embed-widget/technical-analysis/?locale=in#%7B%22interval%22%3A%221D%22%2C%22width%22%3A%22100%25%22%2C%22isTransparent%22%3Atrue%2C%22height%22%3A%22100%25%22%2C%22symbol%22%3A%22${encodeURIComponent(searchSymbol)}%22%2C%22showIntervalTabs%22%3Atrue%2C%22colorTheme%22%3A%22light%22%7D`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
               </Box>
            </Card>
          </Grid>

          {/* Symbol Specific NEWS Feed (RESTORED) */}
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, height: 420, border: '1px solid', borderColor: 'divider' }}>
               <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Iconify icon="solar:notes-bold-duotone" width={24} color="primary.main" />
                  <Typography variant="h6" fontWeight="900">{searchSymbol.split(":")[1]} LIVE NEWS</Typography>
               </Stack>
               <Box sx={{ height: 340 }}>
                  <iframe 
                    key={`news-${searchSymbol}`}
                    title="symbol-news"
                    src={`https://www.tradingview-widget.com/embed-widget/timeline/?locale=in#%7B%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22adaptive%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22${encodeURIComponent(searchSymbol)}%22%7D`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
               </Box>
            </Card>
          </Grid>

          {/* Symbol Statistics Card */}
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 2, height: 420, border: '1px solid', borderColor: 'divider', bgcolor: 'info.lighter' }}>
               <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Iconify icon="solar:info-square-bold-duotone" width={24} color="info.main" />
                  <Typography variant="h6" fontWeight="900">KEY STATISTICS</Typography>
               </Stack>
               <Box sx={{ height: 340 }}>
                  <iframe 
                    key={`info-${searchSymbol}`}
                    title="symbol-info"
                    src={`https://www.tradingview-widget.com/embed-widget/symbol-info/?locale=in#%7B%22symbol%22%3A%22${encodeURIComponent(searchSymbol)}%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Atrue%7D`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
               </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* GLOBAL MOVERS (Always at Bottom) */}
      <Typography variant="h4" fontWeight="900" sx={{ mb: 3 }}>INDIAN MARKET OVERVIEW</Typography>
      <Box sx={{ height: 550, mb: 10 }}>
          <iframe 
            title="global-movers"
            src="https://www.tradingview-widget.com/embed-widget/hotlists/?locale=in#%7B%22colorTheme%22%3A%22light%22%2C%22dateRange%22%3A%2212M%22%2C%22exchange%22%3A%22NSE%22%2C%22showChart%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22isTransparent%22%3Atrue%7D"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
      </Box>
    </Container>
  );
}
