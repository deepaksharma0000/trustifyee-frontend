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
  Paper,
  CircularProgress,
  Alert,
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
                        onClick={() => placeOrder(row.CE!, "BUY")}
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
                        onClick={() => placeOrder(row.PE!, "BUY")}
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
      {/* 🔥 ACTIVE POSITIONS SECTION */}
      {activePositions.length > 0 && (
        <Card sx={{ p: 3, mb: 3, bgcolor: '#f4f6f8' }}>
          <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
            💼 Active Positions (Live P&L)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Entry</TableCell>
                  <TableCell>LTP</TableCell>
                  <TableCell>P&L</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePositions.map((pos) => (
                  <TableRow key={pos.orderid}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{pos.tradingsymbol}</TableCell>
                    <TableCell color={pos.side === 'BUY' ? 'success' : 'error'}>{pos.side}</TableCell>
                    <TableCell>{pos.quantity}</TableCell>
                    <TableCell>{pos.entryPrice}</TableCell>
                    <TableCell>{pos.ltp}</TableCell>
                    <TableCell sx={{
                      color: pos.pnl >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 'bold'
                    }}>
                      {pos.pnl?.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleExit(pos.orderid)}
                      >
                        Exit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Card sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          📊 {symbol} Option Chain
        </Typography>
        <Box mb={2} maxWidth={220}>
          <FormControl fullWidth size="small">
            <InputLabel>Symbol</InputLabel>
            <Select
              label="Symbol"
              value={symbol}
              onChange={(e) =>
                setSymbol(e.target.value as "NIFTY" | "BANKNIFTY")
              }
            >
              <MenuItem value="NIFTY">NIFTY 50</MenuItem>
              <MenuItem value="BANKNIFTY">BANK NIFTY</MenuItem>
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

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        {content}
      </Card>

      {/* 🔥 TRADE HISTORY SECTION */}
      <Card sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
          📜 Trade History (Closed)
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Entry Price</TableCell>
                <TableCell>Exit Time</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tradeHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No history found</TableCell>
                </TableRow>
              ) : (
                tradeHistory.map((history) => (
                  <TableRow key={history.orderid}>
                    <TableCell>{history.tradingsymbol}</TableCell>
                    <TableCell>{history.side}</TableCell>
                    <TableCell>{history.quantity}</TableCell>
                    <TableCell>{history.entryPrice}</TableCell>
                    <TableCell>{new Date(history.exitAt).toLocaleString()}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>CLOSED</TableCell>
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
