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
  const [quoteMap, setQuoteMap] = useState<
    Record<
      string,
      { ltp: number; oi: number | null; dir?: "up" | "down" }
    >
  >({});
  const wsRef = useRef<WebSocket | null>(null);
  const blinkTimers = useRef<Record<string, number>>({});

  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const isAdmin = authUser?.role === "admin";
  const token = localStorage.getItem("authToken");
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || "";
  const WS_URL = (API_BASE
    ? API_BASE.replace(/^http/, "ws")
    : window.location.origin.replace(/^http/, "ws")
  ) + "/ws/market";



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
  }, [fetchOptionChainFromLTP]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "tick" || !Array.isArray(msg.items)) return;

        setQuoteMap((prev) => {
          const next = { ...prev };
          for (const item of msg.items) {
            const token = item.symboltoken;
            const ltp = Number(item.ltp || 0);
            const oi =
              item.oi === null || item.oi === undefined ? null : Number(item.oi);
            const prevLtp = prev[token]?.ltp;
            const dir =
              prevLtp !== undefined && ltp !== prevLtp
                ? ltp > prevLtp
                  ? "up"
                  : "down"
                : undefined;
            next[token] = { ltp, oi, dir };

            if (dir) {
              if (blinkTimers.current[token]) {
                window.clearTimeout(blinkTimers.current[token]);
              }
              blinkTimers.current[token] = window.setTimeout(() => {
                setQuoteMap((p) => {
                  if (!p[token]) return p;
                  return { ...p, [token]: { ...p[token], dir: undefined } };
                });
              }, 350);
            }
          }
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

  const isBrokerConnected =
    localStorage.getItem("angel_jwt") !== null;
  const isTradingEnabled =
    localStorage.getItem("trading_enabled") === "true";

  if (!isBrokerConnected) {
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
  if (!isTradingEnabled) {
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

  const isOptionSelected = (opt: OptionItem) => {
    return selectedOptions.some((o) => o.symboltoken === opt.symboltoken);
  };

  const executeSelectedOrders = async () => {
    if (selectedOptions.length === 0) {
      alert("Please select at least one option (CE or PE) to trade");
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

    const confirmMsg = `Place ${selectedOptions.length} order(s) with quantity ${orderQuantity} lots?\n\nClient: ${angelClientcode}`;
    if (!window.confirm(confirmMsg)) return;

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const opt of selectedOptions) {
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
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          failCount++;
          errors.push(`${opt.tradingsymbol}: ${json.error || "Order failed"}`);
        } else {
          successCount++;
        }
      } catch (err: any) {
        failCount++;
        errors.push(`${opt.tradingsymbol}: ${err.message || "Network error"}`);
      }
    }

    // Clear selection after execution
    setSelectedOptions([]);

    // Show results
    let resultMsg = `✅ Success: ${successCount}\n❌ Failed: ${failCount}`;
    if (errors.length > 0) {
      resultMsg += "\n\nErrors:\n" + errors.join("\n");
    }
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
                          color:
                            quoteMap[row.CE.symboltoken]?.dir === "up"
                              ? "success.main"
                              : quoteMap[row.CE.symboltoken]?.dir === "down"
                                ? "error.main"
                                : "text.secondary",
                          backgroundColor:
                            quoteMap[row.CE.symboltoken]?.dir === "up"
                              ? "rgba(76, 175, 80, 0.12)"
                              : quoteMap[row.CE.symboltoken]?.dir === "down"
                                ? "rgba(244, 67, 54, 0.12)"
                                : "transparent",
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
                          color:
                            quoteMap[row.PE.symboltoken]?.dir === "up"
                              ? "success.main"
                              : quoteMap[row.PE.symboltoken]?.dir === "down"
                                ? "error.main"
                                : "text.secondary",
                          backgroundColor:
                            quoteMap[row.PE.symboltoken]?.dir === "up"
                              ? "rgba(76, 175, 80, 0.12)"
                              : quoteMap[row.PE.symboltoken]?.dir === "down"
                                ? "rgba(244, 67, 54, 0.12)"
                                : "transparent",
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
          <Box mb={3} maxWidth={240}>
            <FormControl fullWidth size="small">
              <InputLabel>Strategy</InputLabel>
              <Select
                label="Strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <MenuItem value="Gamma">Gamma</MenuItem>
                <MenuItem value="Alpha">Alpha</MenuItem>
                <MenuItem value="Delta">Delta</MenuItem>
                <MenuItem value="Beta">Beta</MenuItem>
              </Select>
            </FormControl>
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
                onClick={() => setSelectedOptions([])}
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










