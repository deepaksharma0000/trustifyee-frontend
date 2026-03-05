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
import { alpha } from '@mui/material/styles';
// hooks
import { useAuthUser } from 'src/hooks/use-auth-user';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';
// local components
import AlgoRiskDisclaimer from 'src/components/algo-risk-disclaimer/AlgoRiskDisclaimer';
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
  is_star?: boolean;
}

interface ApiResponse {
  status: boolean;
  message?: string;
  is_star?: boolean;
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
  broker_session_active?: boolean;  // [NEW] Live broker token check
  is_star: boolean;
}

type Props = {
  data?: ClientData[];
};

const API_BASE_URL = HOST_API || '';

const apiService = {
  registerClient: async (data: any): Promise<ApiResponse> => {
    const token = localStorage.getItem('authToken');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, id, srNo, avatar_color, is_login, is_online, created_at, updated_at, updatedAt, __v, ...cleanData } = data;
    const res = await fetch(`${API_BASE_URL}/api/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token || ''
      },
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
  },
  toggleStarClient: async (id: string): Promise<ApiResponse> => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/api/user/toggle-star-client/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-token': token || '' },
    });
    return res.json();
  }
};

const getColumns = (
  handleEdit: (c: ClientData) => void,
  handleDelete: (c: ClientData) => void,
  handleToggleStar: (id: string) => void,
  p: { viewFull: boolean; canEdit: boolean; goToDashboard: boolean }
): GridColDef[] => [
    {
      field: 'is_star',
      headerName: '',
      width: 50,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() => handleToggleStar(params.row.id)}
          sx={{ color: params.value ? 'warning.main' : 'text.disabled' }}
        >
          <Iconify icon={params.value ? 'solar:star-bold' : 'solar:star-outline'} width={20} />
        </IconButton>
      )
    },
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
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {p.viewFull ? params.row.email : "****@****.com"}
            </Typography>
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
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {p.viewFull ? `${params.value?.substring(0, 8)}...` : "****"}
          </Typography>
          {p.viewFull && (
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(params.value)}>
              <Iconify icon="eva:copy-fill" width={14} />
            </IconButton>
          )}
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
      headerName: 'System Login',
      width: 115,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={params.value ? 'User is logged into the System' : 'User is offline / Session expired'}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: params.value ? '#22c55e' : '#ff5630',
              boxShadow: params.value ? '0 0 7px #22c55e' : 'none',
              border: '2px solid white',
              flexShrink: 0,
            }} />
            <Typography variant="caption" sx={{ color: params.value ? 'success.main' : 'text.disabled', fontWeight: 600 }}>
              {params.value ? 'Online' : 'Offline'}
            </Typography>
          </Box>
        </Tooltip>
      )
    },
    {
      field: 'broker_session_active',
      headerName: 'Broker Session',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const isLive = params.row.licence === 'Live';
        if (!isLive) {
          return (
            <Tooltip title="Demo users do not require a broker session">
              <Label color="default" variant="soft">Demo</Label>
            </Tooltip>
          );
        }
        const hasSession = !!params.value;
        return (
          <Tooltip title={hasSession
            ? 'Broker is connected — Orders can be placed'
            : 'No broker session found — User must login to broker first!'
          }>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: hasSession ? '#22c55e' : '#ff9800',
                boxShadow: hasSession ? '0 0 7px #22c55e' : '0 0 7px #ff9800',
                border: '2px solid white',
                flexShrink: 0,
                animation: !hasSession ? 'pulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                  '100%': { opacity: 1 },
                }
              }} />
              <Typography variant="caption" sx={{ color: hasSession ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                {hasSession ? 'Connected' : 'Login Needed'}
              </Typography>
            </Box>
          </Tooltip>
        );
      }
    },
    {
      field: 'review',
      headerName: 'Go To Dashboard',
      width: 130,
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Review User Dashboard">
          <IconButton
            size="small"
            color="primary"
            component={RouterLink as any}
            href={paths.dashboard.user.review(params.row.id)}
            disabled={!p.goToDashboard}
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) }
            }}
          >
            <Iconify icon="solar:round-alt-arrow-right-bold-duotone" width={22} />
          </IconButton>
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
      hideable: true,
      getActions: (params) => {
        const actions = [];
        if (p.canEdit) {
          actions.push(<GridActionsCellItem key="edit" icon={<Iconify icon="eva:edit-fill" />} label="Edit" onClick={() => handleEdit(params.row)} />);
          actions.push(<GridActionsCellItem key="delete" icon={<Iconify icon="eva:trash-2-outline" />} label="Delete" onClick={() => handleDelete(params.row)} sx={{ color: 'error.main' }} />);
        }
        return actions;
      }
    }
  ];

export default function DataGridCustom({ data = [] }: Props) {
  const { user: authUser } = useAuthUser();
  const isMasterAdmin = authUser?.role === 'admin';
  const isSubAdmin = authUser?.role === 'sub-admin' || authUser?.role === 'subadmin';
  const isStaff = isMasterAdmin || isSubAdmin;

  // ✅ Permissions Extraction
  const p = {
    all: !!authUser?.all_permission,
    add: !!authUser?.add_client,
    edit: !!authUser?.edit_client,
    viewFull: !!authUser?.full_info_view || isMasterAdmin,
    trade: !!authUser?.trade_history,
    licence: !!authUser?.licence_permission,
    strategy: !!authUser?.strategy_permission,
    groupService: !!authUser?.group_service_permission,
    apiKey: !!authUser?.update_client_api_key,
    goToDashboard: !!authUser?.go_to_dashboard || isMasterAdmin,
  };

  const canShowPanel = isMasterAdmin || isSubAdmin;
  const canAddClient = isMasterAdmin || p.all || p.add;
  const canEditClient = isMasterAdmin || p.all || p.edit;

  const [clients, setClients] = useState<ClientData[]>(data);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [strategiesList, setStrategiesList] = useState<string[]>(["Beta", "Alpha", "Gamma", "Delta", "Zeta", "Sigma"]);
  const [subAdminsList, setSubAdminsList] = useState<any[]>([]); // [NEW]

  const [formData, setFormData] = useState<ClientFormData>({
    user_name: '', email: '', full_name: '', phone_number: '', broker: 'AngelOne', licence: 'Live',
    sub_admin: '', group_service: '', strategies: [], status: 'active', trading_status: 'enabled',
    api_key: '', client_key: '', start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  const fetchClients = useCallback(async () => {
    setFetchLoading(true);
    const d = await apiService.getLoggedInClients();
    setClients(d.map(c => ({ ...c, is_star: !!c.is_star })));
    setFetchLoading(false);
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/group/all`, {
        headers: { 'x-access-token': localStorage.getItem('authToken') || '' }
      });
      const json = await res.json();
      if (json.status) setGroups(json.data || []);
    } catch (e) { console.error("Failed to fetch groups"); }
  }, []); // [NEW]

  const fetchStrategies = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/strategy/list`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      const json = await res.json();
      if (json.ok) {
        setStrategiesList(json.strategies.map((s: any) => s.name));
      }
    } catch (e) { console.error("Failed to fetch strategies"); }
  }, []);

  const fetchSubAdmins = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/admin/all`, {
        headers: { 'x-access-token': token || '' }
      });
      const json = await res.json();
      if (json.status) {
        setSubAdminsList(json.results || []);
      }
    } catch (e) { console.error("Failed to fetch sub-admins"); }
  }, []); // [NEW]

  const handleToggleStar = useCallback(async (id: string) => {
    try {
      const res = await apiService.toggleStarClient(id);
      if (res.status) {
        setClients(prev => prev.map(c => c.id === id ? { ...c, is_star: !!res.is_star } : c));
        setSnackbar({ open: true, message: res.message || 'Updated Star Status', severity: 'success' });
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  }, []);

  useEffect(() => {
    if (canShowPanel) {
      fetchClients();
      fetchGroups();
      fetchStrategies();
      fetchSubAdmins();
    }
  }, [canShowPanel, fetchClients, fetchGroups, fetchStrategies, fetchSubAdmins]);

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

  const columns = useMemo(() => getColumns(handleEdit, handleDelete, handleToggleStar, {
    viewFull: p.viewFull,
    canEdit: canEditClient,
    goToDashboard: p.goToDashboard
  }), [handleEdit, handleDelete, handleToggleStar, p.viewFull, canEditClient, p.goToDashboard]);

  return (
    <Box sx={{ p: 3 }}>
      {/* 🚀 Dashboard for Live Users */}
      {!isStaff && authUser?.licence === 'Live' && (
        <LiveTradingControl user={authUser} />
      )}

      {/* 🛠️ Dashboard for Admin/Sub-Admin */}
      {canShowPanel && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Client Management</Typography>
            {canAddClient && (
              <Button variant="contained" onClick={() => { setShowForm(!showForm); setEditMode(false); }} startIcon={<Iconify icon="eva:plus-fill" />}>
                {showForm ? "Hide Form" : "Add New Client"}
              </Button>
            )}
          </Box>

          {showForm && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>{editMode ? 'Edit Client' : 'Create New Client'}</Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Username" helperText="Primary login ID" value={formData.user_name} onChange={(e) => setFormData({ ...formData, user_name: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Email" helperText="Can be used for login" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile" helperText="Can be used for login" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} /></Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Licence"
                      value={formData.licence}
                      onChange={(e) => setFormData({ ...formData, licence: e.target.value })}
                      disabled={!isMasterAdmin && !p.all && !p.licence}
                      helperText={(!isMasterAdmin && !p.all && !p.licence) ? "Permission Required to change Licence" : ""}
                    >
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
                      <MenuItem value=""><em>None (Master Admin)</em></MenuItem>
                      {subAdminsList.map((a) => (
                        <MenuItem key={a._id} value={a.full_name}>{a.full_name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth select label="Group Service" value={formData.group_service} onChange={(e) => setFormData({ ...formData, group_service: e.target.value })}
                      disabled={!isMasterAdmin && !p.all && !p.groupService}
                      helperText={(!isMasterAdmin && !p.all && !p.groupService) ? "Permission Required to assign Group Services" : ""}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {groups.map((g) => (
                        <MenuItem key={g._id} value={g.name}>{g.name}</MenuItem>
                      ))}
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
                          <Checkbox
                            size="small"
                            checked={formData.strategies?.includes(s)}
                            disabled={!isMasterAdmin && !p.all && !p.strategy}
                            onChange={() => {
                              const next = formData.strategies?.includes(s) ? formData.strategies.filter(x => x !== s) : [...(formData.strategies || []), s];
                              setFormData({ ...formData, strategies: next });
                            }}
                          />
                        } label={s} />
                      ))}
                    </Box>
                    {(!isMasterAdmin && !p.all && !p.strategy) && (
                      <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                        * Permission Required to modify strategies
                      </Typography>
                    )}
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

      {isStaff && <AlgoRiskDisclaimer variant="footer" />}
    </Box>
  );
}
