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
} from "@mui/material";
import { HOST_API } from "src/config-global";

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
      { ltp: number; oi: number | null; dir?: "up" | "down" }
    >
  >({});
  const [autoSelecting, setAutoSelecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  /* ---------------- AUTO SQUARE OFF STATE ---------------- */
  const [autoSquareOffEnabled, setAutoSquareOffEnabled] = useState(false);
  const [exitTime, setExitTime] = useState("");


  /* ---------------- MARKET STATUS STATE ---------------- */
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean, message: string } | null>(null);

  const blinkTimers = useRef<Record<string, number>>({});

  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
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

      // const res = await fetch(
      //   "http://localhost:4000/api/nifty/option-chain?ltp=25000"
      // );
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

      setMarketData(Object.values(grouped));
    } catch (err: any) {
      setApiError(err.message || "API error");
    } finally {
      setLoading(false);
    }
  }, [selectedExpiry, symbol, API_BASE, extractExpiryList, getExpiryLabel, getExpiryValue]);


  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    fetchOptionChainFromLTP();

    // Check Market Status
    fetch(`${API_BASE}/api/market/status`)
      .then(res => res.json())
      .then(json => {
        if (json.ok) setMarketStatus(json.data);
      })
      .catch(err => console.error("Market status check failed", err));
  }, [fetchOptionChainFromLTP, API_BASE]);

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
            const prevLtp = prev[symbolToken]?.ltp;

            let dir: "up" | "down" | undefined;
            if (prevLtp !== undefined && ltp !== prevLtp) {
              dir = ltp > prevLtp ? "up" : "down";
            }

            next[symbolToken] = { ltp, oi, dir };

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
          intervalMs: 2000,
          items,
        })
      );
    }
  }, [marketData]);

  /* ---------------- EXPIRY CHECK ---------------- */
  const isBrokerConnected = localStorage.getItem("angel_jwt") !== null;
  const isTradingEnabled = localStorage.getItem("trading_enabled") === "true";

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

  // 2. Check for Broker Connection (Only for LIVE Users)
  // Demo and Admin should see the chain directly
  const needsBroker = !isDemo && !isAdmin && !isBrokerConnected;

  if (needsBroker) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            🔒 Broker not connected
          </Typography>

          <Typography variant="body2" sx={{ mb: 3 }}>
            Option Chain access ke liye pehle broker connect karein
          </Typography>

          <Button
            variant="contained"
            onClick={() => { window.location.href = "/dashboard/profile" }}
          >
            Connect Broker
          </Button>
        </Card>
      </Container>
    );
  }

  // 3. Check for Trading Enabled (Only for LIVE Users)
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

    // Optional: Force SL/Target for safety (Uncomment if mandatory)
    // if (!stopLoss || !target) {
    //    alert("Safety: Please provide Stop Loss and Target price to protect your capital.");
    //    return;
    // }

    const now = new Date();
    // Use UTC+5:30 (IST) manually or simple generic local time check if user is in India
    // 9 * 60 + 15 = 555 mins
    // 15 * 60 + 30 = 930 mins
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if weekend
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // Simple IST check (Assuming user system is IST or close enough)
    // NOTE: For stricter check, this logic should be on backend.
    // NOTE: For stricter check, this logic should be on backend.
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

    let confirmMsg = `Place ${selectedOptions.length} order(s) with quantity ${orderQuantity} lots?\n\nClient: ${angelClientcode}`;

    if (stopLoss) confirmMsg += `\n🛑 SL: ${stopLoss}`;
    if (target) confirmMsg += `\n🎯 Target: ${target}`;

    if (!window.confirm(confirmMsg)) return;

    const orderPromises = selectedOptions.map(async (opt) => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/place`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            clientcode: angelClientcode, // 🔥 USE ANGEL CLIENTCODE
            exchange: "NFO",
            tradingsymbol: opt.tradingsymbol,
            side: "BUY",
            transactiontype: "BUY",
            quantity: orderQuantity,
            ordertype: "MARKET",
            symboltoken: opt.symboltoken,
            stopLossPrice: stopLoss ? Number(stopLoss) : undefined,
            targetPrice: target ? Number(target) : undefined,
            strategy,
            autoSquareOffEnabled,
            autoSquareOffTime: autoSquareOffEnabled && exitTime ? new Date(exitTime).toISOString() : undefined,
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          return { success: false, error: `${opt.tradingsymbol}: ${json.error || "Order failed"}` };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: `${opt.tradingsymbol}: ${err.message || "Network error"}` };
      }
    });

    const results = await Promise.all(orderPromises);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const errors = results.filter((r) => !r.success).map((r) => r.error || "Unknown error");

    // Clear selection after execution
    setSelectedOptions([]);
    setStopLoss("");
    setTarget("");

    // Show results
    const resultMsg = `✅ Success: ${successCount}\n❌ Failed: ${failCount}${errors.length > 0 ? `\n\nErrors:\n${errors.join("\n")}` : ""
      }`;
    alert(resultMsg);
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
    content = (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Strike</TableCell>
              <TableCell align="center">CALL (CE)</TableCell>
              <TableCell align="center">PUT (PE)</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {marketData.map((row) => (
              <TableRow key={row.strikePrice}>
                <TableCell>{row.strikePrice}</TableCell>

                <TableCell align="center">
                  {row.CE ? (
                    <>
                      <Typography variant="body2">
                        {row.CE.tradingsymbol}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: getDirectionColor(quoteMap[row.CE.symboltoken]?.dir),
                          backgroundColor: getDirectionBgColor(quoteMap[row.CE.symboltoken]?.dir),
                          borderRadius: 1,
                          px: 0.5,
                          py: 0.25,
                          mt: 0.5,
                        }}
                      >
                        LTP: {quoteMap[row.CE.symboltoken]?.ltp ?? "-"} | OI:{" "}
                        {quoteMap[row.CE.symboltoken]?.oi ?? "-"}
                      </Typography>
                      <Button
                        size="small"
                        variant={isOptionSelected(row.CE) ? "contained" : "outlined"}
                        color={isOptionSelected(row.CE) ? "success" : "primary"}
                        sx={{ mt: 1 }}
                        disabled={!isAdmin}
                        onClick={() => handleSelectOption(row.CE!)}
                      >
                        {isOptionSelected(row.CE) ? "✓ SELECTED" : "SELECT CE"}
                      </Button>
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>

                <TableCell align="center">
                  {row.PE ? (
                    <>
                      <Typography variant="body2">
                        {row.PE.tradingsymbol}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: getDirectionColor(quoteMap[row.PE.symboltoken]?.dir),
                          backgroundColor: getDirectionBgColor(quoteMap[row.PE.symboltoken]?.dir),
                          borderRadius: 1,
                          px: 0.5,
                          py: 0.25,
                          mt: 0.5,
                        }}
                      >
                        LTP: {quoteMap[row.PE.symboltoken]?.ltp ?? "-"} | OI:{" "}
                        {quoteMap[row.PE.symboltoken]?.oi ?? "-"}
                      </Typography>
                      <Button
                        size="small"
                        variant={isOptionSelected(row.PE) ? "contained" : "outlined"}
                        color={isOptionSelected(row.PE) ? "success" : "error"}
                        sx={{ mt: 1 }}
                        disabled={!isAdmin}
                        onClick={() => handleSelectOption(row.PE!)}
                      >
                        {isOptionSelected(row.PE) ? "✓ SELECTED" : "SELECT PE"}
                      </Button>
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Card sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Typography variant="h4">
            📊 {symbol} Option Chain
          </Typography>

          {marketStatus && !marketStatus.isOpen && (
            <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
              ⛔ {marketStatus.message}. Orders will be rejected.
            </Alert>
          )}
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
                placeholder="Ex. 150"
              />
              <TextField
                label="Target"
                size="small"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                sx={{ width: 100 }}
                placeholder="Ex. 250"
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
        <Box mb={2} maxWidth={220}>
          <FormControl fullWidth size="small">
            <InputLabel>Symbol</InputLabel>
            <Select
              label="Symbol"
              value={symbol}
              onChange={(e) =>
                setSymbol(e.target.value as "NIFTY" | "BANKNIFTY" | "FINNIFTY")
              }
            >
              <MenuItem value="NIFTY">NIFTY 50</MenuItem>
              <MenuItem value="BANKNIFTY">BANK NIFTY</MenuItem>
              <MenuItem value="FINNIFTY">FIN NIFTY</MenuItem>
            </Select>
          </FormControl>
        </Box>


        {/* Expiry Selector */}
        <Box mb={3} maxWidth={240}>
          <FormControl fullWidth size="small">
            <InputLabel>Expiry</InputLabel>
            <Select
              label="Expiry"
              value={selectedExpiry}
              onChange={(e) => {
                setSelectedExpiry(e.target.value);
              }}
            >
              {expiryDates.map((e) => (
                <MenuItem key={e.value} value={e.value}>
                  {e.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isAdmin && (
          <Box mb={3} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Strategy</InputLabel>
              <Select
                label="Strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <MenuItem value="Alpha">Alpha - ATM Straddle (Buy)</MenuItem>
                <MenuItem value="Beta">Beta - OTM Strangle (Buy)</MenuItem>
                <MenuItem value="Gamma">Gamma - ATM Straddle (Sell)</MenuItem>
                <MenuItem value="Delta">Delta - Bull Call Spread</MenuItem>
                <MenuItem value="Straddle">Straddle - Classic ATM</MenuItem>
                <MenuItem value="Strangle">Strangle - OTM</MenuItem>
                <MenuItem value="IronCondor">Iron Condor - 4 Leg</MenuItem>
                <MenuItem value="BullCallSpread">Bull Call Spread</MenuItem>
                <MenuItem value="BearPutSpread">Bear Put Spread</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              color="secondary"
              size="medium"
              onClick={handleAutoSelectStrategy}
              disabled={autoSelecting || !selectedExpiry}
              startIcon={autoSelecting ? <CircularProgress size={20} /> : null}
            >
              {autoSelecting ? "Auto-Selecting..." : "🎯 Auto-Select Strategy"}
            </Button>
          </Box>
        )}

        {isAdmin && (
          <Box mb={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={selectedOptions.length === 0}
              onClick={executeSelectedOrders}
            >
              🚀 Execute Selected ({selectedOptions.length})
            </Button>
            {selectedOptions.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => { setSelectedOptions([]); setStopLoss(""); setTarget(""); }}
              >
                Clear Selection
              </Button>
            )}
          </Box>
        )}

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        {content}
      </Card>
    </Container>
  );
}










