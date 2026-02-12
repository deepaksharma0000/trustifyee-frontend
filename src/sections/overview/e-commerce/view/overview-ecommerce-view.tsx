import { useState, useCallback, useEffect, useMemo } from 'react';
// @mui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridRowSelectionModel,
  getGridNumericOperators,
  GridFilterInputValueProps,
  GridColumnVisibilityModel,
  GridActionsCellItem,
} from '@mui/x-data-grid';
// components
import Iconify from 'src/components/iconify';
import { HOST_API } from 'src/config-global';

// Types
interface ClientFormData {
  user_name: string;
  email: string;
  full_name: string;
  phone_number: string;
  broker: string;
  licence: string;
  sub_admin: string;
  group_service: string;
  strategies?: string[];
  service_to_month?: string;
  to_month?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  trading_status?: string;
  api_key?: string;
  client_key?: string;
}

interface ApiResponse {
  message: string;
  data: any;
  status: boolean;
  error?: string;
}

interface ClientData {
  id: string;
  srNo: number;
  user_name: string;
  email: string;
  full_name: string;
  client_key: string;
  phone_number: string;
  broker: string;
  to_month: string;
  status: string;
  trading_status: string;
  api_key: string;
  created_at: string;
  start_date: string;
  end_date: string;
  last_login?: string;
  avatar_color?: string;
  isStarred?: boolean;
}

// ----------------------------------------------------------------------


