import { useEffect, useState, useCallback, useRef } from "react";
import {
  Container,
  Card,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Divider,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import { paths } from 'src/routes/paths';
import { HOST_API } from "src/config-global";
import Iconify from 'src/components/iconify';
import { useAuthUser } from "src/hooks/use-auth-user";

/* ---------------- TYPES ---------------- */

interface OptionItem {
  symboltoken: string;
  tradingsymbol: string;
  expiry: string;
  optiontype: "CE" | "PE";
  strike: number;
  ltp?: number; // 🔥 Initial LTP from backend
}

interface OptionRow {
  strikePrice: number;
  CE?: OptionItem;
  PE?: OptionItem;
}

interface ExpiryDateItem {
  value: string;
  label: string;
  timestamp: string;
}

/* ---------------- COMPONENT ---------------- */

export default function OptionChainPage() {
  const [marketData, setMarketData] = useState<OptionRow[]>([]);
  const [expiryDates, setExpiryDates] = useState<ExpiryDateItem[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<"NIFTY" | "BANKNIFTY" | "FINNIFTY">("NIFTY");
  const [strategy, setStrategy] = useState<string>("Gamma");
  const [selectedOptions, setSelectedOptions] = useState<OptionItem[]>([]);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [quoteMap, setQuoteMap] = useState<
    Record<
      string,
      {
        ltp: number;
        oi: number | null;
        volume: number | null;
        percentChange: number | null;
        dir?: "up" | "down";
      }
    >
  >({});
  const [viewMode, setViewMode] = useState<"LTP" | "OI">("LTP");
  const [indexLtp, setIndexLtp] = useState<number>(0);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [strategiesList, setStrategiesList] = useState<string[]>(["Gamma", "Alpha"]);
  const wsRef = useRef<WebSocket | null>(null);
  /* ---------------- AUTO SQUARE OFF STATE ---------------- */
  const [autoSquareOffEnabled, setAutoSquareOffEnabled] = useState(false);
  const [exitTime, setExitTime] = useState("");


  /* ---------------- MARKET STATUS STATE ---------------- */
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean, message: string } | null>(null);

  /* ---------------- ORDER DIALOG STATE ---------------- */
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrderOption, setSelectedOrderOption] = useState<OptionItem | null>(null);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');

  /* ---------------- BROADCAST RESULTS MODAL STATE ---------------- */
  const [broadcastResults, setBroadcastResults] = useState<any | null>(null);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  const blinkTimers = useRef<Record<string, number>>({});

  const { user: authUser } = useAuthUser();
  const isAdmin = authUser?.role === "admin" || authUser?.role === "sub-admin" || authUser?.role === "subadmin";
  const token = sessionStorage.getItem("accessToken") || localStorage.getItem("authToken");
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || "";
  const wsBase = API_BASE
    ? API_BASE.replace(/^http/, "ws")
    : window.location.origin.replace(/^http/, "ws");
  const WS_URL = `${wsBase}/ws/market`;

  /* ---------------- HELPERS ---------------- */

  const getExpiryValue = useCallback(
    (dateValue: string) => {
      if (!dateValue) return "";
      
      // If it's already a simple date string (YYYY-MM-DD), use it directly
      if (dateValue.length === 10 && !dateValue.includes('T')) {
        return dateValue;
      }

      try {
        const date = new Date(dateValue);
        // Backend stores expiries in UTC. In India, 18:30 UTC is 00:00 IST of the next day.
        // We shift by 5.5 hours to align with the IST date string in the expiries array.
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        return istDate.toISOString().split('T')[0];
      } catch (e) {
        return dateValue.slice(0, 10);
      }
    },
    []
  );

  const getExpiryLabel = useCallback(
    (dateStr: string) =>
      new Date(`${dateStr}T00:00:00+05:30`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
    []
  );

  const getDirectionColor = (dir?: "up" | "down") => {
    if (dir === "up") return "success.main";
    if (dir === "down") return "error.main";
    return "text.secondary";
  };

  const getDirectionBgColor = (dir?: "up" | "down") => {
    if (dir === "up") return "rgba(76, 175, 80, 0.12)";
    if (dir === "down") return "rgba(244, 67, 54, 0.12)";
    return "transparent";
  };

  const isPlausibleLivePrice = (symbolToken: string, ltp: number) => {
    if (!Number.isFinite(ltp) || ltp <= 0) return false;
    const isIndex = ["99926000", "99926009", "99926037"].includes(symbolToken);
    return isIndex ? ltp < 1000000 : ltp < 100000;
  };

  const extractExpiryList = useCallback((options: OptionItem[]): ExpiryDateItem[] => {
    const map = new Map<string, ExpiryDateItem>();

    options.forEach((opt) => {
      const value = getExpiryValue(opt.expiry);

      if (!map.has(value)) {
        map.set(value, {
          value,
          label: getExpiryLabel(value),
          timestamp: value,
        });
      }
    });

    return Array.from(map.values());
  }, [getExpiryLabel, getExpiryValue]);

  /* ---------------- API CALL ---------------- */

  const fetchOptionChainFromLTP = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);

      const baseUrl = `${API_BASE}/api/nifty/option-chain?symbol=${symbol}&range=5`;
      const apiUrlWithExpiry = selectedExpiry
        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}expiry=${selectedExpiry}`
        : baseUrl;

      const res = await fetch(apiUrlWithExpiry);


      const json = await res.json();
      if (!json.ok) throw new Error("Option chain fetch failed");

      const options: OptionItem[] = json.data.options || [];
      const expiries: string[] = json.data.expiries || [];

      /* Expiry dropdown */
      const expiryList = expiries.length
        ? expiries.map((value) => ({
          value: getExpiryValue(value),
          label: getExpiryLabel(value),
          timestamp: value,
        }))
        : extractExpiryList(options);
      setExpiryDates(expiryList);

      const expirySet = new Set(expiryList.map((e) => e.value));
      const activeExpiry = expirySet.has(selectedExpiry)
        ? selectedExpiry
        : expiryList[0]?.value || "";

      if (selectedExpiry !== activeExpiry) {
        setSelectedExpiry(activeExpiry);
      }

      /* Filter by expiry */
      const filtered = options.filter(
        (o) =>
          getExpiryValue(o.expiry) === activeExpiry
      );

      /* Group by strike → CE / PE */
      const grouped: Record<number, OptionRow> = {};

      filtered.forEach((opt) => {
        if (!grouped[opt.strike]) {
          grouped[opt.strike] = { strikePrice: opt.strike };
        }
        grouped[opt.strike][opt.optiontype] = opt;
      });

      setIndexLtp(json.data.ltp || 0);
      console.log("OPTION_DATA:", options); // 🔍 DEBUG LOG
      setMarketData(Object.values(grouped).sort((a, b) => a.strikePrice - b.strikePrice));
    } catch (err: any) {
      setApiError(err.message || "API error");
    } finally {
      setLoading(false);
    }
  }, [selectedExpiry, symbol, API_BASE, extractExpiryList, getExpiryLabel, getExpiryValue]);


  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    fetchOptionChainFromLTP();

    // Fetch Strategies
    fetch(`${API_BASE}/api/strategy/list`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    })
      .then(res => res.json())
      .then(json => {
        if (json.ok) {
          const names = json.strategies.map((s: any) => s.name);
          setStrategiesList(names);
          if (names.length > 0 && !names.includes(strategy)) {
            setStrategy(names[0]);
          }
        }
      })
      .catch(err => console.error("Failed to fetch strategies", err));

    // Check Market Status
    fetch(`${API_BASE}/api/market/status`)
      .then(res => res.json())
      .then(json => {
        if (json.ok) setMarketStatus(json.data);
      })
      .catch(err => console.error("Market status check failed", err));
  }, [fetchOptionChainFromLTP, API_BASE, token, strategy]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "error") {
          console.error("Market WebSocket Error:", msg.message);
          return;
        }
        if (msg.type !== "tick" || !Array.isArray(msg.items)) return;

        setQuoteMap((prev) => {
          const next = { ...prev };
          msg.items.forEach((item: any) => {
            const symbolToken = item.symboltoken;
            const ltp = Number(item.ltp || 0);
            if (!isPlausibleLivePrice(symbolToken, ltp)) {
              console.warn("Dropped implausible market tick", { symbolToken, ltp });
              return;
            }
            const oi =
              item.oi === null || item.oi === undefined ? null : Number(item.oi);
            const volume =
              item.volume === null || item.volume === undefined ? null : Number(item.volume);
            const percentChange =
              item.percentChange === null || item.percentChange === undefined ? null : Number(item.percentChange);

            const prevLtp = prev[symbolToken]?.ltp;

            let dir: "up" | "down" | undefined;
            if (prevLtp !== undefined && ltp !== prevLtp) {
              dir = ltp > prevLtp ? "up" : "down";
            }

            next[symbolToken] = { ltp, oi, volume, percentChange, dir };

            // Update Index LTP & Status if this is the index token
            const indexTokens = ["99926000", "99926009", "99926037"];
            if (indexTokens.includes(symbolToken)) {
              setIndexLtp(ltp);
              // Store index percent change in quoteMap as well
            }

            if (dir) {
              if (blinkTimers.current[symbolToken]) {
                window.clearTimeout(blinkTimers.current[symbolToken]);
              }
              blinkTimers.current[symbolToken] = window.setTimeout(() => {
                setQuoteMap((p) => {
                  if (!p[symbolToken]) return p;
                  return { ...p, [symbolToken]: { ...p[symbolToken], dir: undefined } };
                });
              }, 350);
            }
          });
          return next;
        });
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [WS_URL]);



  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const items: { exchange: string; tradingsymbol: string; symboltoken: string }[] = [];

    // 1. Subscribe to Index Token
    const indexTokens: Record<string, string> = { "NIFTY": "99926000", "BANKNIFTY": "99926009", "FINNIFTY": "99926037" };
    const indexTradingSymbols: Record<string, string> = { "NIFTY": "Nifty 50", "BANKNIFTY": "Nifty Bank", "FINNIFTY": "Nifty Fin Service" };

    items.push({
      exchange: "NSE",
      tradingsymbol: indexTradingSymbols[symbol] || "Nifty 50",
      symboltoken: indexTokens[symbol] || "99926000",
    });

    // 2. Subscribe to Options
    marketData.forEach((row) => {
      if (row.CE) {
        items.push({
          exchange: "NFO",
          tradingsymbol: row.CE.tradingsymbol,
          symboltoken: row.CE.symboltoken,
        });
      }
      if (row.PE) {
        items.push({
          exchange: "NFO",
          tradingsymbol: row.PE.tradingsymbol,
          symboltoken: row.PE.symboltoken,
        });
      }
    });

    if (items.length) {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          intervalMs: 1500,
          items,
        })
      );
    }
  }, [marketData, symbol]);

  /* ---------------- EXPIRY CHECK ---------------- */
  const isBrokerConnected = !!authUser?.broker_connected || localStorage.getItem('angel_jwt') !== null;

  const isDemo = authUser?.licence === "Demo";
  const endDate = authUser?.end_date ? new Date(authUser.end_date) : null;
  const isExpired = isDemo && endDate && new Date() > endDate;

  /* ---------------- CONDITIONAL RENDERING ---------------- */

  // 1. Check for Expired Demo
  if (isExpired) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Card sx={{ p: 4, textAlign: "center", border: '2px solid', borderColor: 'error.main' }}>
          <Typography variant="h4" color="error" gutterBottom>
            ⚠️ Demo Expired
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Aapka 2 din ka demo period khatam ho chuka hai.
            Aage ki services continue karne ke liye please subscription lein.
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              onClick={() => { window.location.href = "https://wa.me/91XXXXXXXXXX?text=Hi, I want to subscribe to Trustifye" }}
            >
              Contact for Subscription
            </Button>
            <Button
              variant="outlined"
              onClick={() => { window.location.href = "/dashboard" }}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  // 2. Check for Broker Connection (Strict requirement for LIVE Users)
  const canViewChain = isDemo || isAdmin || isBrokerConnected;
  if (!canViewChain) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Card sx={{ p: 4, textAlign: "center", border: '2px dashed', borderColor: 'warning.main', bgcolor: 'warning.lighter' }}>
          <Iconify icon="eva:alert-triangle-fill" width={60} sx={{ color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            📊 Option Chain Locked
          </Typography>

          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Your broker session is not active or not connected. Please login to your broker account to unlock trading tools.
          </Typography>

          <Button
            variant="contained"
            color="warning"
            component={RouterLink}
            to={paths.dashboard.brokerConnect}
          >
            Go to Broker Connect
          </Button>
        </Card>
      </Container>
    );
  }

  // 3. Check for Trading Enabled (Only for LIVE Users)
  const isTradingEnabled = authUser?.trading_status === 'enabled';
  const needsTradingEnabled = !isDemo && !isAdmin && !isTradingEnabled;

  if (needsTradingEnabled) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Trading Disabled
          </Typography>

          <Typography variant="body2" sx={{ mb: 3 }}>
            Option Chain access ke liye Trading Details me Enable karein
          </Typography>

          <Button
            variant="contained"
            onClick={() => { window.location.href = "/dashboard/banking" }}
          >
            Go to Trading Details
          </Button>
        </Card>
      </Container>
    );
  }
  /* ---------------- ORDER HANDLER (REAL) ---------------- */

  const handleSelectOption = (opt: OptionItem) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((o) => o.symboltoken === opt.symboltoken);
      if (exists) {
        // Deselect if already selected
        return prev.filter((o) => o.symboltoken !== opt.symboltoken);
      }
      // Add to selection
      return [...prev, opt];
    });
  };

  const isOptionSelected = (opt: OptionItem) =>
    selectedOptions.some((o) => o.symboltoken === opt.symboltoken);

  // 🔥 NEW: Auto-select strikes based on strategy
  const handleAutoSelectStrategy = async () => {
    if (!selectedExpiry) {
      alert("Please select an expiry date first");
      return;
    }

    if (!strategy) {
      alert("Please select a strategy");
      return;
    }

    setAutoSelecting(true);
    try {
      const res = await fetch(`${API_BASE}/api/strategy/auto-select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          symbol,
          expiry: selectedExpiry,
          strategy,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        alert(`Auto-select failed: ${json.error || "Unknown error"}`);
        return;
      }

      // Set the selected options from strategy
      setSelectedOptions(json.selectedOptions);
      alert(`✅ ${json.message}\n\nReview the selected options and click Execute when ready.`);
    } catch (err: any) {
      alert(`Error: ${err.message || "Failed to auto-select"}`);
    } finally {
      setAutoSelecting(false);
    }
  };

  const executeSelectedOrders = async () => {
    // [NEW] Check Market Status First
    if (marketStatus && !marketStatus.isOpen) {
      alert(`${marketStatus.message}. Orders will be rejected.`);
      return;
    }

    if (selectedOptions.length === 0) {
      alert("Please select at least one option (CE or PE) to trade");
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    if (isWeekend || currentMinutes < 555 || currentMinutes > 930) {
      alert("⛔ Market Closed! (9:15 AM - 3:30 PM)\n\nWe do NOT support AMO (After Market Orders) to protect you from Option Gap Risks.\nPlease come back at 9:15 AM.");
      return;
    }

    if (!isAdmin) {
      alert("Only admin can place trades");
      return;
    }

    // Get the AngelOne clientcode from localStorage
    const angelClientcode = localStorage.getItem('angel_clientcode');
    if (!angelClientcode) {
      alert("❌ No AngelOne session found. Please connect your broker first.");
      return;
    }

    let confirmMsg = `BROADCAST: Place ${selectedOptions.length} order(s) for ALL active users?\n\nEach user will receive ${orderQuantity} lots.`;

    if (stopLoss) confirmMsg += `\n🛑 SL: ${stopLoss}`;
    if (target) confirmMsg += `\n🎯 Target: ${target}`;

    if (!window.confirm(confirmMsg)) return;

    const orderPromises = selectedOptions.map(async (opt) => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/place-all`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            exchange: "NFO",
            tradingsymbol: opt.tradingsymbol,
            side: "BUY",
            transactiontype: "BUY",
            quantity: orderQuantity,
            ordertype: "MARKET",
            symboltoken: opt.symboltoken,
            strategy,
            tradeType: "Option-Chain",
            executionMode: "SERVER",
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          return { success: false, error: `${opt.tradingsymbol}: ${json.error || "Broadcast failed"}`, results: [] };
        }
        return {
          success: true,
          totalUsers: json.totalUsers,
          dispatchMode: json.dispatchMode,
          queued: json.queued,
          livePlaced: json.livePlaced,
          demoPlaced: json.demoPlaced,
          executions: json.executions || json.results || [],
        };
      } catch (err: any) {
        return { success: false, error: `${opt.tradingsymbol}: ${err.message || "Network error"}`, results: [] };
      }
    });

    const results = await Promise.all(orderPromises);
    const totalTargeted = results[0]?.totalUsers || 0;

    // Combine all user results from multiple symbols if any
    const allUserResults: any[] = results.flatMap((r: any) => r.executions || r.results || []);
    const firstOk = results.find((r: any) => r.success);

    // Clear selection after execution
    setSelectedOptions([]);
    setStopLoss("");
    setTarget("");

    // Open Professional Results Modal
    setBroadcastResults({
      ok: results.every((r: any) => r.success),
      totalUsers: totalTargeted,
      dispatchMode: firstOk?.dispatchMode || "SERVER_BROADCAST",
      queued: firstOk?.queued,
      livePlaced: firstOk?.livePlaced,
      demoPlaced: firstOk?.demoPlaced,
      executions: allUserResults,
    });
    setBroadcastModalOpen(true);
    
    alert(`🚀 Broadcast initiated for ${totalTargeted} users. Check the Signals tab for real-time progress.`);
  };

  const handleOpenOrderDialog = (opt: OptionItem, side: 'BUY' | 'SELL') => {
    setSelectedOrderOption(opt);
    setOrderSide(side);
    setOrderDialogOpen(true);
  };

  const lotSizeMap: Record<string, number> = {
    "NIFTY": 25,
    "BANKNIFTY": 15,
    "FINNIFTY": 40
  };

  /* ---------------- UI ---------------- */
  let content: React.ReactNode;

  if (loading) {
    content = (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  } else if (marketData.length === 0) {
    content = <Typography>No option chain data</Typography>;
  } else {
    const sortedStrikes = [...marketData].sort((a, b) => a.strikePrice - b.strikePrice);
    let spotInserted = false;

    content = (
      <>
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.7; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.7; }
            }
          `}
        </style>

        {/* Advanced Market Intelligence Header */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Index Value Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #021B79 0%, #0575E6 100%)',
              color: 'common.white',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 110
            }}>
              <Box sx={{ flexGrow: 1, zIndex: 1 }}>
                <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1, fontWeight: '900', fontSize: 10 }}>LIVE INDEX PRICE</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: -1 }}>
                    {quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.ltp?.toFixed(2) || indexLtp?.toFixed(2) || '0.00'}
                  </Typography>
                  <Box 
                    sx={{ 
                      px: 0.8, py: 0.3, borderRadius: 0.5, fontSize: 12, fontWeight: '900',
                      bgcolor: (quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange || 0) >= 0 ? 'success.main' : 'error.main',
                      animation: 'pulse 2s infinite',
                      mb: 0.5
                    }}
                  >
                    {(quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange || 0) >= 0 ? '+' : ''}
                    {quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange?.toFixed(2) || '0.00'}%
                  </Box>
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 10 }}>Sync: Live Tick Data • {new Date().toLocaleTimeString()}</Typography>
              </Box>
            </Card>
          </Grid>

          {/* Market Sentiment Card (Analytics) */}
          <Grid item xs={12} md={4}>
            {(() => {
              const totalCeOi = marketData.reduce((acc, curr) => {
                const symbolToken = curr.CE?.symboltoken || '';
                return acc + (quoteMap[symbolToken]?.oi || 0);
              }, 0);
              const totalPeOi = marketData.reduce((acc, curr) => {
                const symbolToken = curr.PE?.symboltoken || '';
                return acc + (quoteMap[symbolToken]?.oi || 0);
              }, 0);
              const pcr = totalCeOi > 0 ? (totalPeOi / totalCeOi).toFixed(2) : "0.00";
              const isBullish = Number(pcr) > 1;
              return (
                <Card sx={{ p: 2, minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: '900', fontSize: 10 }}>OI SENTIMENT (PCR)</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h4" color={isBullish ? 'success.main' : 'error.main'} fontWeight="900">
                        {pcr}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, fontSize: 9 }}>
                        {isBullish ? 'BULLISH BIAS' : 'BEARISH BIAS'}
                      </Typography>
                    </Box>
                    <Iconify
                      icon={isBullish ? "solar:round-alt-arrow-up-bold-duotone" : "solar:round-alt-arrow-down-bold-duotone"}
                      width={32}
                      color={isBullish ? 'success.main' : 'error.main'}
                      sx={{ animation: 'float 2s infinite' }}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (totalPeOi / (totalPeOi + totalCeOi || 1)) * 100)}
                    sx={{ mt: 1, height: 4, borderRadius: 5, bgcolor: 'error.lighter', '& .MuiLinearProgress-bar': { bgcolor: 'success.main' } }}
                  />
                </Card>
              );
            })()}
          </Grid>

          {/* Market Status Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, minHeight: 110, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: '900', fontSize: 10 }}>EXCHANGE STATUS</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: marketStatus?.isOpen ? 'success.main' : 'error.main',
                    boxShadow: (theme) => `0 0 10px ${marketStatus?.isOpen ? theme.palette.success.main : theme.palette.error.main}`
                  }} />
                  <Typography variant="subtitle1" fontWeight="900" sx={{ textTransform: 'uppercase' }}>
                    {marketStatus?.isOpen ? 'MARKET OPEN' : 'SYSTEM CLOSED'}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: 9 }}>
                  {marketStatus?.message || 'Data feed active • No Latency'}
                </Typography>
              </Box>
              <Iconify icon="solar:globus-bold-duotone" width={32} color="text.disabled" />
            </Card>
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            color="primary"
            sx={{ bgcolor: 'background.paper', boxShadow: (theme) => theme.customShadows.z8 }}
          >
            <ToggleButton value="LTP" sx={{ px: 3, fontWeight: 'bold' }}>LTP VIEW</ToggleButton>
            <ToggleButton value="OI" sx={{ px: 3, fontWeight: 'bold' }}>OI VIEW</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 700,
            overflow: 'auto',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: (theme) => theme.customShadows.z20
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {viewMode === "LTP" ? (
                  <>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>VOLUME (CE)</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>LTP (CALL)</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'primary.main', color: 'common.white', fontWeight: 'bold', minWidth: 100 }}>STRIKE</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>LTP (PUT)</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>VOLUME (PE)</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>CALL OI</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>LTP (CALL)</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'primary.main', color: 'common.white', fontWeight: 'bold' }}>STRIKE</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>LTP (PUT)</TableCell>
                    <TableCell align="center" sx={{ backgroundColor: 'background.neutral', fontWeight: 'bold' }}>PUT OI</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedStrikes.map((row, index) => {
                const subRows: React.ReactNode[] = [];

                const isCeItm = row.strikePrice < indexLtp;
                const isPeItm = row.strikePrice > indexLtp;

                const renderPriceCellWithButtons = (
                  opt: OptionItem | undefined,
                  isItm: boolean,
                  value: string | number,
                  showLtpMeta: boolean = true
                ) => {
                  if (!opt) return <TableCell align="center">-</TableCell>;
                  const quote = quoteMap[opt.symboltoken];
                  return (
                    <TableCell align="center"
                      sx={{
                        bgcolor: isItm ? 'rgba(255, 245, 157, 0.15)' : 'transparent',
                        position: 'relative',
                        '&:hover .entry-btns': { opacity: 1 },
                        minWidth: 100
                      }}
                    >
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </Typography>
                          {showLtpMeta && (
                            <Typography variant="caption" sx={{
                              fontWeight: 'bold',
                              color: (quote?.percentChange || 0) >= 0 ? 'success.main' : 'error.main',
                              display: 'block'
                            }}>
                              {(quote?.percentChange || 0) >= 0 ? '+' : ''}
                              {quote?.percentChange?.toFixed(2) || '0.00'}%
                            </Typography>
                          )}
                        </Box>

                        <Stack className="entry-btns" direction="row" spacing={0.3} sx={{
                          opacity: 0,
                          position: 'absolute',
                          right: 2,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          transition: 'opacity 0.2s',
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          boxShadow: 2,
                          p: 0.3,
                          zIndex: 2
                        }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ minWidth: 28, height: 24, p: 0, fontSize: 11, fontWeight: 'bold' }}
                            onClick={(e) => { e.stopPropagation(); handleOpenOrderDialog(opt, 'BUY'); }}
                          >B</Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            sx={{ minWidth: 28, height: 24, p: 0, fontSize: 11, fontWeight: 'bold' }}
                            onClick={(e) => { e.stopPropagation(); handleOpenOrderDialog(opt, 'SELL'); }}
                          >S</Button>
                        </Stack>
                      </Stack>
                    </TableCell>
                  );
                };

                // Insert Spotlight row if this is the spot
                if (!spotInserted && indexLtp > 0 && (row.strikePrice > indexLtp || index === sortedStrikes.length - 1)) {
                  spotInserted = true;
                  subRows.push(
                    <TableRow key="spot-row" sx={{ backgroundColor: 'info.lighter', borderY: '3px solid', borderColor: 'info.main', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <TableCell colSpan={viewMode === "LTP" ? 7 : 5} align="center" sx={{ py: 1.5 }}>
                        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'info.main', animation: 'pulse 1s infinite' }} />
                          <Typography variant="h6" sx={{ color: 'info.darker', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>
                            {marketStatus?.isOpen ? 'LIVE MARKET' : 'MARKET CLOSED'} AT {indexLtp.toFixed(2)}
                          </Typography>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'info.main', animation: 'pulse 1s infinite' }} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                }

                subRows.push(
                  <TableRow
                    key={row.strikePrice}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    {viewMode === "LTP" ? (
                      <>
                        <TableCell align="center" sx={{ bgcolor: isCeItm ? 'rgba(255, 245, 157, 0.15)' : 'transparent' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {quoteMap[row.CE?.symboltoken || '']?.volume?.toLocaleString() || '0'}
                          </Typography>
                        </TableCell>

                        {renderPriceCellWithButtons(
                          row.CE,
                          isCeItm,
                          quoteMap[row.CE?.symboltoken || '']?.ltp?.toFixed(2) || row.CE?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        <TableCell align="center" sx={{ bgcolor: 'grey.100', fontWeight: 'bold', color: 'primary.dark' }}>
                          <Typography variant="subtitle2">{row.strikePrice}</Typography>
                        </TableCell>

                        {renderPriceCellWithButtons(
                          row.PE,
                          isPeItm,
                          quoteMap[row.PE?.symboltoken || '']?.ltp?.toFixed(2) || row.PE?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        <TableCell align="center" sx={{ bgcolor: isPeItm ? 'rgba(255, 245, 157, 0.15)' : 'transparent' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {quoteMap[row.PE?.symboltoken || '']?.volume?.toLocaleString() || '0'}
                          </Typography>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {renderPriceCellWithButtons(
                          row.CE,
                          isCeItm,
                          quoteMap[row.CE?.symboltoken || '']?.oi || 0,
                          false
                        )}

                        {renderPriceCellWithButtons(
                          row.CE,
                          isCeItm,
                          quoteMap[row.CE?.symboltoken || '']?.ltp?.toFixed(2) || row.CE?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        <TableCell align="center" sx={{ bgcolor: 'grey.100', fontWeight: 'bold', color: 'primary.dark' }}>
                          <Typography variant="subtitle2">{row.strikePrice}</Typography>
                        </TableCell>

                        {renderPriceCellWithButtons(
                          row.PE,
                          isPeItm,
                          quoteMap[row.PE?.symboltoken || '']?.ltp?.toFixed(2) || row.PE?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        {renderPriceCellWithButtons(
                          row.PE,
                          isPeItm,
                          quoteMap[row.PE?.symboltoken || '']?.oi || 0,
                          false
                        )}
                      </>
                    )}
                  </TableRow>
                );
                return subRows;
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 1 }}>
      {/* 🌐 100% REAL-TIME GLOBAL MARKET TICKER (NO MOCK DATA) */}
      <Box sx={{ mb: 2, height: 46, bgcolor: 'background.neutral', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <iframe 
          title="global-ticker-tape"
          src="https://www.tradingview-widget.com/embed-widget/ticker-tape/?locale=in#%7B%22symbols%22%3A%5B%7B%22proName%22%3A%22FOREXCOM%3ASPX500%22%2C%22title%22%3A%22S%26P%20500%22%7D%2C%7B%22proName%22%3A%22FOREXCOM%3ANSXUSD%22%2C%22title%22%3A%22Nasdaq%20100%22%7D%2C%7B%22proName%22%3A%22FX_IDC%3AUSDINR%22%2C%22title%22%3A%22USD%2FINR%22%7D%2C%7B%22proName%22%3A%22BITSTAMP%3ABTCUSD%22%2C%22title%22%3A%22BTC%2FUSD%22%7D%2C%7B%22proName%22%3A%22NSE%3ANIFTY%22%2C%22title%22%3A%22NIFTY%2050%22%7D%2C%7B%22proName%22%3A%22NSE%3ABANKNIFTY%22%2C%22title%22%3A%22BANK%20NIFTY%22%7D%5D%2C%22showSymbolLogo%22%3Atrue%2C%22colorTheme%22%3A%22light%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22adaptive%22%7D"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </Box>

      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            mb: 4,
            p: 2.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #001529 0%, #003366 100%)',
            color: 'common.white',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ position: 'relative', display: 'flex' }}>
              <Box 
                component="img" 
                src="/logo/logo_single.png" 
                sx={{ 
                  width: 42, 
                  height: 42, 
                  bgcolor: 'common.white', 
                  borderRadius: '20%',
                  p: 0.5,
                  boxShadow: (theme) => theme.customShadows.z8,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' 
                }} 
              />
              <Box sx={{ 
                width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', 
                position: 'absolute', bottom: -4, right: -4, border: '2px solid #001529',
                animation: 'pulse 1.5s infinite'
              }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: 2, textTransform: 'uppercase' }}>
                {symbol} <span style={{ opacity: 0.6, fontWeight: 400 }}>Option Chain</span>
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.5, letterSpacing: 1 }}>REAL-TIME ALGO TERMINAL v2.0</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.2, opacity: 0.6 }}>Active Strategy</Typography>
              <Typography variant="subtitle2" sx={{ color: 'primary.light', fontWeight: 'bold' }}>{strategy || 'MANUAL'}</Typography>
            </Box>

            <Box sx={{
              bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Typography variant="overline" sx={{ display: 'block', lineHeight: 1.2, opacity: 0.6 }}>Chain Expiry</Typography>
              <Typography variant="subtitle2" sx={{ color: 'warning.light', fontWeight: 'bold' }}>{selectedExpiry || 'NOT SELECTED'}</Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Symbol</InputLabel>
            <Select
              label="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as any)}
            >
              <MenuItem value="NIFTY">NIFTY 50</MenuItem>
              <MenuItem value="BANKNIFTY">BANK NIFTY</MenuItem>
              <MenuItem value="FINNIFTY">FIN NIFTY</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 220 }}>
            <InputLabel>Expiry</InputLabel>
            <Select
              label="Expiry"
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
            >
              {expiryDates.map((e) => (
                <MenuItem key={e.value} value={e.value}>
                  {e.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Strategy</InputLabel>
              <Select
                label="Strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                {strategiesList.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        {content}
      </Card>

      <OrderDialog
        open={orderDialogOpen}
        onClose={() => setOrderDialogOpen(false)}
        option={selectedOrderOption}
        side={orderSide}
        setSide={setOrderSide}
        ltp={quoteMap[selectedOrderOption?.symboltoken || '']?.ltp || 0}
        percentChange={quoteMap[selectedOrderOption?.symboltoken || '']?.percentChange || 0}
        indexSymbol={symbol}
        lotSize={lotSizeMap[symbol] || 25}
        strategy={strategy}
        onComplete={(results) => {
          setBroadcastResults(results);
          setBroadcastModalOpen(true);
        }}
      />

      <BroadcastResultModal
        open={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        data={broadcastResults}
      />
    </Container>
  );
}

/* ---------------- ORDER DIALOG COMPONENT ---------------- */

interface OrderDialogProps {
  open: boolean;
  onClose: () => void;
  option: OptionItem | null;
  side: 'BUY' | 'SELL';
  setSide: (side: 'BUY' | 'SELL') => void;
  ltp: number;
  percentChange: number;
  indexSymbol: string;
  lotSize: number;
  strategy: string;
  onComplete: (data: any) => void;
}

function OrderDialog({ open, onClose, option, side, setSide, ltp, percentChange, indexSymbol, lotSize, strategy, onComplete }: OrderDialogProps) {
  const [tab, setTab] = useState(0);
  const [productType, setProductType] = useState<'INTRADAY' | 'CARRYFORWARD'>('INTRADAY');
  const [lots, setLots] = useState(1);
  const [price, setPrice] = useState<string>("");
  const [isLimit, setIsLimit] = useState(false);
  const [slTargetEnabled, setSlTargetEnabled] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (open) {
      setPrice(ltp.toFixed(2));
    }
  }, [open, ltp]);

  if (!option) return null;

  const handleExecute = async () => {
    if (lots <= 0) {
      alert("Please enter a valid lot quantity");
      return;
    }

    setExecuting(true);
    try {
      const token = localStorage.getItem("authToken");
      const API_BASE = HOST_API || "";

      const payload = {
        exchange: "NFO",
        tradingsymbol: option.tradingsymbol,
        side,
        transactiontype: side,
        quantity: lots,
        ordertype: isLimit ? "LIMIT" : "MARKET",
        price: isLimit ? Number(price) : 0,
        producttype: productType,
        symboltoken: option.symboltoken,
        stopLossPrice: slTargetEnabled && stopLoss ? Number(stopLoss) : undefined,
        targetPrice: slTargetEnabled && target ? Number(target) : undefined,
        strategy: strategy || "Manual",
        tradeType: "Option-Chain",
        executionMode: "SERVER",
      };

      const res = await fetch(`${API_BASE}/api/orders/place-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok) {
        onClose();
        onComplete(json);
      } else {
        alert(`❌ Order Failed: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: { 
          borderRadius: 2, 
          overflow: 'hidden',
          boxShadow: (theme) => theme.customShadows.z24,
          maxHeight: '95vh',
          width: 440 // Consistent professional width
        }
      }}
    >
      {/* 🚀 Compact Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: side === 'BUY' ? 'rgba(0, 167, 111, 0.05)' : 'rgba(255, 86, 48, 0.05)'
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.2 }}>
              <Typography variant="subtitle1" fontWeight="900">{indexSymbol}</Typography>
              <Typography variant="caption" sx={{ bgcolor: 'grey.200', px: 0.8, py: 0.2, borderRadius: 0.5, fontWeight: 'bold', fontSize: 10 }}>
                {new Date(option.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
              </Typography>
              <Typography variant="caption" sx={{ bgcolor: option.optiontype === 'CE' ? 'success.lighter' : 'error.lighter', color: option.optiontype === 'CE' ? 'success.darker' : 'error.darker', px: 0.8, py: 0.2, borderRadius: 0.5, fontWeight: '900', fontSize: 10 }}>
                {option.strike} {option.optiontype}
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h4" color={side === 'BUY' ? 'success.main' : 'error.main'} fontWeight="800">
                {ltp.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: percentChange >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: 11 }}>
                {percentChange >= 0 ? '+' : ''} {percentChange.toFixed(2)}%
                <Iconify icon={percentChange >= 0 ? "solar:arrow-right-up-bold" : "solar:arrow-right-down-bold"} width={14} sx={{ ml: 0.2 }} />
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={1} alignItems="flex-end">
            <IconButton size="small" onClick={onClose} sx={{ mb: 0.5 }}>
               <Iconify icon="eva:close-fill" width={18} />
            </IconButton>
            <ToggleButtonGroup
              value={side}
              exclusive
              onChange={(e, next) => next && setSide(next)}
              size="small"
              sx={{ 
                bgcolor: 'background.neutral',
                p: 0.3,
                borderRadius: 1,
                height: 30,
                '& .MuiToggleButton-root': { border: 0, px: 2, fontWeight: 'bold', fontSize: 12 }
              }}
            >
              <ToggleButton value="BUY" sx={{ 
                borderRadius: '6px !important',
                '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white', '&:hover': { bgcolor: 'success.dark' } } 
              }}>B</ToggleButton>
              <ToggleButton value="SELL" sx={{ 
                borderRadius: '6px !important',
                '&.Mui-selected': { bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' } } 
              }}>S</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Box>

      {/* 📑 Compact Tabs */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 40,
          '& .MuiTab-root': { minWidth: 70, fontWeight: 'bold', fontSize: 12, py: 1.5, minHeight: 40 }
        }}
      >
        <Tab label="Regular" />
        <Tab label="Stop Loss" />
        <Tab label="GTT" />
      </Tabs>

      <DialogContent sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.8, display: 'block', fontWeight: '800', fontSize: 10 }}>
              PRODUCT TYPE
            </Typography>
            <ToggleButtonGroup
              value={productType}
              exclusive
              onChange={(e, next) => next && setProductType(next)}
              fullWidth
              size="small"
              sx={{ 
                bgcolor: 'background.neutral', 
                p: 0.3, 
                borderRadius: 1,
                height: 32,
                '& .MuiToggleButton-root': { border: 0, fontWeight: 'bold', fontSize: 11 }
              }}
            >
              <ToggleButton value="INTRADAY" sx={{ borderRadius: '6px !important' }}>INT (Intraday)</ToggleButton>
              <ToggleButton value="CARRYFORWARD" sx={{ borderRadius: '6px !important' }}>CF (Overnight)</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={6}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: '800', fontSize: 10 }}>LOTS</Typography>
              <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5, fontSize: 8, fontWeight: 'bold' }}>
                1 LOT = {lotSize} QTY
              </Typography>
            </Stack>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              type="number"
              value={lots}
              onChange={(e) => setLots(Number(e.target.value))}
              InputProps={{
                sx: { fontWeight: 'bold', height: 40 }
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: '800', fontSize: 10 }}>PRICE</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Switch
                        size="small"
                        checked={!isLimit}
                        onChange={() => setIsLimit(!isLimit)}
                    />
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: 9 }} color={!isLimit ? "primary" : "text.disabled"}>MARKET</Typography>
                </Box>
            </Stack>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={isLimit ? price : 'MARKET'}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!isLimit}
              InputProps={{
                sx: { fontWeight: 'bold', height: 40, bgcolor: !isLimit ? 'background.neutral' : 'transparent', fontSize: 14 }
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={slTargetEnabled}
                onChange={(e) => setSlTargetEnabled(e.target.checked)}
              />
            }
            label={<Typography variant="caption" fontWeight="bold">Set Stop Loss / Target</Typography>}
          />
          {slTargetEnabled && (
            <Grid container spacing={1.5} sx={{ mt: 1, p: 1.5, bgcolor: 'background.neutral', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
              <Grid item xs={6}>
                <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ fontSize: 9 }}>STOP LOSS</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Price"
                  sx={{ bgcolor: 'background.paper', mt: 0.5, '& .MuiInputBase-root': { height: 32, fontSize: 12 } }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ fontSize: 9 }}>TARGET</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Price"
                  sx={{ bgcolor: 'background.paper', mt: 0.5, '& .MuiInputBase-root': { height: 32, fontSize: 12 } }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </DialogContent>

      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderTop: '1px solid', borderColor: 'divider' }}>
        {(() => {
            const totalQty = lots * lotSize;
            const marginRequired = totalQty * ltp;
            const estimatedCharges = marginRequired > 0 ? 20 + (marginRequired * 0.0006) : 0;

            return (
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Stack>
                        <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 0.5, fontSize: 9 }}>MARGIN REQUIRED</Typography>
                        <Typography variant="h6" fontWeight="900" color="text.primary">
                            ₹ {marginRequired.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Stack>
                    <Stack alignItems="flex-end">
                        <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 0.5, fontSize: 9 }}>EST. CHARGES</Typography>
                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                            ₹ {estimatedCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Stack>
                </Stack>
            );
        })()}

        <Button
          fullWidth
          variant="contained"
          size="medium"
          color={side === 'BUY' ? 'success' : 'error'}
          onClick={handleExecute}
          disabled={executing}
          sx={{ 
            height: 48, 
            fontWeight: '900', 
            fontSize: 16, 
            letterSpacing: 1,
            boxShadow: (theme) => theme.customShadows[side === 'BUY' ? 'success' : 'error']
          }}
        >
          {executing ? <CircularProgress size={20} color="inherit" /> : `PLACE ${side} ORDER`}
        </Button>
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, opacity: 0.5, fontSize: 9 }}>
            Trading involves risk. System Generated Order via {strategy || 'Manual'}
        </Typography>
      </Box>
    </Dialog>
  );
}

