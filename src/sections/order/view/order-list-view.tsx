import { useEffect, useState, useCallback } from "react";
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
  const [tradingLive, setTradingLive] = useState(false);
  const [strategy, setStrategy] = useState<string>("Gamma");
  const [algoStatus, setAlgoStatus] = useState<any>(null);
  const manualOrdersEnabled = false;
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<OptionItem | null>(null);
  const [selectedSide, setSelectedSide] = useState<"CE" | "PE" | null>(null);

  const authUserRaw = localStorage.getItem("authUser");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const isAdmin = authUser?.role === "admin";
  const token = localStorage.getItem("authToken");
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || "";
 
  

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
    const fetchStatus = async () => {
      if (!isAdmin) return;
      const res = await fetch(`${API_BASE}/api/algo/status`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const json = await res.json();
      if (json.ok) setAlgoStatus(json.run);
    };
    fetchStatus();
  }, [API_BASE, isAdmin, token]);

  useEffect(() => {
    const fetchRuns = async () => {
      if (!isAdmin) return;
      const res = await fetch(`${API_BASE}/api/algo/runs?limit=20`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await res.json();
      if (json.ok) setRunHistory(json.runs || []);
    };
    fetchRuns();
  }, [API_BASE, isAdmin, token]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!isAdmin) return;
      const res = await fetch(`${API_BASE}/api/algo/summary`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await res.json();
      if (json.ok) setSummary(json.summary);
    };
    fetchSummary();
  }, [API_BASE, isAdmin, token]);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!isAdmin || !algoStatus?._id) return;
      const res = await fetch(`${API_BASE}/api/algo/trades/${algoStatus._id}?limit=50`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await res.json();
      if (json.ok) setRecentTrades(json.trades || []);
    };
    fetchTrades();
  }, [API_BASE, isAdmin, token, algoStatus]);

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
          onClick={() => { window.location.href = "/dashboard/profile"}}
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
          onClick={() => { window.location.href = "/dashboard/banking"}}
        >
          Go to Trading Details
        </Button>
      </Card>
    </Container>
  );
}
  /* ---------------- ORDER HANDLER (STUB) ---------------- */

 const placeOrder = async (opt: OptionItem, side: "BUY" | "SELL") => {
  try {
    if (!manualOrdersEnabled) {
      alert("Manual orders are disabled. Use Start Algo.");
      return;
    }
    if (!isAdmin) {
      alert("Only admin can place trades");
      return;
    }
    if (!tradingLive) {
      alert("Trading is disabled. Enable Live first.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/orders/place-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        exchange: "NFO",
        tradingsymbol: opt.tradingsymbol,
        side,
        transactiontype: side,
        quantity: 1,
        ordertype: "MARKET",
      }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Order failed");

    alert("Order placed successfully");
  } catch (err: any) {
    alert(err.message || "Order error");
  }
};

// check status 
const checkOrderStatus = async (orderid: string) => {
  const res = await fetch(
    `${API_BASE}/api/orders/status/ANBG1133/${orderid}`
  );
  const json = await res.json();
  return json.status === "COMPLETE";
};

 const handleSelect = (opt: OptionItem) => {
  setSelectedOption(opt);
  setSelectedSide(opt.optiontype);
 };

 const startAlgo = async () => {
  if (!isAdmin) return;
  if (!selectedExpiry) {
    alert("Select expiry first");
    return;
  }
  if (!strategy) {
    alert("Select strategy first");
    return;
  }
  const res = await fetch(`${API_BASE}/api/algo/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      symbol,
      expiry: selectedExpiry,
      strategy,
      optionSide: selectedSide || "BOTH",
    }),
  });
  const json = await res.json();
  if (!json.ok) {
    alert(json.error || "Failed to start");
    return;
  }
  setAlgoStatus(json.run);
  setTradingLive(true);
 };

 const stopAlgo = async () => {
  if (!algoStatus?._id) return;
  const res = await fetch(`${API_BASE}/api/algo/stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ runId: algoStatus._id, reason: "Manual stop" }),
  });
  const json = await res.json();
  if (json.ok) {
    setAlgoStatus(null);
    setTradingLive(false);
  }
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
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ mt: 1 }}
                      disabled={!manualOrdersEnabled || !isAdmin || !tradingLive}
                      onClick={() => handleSelect(row.CE!)}
                    >
                      BUY CE
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
                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      sx={{ mt: 1 }}
                      disabled={!manualOrdersEnabled || !isAdmin || !tradingLive}
                      onClick={() => handleSelect(row.PE!)}
                    >
                      BUY PE
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
              {algoStatus ? (
                <Chip color="success" label="Algo Running" />
              ) : (
                <Chip color="default" label="Algo Stopped" />
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={tradingLive}
                    onChange={(_, checked) => setTradingLive(checked)}
                    color="success"
                  />
                }
                label={tradingLive ? "Live Trading: ON" : "Live Trading: OFF"}
              />
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
          <Box mb={3} display="flex" gap={2} flexWrap="wrap">
            <Button variant="contained" color="success" onClick={startAlgo}>
              Start Algo
            </Button>
            <Button variant="contained" disabled={!selectedOption} onClick={startAlgo}>
              Execute Selected
            </Button>
            <Button variant="outlined" color="error" onClick={stopAlgo}>
              Stop Algo
            </Button>
          </Box>
        )}

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        {content}
      </Card>

      {isAdmin && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Algo Runs (Recent)
          </Typography>
          {runHistory.length === 0 ? (
            <Typography variant="body2">No runs yet</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Strategy</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {runHistory.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>{r.symbol}</TableCell>
                      <TableCell>{r.strategy}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>{new Date(r.startedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {isAdmin && summary && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Daily Summary
          </Typography>
          <Typography variant="body2">Date: {summary.date}</Typography>
          <Typography variant="body2">Total Trades: {summary.totalTrades}</Typography>
          <Typography variant="body2">Success: {summary.success}</Typography>
          <Typography variant="body2">Failed: {summary.failed}</Typography>
          <Typography variant="body2">Open Positions: {summary.openPositions}</Typography>
          <Typography variant="body2">Closed Positions: {summary.closedPositions}</Typography>
          <Typography variant="body2">P&L: {summary.pnl}</Typography>
        </Card>
      )}

      {isAdmin && algoStatus && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Trades (Current Run)
          </Typography>
          {recentTrades.length === 0 ? (
            <Typography variant="body2">No trades yet</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTrades.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>{t.clientcode}</TableCell>
                      <TableCell>{t.tradingsymbol}</TableCell>
                      <TableCell>{t.optiontype}</TableCell>
                      <TableCell>{t.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}
    </Container>
  );
}










