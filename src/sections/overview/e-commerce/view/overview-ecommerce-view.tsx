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
      console.log('Making API call to:', `${API_BASE_URL}/api/user/register`);
      console.log('Request data:', clientData);
      
      const response = await fetch(`${API_BASE_URL}/api/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      console.log('API response status:', response.status);
      
      // Check if response is OK (status 200-299)
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Registration failed (Status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      const responseData = await response.json();
      console.log('API response data:', responseData);
      return responseData;
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
      body: JSON.stringify({
        user_id: userId,
        user_name: userName,
        email
      }),
    });

    if (!response.ok) throw new Error('Failed to update star status');
    return await response.json();
  } catch (error) {
    console.error('Error starring client:', error);
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
},
deleteStarClient: async (userId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/delete-star-client/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to remove star status');
    return await response.json();
  } catch (error) {
    console.error('Error removing star client:', error);
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
},





  // Add function to update client
  updateClient: async (
  clientId: string,
  clientData: any
): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('Auth token missing');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/user/update-register/${clientId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token, // 🔥 REQUIRED
        },
        body: JSON.stringify(clientData),
      }
    );

    if (!response.ok) {
      let errorMessage = `Failed to update client (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch(err) {
        console.warn('Failed to parse error response', err);
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating client:', error);
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
},  

  // Add function to fetch logged-in clients by creation date
  getLoggedInClients: async (): Promise<ClientData[]> => {
    try {
      const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        
        return {
          'Content-Type': 'application/json',
           'x-access-token': token || '',
        };
      };

const response = await fetch(
  `${API_BASE_URL}/api/user/by-enddate?filter=custom&date=2099-12-31`,
  {
    method: 'GET',
    headers: getAuthHeaders(),
  }
);

      if (!response.ok) {
        throw new Error('Failed to fetch logged-in clients');
      }
      const result = await response.json();

      return result.data.map((client: any, index: number) => ({
        id: client.id || client._id || index.toString(), // Handle different ID formats
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
        created_at: client.createdAt || client.created_at || new Date().toISOString(), // Handle different date formats
        start_date: client.start_date || '',
        end_date: client.end_date || '',
        isStarred: client.isStarred || false,
        avatar_color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }));
    } catch (error) {
      console.error('Error fetching logged-in clients:', error);
      return [];
    }
  },

  // Add function to delete client
  deleteClient: async (clientId: string): Promise<ApiResponse> => {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('Auth token missing');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/user/delete-client/${clientId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token, // ✅ REQUIRED
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete client');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting client:', error);
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
},

};

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

