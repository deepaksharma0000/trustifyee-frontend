// @mui
import {
  Container,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

// ----------------------------------------------------------------------

const strategies = [
  'All',
  'Beta',
  'Alpha',
  'Gama',
  'Delta',
  'DELTA',
  'GAMA',
  'ALPHA',
  'BETA',
  'zeta',
  'ZETA',
  'SIGMA',
  'sigma',
];

const tableData = [
  {
    sno: 1,
    time: '11/09/2025 01:03:43',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554400CE',
    price: 807.85,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 2,
    time: '11/09/2025 12:13:20',
    type: 'LE',
    symbol: 'BANKNIFTY30SEP2554400CE',
    price: 814.45,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: '-',
  },
  {
    sno: 3,
    time: '11/09/2025 12:10:45',
    type: 'LX',
    symbol: 'SENSEX11SEP2581300CE',
    price: 261.5,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 4,
    time: '11/09/2025 12:10:45',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554500CE',
    price: 740.9,
    strategy: 'Delta',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
  {
    sno: 5,
    time: '11/09/2025 12:07:43',
    type: 'LX',
    symbol: 'BANKNIFTY30SEP2554400PE',
    price: 322.75,
    strategy: 'Gama',
    tradeType: 'OPTION_CHAIN',
    status: 'SQUAREOFF',
  },
];

// ----------------------------------------------------------------------

export default function AllSignalsView() {
  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4">All Signals</Typography>
        <Button variant="contained" color="primary">
          Export Excel
        </Button>
      </Stack>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} md={6}>
          <TextField fullWidth label="Search Something Here" variant="outlined" />
        </Grid>
        <Grid xs={12} md={6}>
          <TextField select fullWidth label="Select Strategy" defaultValue="All">
            {strategies.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>S.No</TableCell>
              <TableCell>Signals Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Strategy</TableCell>
              <TableCell>Trade Type</TableCell>
              <TableCell>Entry/Exit Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.sno}>
                <TableCell>{row.sno}</TableCell>
                <TableCell>{row.time}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.symbol}</TableCell>
                <TableCell>{row.price}</TableCell>
                <TableCell>{row.strategy}</TableCell>
                <TableCell>{row.tradeType}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
