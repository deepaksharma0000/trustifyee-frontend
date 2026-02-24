// React & external libs
import { useState, useCallback, useEffect } from 'react';
import isEqual from 'lodash/isEqual';
import { format } from 'date-fns';

// MUI components
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';

// Internal imports
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { _roles, USER_STATUS_OPTIONS } from 'src/_mock';
import { useBoolean } from 'src/hooks/use-boolean';
import { IUserItem, IUserTableFilters, IUserTableFilterValue } from 'src/types/user';
import axiosInstance from 'src/utils/axios';

// Components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  getComparator,
  emptyRows,
  TableEmptyRows,
  TableHeadCustom,
} from 'src/components/table';

// Relative imports
import UserTableRow from '../user-table-row';
import UserTableToolbar from '../user-table-toolbar';
import UserTableFiltersResult from '../user-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...USER_STATUS_OPTIONS];

const TABLE_HEAD = [
  { id: 'srno', label: 'Sr. No.', width: 60 },
  { id: 'name', label: 'User Name' },
  { id: 'email', label: 'Email' },
  { id: 'fullname', label: 'Full Name' },
  { id: 'phoneNumber', label: 'Phone Number' },
  { id: 'broker', label: 'Broker' },
  { id: 'month', label: 'Month' },
  { id: 'gotodashboard', label: 'Go to Dashboard', align: 'center' },
  { id: 'startdate', label: 'Start Date' },
  { id: 'enddate', label: 'End Date' },
  { id: 'action', label: 'Action', align: 'right' },
];

const defaultFilters = {
  name: '',
  role: [] as string[],
  status: 'all',
  clientType: 'All',
  tradingType: 'All',
};

// ----------------------------------------------------------------------