/* ---------------- BROADCAST RESULT MODAL ---------------- */

function BroadcastResultModal({ open, onClose, data }: { open: boolean, onClose: () => void, data: any }) {
  if (!data) return null;

  const results = data.executions || data.results || [];
  const total = data.totalUsers || 0;
  const dispatchMode = String(data.dispatchMode || "SERVER_BROADCAST");
  const isClientDispatch =
    dispatchMode === "CLIENT_ONLY" ||
    dispatchMode === "CLIENT_FALLBACK" ||
    results.some((r: any) =>
      String(r.message || "").toLowerCase().includes("user-side execution")
    );

  const serverQueuedCount =
    typeof data.queued === "number"
      ? data.queued
      : results.filter((r: any) => r.status === "QUEUED" && !isClientDispatch).length;
  const successCount = isClientDispatch
    ? results.filter((r: any) => r.online && (r.status === "QUEUED" || r.status === "ok")).length
    : serverQueuedCount || results.filter((r: any) => r.status === "QUEUED" || r.status === "SUCCESS").length;
  const paperCount = data.demoPlaced || 0;
  const skippedCount = results.filter((r: any) => r.status === 'SKIPPED' || r.status === 'skipped' || r.status === 'OFFLINE').length;
  const errorCount = results.filter((r: any) => r.status === 'FAILED' || r.status === 'error').length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'primary.lighter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Iconify icon="eva:flash-fill" width={24} color="primary.main" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">Broadcast Execution Summary</Typography>
              <Typography variant="caption" color="text.secondary">
                {isClientDispatch
                  ? `Signal sent to ${total} user(s) — waiting for user device to place orders`
                  : `Server broker execution queued for ${total} targeted user(s)`}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.light' }}>
              <Typography variant="h4" color="success.darker" fontWeight="bold">{successCount}</Typography>
              <Typography variant="overline" color="success.darker">
                {isClientDispatch ? "Signals Sent" : "Server Queued"}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.light' }}>
              <Typography variant="h4" color="info.darker" fontWeight="bold">{paperCount}</Typography>
              <Typography variant="overline" color="info.darker">Demo/Paper</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.light' }}>
              <Typography variant="h4" color="warning.darker" fontWeight="bold">{skippedCount}</Typography>
              <Typography variant="overline" color="warning.darker">Offline/Skipped</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="h4" color="error.darker" fontWeight="bold">{errorCount}</Typography>
              <Typography variant="overline" color="error.darker">Errors</Typography>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mb: 1.5, px: 0.5 }}>Individual User Status</Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 400, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'background.neutral' }}>User Name</TableCell>
                <TableCell sx={{ bgcolor: 'background.neutral' }}>Licence</TableCell>
                <TableCell sx={{ bgcolor: 'background.neutral' }} align="center">
                  {isClientDispatch ? "Online" : "Execution"}
                </TableCell>
                <TableCell sx={{ bgcolor: 'background.neutral' }} align="center">Broker</TableCell>
                <TableCell sx={{ bgcolor: 'background.neutral' }}>Status</TableCell>
                <TableCell sx={{ bgcolor: 'background.neutral' }}>Message/ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r: any, i: number) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{r.userName}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.userId?.slice(-6) || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.licence} color={r.licence === 'Live' ? 'primary' : 'default'} sx={{ fontWeight: 'bold' }} />
                  </TableCell>
                  <TableCell align="center">
                    {isClientDispatch ? (
                      <Iconify
                        icon={r.online ? "eva:checkmark-circle-fill" : "eva:close-circle-fill"}
                        color={r.online ? "success.main" : "text.disabled"}
                        width={20}
                      />
                    ) : (
                      <Tooltip title={r.onlineMode === "SERVER_SIDE" ? "Server-side — user device not required" : "Server queued"}>
                        <Iconify
                          icon={
                            r.status === "QUEUED" || r.status === "SUCCESS" || r.online
                              ? "mdi:server-network"
                              : "eva:close-circle-fill"
                          }
                          color={
                            r.status === "QUEUED" || r.status === "SUCCESS" || r.online
                              ? "info.main"
                              : "text.disabled"
                          }
                          width={20}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{r.broker}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status?.toUpperCase()}
                      color={
                        (() => {
                          if (r.status === 'SUCCESS' || r.status === 'PENDING') return 'success';
                          if (r.status === 'QUEUED' && !isClientDispatch) return 'info';
                          if (r.status === 'QUEUED' || r.status === 'ok' || r.status === 'paper') return 'success';
                          if (['SKIPPED', 'skipped', 'OFFLINE'].includes(r.status)) return 'warning';
                          return 'error';
                        })()
                      }
                      sx={{ fontWeight: 'bold', fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: r.status === 'error' ? 'error.main' : 'text.secondary' }}>
                      {r.message || r.orderid || r.reason || r.error || "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button variant="contained" onClick={onClose} sx={{ px: 4 }}>
            Done
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
