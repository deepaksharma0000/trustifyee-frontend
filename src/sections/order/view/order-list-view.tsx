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

  const blinkTimers = useRef<Record<string, number>>({});

  const { user: authUser } = useAuthUser();
  const isAdmin = authUser?.role === "admin";
  const token = localStorage.getItem("authToken");
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || "";
  const wsBase = API_BASE
    ? API_BASE.replace(/^http/, "ws")
    : window.location.origin.replace(/^http/, "ws");
  const WS_URL = `${wsBase}/ws/market`;

  /* ---------------- HELPERS ---------------- */

  const getExpiryValue = useCallback(
    (dateValue: string) =>
      new Date(dateValue).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
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
          value,
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
        if (msg.type !== "tick" || !Array.isArray(msg.items)) return;

        setQuoteMap((prev) => {
          const next = { ...prev };
          msg.items.forEach((item: any) => {
            const symbolToken = item.symboltoken;
            const ltp = Number(item.ltp || 0);
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
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          return { success: false, error: `${opt.tradingsymbol}: ${json.error || "Broadcast failed"}` };
        }
        return { success: true, totalUsers: json.totalUsers };
      } catch (err: any) {
        return { success: false, error: `${opt.tradingsymbol}: ${err.message || "Network error"}` };
      }
    });

    const results = await Promise.all(orderPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const totalTargeted = results[0]?.success ? results[0].totalUsers : 0;
    const errors = results.filter((r) => !r.success).map((r) => r.error || "Unknown error");

    // Clear selection after execution
    setSelectedOptions([]);
    setStopLoss("");
    setTarget("");

    // Show results
    const resultMsg = `✅ Broadcast Success: ${successCount} symbols\n👥 Total Users Processed: ${totalTargeted}\n❌ Failed Symbols: ${failCount}${errors.length > 0 ? `\n\nErrors:\n${errors.join("\n")}` : ""
      }`;
    alert(resultMsg);
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

        {/* Premium Header Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: 'primary.darker', color: 'common.white' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Current Index Value</Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="h3" fontWeight="bold">{indexLtp.toFixed(2)}</Typography>
                  <Typography variant="subtitle2" sx={{
                    color: (quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange || 0) >= 0 ? 'success.light' : 'error.light'
                  }}>
                    {(quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange || 0) >= 0 ? '+' : ''}
                    {quoteMap[Object.keys(quoteMap).find(k => ["99926000", "99926009", "99926037"].includes(k)) || '']?.percentChange?.toFixed(2) || '0.00'}%
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>Updated: {new Date().toLocaleTimeString()}</Typography>
              </Box>
              <Iconify icon="eva:activity-fill" width={48} sx={{ opacity: 0.2 }} />
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="overline" color="text.secondary">Market Status</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: marketStatus?.isOpen ? 'success.main' : 'error.main' }} />
                  <Typography variant="h6" color={marketStatus?.isOpen ? 'success.main' : 'error.main'}>
                    {marketStatus?.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{marketStatus?.message || 'Exchange status updated live'}</Typography>
              </Box>
              <Iconify icon={marketStatus?.isOpen ? 'eva:trending-up-fill' : 'eva:moon-fill'} width={40} color="text.disabled" />
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={selectedOptions.length === 0}
                  onClick={executeSelectedOrders}
                  startIcon={<Iconify icon="eva:flash-fill" />}
                  sx={{ px: 4, height: 48, fontWeight: 'bold' }}
                >
                  PLACE ORDERS ({selectedOptions.length})
                </Button>
              </Stack>
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
                          quoteMap[row.CE?.symboltoken || '']?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        <TableCell align="center" sx={{ bgcolor: 'grey.100', fontWeight: 'bold', color: 'primary.dark' }}>
                          <Typography variant="subtitle2">{row.strikePrice}</Typography>
                        </TableCell>

                        {renderPriceCellWithButtons(
                          row.PE,
                          isPeItm,
                          quoteMap[row.PE?.symboltoken || '']?.ltp?.toFixed(2) || '0.00',
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
                          quoteMap[row.CE?.symboltoken || '']?.ltp?.toFixed(2) || '0.00',
                          true
                        )}

                        <TableCell align="center" sx={{ bgcolor: 'grey.100', fontWeight: 'bold', color: 'primary.dark' }}>
                          <Typography variant="subtitle2">{row.strikePrice}</Typography>
                        </TableCell>

                        {renderPriceCellWithButtons(
                          row.PE,
                          isPeItm,
                          quoteMap[row.PE?.symboltoken || '']?.ltp?.toFixed(2) || '0.00',
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
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Card sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          <Typography variant="h4">
            📊 {symbol} Option Chain
          </Typography>

          {isAdmin && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                color={selectedOptions.length > 0 ? "primary" : "default"}
                label={`Selected: ${selectedOptions.length}`}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Quantity</InputLabel>
                <Select
                  value={orderQuantity}
                  label="Quantity"
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                >
                  <MenuItem value={1}>1 Lot</MenuItem>
                  <MenuItem value={2}>2 Lots</MenuItem>
                  <MenuItem value={3}>3 Lots</MenuItem>
                  <MenuItem value={5}>5 Lots</MenuItem>
                  <MenuItem value={10}>10 Lots</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Stop Loss"
                size="small"
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                sx={{ width: 100 }}
              />
              <TextField
                label="Target"
                size="small"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                sx={{ width: 100 }}
              />

              <Box sx={{ border: '1px dashed grey', p: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSquareOffEnabled}
                      onChange={(e) => setAutoSquareOffEnabled(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto Exit"
                />
                {autoSquareOffEnabled && (
                  <TextField
                    type="datetime-local"
                    size="small"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    label="Exit Time"
                  />
                )}
              </Box>
            </Stack>
          )}
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
            <>
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
              <Button
                variant="outlined"
                onClick={handleAutoSelectStrategy}
                disabled={autoSelecting || !selectedExpiry}
              >
                Auto-Select
              </Button>
            </>
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
}

function OrderDialog({ open, onClose, option, side, setSide, ltp, percentChange, indexSymbol, lotSize, strategy }: OrderDialogProps) {
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
        tradeType: "Option-Chain"
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
        alert(`✅ Broadcast Complete!\nProcessed for ${json.totalUsers} users.`);
        onClose();
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
        sx: { borderRadius: 1.5, overflow: 'hidden' }
      }}
    >
      <Box sx={{ p: 2, bgcolor: side === 'BUY' ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight="bold" sx={{ color: 'text.primary' }}>
                {indexSymbol}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(option.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Typography>
              <Chip
                label={option.strike}
                size="small"
                sx={{ bgcolor: 'grey.200', fontWeight: 'bold' }}
              />
              <Chip
                label={option.optiontype}
                size="small"
                color={option.optiontype === 'CE' ? 'success' : 'error'}
                sx={{ fontWeight: 'bold' }}
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" color={percentChange >= 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                {ltp.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: percentChange >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                {percentChange >= 0 ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={1} alignItems="flex-end">
            <Stack direction="row" spacing={1}>
              {/* Fullscreen icon mock */}
              <IconButton size="small" sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Iconify icon="eva:expand-fill" width={16} />
              </IconButton>
              <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Iconify icon="eva:close-fill" width={16} />
              </IconButton>
            </Stack>
            <ToggleButtonGroup
              value={side}
              exclusive
              onChange={(e, next) => next && setSide(next)}
              size="small"
              sx={{ height: 32 }}
            >
              <ToggleButton value="BUY" sx={{
                px: 2,
                fontWeight: 'bold',
                '&.Mui-selected': { bgcolor: 'success.main', color: 'common.white', '&:hover': { bgcolor: 'success.dark' } }
              }}>B</ToggleButton>
              <ToggleButton value="SELL" sx={{
                px: 2,
                fontWeight: 'bold',
                '&.Mui-selected': { bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' } }
              }}>S</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Box>

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minWidth: 80, fontWeight: 'bold', fontSize: 13 }
        }}
      >
        <Tab label="Regular" />
        <Tab label="Stop Loss" />
        <Tab label="GTT" />
        <Tab label="SIP" disabled />
      </Tabs>

      <DialogContent sx={{ p: 2.5 }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
              Product Type
            </Typography>
            <ToggleButtonGroup
              value={productType}
              exclusive
              onChange={(e, next) => next && setProductType(next)}
              fullWidth
              size="small"
              sx={{ height: 36 }}
            >
              <ToggleButton value="INTRADAY" sx={{ fontWeight: 'bold' }}>INT</ToggleButton>
              <ToggleButton value="CARRYFORWARD" sx={{ fontWeight: 'bold' }}>CF</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={6} sm={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Lots</Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>1 Lot = {lotSize} Qty</Typography>
            </Stack>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={lots}
              onChange={(e) => setLots(Number(e.target.value))}
              sx={{ mt: 0.5 }}
            />
          </Grid>

          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 'bold' }}>
              Price
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!isLimit}
              sx={{ mt: 0.5 }}
            />
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: isLimit ? 'bold' : 'normal', color: isLimit ? 'primary.main' : 'text.disabled' }}>Limit</Typography>
              <Switch
                size="small"
                checked={!isLimit}
                onChange={() => setIsLimit(!isLimit)}
              />
              <Typography variant="caption" sx={{ fontWeight: !isLimit ? 'bold' : 'normal', color: !isLimit ? 'primary.main' : 'text.disabled' }}>Market</Typography>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={slTargetEnabled}
                onChange={(e) => setSlTargetEnabled(e.target.checked)}
              />
            }
            label={<Typography variant="body2" fontWeight="bold">Set Stop Loss / Target</Typography>}
          />
          {slTargetEnabled && (
            <Grid container spacing={2} sx={{ mt: 1, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Grid item xs={6}>
                <Typography variant="caption" fontWeight="bold">Stop Loss</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="SL Price"
                  sx={{ bgcolor: 'background.paper', mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" fontWeight="bold">Target</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Target Price"
                  sx={{ bgcolor: 'background.paper', mt: 0.5 }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">Available Margin</Typography>
            <Typography variant="subtitle2" fontWeight="bold">₹ 0.00</Typography>
          </Stack>
          <Stack alignItems="flex-end">
            <Typography variant="caption" color="text.secondary" fontWeight="bold">Charges</Typography>
            <Typography variant="subtitle2" fontWeight="bold">₹ 0</Typography>
          </Stack>
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          color={side === 'BUY' ? 'success' : 'error'}
          onClick={handleExecute}
          disabled={executing}
          sx={{ height: 48, fontWeight: 'bold', fontSize: 16 }}
        >
          {executing ? <CircularProgress size={24} /> : `PLACE ${side} ORDER`}
        </Button>
      </Box>
    </Dialog>
  );
}