// Enhanced columns with actions and better styling
const getColumns = (handleEdit: (client: ClientData) => void, handleOpenDeleteDialog: (client: ClientData) => void): GridColDef[] => [
  {
    field: 'srNo',
    headerName: 'SR. No.',
    width: 80,
    headerAlign: 'center',
    align: 'center',
    valueGetter: (params) => params.row.srNo
  },
  {
    field: 'avatar',
    headerName: '',
    width: 60,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <Avatar
        sx={{
          bgcolor: params.row.avatar_color || '#4caf50',
          width: 32,
          height: 32,
          fontSize: '0.875rem'
        }}
      >
        {params.row.full_name ? params.row.full_name.charAt(0).toUpperCase() : params.row.user_name.charAt(0).toUpperCase()}
      </Avatar>
    )
  },
  {
    field: 'user_name',
    headerName: 'User Name',
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <Tooltip title={params.value}>
        <span>{params.value}</span>
      </Tooltip>
    )
  },
  {
    field: 'email',
    headerName: 'Email',
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <Tooltip title={params.value}>
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{params.value}</span>
      </Tooltip>
    )
  },
  {
    field: 'full_name',
    headerName: 'Full Name',
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <Tooltip title={params.value}>
        <span>{params.value}</span>
      </Tooltip>
    )
  },
  {
    field: 'client_key',
    headerName: 'Client Key',
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <Tooltip title={params.value}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 120 }}>{params.value}</span>
          <IconButton size="small" onClick={() => navigator.clipboard.writeText(params.value)}>
            <Iconify icon="eva:copy-fill" width={16} />
          </IconButton>
        </Box>
      </Tooltip>
    )
  },
  {
    field: 'phone_number',
    headerName: 'Phone',
    width: 120
  },
  {
    field: 'broker',
    headerName: 'Broker',
    width: 100,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        variant="outlined"
        color={params.value === 'Zerodha' ? 'primary' : 'default'}
      />
    )
  },
  {
    field: 'to_month',
    headerName: 'Month',
    width: 80,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        color="secondary"
        variant="outlined"
      />
    )
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 80,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      const isActive = params.value === 'Active';
      return (
        <Tooltip title={isActive ? 'Click to deactivate' : 'Click to activate'}>
          <IconButton
            size="small"
            onClick={() => {
              // Handle status toggle here
              console.log('Toggle status for:', params.row.id);
            }}
            color={isActive ? 'success' : 'default'}
          >
            <Iconify
              icon={isActive ? 'eva:power-fill' : 'eva:power-outline'}
              width={20}
              color={isActive ? '#4caf50' : '#9e9e9e'}
            />
          </IconButton>
        </Tooltip>
      );
    },
  },
  {
    field: 'trading_status',
    headerName: 'Trading',
    width: 80,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => {
      const isEnabled = params.value === 'enabled';
      return (
        <Tooltip title={isEnabled ? 'Trading enabled - Click to disable' : 'Trading disabled - Click to enable'}>
          <IconButton
            size="small"
            onClick={() => {
              // Handle trading status toggle here
              console.log('Toggle trading for:', params.row.id);
            }}
            color={isEnabled ? 'success' : 'default'}
          >
            <Iconify
              icon={isEnabled ? 'eva:checkmark-circle-2-fill' : 'eva:close-circle-outline'}
              width={24}
              color={isEnabled ? '#4caf50' : '#9e9e9e'}
            />
          </IconButton>
        </Tooltip>
      );
    },
  },
  {
    field: 'api_key',
    headerName: 'API Key',
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <Tooltip title={params.value || 'No API key'}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: 100,
            opacity: params.value ? 1 : 0.5
          }}>
            {params.value || 'Not set'}
          </span>
          {params.value && (
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(params.value)}>
              <Iconify icon="eva:copy-fill" width={16} />
            </IconButton>
          )}
        </Box>
      </Tooltip>
    )
  },
  {
    field: 'created_at',
    headerName: 'Created',
    width: 120,
    valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
  },
  {
    field: 'start_date',
    headerName: 'Start Date',
    width: 120,
    valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
  },
  {
    field: 'end_date',
    headerName: 'End Date',
    width: 120,
    valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A',
    renderCell: (params) => {
      if (!params.value) return 'N/A';

      const endDate = new Date(params.value);
      const today = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let color: 'default' | 'error' | 'warning' = 'default';
      if (daysLeft < 0) color = 'error';
      else if (daysLeft < 7) color = 'warning';

      const timeLabel = daysLeft < 0 ? 'ago' : 'remaining'; // ✅ extracted ternary

      return (
        <Tooltip title={`${daysLeft} days ${timeLabel}`}>
          <Chip
            label={new Date(params.value).toLocaleDateString()}
            size="small"
            color={color as any}
            variant="outlined"
          />
        </Tooltip>
      );
    }

  },
  {
    field: 'star',
    headerName: 'Star',
    width: 80,
    headerAlign: 'center',
    align: 'center',
    sortable: false,
    filterable: false,
    renderCell: (params) => {
      const isStarred = params.row.isStarred;

      return (
        <Tooltip title={isStarred ? "Unstar Client" : "Star this Client"}>
          <IconButton
            size="small"
            color={isStarred ? "warning" : "default"}
            onClick={async () => {
              try {
                const newStatus = !isStarred;
                if (newStatus) {
                  await apiService.toggleStarClient(
                    params.row.id,           // ✅ user_id
                    params.row.user_name,    // ✅ user_name
                    params.row.email       // ✅ email
                  );
                } else {
                  await apiService.deleteStarClient(params.row.id);
                }
                // ✅ Update UI instantly
                params.api.updateRows([{ ...params.row, isStarred: newStatus }]);

              } catch (error) {
                console.error('Failed to update star status', error);
                alert('Failed to update star status');
              }
            }}
          >
            <Iconify
              icon={isStarred ? "mdi:star" : "mdi:star-outline"}
              width={24}
              color={isStarred ? "#fbc02d" : "#9e9e9e"}
            />
          </IconButton>
        </Tooltip>
      );
    }
  },
  {
    field: 'dashboard',
    headerName: 'Dashboard',
    width: 100,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => (
      <Tooltip title="Go to client dashboard">
        <IconButton
          size="small"
          color="primary"
          onClick={() => window.open(`/dashboard/${params.row.id}`, '_blank')}
        >
          <Iconify icon="eva:external-link-fill" width={20} />
        </IconButton>
      </Tooltip>
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    type: 'actions',
    width: 100,
    headerAlign: 'center',
    align: 'center',
    getActions: (params) => [
      <GridActionsCellItem
        icon={<Iconify icon="eva:edit-fill" />}
        label="Edit"
        onClick={() => handleEdit(params.row)}
      />,
      <GridActionsCellItem
        icon={<Iconify icon="eva:trash-2-outline" />}
        label="Delete"
        onClick={() => handleOpenDeleteDialog(params.row)}
        sx={{ color: 'error.main' }}
      />,
    ],
  },
];

// ----------------------------------------------------------------------

type Props = {
  data?: ClientData[];
};


// API Service Functions
const API_BASE_URL = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

