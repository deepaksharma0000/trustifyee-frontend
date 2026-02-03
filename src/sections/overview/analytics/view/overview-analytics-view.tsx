import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Divider,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Switch,
  Avatar,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import { useSettingsContext } from 'src/components/settings';
import { BACKEND_API } from 'src/config-global';

// ----------------------------------------------------------------------

interface SubAdmin {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  password: string;
  status: boolean;
  clients: number;
  dashboard: boolean;
  permissions?: any;
}

export default function SubAdminManagementView() {
  const settings = useSettingsContext();

  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<number[]>([]);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const API_BASE = `${BACKEND_API}/api/admin`;
  const STORE_ENDPOINT = `${API_BASE}/register`;
  const UPDATE_ENDPOINT = `${API_BASE}/update-register/`;
  const SHOW_ENDPOINT = `${API_BASE}/get-admin/`;

  const showSnackbar = useCallback((message: string, severity: any) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const [permissions, setPermissions] = useState({
    allPermission: false,
    addClient: false,
    editClient: false,
    licencePermission: false,
    goToDashboard: false,
    tradeHistory: false,
    fullInfoView: false,
    groupServicePermission: false,
    updateClientApiKey: false,
    strategyPermission: false,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
  });

  const fetchSubAdmins = useCallback(async () => {
    try {
      const res = await fetch(SHOW_ENDPOINT);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setSubAdmins(data);
    } catch {
      showSnackbar('Failed to load sub-admins', 'error');
    }
  }, [SHOW_ENDPOINT, showSnackbar]);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  const generateRandomClientKey = () =>
    Math.floor(1000000000 + Math.random() * 9000000000).toString();

  const createSubAdmin = async (data: any) => {
    await fetch(STORE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, panel_client_key: generateRandomClientKey() }),
    });
  };

  const updateSubAdmin = async (id: number, data: any) => {
    await fetch(`${UPDATE_ENDPOINT}${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, panel_client_key: generateRandomClientKey() }),
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const payload = { ...formData, permissions, status: editingId ? 'active' : 'active', };
      if (editingId) {
        await updateSubAdmin(editingId, payload);
      } else {
        await createSubAdmin(payload);
      }
      showSnackbar(editingId ? 'Updated successfully' : 'Created successfully', 'success');
      setIsFormVisible(false);
      setEditingId(null);
      setFormData({ full_name: '', email: '', mobile: '', password: '' });
      fetchSubAdmins();
    } catch {
      showSnackbar('Operation failed', 'error');
    }
  };

  const filteredSubAdmins = subAdmins.filter((a) => {
    const searchMatch =
      a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'active' && a.status) ||
      (statusFilter === 'inactive' && !a.status);
    return searchMatch && statusMatch;
  });

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'} sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Sub Admin Management</Typography>
        <Button variant="contained" onClick={() => setIsFormVisible(!isFormVisible)}>
          {isFormVisible ? 'View List' : 'Add Sub Admin'}
        </Button>
      </Box>

      {isFormVisible ? (
        <Card sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <TextField fullWidth label="Full Name" name="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                <TextField fullWidth label="Mobile" name="mobile" sx={{ mt: 2 }} value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                <TextField fullWidth label="Email" name="email" sx={{ mt: 2 }} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  sx={{ mt: 2 }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button size="small" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? 'Hide' : 'Show'}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid xs={12} md={6}>
                <Typography variant="h6">Permissions</Typography>
                {Object.keys(permissions).map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={(permissions as any)[key]}
                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                      />
                    }
                    label={key}
                  />
                ))}
              </Grid>
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={() => setIsFormVisible(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Box>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sr</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Dashboard</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubAdmins
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar>{a.full_name[0]}</Avatar>
                        {a.full_name}
                      </Box>
                    </TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.mobile}</TableCell>
                    <TableCell>
                      <Chip label={a.status ? 'active' : 'inactive'} color={a.status ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={a.dashboard} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => setEditingId(a.id)}>Edit</Button>
                      <Button size="small" color="error">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredSubAdmins.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => setRowsPerPage(+e.target.value)}
          />
        </TableContainer>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}
