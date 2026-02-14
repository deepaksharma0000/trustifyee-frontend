import { useState } from 'react';
import {
    Box,
    Card,
    Table,
    Button,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    Typography,
    TableContainer,
    TextField,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    Paper,
} from '@mui/material';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`demo-trade-tabpanel-${index}`}
            aria-labelledby={`demo-trade-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `demo-trade-tab-${index}`,
        'aria-controls': `demo-trade-tabpanel-${index}`,
    };
}

// ----------------------------------------------------------------------

const STRATEGY_OPTIONS = ['All', 'Strategy', 'Trade'];
const SYMBOL_OPTIONS = ['All'];
const INDEX_SYMBOL_OPTIONS = ['Nifty 50', 'BankNifty', 'FinNifty'];

// ----------------------------------------------------------------------

export default function DemoTradeDetailsView() {
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <Card sx={{ mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="demo trade details tabs">
                    <Tab label="Signals" icon={<Iconify icon="mdi:broadcast" />} iconPosition="start" {...a11yProps(0)} />
                    <Tab label="Trade History" icon={<Iconify icon="mdi:history" />} iconPosition="start" {...a11yProps(1)} />
                </Tabs>
            </Box>

            {/* ---------------- Signals Tab ---------------- */}
            <CustomTabPanel value={currentTab} index={0}>
                <SignalsTab />
            </CustomTabPanel>

            {/* ---------------- Trade History Tab ---------------- */}
            <CustomTabPanel value={currentTab} index={1}>
                <TradeHistoryTab />
            </CustomTabPanel>
        </Card>
    );
}

// ----------------------------------------------------------------------

function SignalsTab() {
    const [type, setType] = useState('Trade');

    return (
        <>
            <Typography variant="h5" sx={{ mb: 3 }}>Signals</Typography>

            {/* Section 1: Row Nav */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <TextField
                    select
                    label="Type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    sx={{ minWidth: 200 }}
                    size="small"
                >
                    <MenuItem value="Trade">Trade</MenuItem>
                    <MenuItem value="Strategy">Strategy</MenuItem>
                </TextField>
            </Stack>

            {/* Section 2: Table */}
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead sx={{ bgcolor: 'background.neutral' }}>
                        <TableRow>
                            <TableCell>S.No.</TableCell>
                            <TableCell>Signals Time</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Symbol</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Strategy</TableCell>
                            <TableCell>Trade Type</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No Signals Available (Demo View Only)
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
}

// ----------------------------------------------------------------------

function TradeHistoryTab() {
    const [filters, setFilters] = useState({
        type: 'Strategy',
        symbol: 'All',
        indexSymbol: 'Nifty 50',
    });

    const handleReset = () => {
        setFilters({
            type: 'Strategy',
            symbol: 'All',
            indexSymbol: 'Nifty 50',
        });
    };

    return (
        <>
            <Typography variant="h5" sx={{ mb: 3 }}>Trade History</Typography>

            {/* Section Row 1: Filters */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                    select
                    label="Type"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    sx={{ minWidth: 150 }}
                    size="small"
                >
                    <MenuItem value="Strategy">Strategy</MenuItem>
                    <MenuItem value="Trade">Trade</MenuItem>
                </TextField>

                <TextField
                    select
                    label="Symbol"
                    value={filters.symbol}
                    onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                    sx={{ minWidth: 150 }}
                    size="small"
                >
                    {SYMBOL_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Index Symbol"
                    value={filters.indexSymbol}
                    onChange={(e) => setFilters({ ...filters, indexSymbol: e.target.value })}
                    sx={{ minWidth: 150 }}
                    size="small"
                >
                    {INDEX_SYMBOL_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>

            {/* Section Row 2: Reset Button */}
            <Box sx={{ mb: 3 }}>
                <Button variant="outlined" color="primary" onClick={handleReset}>
                    Reset
                </Button>
            </Box>

            {/* Section Row 3: Table */}
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead sx={{ bgcolor: 'background.neutral' }}>
                        <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell>Strategy</TableCell>
                            <TableCell>Entry Type</TableCell>
                            <TableCell>Entry Qty</TableCell>
                            <TableCell>Entry Price</TableCell>
                            <TableCell>Exit Price</TableCell>
                            <TableCell>Total</TableCell>
                            <TableCell>Details View</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No Trade History Available (Demo View Only)
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
}
