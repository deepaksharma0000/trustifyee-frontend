import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

interface Props {
  data: any[];
  chartType?: 'candle' | 'line';
  symbol?: string;
}

export default function TrustifyeChart({ data, chartType = 'candle', symbol = 'NIFTY' }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [legendData, setLegendData] = useState<any>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chartOptions = {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#333',
          fontFamily: 'Inter, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(238, 238, 238, 0.4)' },
          horzLines: { color: 'rgba(238, 238, 238, 0.4)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#2196F3', style: 2, labelBackgroundColor: '#2196F3' },
          horzLine: { color: '#2196F3', style: 2, labelBackgroundColor: '#2196F3' },
        },
        rightPriceScale: {
          borderColor: '#f0f0f0',
          visible: true,
          autoScale: true,
        },
        timeScale: {
          borderColor: '#f0f0f0',
          timeVisible: true,
        },
        width: chartContainerRef.current.clientWidth,
        height: 420,
        watermark: {
          visible: true,
          fontSize: 34,
          horzAlign: 'center' as const,
          vertAlign: 'center' as const,
          color: 'rgba(28, 37, 46, 0.12)',
          text: 'Trustifye Algo Solution',
        },
      };

      const chart = createChart(chartContainerRef.current, chartOptions as any);
      chartRef.current = chart;

      if (chartType === 'candle') {
        seriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else {
        seriesRef.current = chart.addSeries(LineSeries, {
          color: '#2196F3',
          lineWidth: 3,
        });
      }

      // Volume Series configuration
      volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        visible: false,
      });

      chart.subscribeCrosshairMove((param: any) => {
        if (param.time && param.seriesData.get(seriesRef.current)) {
          const candle = param.seriesData.get(seriesRef.current);
          const volumeVal = param.seriesData.get(volumeSeriesRef.current);
          setLegendData({ ...candle, volume: volumeVal?.value || 0, time: param.time });
        }
      });

      const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
    return undefined;
  }, [chartType]);

  useEffect(() => {
    if (seriesRef.current && volumeSeriesRef.current && data.length > 0) {
      const tempArray = [...data].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

      const priceData: any[] = [];
      const volumeData: any[] = [];

      tempArray.forEach((d) => {
        const time = Math.floor(new Date(d[0]).getTime() / 1000);
        const candleOpen = d[1];
        const candleClose = d[4];
        
        if (chartType === 'candle') {
          priceData.push({ time: time as any, open: d[1], high: d[2], low: d[3], close: d[4] });
        } else {
          priceData.push({ time: time as any, value: d[4] });
        }

        // Professional Transparent Volume coloring
        const isUp = candleClose >= candleOpen;
        volumeData.push({ 
            time: time as any, 
            value: Number(d[5]) || 0, 
            color: isUp ? 'rgba(38, 166, 154, 0.45)' : 'rgba(239, 83, 80, 0.45)' 
        });
      });

      const uPrice = priceData.filter((v, i, a) => i === 0 || v.time !== a[i - 1].time);
      const uVol = volumeData.filter((v, i, a) => i === 0 || v.time !== a[i - 1].time);

      seriesRef.current.setData(uPrice);
      volumeSeriesRef.current.setData(uVol);
      
      chartRef.current?.timeScale().fitContent();

      // Set default legend to latest LTP
      const last = tempArray[tempArray.length - 1];
      setLegendData({
          time: Math.floor(new Date(last[0]).getTime() / 1000),
          open: last[1], high: last[2], low: last[3], close: last[4],
          volume: last[5]
      });
    }
  }, [data, chartType]);

  const change = legendData ? (legendData.close - legendData.open).toFixed(2) : '0';
  const changePct = legendData ? ((Number(change) / legendData.open) * 100).toFixed(2) : '0';
  const priceColor = Number(change) >= 0 ? '#26a69a' : '#ef5350';

  return (
    <Box sx={{ position: 'relative', width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: '#fff' }}>
      
      {/* 🚀 ELITE TRADING LEGEND OVERLAY */}
      <Box sx={{ 
          position: 'absolute', top: 12, left: 16, zIndex: 10, 
          bgcolor: 'rgba(255,255,255,0.75)', p: 1.5, borderRadius: 1,
          backdropFilter: 'blur(8px)', minWidth: 260, border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight="900" color="primary.main" sx={{ letterSpacing: -0.5 }}>{symbol}</Typography>
            <Box sx={{ px: 0.8, py: 0.2, bgcolor: 'background.neutral', borderRadius: 0.5, fontSize: 9, fontWeight: 'bold' }}>REAL-TIME</Box>
        </Stack>
        
        {legendData && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
                 <Stack direction="row" spacing={1.5} alignItems="baseline">
                    <Typography variant="h4" fontWeight="1000" color="text.primary">{legendData.close || legendData.value}</Typography>
                    <Typography variant="button" fontWeight="800" sx={{ color: priceColor }}>
                       {Number(change) > 0 ? '+' : ''}{change} ({changePct}%)
                    </Typography>
                 </Stack>

                 <Stack direction="row" spacing={2} sx={{ opacity: 0.8 }}>
                    <Typography variant="caption">O <b>{legendData.open || '--'}</b></Typography>
                    <Typography variant="caption">H <b>{legendData.high || '--'}</b></Typography>
                    <Typography variant="caption">L <b>{legendData.low || '--'}</b></Typography>
                    <Typography variant="caption">C <b>{legendData.close || '--'}</b></Typography>
                 </Stack>

                 <Typography variant="overline" color="text.disabled" sx={{ fontSize: 9 }}>
                    VOL: {Intl.NumberFormat('en-IN', { notation: 'compact' }).format(legendData.volume || 0)}
                 </Typography>
            </Stack>
        )}
      </Box>

      <Box ref={chartContainerRef} sx={{ width: '100%', height: 420 }} />
    </Box>
  );
}
