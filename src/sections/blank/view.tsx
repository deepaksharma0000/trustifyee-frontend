/* eslint-disable no-nested-ternary */
// @mui
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  MenuItem,
  TextField,
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

  // ---------------- Fetch API ----------------
  const fetchClients = useCallback(async () => {
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
  }, [API_BASE]);

  // Fetch on component mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Star Clients
      </Typography>

      {/* ---------------- Filters ---------------- */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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

          <TextField select label="Broker Type" size="small" sx={{ minWidth: 200 }}>
            <MenuItem value="null">All</MenuItem>
            <MenuItem value="2">Alice Blue</MenuItem>
            <MenuItem value="15">Zerodha</MenuItem>
            <MenuItem value="19">Upstox</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {/* ---------------- Table ---------------- */}
      <Paper sx={{ borderRadius: 2, p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>SR. No.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>User Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>User ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map((row, index) => (
                    <TableRow key={row.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.user_name || '-'}</TableCell>
                      <TableCell>{row.email || '-'}</TableCell>
                      <TableCell>{row.user_id || '-'}</TableCell>
                      <TableCell>
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : '-'}
                      </TableCell>
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
        )}
      </Paper>
    </Container>
  );
}