const apiService = {
  registerClient: async (clientData: Omit<ClientFormData, 'strategies'>): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        let errorMessage = `Registration failed (Status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
  toggleStarClient: async (userId: string, userName: string, email: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/star-client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, user_name: userName, email }),
      });
      if (!response.ok) throw new Error('Failed to update star status');
      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
  deleteStarClient: async (userId: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/delete-star-client/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove star status');
      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
  updateClient: async (clientId: string, clientData: any): Promise<ApiResponse> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Auth token missing');
      const response = await fetch(`${API_BASE_URL}/api/user/update-register/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token,
        },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error(`Update failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
  getLoggedInClients: async (): Promise<ClientData[]> => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user/by-enddate?filter=custom&date=2099-12-31`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      return result.data.map((client: any, index: number) => ({
        id: client.id || client._id || index.toString(),
        srNo: index + 1,
        user_name: client.user_name || '',
        email: client.email || '',
        full_name: client.full_name || '',
        client_key: client.client_key || '',
        phone_number: client.phone_number || '',
        broker: client.broker || '',
        to_month: client.to_month || '',
        status: client.status || 'inactive',
        trading_status: client.trading_status || 'disabled',
        api_key: client.api_key || '',
        created_at: client.createdAt || client.created_at || new Date().toISOString(),
        start_date: client.start_date || '',
        end_date: client.end_date || '',
        isStarred: client.isStarred || false,
        avatar_color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
      }));
    } catch (error) {
      return [];
    }
  },
  deleteClient: async (clientId: string): Promise<ApiResponse> => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user/delete-client/${clientId}`, {
        method: 'DELETE',
        headers: { 'x-access-token': token || '' },
      });
      if (!response.ok) throw new Error('Failed to delete client');
      return await response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
};

// Validation functions
const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string): boolean => /^[+]?[0-9]{10,15}$/.test(phone);

const validateForm = (formData: Omit<ClientFormData, 'strategies'>, isEdit: boolean = false): string[] => {
  const errors: string[] = [];
  if (!formData.user_name?.trim()) errors.push('Username is required');
  if (!formData.full_name?.trim()) errors.push('Full name is required');
  if (!validateEmail(formData.email)) errors.push('Valid email is required');
  if (!validatePhone(formData.phone_number)) errors.push('Valid phone number is required');
  if (formData.licence === 'Live' && !formData.broker) errors.push('Broker selection is required for Live accounts');
  if (!formData.licence) errors.push('Licence selection is required');
  return errors;
};

// ----------------------------------------------------------------------

export default function DataGridCustom({ data = [] }: Props) {
  const [clients, setClients] = useState<ClientData[]>(data);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({ id: false });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const [formData, setFormData] = useState<ClientFormData>({
    user_name: '',
    email: '',
    full_name: '',
    phone_number: '',
    broker: '',
    licence: 'Live',
    sub_admin: '',
    group_service: '',
    strategies: [],
    status: 'active',
    trading_status: 'enabled',
    api_key: '',
    client_key: ''
  });

  const strategiesList = ["Beta", "Alpha", "Gamma", "Delta", "Zeta", "Sigma"];

  const handleEditClient = useCallback((client: any) => {
    setEditingClient(client);
    setFormData({
      user_name: client.user_name || '',
      email: client.email || '',
      full_name: client.full_name || '',
      phone_number: client.phone_number || '',
      broker: client.broker || '',
      licence: client.licence || 'Live',
      sub_admin: client.sub_admin || '',
      group_service: client.group_service || '',
      strategies: client.strategies || [],
      status: client.status ? client.status.toLowerCase() : 'active',
      trading_status: client.trading_status || 'enabled',
      start_date: client.start_date ? new Date(client.start_date).toISOString().split('T')[0] : '',
      end_date: client.end_date ? new Date(client.end_date).toISOString().split('T')[0] : '',
      api_key: client.api_key || '',
      client_key: client.client_key || '',
    });
    setEditMode(true);
    setShowForm(true);
    setShowPasswordField(false);
  }, []);

  const handleOpenDeleteDialog = useCallback((client: ClientData) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  }, []);

  const columns = useMemo(() => getColumns(handleEditClient, handleOpenDeleteDialog), [handleEditClient, handleOpenDeleteDialog]);

  const fetchLoggedInClients = useCallback(async () => {
    setFetchLoading(true);
    const clientsData = await apiService.getLoggedInClients();
    setClients(clientsData);
    setFetchLoading(false);
  }, []);

  useEffect(() => { fetchLoggedInClients(); }, [fetchLoggedInClients]);

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setLoading(true);
    const response = await apiService.deleteClient(clientToDelete.id);
    if (response.status) {
      setSnackbar({ open: true, message: 'Client deleted', severity: 'success' });
      fetchLoggedInClients();
    }
    setLoading(false);
    setDeleteDialogOpen(false);
  };

  const handleCloseDeleteDialog = () => { setDeleteDialogOpen(false); };

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLicenceChange = (value: string) => {
    setFormData(prev => ({ ...prev, licence: value, broker: value === 'Demo' ? '' : prev.broker }));
  };

  const handleStrategyToggle = (strategy: string) => {
    setFormData(prev => {
      const strategies = [...prev.strategies || []];
      const index = strategies.indexOf(strategy);
      if (index > -1) strategies.splice(index, 1);
      else strategies.push(strategy);
      return { ...prev, strategies };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { strategies, ...rest } = formData;
    const errors = validateForm(rest, editMode && !showPasswordField);
    if (errors.length > 0) { setFormErrors(errors); return; }
    setLoading(true);
    try {
      let response;
      if (editMode && editingClient) {
        response = await apiService.updateClient(editingClient.id, formData);
      } else {
        response = await apiService.registerClient(formData);
      }
      if (response.status) {
        setShowForm(false);
        fetchLoggedInClients();
      }
    } finally { setLoading(false); }
  };

  const handleCancelForm = () => { setShowForm(false); setEditMode(false); };
  const togglePasswordField = () => setShowPasswordField(!showPasswordField);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const expiredClients = clients.filter(c => c.end_date && new Date(c.end_date) < new Date()).length;

  return (
    <Box>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Delete {clientToDelete?.user_name}?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setShowForm(!showForm)} startIcon={<Iconify icon="eva:plus-fill" />}>
          {showForm ? "Hide Form" : "Add New Client"}
        </Button>
      </Box>

      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{editMode ? 'Edit Client' : 'Create New Client'}</Typography>
            {formErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Please correct the following errors:
                <ul>
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Username" value={formData.user_name} onChange={(e) => handleInputChange('user_name', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile" value={formData.phone_number} onChange={(e) => handleInputChange('phone_number', e.target.value)} /></Grid>

              {formData.licence === 'Live' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Client Key / User ID"
                      value={formData.client_key}
                      onChange={(e) => handleInputChange('client_key', e.target.value)}
                      helperText="Broker platform client code (e.g. LALIT123)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="API Key"
                      value={formData.api_key}
                      onChange={(e) => handleInputChange('api_key', e.target.value)}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Broker"
                  value={formData.broker}
                  onChange={(e) => handleInputChange('broker', e.target.value)}
                  disabled={formData.licence === 'Demo'}
                >
                  <MenuItem value="Zerodha">Zerodha</MenuItem>
                  <MenuItem value="AngelOne">Angel Broking</MenuItem>
                  <MenuItem value="Upstox">Upstox</MenuItem>
                  <MenuItem value="AliceBlue">Alice Blue</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={formData.start_date} onChange={(e) => handleInputChange('start_date', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={formData.end_date} onChange={(e) => handleInputChange('end_date', e.target.value)} /></Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Licence" value={formData.licence} onChange={(e) => handleLicenceChange(e.target.value)}>
                  <MenuItem value="Live">Live</MenuItem>
                  <MenuItem value="Demo">Demo</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Sub-Admin" value={formData.sub_admin} onChange={(e) => handleInputChange('sub_admin', e.target.value)}>
                  <MenuItem value="admin1">Admin 1</MenuItem>
                  <MenuItem value="admin2">Admin 2</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Group Service" value={formData.group_service} onChange={(e) => handleInputChange('group_service', e.target.value)}>
                  <MenuItem value="service1">Service 1</MenuItem>
                  <MenuItem value="service2">Service 2</MenuItem>
                </TextField>
              </Grid>

              {editMode && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Status" value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)}>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="subtitle1">Strategies</Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {strategiesList.map(s => (
                    <FormControlLabel key={s} control={<Checkbox checked={formData.strategies?.includes(s)} onChange={() => handleStrategyToggle(s)} />} label={s} />
                  ))}
                </Box>
              </Grid>
            </Grid>
            <Box mt={2} display="flex" justifyContent="flex-end" gap={2}>
              <Button onClick={handleCancelForm}>Cancel</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <DataGrid
          rows={clients}
          columns={columns}
          autoHeight
          loading={fetchLoading}
          slots={{ toolbar: GridToolbar }}
        />
      </Card>
    </Box>
  );
}

function RatingInputValue({ item, applyValue }: GridFilterInputValueProps) {
  return (
    <Box sx={{ p: 1, height: 1, alignItems: 'flex-end', display: 'flex' }}>
      <Rating size="small" precision={0.5} value={Number(item.value)} onChange={(e, v) => applyValue({ ...item, value: v })} />
    </Box>
  );
}
