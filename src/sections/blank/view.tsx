// @mui
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSettingsContext } from 'src/components/settings';
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

export default function ClientsView() {
  const settings = useSettingsContext();

  // ---------------- Filters ----------------
  const [filters, setFilters] = useState({
    clientType: 'All',
    tradingType: 'All',
    brokerType: 'All',
    strategy: 'All',
    search: '',
  });

  // ---------------- State for Data ----------------
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  // ---------------- Handle Filters ----------------
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_BASE}/api/admin/star-client`);
        setClients(response.data.data || []);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [API_BASE]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Star Clients
      </Typography>

      {/* ---------------- Filters ---------------- */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="center"
        >
          <TextField
            select
            label="Client Type"
            value={filters.clientType}
            onChange={(e) => handleFilterChange('clientType', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Live">Live</MenuItem>
            <MenuItem value="Demo">Demo</MenuItem>
            <MenuItem value="2Days">2 Days Only</MenuItem>
          </TextField>

          <TextField
            select
            label="Trading Type"
            value={filters.tradingType}
            onChange={(e) => handleFilterChange('tradingType', e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="On">On</MenuItem>
            <MenuItem value="Off">Off</MenuItem>
          </TextField>

          <TextField
            select
            label="Broker Type"
            defaultValue="null"
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="null">All</MenuItem>
            <MenuItem value="2">Alice Blue</MenuItem>
            <MenuItem value="5">Zebull</MenuItem>
            <MenuItem value="15">Zerodha</MenuItem>
            <MenuItem value="14">5 Paisa</MenuItem>
            <MenuItem value="1">Market Hub</MenuItem>
            <MenuItem value="12">Angel</MenuItem>
            <MenuItem value="13">Fyers</MenuItem>
            <MenuItem value="4">Motilal Oswal</MenuItem>
            <MenuItem value="7">Kotak Neo</MenuItem>
            <MenuItem value="19">Upstox</MenuItem>
            <MenuItem value="20">Dhan</MenuItem>
            <MenuItem value="25">ICICI Direct</MenuItem>
            <MenuItem value="26">IIFL</MenuItem>
          </TextField>

          <TextField
            select
            label="Strategies"
            defaultValue="all"
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="66851e02afbc89187ef13a85">Beta</MenuItem>
            <MenuItem value="668baba8e12b696092ad161d">Alpha</MenuItem>
            <MenuItem value="668fa104ffc332d3cbb21f61">Gama</MenuItem>
            <MenuItem value="668fa226ffc332d3cbb21f88">Delta</MenuItem>
            <MenuItem value="66ab15f55c2ac83e345edebf">DELTA</MenuItem>
            <MenuItem value="674963f373a57e485e5e7202">GAMA</MenuItem>
            <MenuItem value="6785e55a35586b06b9d5194c">ALPHA</MenuItem>
            <MenuItem value="67cfe593c07093099c3a68b2">BETA</MenuItem>
            <MenuItem value="68918385c7e63475f6490078">zeta</MenuItem>
            <MenuItem value="689183b2c7e63475f649007d">ZETA</MenuItem>
            <MenuItem value="6891845ec7e63475f6490083">SIGMA</MenuItem>
            <MenuItem value="6891847bc7e63475f6490088">sigma</MenuItem>
          </TextField>
          {/* 
          <TextField
            label="Search"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />

          <Button variant="contained" size="small" onClick={fetchClients}>
            Search
          </Button> */}
        </Stack>
      </Paper>

      {/* ---------------- Table ---------------- */}
      <Paper sx={{ borderRadius: 2, p: 2 }}>
        {(() => {
          if (loading) {
            return (
              <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                <CircularProgress />
              </Box>
            );
          }

          if (error) {
            return (
              <Typography color="error" sx={{ p: 2 }}>
                {error}
              </Typography>
            );
          }

          return (
            <TableContainer
              sx={{
                maxWidth: '100%',
                overflowX: 'auto', // Enable horizontal scroll on small screens
              }}
            >
              <Table
                sx={{
                  minWidth: 650,
                  '& .MuiTableCell-root': {
                    py: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>SR. No.</TableCell>
                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>User Name</TableCell>
                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>User ID</TableCell>
                    <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Created At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.length > 0 ? (
                    clients.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.user_name || '-'}</TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.user_id || '-'}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No clients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()}
      </Paper>
    </Container>
  );
}
