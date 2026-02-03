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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import { BROKER_API } from "src/config-global";
import { useAuthContext } from "src/auth/hooks";

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
  const theme = useTheme();
  const { user } = useAuthContext();

  const [marketData, setMarketData] = useState<OptionRow[]>([]);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]); // 🔥 NEW
  const [expiryDates, setExpiryDates] = useState<ExpiryDateItem[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<"NIFTY" | "BANKNIFTY">("NIFTY");

  // @ts-ignore
  const clientCode = (user?.role === 'admin' ? user?.panel_client_key : user?.client_key) || "ANBG1133";




  /* ---------------- HELPERS ---------------- */

  const extractExpiryList = (options: OptionItem[]): ExpiryDateItem[] => {
    const map = new Map<string, ExpiryDateItem>();

    options.forEach((opt) => {
      const d = new Date(opt.expiry);
      const value = d.toISOString().split("T")[0];

      if (!map.has(value)) {
        map.set(value, {
          value,
          label: d.toDateString(),
          timestamp: d.toISOString(),
        });
      }
    });

    return Array.from(map.values());
  };

  /* ---------------- API CALL ---------------- */

  const fetchOptionChainFromLTP = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);

      // const res = await fetch(
      //   "http://localhost:4000/api/nifty/option-chain?ltp=25000"
      // );
      const apiUrl =
        symbol === "NIFTY"
          ? `${BROKER_API}/api/nifty/option-chain`
          : `${BROKER_API}/api/nifty/option-chain?symbol=BANKNIFTY`;

      const res = await fetch(apiUrl);


      const json = await res.json();
      if (!json.ok) throw new Error("Option chain fetch failed");

      const options: OptionItem[] = json.data.options || [];

      /* Expiry dropdown */
      const expiryList = extractExpiryList(options);
      setExpiryDates(expiryList);

      const activeExpiry =
        selectedExpiry || expiryList[0]?.value || "";

      if (!selectedExpiry && activeExpiry) {
        setSelectedExpiry(activeExpiry);
      }

      /* Filter by expiry */
      const filtered = options.filter(
        (o) =>
          new Date(o.expiry).toISOString().split("T")[0] === activeExpiry
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
  }, [selectedExpiry, symbol]);


  const fetchActivePositions = useCallback(async () => {
    if (!clientCode) return;
    try {
      const res = await fetch(`${BROKER_API}/api/orders/active-positions/${clientCode}`);
      const json = await res.json();
      if (json.ok) {
        setActivePositions(json.data);
      }
    } catch (err) {
      console.error("Fetch positions error:", err);
    }
  }, [clientCode]);

  const fetchTradeHistory = useCallback(async () => {
    if (!clientCode) return;
    try {
      const res = await fetch(`${BROKER_API}/api/orders/trade-history/${clientCode}`);
      const json = await res.json();
      if (json.ok) {
        setTradeHistory(json.data);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  }, [clientCode]);

  const handleExit = async (orderid: string) => {
    try {
      if (!window.confirm("Are you sure you want to Exit this position?")) return;

      const res = await fetch(`${BROKER_API}/api/orders/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientcode: clientCode, orderid }),
      });
      const json = await res.json();
      if (json.ok) {
        alert("Position exited successfully!");
        fetchActivePositions();
        fetchTradeHistory(); // 🔥 Refresh history after exit
      } else {
        alert(json.message || "Exit failed");
      }
    } catch (err) {
      alert("Exit error");
    }
  };

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    fetchOptionChainFromLTP();
  }, [fetchOptionChainFromLTP]);

  useEffect(() => {
    fetchActivePositions();
    fetchTradeHistory(); // 🔥 Initial fetch

    const timer = setInterval(() => {
      fetchActivePositions();
    }, 3000);

    return () => clearInterval(timer);
  }, [fetchActivePositions, fetchTradeHistory]);

  const isBrokerConnected =
    localStorage.getItem("angel_jwt") !== null;

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
  /* ---------------- ORDER HANDLER (STUB) ---------------- */

  const placeOrder = async (opt: OptionItem, side: "BUY" | "SELL") => {
    try {
      const res = await fetch(`${BROKER_API}/api/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientcode: clientCode,
          exchange: "NFO",
          tradingsymbol: opt.tradingsymbol,
          side,
          quantity: 1,
          ordertype: "MARKET",
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Order placement failed at backend");
      }

      // 🚨 Ensure we have a valid order ID from broker
      const brokerOrderId = json.resp?.data?.orderid;

      if (!brokerOrderId) {
        throw new Error(`Order status: ${json.resp?.message || 'Unknown error. No orderid received.'}`);
      }

      // ✅ save order to DB
      const saveRes = await fetch(`${BROKER_API}/api/orders/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientcode: clientCode,
          orderid: brokerOrderId,
          tradingsymbol: opt.tradingsymbol,
          symboltoken: opt.symboltoken, // 🔥 NEW
          exchange: "NFO",
          side,
          quantity: 1,
          price: 0,
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveJson.ok) {
        console.error("Save to DB failed:", saveJson);
        throw new Error("Order was placed at broker but failed to save in Dashboard! Check logs.");
      }

      alert(`Order placed successfully! ID: ${brokerOrderId}`);
    } catch (err: any) {
      console.error("Place Order Error:", err);
      alert(err.message || "Order error");
    }
  };

  // check status 
  const checkOrderStatus = async (orderid: string) => {
    const res = await fetch(
      `${BROKER_API}/api/orders/status/${clientCode}/${orderid}`
    );
    const json = await res.json();
    return json.status === "COMPLETE";
  };



  return (
    <Container maxWidth="xl" sx={{ mt: 3, pb: 10 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h3" sx={{
            fontWeight: 800,
            background: 'linear-gradient(45deg, #1A73E8 30%, #6E00FF 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}>
            Trustifye Terminal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Professional Options Trading Dashboard
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.success.main, 0.1),
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
        }}>
          <Typography variant="subtitle2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 2s infinite' }} />
            LIVE MARKET CONNECTED
          </Typography>
        </Stack>
      </Stack>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      {/* 🔥 ACTIVE POSITIONS SECTION */}
      {activePositions.length > 0 && (
        <Card sx={{
          p: 0,
          mb: 4,
          overflow: 'hidden',
          borderRadius: 3,
          boxShadow: theme.customShadows?.z24 || 24,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box component="span" sx={{ fontSize: '1.5rem' }}>💼</Box> Active Positions
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700,
              color: activePositions.reduce((acc, p) => acc + (p.pnl || 0), 0) >= 0 ? 'success.main' : 'error.main'
            }}>
              Total P&L: ₹{activePositions.reduce((acc, p) => acc + (p.pnl || 0), 0).toFixed(2)}
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Symbol</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Side</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Qty</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Entry</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>LTP</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>P&L</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePositions.map((pos) => (
                  <TableRow key={pos.orderid} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{pos.tradingsymbol}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{
                        px: 1.5, py: 0.5, borderRadius: 1, display: 'inline-flex',
                        fontWeight: 700, fontSize: '0.75rem',
                        bgcolor: pos.side === 'BUY' ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                        color: pos.side === 'BUY' ? 'success.main' : 'error.main'
                      }}>
                        {pos.side}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{pos.quantity}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>₹{pos.entryPrice}</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 700 }}>₹{pos.ltp}</TableCell>
                    <TableCell sx={{
                      color: pos.pnl >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}>
                      {pos.pnl >= 0 ? '+' : ''}{pos.pnl?.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="soft"
                        color="error"
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 1.5 }}
                        onClick={() => handleExit(pos.orderid)}
                      >
                        SQUARE OFF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 340px' }, gap: 4 }}>

        {/* OPTION CHAIN CARD */}
        <Card sx={{
          borderRadius: 3,
          boxShadow: theme.customShadows?.card || 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>📊 {symbol} Option Chain</Typography>
            <Stack direction="row" spacing={1}>
              {apiError && <Alert severity="error">{apiError}</Alert>}
            </Stack>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                <TableRow>
                  <TableCell align="center" sx={{ py: 1.5, fontWeight: 700, color: 'text.secondary' }}>CALL (CE)</TableCell>
                  <TableCell align="center" sx={{ py: 1.5, fontWeight: 800, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>STRIKE</TableCell>
                  <TableCell align="center" sx={{ py: 1.5, fontWeight: 700, color: 'text.secondary' }}>PUT (PE)</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {marketData.map((row) => (
                  <TableRow key={row.strikePrice} sx={{ '&:hover': { bgcolor: alpha(theme.palette.divider, 0.02) } }}>
                    {/* CE COLUMN */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {row.CE ? (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="success"
                          sx={{
                            borderRadius: 1.5, py: 1,
                            borderWidth: 1.5, fontWeight: 700,
                            '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.05), borderScale: 1.02 }
                          }}
                          onClick={() => placeOrder(row.CE!, "BUY")}
                        >
                          BUY CE
                        </Button>
                      ) : "-"}
                    </TableCell>

                    {/* STRIKE COLUMN */}
                    <TableCell align="center" sx={{
                      fontWeight: 800, fontSize: '1.1rem',
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.dark'
                    }}>
                      {row.strikePrice}
                    </TableCell>

                    {/* PE COLUMN */}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {row.PE ? (
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{
                            borderRadius: 1.5, py: 1,
                            borderWidth: 1.5, fontWeight: 700,
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.05) }
                          }}
                          onClick={() => placeOrder(row.PE!, "BUY")}
                        >
                          BUY PE
                        </Button>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* SIDEBAR CONTROLS */}
        <Stack spacing={3}>
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>Settings</Typography>
            <Stack spacing={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Symbol</InputLabel>
                <Select
                  label="Select Symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value as "NIFTY" | "BANKNIFTY")}
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="NIFTY">NIFTY 50</MenuItem>
                  <MenuItem value="BANKNIFTY">BANK NIFTY</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Expiry Date</InputLabel>
                <Select
                  label="Expiry Date"
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  sx={{ borderRadius: 1.5 }}
                >
                  {expiryDates.map((e) => (
                    <MenuItem key={e.value} value={e.value}>
                      {e.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button variant="contained" color="primary" fullWidth sx={{ py: 1.2, borderRadius: 1.5, fontWeight: 700, boxShadow: theme.customShadows?.primary }}>
                Refresh Data
              </Button>
            </Stack>
          </Card>

          <Card sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px dashed ${theme.palette.warning.main}` }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.dark', mb: 1 }}>
              ⚠️ Warning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Algo trading involves high risk. Make sure you have enough margin and correct settings before placing orders.
            </Typography>
          </Card>
        </Stack>

      </Box>

      {/* 🔥 TRADE HISTORY SECTION */}
      <Card sx={{
        p: 0, mt: 6, borderRadius: 3, overflow: 'hidden',
        boxShadow: theme.customShadows?.card || 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            📜 Trade History (Closed)
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Symbol</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Entry Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Exit Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tradeHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>No history found</TableCell>
                </TableRow>
              ) : (
                tradeHistory.map((history) => (
                  <TableRow key={history.orderid} sx={{ '&:hover': { bgcolor: alpha(theme.palette.divider, 0.01) } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{history.tradingsymbol}</TableCell>
                    <TableCell>
                      <Box sx={{
                        px: 1, py: 0.2, borderRadius: 0.5, fontSize: '0.7rem', fontWeight: 700, display: 'inline-block',
                        bgcolor: alpha(theme.palette.grey[500], 0.1), color: 'text.secondary'
                      }}>
                        {history.side}
                      </Box>
                    </TableCell>
                    <TableCell>{history.quantity}</TableCell>
                    <TableCell>₹{history.entryPrice}</TableCell>
                    <TableCell>{new Date(history.exitAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled' }}>CLOSED</Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
