import { useState, useEffect, useCallback } from 'react';
// @mui
import { useTheme, alpha } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Card,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Divider,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  Snackbar,
  Alert,
  CardHeader,
  Paper,
} from '@mui/material';

// components
import Iconify from 'src/components/iconify';
import Label from 'src/components/label';
import Scrollbar from 'src/components/scrollbar';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import EmptyContent from 'src/components/empty-content';
import { useSettingsContext } from 'src/components/settings';
// routes
import { paths } from 'src/routes/paths';
import { HOST_API } from 'src/config-global';

// utils
import axios from 'src/utils/axios';

// ----------------------------------------------------------------------

interface SubAdmin {
  _id?: string;
  id?: number;
  full_name: string;
  email: string;
  mobile: string;
  password: string;
  status: boolean | string;
  clients: number;
  go_to_dashboard: boolean;
  permissions?: any;
}

// Summary Widget Component
function SummaryWidget({ title, total, icon, color }: { title: string, total: number | string, icon: string, color?: string }) {
  const theme = useTheme();
  const mainColor = (color && (theme.palette as any)[color]?.main) || theme.palette.primary.main;

  return (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 3, height: '100%' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>{title}</Typography>
        <Typography variant="h3">{total}</Typography>
      </Box>
      <Box
        sx={{
          width: 56,
          height: 56,
          lineHeight: 0,
          borderRadius: '50%',
          bgcolor: alpha(mainColor, 0.1),
          color: mainColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify icon={icon} width={32} />
      </Box>
    </Card>
  );
}

export default function SubAdminManagementView() {
  const settings = useSettingsContext();
  const theme = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const API_BASE = `/api/admin`;
  const STORE_ENDPOINT = `${API_BASE}/register`;
  const UPDATE_ENDPOINT = `${API_BASE}/update-register/`;
  const SHOW_ENDPOINT = `${API_BASE}/all`;

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
      const response = await axios.get(SHOW_ENDPOINT);

      const data = response.data;

      if (data && data.results) {
        setSubAdmins(data.results);
      } else if (Array.isArray(data)) {
        setSubAdmins(data);
      }
    } catch (error: any) {
      showSnackbar('Failed to load sub-admins', 'error');
    }
  }, [SHOW_ENDPOINT, showSnackbar]);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  const generateRandomClientKey = () =>
    Math.floor(1000000000 + Math.random() * 9000000000).toString();

  const handleToggleForm = () => {
    if (isFormVisible) {
      setEditingId(null);
      setFormData({ full_name: '', email: '', mobile: '', password: '' });
      setPermissions({
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
    }
    setIsFormVisible(!isFormVisible);
  };

  const handleEdit = (subAdmin: SubAdmin) => {
    setEditingId(subAdmin._id || null);
    setFormData({
      full_name: subAdmin.full_name,
      email: subAdmin.email,
      mobile: subAdmin.mobile,
      password: '',
    });

    // Map backend snake_case to frontend camelCase
    setPermissions({
      allPermission: !!(subAdmin as any).all_permission,
      addClient: !!(subAdmin as any).add_client,
      editClient: !!(subAdmin as any).edit_client,
      licencePermission: !!(subAdmin as any).licence_permission,
      goToDashboard: !!(subAdmin as any).go_to_dashboard,
      tradeHistory: !!(subAdmin as any).trade_history,
      fullInfoView: !!(subAdmin as any).full_info_view,
      groupServicePermission: !!(subAdmin as any).group_service_permission,
      updateClientApiKey: !!(subAdmin as any).update_client_api_key,
      strategyPermission: !!(subAdmin as any).strategy_permission,
    });
    setIsFormVisible(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.mobile) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }

    try {
      // Map frontend camelCase to backend snake_case as required by Joi schema
      const payload: any = {
        ...formData,
        all_permission: permissions.allPermission,
        add_client: permissions.addClient,
        edit_client: permissions.editClient,
        licence_permission: permissions.licencePermission,
        go_to_dashboard: permissions.goToDashboard,
        trade_history: permissions.tradeHistory,
        full_info_view: permissions.fullInfoView,
        group_service_permission: permissions.groupServicePermission,
        update_client_api_key: permissions.updateClientApiKey,
        strategy_permission: permissions.strategyPermission,
        status: 'active'
      };

      // Remove empty password on update to avoid hashing empty string
      if (editingId && !payload.password) {
        delete payload.password;
      }

      if (editingId) {
        await axios.put(`${UPDATE_ENDPOINT}${editingId}`, { ...payload, panel_client_key: generateRandomClientKey() });
      } else {
        await axios.post(STORE_ENDPOINT, { ...payload, panel_client_key: generateRandomClientKey() });
      }

      showSnackbar(editingId ? 'Sub Admin updated successfully' : 'Sub Admin created successfully', 'success');
      handleToggleForm();
      fetchSubAdmins();
    } catch (error: any) {
      const errorMsg = (error.response && error.response.data && error.response.data.error) || error.message || 'Operation failed';
      showSnackbar(errorMsg, 'error');
    }
  };

  const filteredSubAdmins = subAdmins.filter((a) => {
    const searchMatch =
      (a.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (a.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (a.mobile || '').includes(searchQuery);

    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (a.status === true || a.status === 'active')) ||
      (statusFilter === 'inactive' && (a.status === false || a.status === 'inactive'));

    return searchMatch && statusMatch;
  });

  const totalActive = subAdmins.filter(a => a.status === true || a.status === 'active').length;
  const totalInactive = subAdmins.length - totalActive;

  // Grouped Permissions
  const permissionCategories = [
    {
      title: 'Common Access',
      items: ['allPermission', 'goToDashboard', 'fullInfoView'],
    },
    {
      title: 'Client Operations',
      items: ['addClient', 'editClient', 'updateClientApiKey'],
    },
    {
      title: 'Trading & Licensing',
      items: ['licencePermission', 'tradeHistory'],
    },
    {
      title: 'Strategy & Groups',
      items: ['groupServicePermission', 'strategyPermission'],
    },
  ];

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Sub Admin Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User Management', href: paths.dashboard.user.root },
          { name: 'Sub Admin' },
        ]}
        action={
          !isFormVisible && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleToggleForm}
              sx={{ boxShadow: theme.customShadows.primary }}
            >
              Add New Sub Admin
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!isFormVisible && (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} md={4}>
            <SummaryWidget title="Total Sub Admins" total={subAdmins.length} icon="solar:users-group-rounded-bold" color="primary" />
          </Grid>
          <Grid item xs={12} md={4}>
            <SummaryWidget title="Active Admins" total={totalActive} icon="solar:user-check-bold" color="success" />
          </Grid>
          <Grid item xs={12} md={4}>
            <SummaryWidget title="Inactive Admins" total={totalInactive} icon="solar:user-block-bold" color="error" />
          </Grid>
        </Grid>
      )}

      {isFormVisible ? (
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <Card sx={{ p: 4, position: 'relative' }}>
                <IconButton
                  onClick={handleToggleForm}
                  sx={{ position: 'absolute', top: 16, right: 16 }}
                >
                  <Iconify icon="eva:close-fill" />
                </IconButton>

                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontSize: 24,
                      fontWeight: 'bold',
                    }}
                  >
                    {formData.full_name ? formData.full_name[0].toUpperCase() : <Iconify icon="solar:user-bold" />}
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{editingId ? 'Edit Sub Admin' : 'Register Sub Admin'}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {editingId ? 'Modify access and profile details' : 'Create a new administrative account'}
                    </Typography>
                  </Box>
                </Box>

                <Box component="form" onSubmit={handleSubmit}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>
                    Profile Details
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Full Name"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Mobile Number"
                        placeholder="10-digit mobile"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        type="email"
                        label="Email Address"
                        placeholder="rahul@trustifye.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Account Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingId ? 'Keep empty to stay unchanged' : 'Minimum 6 characters'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

                  <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>
                    Access Permissions
                  </Typography>

                  <Grid container spacing={3}>
                    {permissionCategories.map((category) => (
                      <Grid item xs={12} sm={6} key={category.title}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.04), borderRadius: 1.5 }}
                        >
                          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>
                            {category.title}
                          </Typography>
                          <Stack spacing={1}>
                            {category.items.map((key) => (
                              <FormControlLabel
                                key={key}
                                control={
                                  <Switch
                                    size="small"
                                    checked={(permissions as any)[key]}
                                    onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                                  />
                                }
                                label={
                                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </Typography>
                                }
                              />
                            ))}
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 5 }}>
                    <Button variant="outlined" color="inherit" onClick={handleToggleForm}>
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<Iconify icon="solar:diskette-bold-duotone" />}
                    >
                      {editingId ? 'Save Changes' : 'Create Admin Account'}
                    </Button>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      ) : (
        <Card>
          <CardHeader
            title="Registered Sub Admins"
            subheader="Manage sub-administrative accounts and their operational permissions"
            action={
              <Stack direction="row" spacing={1}>
                {['all', 'active', 'inactive'].map((status) => {
                  let buttonColor: 'inherit' | 'success' | 'error' = 'inherit';
                  if (status === 'active') buttonColor = 'success';
                  if (status === 'inactive') buttonColor = 'error';

                  return (
                    <Button
                      key={status}
                      size="small"
                      variant={statusFilter === status ? 'soft' : 'text'}
                      color={buttonColor}
                      onClick={() => setStatusFilter(status as any)}
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {status}
                    </Button>
                  );
                })}
              </Stack>
            }
            sx={{ mb: 1 }}
          />

          <Box sx={{ p: 2.5, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or mobile..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size="medium" sx={{ minWidth: 900 }}>
                <TableHead sx={{ bgcolor: alpha(theme.palette.grey[500], 0.08) }}>
                  <TableRow>
                    <TableCell width={60}>Sr</TableCell>
                    <TableCell>Admin Profile</TableCell>
                    <TableCell>Contact Details</TableCell>
                    <TableCell align="center">Operations</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSubAdmins.length > 0 ? (
                    filteredSubAdmins
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, index) => {
                        const isActive = row.status === true || row.status === 'active';
                        return (
                          <TableRow key={row._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar
                                  alt={row.full_name}
                                  sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    fontWeight: 'bold',
                                    width: 40,
                                    height: 40,
                                  }}
                                >
                                  {row.full_name?.[0].toUpperCase()}
                                </Avatar>
                                <Typography variant="subtitle2" noWrap>
                                  {row.full_name}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.2}>
                                <Typography variant="body2">{row.email}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {row.mobile}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title={row.go_to_dashboard ? "Dashboard Access Enabled" : "No Dashboard Access"}>
                                <Box>
                                  <Switch
                                    size="small"
                                    checked={row.go_to_dashboard}
                                    disabled
                                    sx={{ opacity: 0.8 }}
                                  />
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Label
                                variant="soft"
                                color={isActive ? 'success' : 'error'}
                                startIcon={isActive ? <Iconify icon="eva:checkmark-circle-2-fill" /> : <Iconify icon="eva:close-circle-fill" />}
                              >
                                {isActive ? 'Active' : 'Revoked'}
                              </Label>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                                <Tooltip title="Edit Permissions">
                                  <IconButton onClick={() => handleEdit(row)} color="primary" size="small">
                                    <Iconify icon="solar:pen-bold-duotone" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View Logs">
                                  <IconButton color="info" size="small">
                                    <Iconify icon="solar:clipboard-list-bold-duotone" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Account">
                                  <IconButton color="error" size="small">
                                    <Iconify icon="solar:trash-bin-minimalistic-bold-duotone" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3 }}>
                        <EmptyContent
                          title="No Sub Admins Found"
                          description="We couldn't find any admin accounts matching your search."
                          sx={{ py: 10 }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredSubAdmins.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Card>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity as any}
          variant="filled"
          sx={{ width: '100%', boxShadow: theme.customShadows.z8 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
