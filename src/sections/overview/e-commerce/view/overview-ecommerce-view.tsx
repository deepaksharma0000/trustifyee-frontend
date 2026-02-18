import { useState, useCallback, useEffect, useMemo } from 'react';
// @mui
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridActionsCellItem,
} from '@mui/x-data-grid';
// hooks
import { useAuthUser } from 'src/hooks/use-auth-user';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
// config
import { HOST_API } from 'src/config-global';
// local components
import LiveTradingControl from './LiveTradingControl';

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
  start_date?: string;
  end_date?: string;
  status?: string;
  trading_status?: string;
  api_key?: string;
  client_key?: string;
  broker_verified?: boolean;
}

interface ApiResponse {
  status: boolean;
  message?: string;
  error?: string;
  data?: any;
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
  licence: string;
  sub_admin: string;
  group_service: string;
  strategies: string[];
  to_month: string;
  status: string;
  trading_status: string;
  api_key: string;
  created_at: string;
  start_date: string;
  end_date: string;
  avatar_color?: string;
  is_login?: boolean;
  broker_verified?: boolean;
}

type Props = {
  data?: ClientData[];
};

const API_BASE_URL = HOST_API || '';

const apiService = {
  registerClient: async (data: any): Promise<ApiResponse> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, srNo, avatar_color, is_login, is_online, created_at, updated_at, updatedAt, __v, ...cleanData } = data;
    const res = await fetch(`${API_BASE_URL}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanData),
    });
    return res.json();
  },
  updateClientProfile: async (id: string, data: any): Promise<ApiResponse> => {
    const token = localStorage.getItem('authToken');
    // SANITIZE: Remove ANY sensitive or immutable fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id: rid, password, email, user_name, client_key, api_key, ...profileData } = data;

    // We only send specific allowed fields
    const { full_name, phone_number, status, trading_status, licence, start_date, end_date, sub_admin, group_service, strategies } = profileData;

    const res = await fetch(`${API_BASE_URL}/api/user/update-register/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-access-token': token || '' },
      body: JSON.stringify({ full_name, phone_number, status, trading_status, licence, start_date, end_date, sub_admin, group_service, strategies }),
    });
    return res.json();
  },
  toggleBrokerVerification: async (id: string, verified: boolean): Promise<ApiResponse> => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/api/user/verify-broker/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-token': token || '' },
      body: JSON.stringify({ verified }),
    });
    return res.json();
  },
  getLoggedInClients: async (): Promise<ClientData[]> => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/user/by-enddate?filter=custom&date=2099-12-31`, {
        headers: { 'x-access-token': token || '' },
      });
      const json = await res.json();
      return (json.data || []).map((c: any, i: number) => ({
        ...c,
        id: c.id || c._id,
        srNo: i + 1,
        avatar_color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
      }));
    } catch { return []; }
  },
  deleteClient: async (id: string): Promise<ApiResponse> => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/api/user/delete-client/${id}`, {
      method: 'DELETE',
      headers: { 'x-access-token': token || '' },
    });
    return res.json();
  }
};