const validateForm = (formData: Omit<ClientFormData, 'strategies'>, isEdit: boolean = false): string[] => {
  const errors: string[] = [];

  if (!formData.user_name.trim()) errors.push('Username is required');
  if (!formData.full_name.trim()) errors.push('Full name is required');
  if (!validateEmail(formData.email)) errors.push('Valid email is required');
  if (!validatePhone(formData.phone_number)) errors.push('Valid phone number is required');
  // if (!isEdit && (!formData.password || formData.password.length < 6)) errors.push('Password must be at least 6 characters');
  // if (!formData.broker) errors.push('Broker selection is required');
  if (formData.licence !== 'Demo' && !formData.broker) { errors.push('Broker selection is required'); }
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
  const handleLicenceChange = (value: string) => {
    setFormData(prev => ({
    ...prev,
    licence: value,
    broker: value === 'Demo' ? '' : prev.broker, // reset broker if Demo
    }));
    };

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
    trading_status: 'enabled'
  });

  const strategiesList = ["Beta", "Alpha", "Gamma", "Delta", "Zeta", "Sigma"];

  const handleEditClient = useCallback((client: ClientData) => {
    setEditingClient(client);
    setFormData({
      user_name: client.user_name,
      email: client.email,
      full_name: client.full_name,
      phone_number: client.phone_number,
      broker: client.broker,
      licence: 'Live',
      sub_admin: '',
      group_service: '',
      strategies: [],
      status: client.status.toLowerCase(),
      trading_status: client.trading_status,
    });
    setEditMode(true);
    setShowForm(true);
    setShowPasswordField(false); // Hide password field initially
  }, []);

  const handleOpenDeleteDialog = useCallback((client: ClientData) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  }, []);

  const columns = useMemo(
    () => getColumns(handleEditClient, handleOpenDeleteDialog),
    [handleEditClient, handleOpenDeleteDialog]
  );

  const getButtonText = () => {
    if (loading) {
      return editMode ? 'Updating...' : 'Creating...';
    }
    return editMode ? 'Update Client' : 'Create Client';
  };

  // Fetch logged-in clients on component mount
  const fetchLoggedInClients = useCallback(async () => {
    try {
      setFetchLoading(true);
      const clientsData = await apiService.getLoggedInClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching logged-in clients:', error);
      setSnackbar({ open: true, message: 'Failed to fetch clients data', severity: 'error' });
    } finally {
      setFetchLoading(false);
    }
  }, []);

  // Load clients when component mounts
  useEffect(() => {
    fetchLoggedInClients();
  }, [fetchLoggedInClients]);

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      setLoading(true);
      const response = await apiService.deleteClient(clientToDelete.id);
      
      if (response.status) {
        setSnackbar({ open: true, message: 'Client deleted successfully', severity: 'success' });
        // Refresh the clients list
        fetchLoggedInClients();
      } else {
        setSnackbar({ open: true, message: response.error || 'Failed to delete client', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to delete client', severity: 'error' });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  // Handle close delete dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  if (columns.length) {
    const ratingColumn = columns.find((column) => column.field === 'rating')!;
    const ratingColIndex = columns.findIndex((col) => col.field === 'rating');

    const ratingFilterOperators = getGridNumericOperators().map((operator) => ({
      ...operator,
      InputComponent: RatingInputValue,
    }));

    columns[ratingColIndex] = {
      ...ratingColumn,
      filterOperators: ratingFilterOperators,
    };
  }

  const handleChangeColumnVisibilityModel = useCallback((newModel: GridColumnVisibilityModel) => {
    setColumnVisibilityModel(newModel);
  }, []);

  const hiddenFields = ['id', 'action'];
  const getTogglableColumns = () =>
    columns.filter((column) => !hiddenFields.includes(column.field)).map((column) => column.field);

  const selected = clients.filter((row) => selectedRows.includes(row.id));

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStrategyToggle = (strategy: string) => {
    setFormData(prev => {
      const strategies = [...prev.strategies || []];
      const index = strategies.indexOf(strategy);
      
      if (index > -1) {
        strategies.splice(index, 1);
      } else {
        strategies.push(strategy);
      }
      
      return { ...prev, strategies };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create data without strategies for validation and API call
    const { strategies, ...formDataWithoutStrategies } = formData;
    
    // Validate form (don't require password for edit mode unless it's being changed)
    const errors = validateForm(formDataWithoutStrategies, editMode && !showPasswordField);
    if (errors.length > 0) {
      setFormErrors(errors);
      setSnackbar({ open: true, message: 'Please fix form errors', severity: 'error' });
      return;
    }

    setLoading(true);
    setFormErrors([]);

    try {
      let response;
      
      if (editMode && editingClient) {
        // Prepare data for update - only include fields that have changed
        const updateData: Partial<ClientFormData> = {};
        
        // Only include password if it's being changed
        // if (showPasswordField && formData.password) {
        //   updateData.password = formData.password;
        // }
        
        // Include other fields that might have changed
        if (formData.user_name !== editingClient.user_name) updateData.user_name = formData.user_name;
        if (formData.email !== editingClient.email) updateData.email = formData.email;
        if (formData.full_name !== editingClient.full_name) updateData.full_name = formData.full_name;
        if (formData.phone_number !== editingClient.phone_number) updateData.phone_number = formData.phone_number;
        if (formData.broker !== editingClient.broker) updateData.broker = formData.broker;
        if (formData.status !== editingClient.status.toLowerCase()) updateData.status = formData.status;
        if (formData.trading_status !== editingClient.trading_status) updateData.trading_status = formData.trading_status;
        
        // Always include these fields
        updateData.licence = formData.licence;
        updateData.sub_admin = formData.sub_admin;
        updateData.group_service = formData.group_service;
        
        console.log('Updating client with data:', updateData);
        response = await apiService.updateClient(editingClient.id, updateData);
      } else {
        console.log('Creating new client with data:', formDataWithoutStrategies);
        response = await apiService.registerClient(formDataWithoutStrategies);
      }
      
      console.log('API Response:', response);
      
      if (response.status) {
        setSnackbar({ open: true, message: response.message, severity: 'success' });
        setFormData({
          user_name: '',
          email: '',
          full_name: '',
          phone_number: '',
          // password: '',
          broker: '',
          licence: 'Live',
          sub_admin: '',
          group_service: '',
          strategies: [],
          status: 'active',
          trading_status: 'enabled'
        });
        setShowForm(false);
        setEditMode(false);
        setEditingClient(null);
        setShowPasswordField(false);
        
        // Refresh the clients list
        fetchLoggedInClients();
      } else {
        setSnackbar({ open: true, message: response.error || (editMode ? 'Update failed' : 'Registration failed'), severity: 'error' });
      }
    } catch (error) {
      console.error('API Error:', error);
     
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditMode(false);
    setEditingClient(null);
    setShowPasswordField(false);
    setFormData({
      user_name: '',
      email: '',
      full_name: '',
      phone_number: '',
      // password: '',
      broker: '',
      licence: 'Live',
      sub_admin: '',
      group_service: '',
      strategies: [],
      status: 'active',
      trading_status: 'enabled'
    });
  };

  const togglePasswordField = () => {
    setShowPasswordField(!showPasswordField);
    // Clear password when hiding the field
    if (showPasswordField) {
      setFormData(prev => ({ ...prev, password: '' }));
    }
  };

  // Calculate statistics for the summary cards
  const activeClients = clients.filter(client => client.status === 'active').length;
  const expiredClients = clients.filter(client => {
    if (!client.end_date) return false;
    const endDate = new Date(client.end_date);
    return endDate < new Date();
  }).length;
  const expiringSoonClients = clients.filter(client => {
    if (!client.end_date) return false;
    const endDate = new Date(client.end_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return endDate > today && endDate < weekFromNow;
  }).length;

  return (
    <Box>
      {/* Notification Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete client <strong>{clientToDelete?.user_name}</strong>? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <Iconify icon="eva:people-fill" />
              </Avatar>
              <Box>
                <Typography color="textSecondary" variant="body2">Total Clients</Typography>
                <Typography variant="h6">{clients.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <Iconify icon="eva:checkmark-circle-2-fill" />
              </Avatar>
              <Box>
                <Typography color="textSecondary" variant="body2">Active Clients</Typography>
                <Typography variant="h6">{activeClients}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <Iconify icon="eva:clock-fill" />
              </Avatar>
              <Box>
                <Typography color="textSecondary" variant="body2">Expiring Soon</Typography>
                <Typography variant="h6">{expiringSoonClients}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                <Iconify icon="eva:alert-triangle-fill" />
              </Avatar>
              <Box>
                <Typography color="textSecondary" variant="body2">Expired</Typography>
                <Typography variant="h6">{expiredClients}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowForm((prev) => !prev)}
            startIcon={<Iconify icon="eva:plus-fill" />}
          >
            {showForm ? "Hide Form" : "Add New Client"}
          </Button>

          <Button
            variant="outlined"
            onClick={fetchLoggedInClients}
            sx={{ ml: 2 }}
            disabled={fetchLoading}
            startIcon={fetchLoading ? <CircularProgress size={20} /> : <Iconify icon="eva:refresh-fill" />}
          >
            {fetchLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {selectedRows.length > 0 && (
          <Box>
            <Typography variant="body2" component="span" sx={{ mr: 2 }}>
              {selectedRows.length} selected
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Iconify icon="eva:trash-2-outline" />}
            >
              Delete Selected
            </Button>
          </Box>
        )}
      </Box>

      {/* 🔹 Form Section */}
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              {editMode ? 'Edit Client' : 'Create New Client'}
            </Typography>

            {/* Display form errors */}
            {formErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <ul>
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Username" 
                  value={formData.user_name}
                  onChange={(e) => handleInputChange('user_name', e.target.value)}
                  error={formErrors.some(err => err.toLowerCase().includes('username'))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Full Name" 
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  error={formErrors.some(err => err.toLowerCase().includes('full name'))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={formErrors.some(err => err.toLowerCase().includes('email'))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Mobile" 
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  error={formErrors.some(err => err.toLowerCase().includes('phone'))}
                />
              </Grid>

              {/* Password field - always show for new clients, optional for edit */}
              {/* {(!editMode || showPasswordField) && (
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    required={!editMode}
                    label="Password" 
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={formErrors.some(err => err.toLowerCase().includes('password'))}
                  />
                </Grid>
              )} */}

              {/* Toggle password field button for edit mode */}
              {editMode && (
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    onClick={togglePasswordField}
                    startIcon={<Iconify icon={showPasswordField ? "eva:eye-off-fill" : "eva:eye-fill"} />}
                  >
                    {showPasswordField ? 'Cancel Password Change' : 'Change Password'}
                  </Button>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
            <TextField 
            fullWidth 
            select 
            required
            label="Broker"
            value={formData.broker}
            onChange={(e) => handleInputChange('broker', e.target.value)}
            error={formErrors.some(err => err.toLowerCase().includes('broker'))}
            disabled={formData.licence === 'Demo'} // ✅ disable when Demo
            >
            <MenuItem value="Zerodha">Zerodha</MenuItem>
            <MenuItem value="AngelOne">Angel Broking</MenuItem>
            <MenuItem value="Upstox">Upstox</MenuItem>
            <MenuItem value="ICICI Direct">ICICI Direct</MenuItem>
            </TextField>

              </Grid>

              {formData.licence && (
            <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={formData.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </Grid>
          </>
        )}


              <Grid item xs={12} sm={6}>
               <TextField
                  fullWidth
                  select
                  required
                  label="Licence"
                  value={formData.licence}
                  onChange={(e) => handleLicenceChange(e.target.value)}
                >
                  <MenuItem value="Live">Live</MenuItem>
                  <MenuItem value="Demo">Demo</MenuItem>
                </TextField>

              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  select 
                  label="Sub-Admin"
                  value={formData.sub_admin}
                  onChange={(e) => handleInputChange('sub_admin', e.target.value)}
                >
                  <MenuItem value="admin1">Admin 1</MenuItem>
                  <MenuItem value="admin2">Admin 2</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  select 
                  label="Group Service"
                  value={formData.group_service}
                  onChange={(e) => handleInputChange('group_service', e.target.value)}
                >
                  <MenuItem value="service1">Service 1</MenuItem>
                  <MenuItem value="service2">Service 2</MenuItem>
                </TextField>
              </Grid>
              
              {/* Status and Trading Status for edit mode */}
              {editMode && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      select 
                      label="Status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      select 
                      label="Trading Status"
                      value={formData.trading_status}
                      onChange={(e) => handleInputChange('trading_status', e.target.value)}
                    >
                      <MenuItem value="enabled">Enabled</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}
              
              {/* Strategy Checkboxes */}
              <Grid item xs={12}>
                <Typography variant="subtitle1">All Strategies</Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {strategiesList.map((strategy) => (
                    <FormControlLabel
                      key={strategy}
                      control={
                        <Checkbox 
                          checked={formData.strategies?.includes(strategy) || false}
                          onChange={() => handleStrategyToggle(strategy)}
                        />
                      }
                      label={strategy}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Box mt={2} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={handleCancelForm} disabled={loading}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {getButtonText()}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 🔹 DataGrid */}
      {fetchLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading clients data...
          </Typography>
        </Box>
      ) : (
        <Card>
          <DataGrid
            checkboxSelection
            disableRowSelectionOnClick
            rows={clients}
            columns={columns}
            getRowId={(row) => row.id}
            onRowSelectionModelChange={(newSelectionModel) => setSelectedRows(newSelectionModel)}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={handleChangeColumnVisibilityModel}
            slots={{ 
              toolbar: GridToolbar,
              pagination: () => null,
            }}
            slotProps={{ 
              toolbar: { 
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 } 
              },
              pagination: {
                labelRowsPerPage: '',
                rowsPerPageOptions: [10, 25, 50, 100],
              }
            }}
            autoHeight
            loading={fetchLoading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-columnHeader:focus': {
                outline: 'none',
              },
            }}
          />
        </Card>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function RatingInputValue({ item, applyValue }: GridFilterInputValueProps) {
  return (
    <Box sx={{ p: 1, height: 1, alignItems: 'flex-end', display: 'flex' }}>
      <Rating
        size="small"
        precision={0.5}
        placeholder="Filter value"
        value={Number(item.value)}
        onChange={(event, newValue) => {
          applyValue({ ...item, value: newValue });
        }}
      />
    </Box>
  );
}
