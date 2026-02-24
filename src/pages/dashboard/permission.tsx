import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  TextField,
  Pagination,
  Tabs,
  Tab,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  Button,
  CircularProgress,
  Avatar,
  ListItemText,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { format } from "date-fns";
import { IUserItem } from "src/types/user";
import Iconify from "src/components/iconify";
import { ConfirmDialog } from "src/components/custom-dialog";
import { useBoolean } from "src/hooks/use-boolean";
import { useRouter } from "src/routes/hooks";
import { paths } from "src/routes/paths";
import axiosInstance from "src/utils/axios";

export default function ClientView() {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<IUserItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [currentTab, setCurrentTab] = useState('online');
  const router = useRouter();
  const confirm = useBoolean();
  const [selectedId, setSelectedId] = useState<string>('');

  const rowsPerPage = 10;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchLoggedInUsers = useCallback(async () => {
    try {
      setLoading(true);
      const filter = currentTab === 'online' ? 'online' : 'offline';
      const response = await axiosInstance.get(`/api/user/logged-in?filter=${filter}`);
      const data = response.data;

      const usersList = data.data || [];
      const transformedData: IUserItem[] = usersList.map((user: any) => ({
        id: user.id || user._id,
        name: user.user_name || 'N/A',
        email: user.email || 'N/A',
        fullname: user.full_name || 'N/A',
        phoneNumber: user.phone_number || 'N/A',
        status: user.status || 'inactive',
        start_date: user.start_date,
        createdAt: user.created_at || user.createdAt,
        avatarUrl: user.avatarUrl || '',
      }));

      setTableData(transformedData);
    } catch (error) {
      console.error('Error fetching logged-in users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  const handleDeleteClient = useCallback(async (id: string) => {
    try {
      await axiosInstance.delete(`/api/user/delete-client/${id}`);
      setTableData((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  }, []);

  const handleViewDashboard = useCallback((row: IUserItem) => {
    const impersonatedUser = {
      ...row,
      role: 'user',
      impersonated: true,
      originalAdmin: localStorage.getItem('authUser')
    };
    localStorage.setItem('authUser', JSON.stringify(impersonatedUser));
    window.location.href = paths.dashboard.root;
  }, []);

  useEffect(() => {
    fetchLoggedInUsers();
  }, [fetchLoggedInUsers]);

  const filteredClients = tableData.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.fullname || '').toLowerCase().includes(search.toLowerCase())
  );

  const paginatedClients = filteredClients.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Engaged Clients
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Real-time list of users actively logged into the platform.
        </Typography>
      </Box>

      <Tabs
        value={currentTab}
        onChange={(e, val) => {
          setCurrentTab(val);
          setPage(1);
        }}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: currentTab === 'online' ? 'success.main' : 'error.main' },
        }}
      >
        <Tab
          value="online"
          label="Online Users"
          icon={<Iconify icon="solar:user-hand-up-bold" width={20} />}
          iconPosition="start"
          sx={{ color: currentTab === 'online' ? 'success.main' : 'inherit' }}
        />
        <Tab
          value="offline"
          label="InActive / Offline"
          icon={<Iconify icon="solar:user-block-bold" width={20} />}
          iconPosition="start"
          sx={{ color: currentTab === 'offline' ? 'error.main' : 'inherit' }}
        />
      </Tabs>

      {/* Search & Refresh */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <TextField
          size="small"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
        <Button
          variant="soft"
          startIcon={<Iconify icon="solar:refresh-bold" />}
          onClick={fetchLoggedInUsers}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Desktop Table */}
          {!isMobile ? (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.neutral' }}>
                  <TableRow>
                    <TableCell width={60}>SR</TableCell>
                    <TableCell>Client Info</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created Date</TableCell>
                    <TableCell>Login Time</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                        <Box sx={{ color: 'text.disabled' }}>
                          <Iconify icon="solar:user-block-bold-duotone" width={48} sx={{ mb: 1, opacity: 0.4 }} />
                          <Typography variant="h6">No Online Clients Found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClients.map((row, i) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * rowsPerPage + i + 1}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar src={row.avatarUrl} alt={row.name} sx={{ mr: 2, width: 36, height: 36 }} />
                            <ListItemText
                              primary={row.name}
                              secondary={row.email}
                              primaryTypographyProps={{ variant: 'subtitle2' }}
                              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{row.fullname}</TableCell>
                        <TableCell>{row.phoneNumber}</TableCell>
                        <TableCell>
                          <Label
                            variant="soft"
                            color={currentTab === 'online' ? "success" : "error"}
                            startIcon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />}
                          >
                            {currentTab === 'online' ? 'Online' : 'Offline'}
                          </Label>
                        </TableCell>
                        <TableCell>
                          {row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {row.createdAt ? format(new Date(row.createdAt), 'hh:mm a') : 'Now'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View Dashboard">
                              <IconButton color="primary" onClick={() => handleViewDashboard(row)}>
                                <Iconify icon="solar:to-pip-bold" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Client">
                              <IconButton
                                color="error"
                                onClick={() => {
                                  setSelectedId(row.id);
                                  confirm.onTrue();
                                }}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Mobile Cards */
            <Box display="grid" gap={2}>
              {paginatedClients.map((row) => (
                <Card key={row.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar src={row.avatarUrl} alt={row.name} sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="subtitle1">{row.fullname}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.email}</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                      <Box>
                        <Typography variant="caption" color="text.disabled">Username</Typography>
                        <Typography variant="body2">{row.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.disabled">Phone</Typography>
                        <Typography variant="body2">{row.phoneNumber}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.disabled">Created Date</Typography>
                        <Typography variant="body2">{row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : 'N/A'}</Typography>
                      </Box>
                    </Box>
                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Label variant="soft" color={currentTab === 'online' ? "success" : "error"}>
                        {currentTab === 'online' ? 'Online' : 'Offline'}
                      </Label>
                      <Typography variant="caption" color="text.secondary">
                        {row.createdAt ? format(new Date(row.createdAt), 'hh:mm a') : 'Now'}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      variant="soft"
                      color="error"
                      onClick={() => {
                        setSelectedId(row.id);
                        confirm.onTrue();
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      variant="soft"
                      onClick={() => handleViewDashboard(row)}
                    >
                      View Dashboard
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )
          }

          {/* Pagination */}
          {
            filteredClients.length > rowsPerPage && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={Math.ceil(filteredClients.length / rowsPerPage)}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                />
              </Box>
            )
          }
        </>
      )
      }
      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete Client"
        content="Are you sure you want to delete this client? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteClient(selectedId);
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </Container >
  );
}

// ----------------------------------------------------------------------

type LabelProps = {
  children?: React.ReactNode;
  color?: "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error";
  variant?: "filled" | "outlined" | "soft";
  startIcon?: React.ReactNode;
};

function Label({ children, color = 'default', variant = 'soft', startIcon }: LabelProps) {
  const theme = useTheme();

  const colors = {
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    primary: theme.palette.primary,
    info: theme.palette.info,
    default: { main: theme.palette.grey[500], lighter: theme.palette.grey[200] }
  };

  const activeColor = colors[color as keyof typeof colors] || colors.default;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 24,
        px: 1,
        borderRadius: 0.75,
        fontSize: 12,
        fontWeight: 700,
        bgcolor: variant === 'soft' ? alpha(activeColor.main, 0.16) : activeColor.main,
        color: variant === 'soft' ? activeColor.main : '#fff',
      }}
    >
      {startIcon}
      {children}
    </Box>
  );
}

function alpha(color: string, opacity: number) {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