const getColumns = (handleEdit: (c: ClientData) => void, handleDelete: (c: ClientData) => void): GridColDef[] => [
  { field: 'srNo', headerName: 'SR.', width: 60, align: 'center' },
  {
    field: 'user_name',
    headerName: 'Client',
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: params.row.avatar_color, width: 32, height: 32, fontSize: 14 }}>
          {params.value.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" noWrap>{params.value}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{params.row.email}</Typography>
        </Box>
      </Box>
    )
  },
  {
    field: 'client_key',
    headerName: 'Platform ID',
    width: 140,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{params.value?.substring(0, 8)}...</Typography>
        <IconButton size="small" onClick={() => navigator.clipboard.writeText(params.value)}>
          <Iconify icon="eva:copy-fill" width={14} />
        </IconButton>
      </Box>
    )
  },
  {
    field: 'licence',
    headerName: 'Licence',
    width: 100,
    renderCell: (params) => (
      <Label color={params.value === 'Live' ? 'success' : 'warning'} variant="soft">
        {params.value}
      </Label>
    )
  },
  {
    field: 'is_login',
    headerName: 'Dashboard',
    width: 100,
    align: 'center',
    renderCell: (params) => (
      <Tooltip title={params.value ? 'Online' : 'Offline'}>
        <Box sx={{
          width: 12, height: 12, borderRadius: '50%',
          bgcolor: params.value ? '#22c55e' : '#ff5630',
          boxShadow: params.value ? '0 0 8px #22c55e' : 'none',
          border: '2px solid white'
        }} />
      </Tooltip>
    )
  },
  {
    field: 'broker_verified',
    headerName: 'Trading Status',
    width: 140,
    align: 'center',
    renderCell: (params) => {
      const isVerified = !!params.row.broker_verified;
      const isLive = params.row.licence === 'Live';
      if (!isLive) return <Label color="default">Demo/No-Broker</Label>;
      return (
        <Label color={isVerified ? 'success' : 'error'} variant="soft" startIcon={<Iconify icon={isVerified ? 'eva:checkmark-circle-2-fill' : 'eva:close-circle-fill'} />}>
          {isVerified ? 'Ready' : 'Unverified'}
        </Label>
      );
    }
  },
  {
    field: 'actions',
    type: 'actions',
    headerName: 'Actions',
    width: 80,
    getActions: (params) => [
      <GridActionsCellItem key="edit" icon={<Iconify icon="eva:edit-fill" />} label="Edit" onClick={() => handleEdit(params.row)} />,
      <GridActionsCellItem key="delete" icon={<Iconify icon="eva:trash-2-outline" />} label="Delete" onClick={() => handleDelete(params.row)} sx={{ color: 'error.main' }} />,
    ]
  }
];