export default function UserListView() {
  const table = useTable();
  const settings = useSettingsContext();
  const router = useRouter();
  const confirm = useBoolean();

  const [tableData, setTableData] = useState<IUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);

  const fetchExpiredUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/api/user/by-enddate?filter=expired`);

      const responseData = response.data;

      // Backend returns { data: [...] }, but might also return an array directly
      const usersList = Array.isArray(responseData) ? responseData : (responseData.data || responseData.results || []);

      if (usersList.length === 0) {
        setTableData([]);
        setError('Expired Clients Data Not Found');
        return;
      }

      const transformedData: IUserItem[] = usersList.map((user: any, index: number) => ({
        id: user.id || user._id || `temp-${index}`,
        name: user.user_name || 'N/A',
        email: user.email || 'N/A',
        fullname: user.full_name || 'N/A',
        phoneNumber: user.phone_number || 'N/A',
        broker: user.broker || 'N/A',
        status: user.status || 'N/A',
        tradingStatus: user.trading_status || 'N/A',
        month: user.month || 'N/A',
        isVerified: user.isVerified ?? false,
        city: user.city || 'N/A',
        state: user.state || 'N/A',
        avatarUrl: user.avatarUrl || '',
        role: user.role || 'user',
        licence: user.licence || 'Demo',
        brokerVerified: user.brokerVerified ?? false,
        startdate: user.start_date ? new Date(user.start_date) : new Date(),
        enddate: user.end_date ? new Date(user.end_date) : new Date(),
      }));

      setTableData(transformedData);
    } catch (err) {
      console.error('Error fetching expired users:', err);
      setError('Failed to fetch expired users');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpiredUsers();
  }, [fetchExpiredUsers]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const denseHeight = table.dense ? 52 : 72;
  const canReset = !isEqual(defaultFilters, filters);
  const notFound = !loading && dataFiltered.length === 0;

  const handleFilters = useCallback(
    (name: string, value: IUserTableFilterValue) => {
      table.onResetPage();
      setFilters((prev) => ({ ...prev, [name]: value }));
    },
    [table]
  );

  const handleDeleteRow = useCallback(
    (id: string) => {
      setTableData((prev) => prev.filter((row) => row.id !== id));
      table.onUpdatePageDeleteRow(dataFiltered.length);
    },
    [dataFiltered.length, table]
  );

  const handleDeleteRows = useCallback(() => {
    setTableData((prev) => prev.filter((row) => !table.selected.includes(row.id)));
    table.onUpdatePageDeleteRows({
      totalRows: tableData.length,
      totalRowsInPage: dataFiltered.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, table, tableData]);

  const handleEditRow = useCallback(
    (id: string) => router.push(paths.dashboard.user.edit(id)),
    [router]
  );

  const handleFilterStatus = useCallback(
    (event: React.SyntheticEvent, newValue: string) => handleFilters('status', newValue),
    [handleFilters]
  );

  const handleResetFilters = useCallback(() => setFilters(defaultFilters), []);
  const handleRefresh = useCallback(() => fetchExpiredUsers(), [fetchExpiredUsers]);

  const handleExportExcel = () => {
    const headers = TABLE_HEAD.filter(h => h.id !== 'action' && h.id !== 'gotodashboard')
      .map(h => h.label)
      .join(',');

    const rows = dataFiltered.map((user, index) => [
      index + 1,
      user.name,
      user.email,
      user.fullname,
      user.phoneNumber,
      user.broker,
      user.month,
      user.startdate ? format(new Date(user.startdate), 'yyyy-MM-dd') : 'N/A',
      user.enddate ? format(new Date(user.enddate), 'yyyy-MM-dd') : 'N/A',
    ].join(',')).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expired_Clients_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Expired Clients"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'User Management', href: paths.dashboard.user.root },
            { name: 'Expired Clients' },
          ]}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="solar:export-bold" />}
                onClick={handleExportExcel}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="mdi:refresh" />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Stack>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {error && !loading && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Card>
          <Tabs
            value={filters.status}
            onChange={handleFilterStatus}
            sx={{
              px: 2.5,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            {STATUS_OPTIONS.map((tab) => (
              <Tab
                key={tab.value}
                iconPosition="end"
                value={tab.value}
                label={tab.label}
                icon={
                  <Label
                    variant={
                      ((tab.value === 'all' || tab.value === filters.status) && 'filled') || 'soft'
                    }
                    color={
                      (tab.value === 'active' && 'success') ||
                      (tab.value === 'pending' && 'warning') ||
                      (tab.value === 'banned' && 'error') ||
                      'default'
                    }
                  >
                    {tab.value === 'all' && tableData.length}
                    {tab.value === 'active' &&
                      tableData.filter((user) => user.status === 'active').length}
                    {tab.value === 'pending' &&
                      tableData.filter((user) => user.status === 'pending').length}
                    {tab.value === 'banned' &&
                      tableData.filter((user) => user.status === 'banned').length}
                    {tab.value === 'rejected' &&
                      tableData.filter((user) => user.status === 'rejected').length}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <UserTableToolbar
            filters={filters}
            onFilters={handleFilters}
            roleOptions={_roles}
            onResetFilters={handleResetFilters}
          />

          {canReset && (
            <UserTableFiltersResult
              filters={filters}
              onFilters={handleFilters}
              onResetFilters={handleResetFilters}
              results={dataFiltered.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataFiltered.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {loading ? (
                    <TableEmptyRows height={denseHeight} emptyRows={5} />
                  ) : (
                    dataFiltered
                      .slice(table.page * table.rowsPerPage, table.page * table.rowsPerPage + table.rowsPerPage)
                      .map((row, index) => (
                        <UserTableRow
                          key={row.id}
                          row={row}
                          index={table.page * table.rowsPerPage + index}
                          selected={table.selected.includes(row.id)}
                          onSelectRow={() => table.onSelectRow(row.id)}
                          onDeleteRow={() => handleDeleteRow(row.id)}
                          onEditRow={() => handleEditRow(row.id)}
                        />
                      ))
                  )}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  {notFound && (
                    <TableRow>
                      <TableCell align="center" colSpan={TABLE_HEAD.length}>
                        <Box sx={{ py: 5 }}>
                          <Iconify icon="solar:user-block-bold-duotone" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                          <Typography variant="h6" sx={{ color: 'text.disabled' }}>No Expired Clients Found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePagination
            component="div"
            count={dataFiltered.length}
            page={table.page}
            onPageChange={table.onChangePage}
            rowsPerPage={table.rowsPerPage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>

        <Box sx={{ mt: 5, py: 3, textAlign: 'center', borderTop: (theme) => `dashed 1px ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            CopyRight Finvesta 2026 - 27 . All Rights Reserved
          </Typography>
        </Box>
      </Container>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure you want to delete <strong>{table.selected.length}</strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteRows();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({
  inputData,
  comparator,
  filters,
}: {
  inputData: IUserItem[];
  comparator: (a: any, b: any) => number;
  filters: any;
}) {
  const { name, status, clientType, tradingType } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    const search = name.toLowerCase();
    inputData = inputData.filter(
      (user) =>
        (user.name ?? '').toLowerCase().includes(search) ||
        (user.email ?? '').toLowerCase().includes(search) ||
        (user.fullname ?? '').toLowerCase().includes(search)
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((user) => user.status === status);
  }

  if (clientType !== 'All') {
    if (clientType === 'Live') inputData = inputData.filter(u => u.licence === 'Live');
    if (clientType === 'Paper Trading') inputData = inputData.filter(u => u.licence === 'Demo');
    if (clientType === 'Live 2 Days Only') inputData = inputData.filter(u => u.licence === 'Live' && u.month === '2 Days');
  }

  if (tradingType !== 'All') {
    if (tradingType === 'Ready') inputData = inputData.filter(u => u.brokerVerified && u.tradingStatus === 'active');
    if (tradingType === 'Demo/No-Broker') inputData = inputData.filter(u => !u.broker || u.broker === 'N/A');
    if (tradingType === 'Unverified') inputData = inputData.filter(u => !u.isVerified);
  }

  return inputData;
}