export default function DataGridCustom({ data = [] }: Props) {
  const { user: authUser } = useAuthUser();
  const isAdmin = authUser?.role === 'admin';

  const [clients, setClients] = useState<ClientData[]>(data);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);

  const [formData, setFormData] = useState<ClientFormData>({
    user_name: '', email: '', full_name: '', phone_number: '', broker: 'AngelOne', licence: 'Live',
    sub_admin: 'admin1', group_service: 'service1', strategies: [], status: 'active', trading_status: 'enabled',
    api_key: '', client_key: '', start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  const strategiesList = ["Beta", "Alpha", "Gamma", "Delta", "Zeta", "Sigma"];

  const fetchClients = useCallback(async () => {
    setFetchLoading(true);
    const d = await apiService.getLoggedInClients();
    setClients(d);
    setFetchLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) fetchClients(); }, [isAdmin, fetchClients]);

  const handleEdit = useCallback((c: ClientData) => {
    setEditingClient(c);
    // Strip dynamic fields from edit payload initialization
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, srNo, avatar_color, is_login, created_at, updated_at, updatedAt, __v, is_online, password, email, user_name, client_key, ...baseData } = c as any;

    setFormData({
      ...baseData,
      api_key: c.api_key?.startsWith('****') ? '' : c.api_key,
      client_key: c.client_key?.startsWith('****') ? '' : c.client_key,
      start_date: c.start_date ? new Date(c.start_date).toISOString().split('T')[0] : '',
      end_date: c.end_date ? new Date(c.end_date).toISOString().split('T')[0] : '',
    });
    setEditMode(true);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((c: ClientData) => {
    setClientToDelete(c);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let res: ApiResponse;
      if (editMode && editingClient) {
        // 1. Update Profile (Excluding sensitive fields)
        res = await apiService.updateClientProfile(editingClient.id, formData);

        // 2. [NEW] Independent Toggle for Verification (Safety Constraint D)
        if (formData.broker_verified !== editingClient.broker_verified) {
          const vRes = await apiService.toggleBrokerVerification(editingClient.id, !!formData.broker_verified);
          if (!vRes.status) {
            setSnackbar({ open: true, message: `Broker Verification Error: ${vRes.error || 'Check user login status'}`, severity: 'error' });
            return;
          }
        }
      } else {
        res = await apiService.registerClient(formData);
      }

      if (res.status) {
        setSnackbar({ open: true, message: editMode ? 'Updated successfully!' : 'Registered successfully!', severity: 'success' });
        setShowForm(false);
        fetchClients();
      } else {
        throw new Error(res.error || res.message || 'Operation failed');
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => getColumns(handleEdit, handleDelete), [handleEdit, handleDelete]);

  return (
    <Box sx={{ p: 3 }}>
      {/* 🚀 Dashboard for Live Users */}
      {!isAdmin && authUser?.licence === 'Live' && (
        <LiveTradingControl user={authUser} />
      )}

      {/* 🛠️ Dashboard for Admin */}
      {isAdmin && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Client Management</Typography>
            <Button variant="contained" onClick={() => { setShowForm(!showForm); setEditMode(false); }} startIcon={<Iconify icon="eva:plus-fill" />}>
              {showForm ? "Hide Form" : "Add New Client"}
            </Button>
          </Box>

          {showForm && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>{editMode ? 'Edit Client' : 'Create New Client'}</Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Username" value={formData.user_name} onChange={(e) => setFormData({ ...formData, user_name: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} /></Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Licence" value={formData.licence} onChange={(e) => setFormData({ ...formData, licence: e.target.value })}>
                      <MenuItem value="Live">Live</MenuItem>
                      <MenuItem value="Demo">Demo</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Broker" value={formData.broker} onChange={(e) => setFormData({ ...formData, broker: e.target.value })} disabled={formData.licence === 'Demo'}>
                      <MenuItem value="AngelOne">Angel Broking</MenuItem>
                      <MenuItem value="Zerodha">Zerodha</MenuItem>
                      <MenuItem value="Upstox">Upstox</MenuItem>
                      <MenuItem value="AliceBlue">Alice Blue</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Sub-Admin" value={formData.sub_admin} onChange={(e) => setFormData({ ...formData, sub_admin: e.target.value })}>
                      <MenuItem value="admin1">Admin 1</MenuItem>
                      <MenuItem value="admin2">Admin 2</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Group Service" value={formData.group_service} onChange={(e) => setFormData({ ...formData, group_service: e.target.value })}>
                      <MenuItem value="service1">Service 1</MenuItem>
                      <MenuItem value="service2">Service 2</MenuItem>
                    </TextField>
                  </Grid>

                  {editMode && (
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="Account Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </TextField>
                    </Grid>
                  )}

                  {formData.licence === 'Live' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth label="Broker Client Code"
                          value={formData.client_key}
                          onChange={(e) => setFormData({ ...formData, client_key: e.target.value })}
                          placeholder={editingClient?.client_key?.startsWith('****') ? 'Encrypted (Enter to update)' : ''}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth label="Broker API Key"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          placeholder={editingClient?.api_key?.startsWith('****') ? 'Encrypted (Enter to update)' : ''}
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Assigned Strategies</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {strategiesList.map(s => (
                        <FormControlLabel key={s} control={
                          <Checkbox size="small" checked={formData.strategies?.includes(s)} onChange={() => {
                            const next = formData.strategies?.includes(s) ? formData.strategies.filter(x => x !== s) : [...(formData.strategies || []), s];
                            setFormData({ ...formData, strategies: next });
                          }} />
                        } label={s} />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.broker_verified || false}
                          onChange={(e) => setFormData({ ...formData, broker_verified: e.target.checked })}
                        />
                      }
                      label="Approve Trading Ready"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                  <Button variant="outlined" color="inherit" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
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
              sx={{ border: 'none', '& .MuiDataGrid-cell': { borderBottom: '1px solid #f4f6f8' } }}
            />
          </Card>
        </>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity as any} variant="filled">{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { width: 400 } }}>
        <DialogTitle sx={{ pb: 2 }}>Confirm Deletion</DialogTitle>
        <Typography sx={{ px: 3, pb: 3 }}>Are you sure you want to delete <strong>{clientToDelete?.user_name}</strong>? This action cannot be undone.</Typography>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>No, Keep</Button>
          <Button variant="contained" color="error" onClick={async () => {
            if (clientToDelete) {
              await apiService.deleteClient(clientToDelete.id);
              setDeleteDialogOpen(false);
              fetchClients();
            }
          }}>Yes, Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
