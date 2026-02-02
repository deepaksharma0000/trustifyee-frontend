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

// Internal imports
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { _userList, _roles, USER_STATUS_OPTIONS } from 'src/_mock';
import { useBoolean } from 'src/hooks/use-boolean';
import { IUserItem, IUserTableFilters, IUserTableFilterValue } from 'src/types/user';

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
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
} from 'src/components/table';

// Relative imports
import UserTableRow from '../user-table-row';
import UserTableToolbar from '../user-table-toolbar';
import UserTableFiltersResult from '../user-table-filters-result';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...USER_STATUS_OPTIONS];

const TABLE_HEAD = [
  { id: 'name', label: 'User Name' },
  { id: 'email', label: 'Email' },
  { id: 'fullname', label: 'Full Name' },
  { id: 'phoneNumber', label: 'Phone Number', width: 180 },
  { id: 'broker', label: 'Broker', width: 220 },
  { id: 'month', label: 'Month' },
  { id: 'gotodashboard', label: 'Go to Dashboard' },
  { id: 'tradingStatus', label: 'Trading Status' },
  { id: 'startdate', label: 'Start Date' },
  { id: 'enddate', label: 'End Date' },
  { id: 'action', label: 'Actions' },
  { id: '', width: 88 },
];

const defaultFilters: IUserTableFilters = {
  name: '',
  role: [],
  status: 'all',
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

  // ✅ API Call
  const fetchExpiredUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const apiUrl = `http://localhost:3000/api/users/by-enddate?filter=custom&date=${currentDate}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Invalid response: ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (!Array.isArray(data) || data.length === 0) {
        setTableData([]);
        setError('Data Not Found');
        return;
      }

  const transformedData: IUserItem[] = data.map((user: any, index: number) => ({
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

  // ✅ Required fields in IUserItem that might not come from API
  city: user.city || 'N/A',
  state: user.state || 'N/A',
  address: user.address || 'N/A',
  country: user.country || 'N/A',
  zipCode: user.zipCode || 'N/A',
  company: user.company || 'N/A',
  avatarUrl: user.avatarUrl || '',

  role: user.role || 'user',

  // ✅ Dates converted properly
  startdate: user.start_date ? new Date(user.start_date) : new Date(),
  enddate: user.end_date ? new Date(user.end_date) : new Date(),
}));



      setTableData(transformedData);
    } catch (err) {
      console.error('Error fetching expired users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expired users');
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

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const denseHeight = table.dense ? 52 : 72;
  const canReset = !isEqual(defaultFilters, filters);
  const notFound = !loading && tableData.length === 0;

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
      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table]
  );

  const handleDeleteRows = useCallback(() => {
    setTableData((prev) => prev.filter((row) => !table.selected.includes(row.id)));
    table.onUpdatePageDeleteRows({
      totalRows: tableData.length,
      totalRowsInPage: dataInPage.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

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

  if (loading) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Expired Clients"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Expired Clients' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card sx={{ p: 3, textAlign: 'center' }}>Loading expired clients...</Card>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Expired Clients"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Expired Clients' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mdi:refresh" />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {error && (
          <Alert
            severity="warning"
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

          <UserTableToolbar filters={filters} onFilters={handleFilters} roleOptions={_roles} />

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
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={tableData.length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  tableData.map((row) => row.id)
                )
              }
              action={
                <Tooltip title="Delete">
                  <IconButton color="primary" onClick={confirm.onTrue}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      tableData.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataFiltered.map((row) => (
                    <UserTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onDeleteRow={() => handleDeleteRow(row.id)}
                      onEditRow={() => handleEditRow(row.id)}
                    />
                  ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)}
                  />

                  {notFound && (
                    <TableRow>
                      <TableCell align="center" colSpan={TABLE_HEAD.length}>
                        <Alert severity="info">📭 Data Not Found</Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        </Card>
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
  filters: IUserTableFilters & { tradingStatus?: string };
}) {
  const { name, status, role, tradingStatus } = filters;

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
    (user) => (user.name ?? '').toLowerCase().includes(search)
  );
}


  if (status !== 'all') {
    inputData = inputData.filter((user) => user.status === status);
  }

  if (role.length) {
    inputData = inputData.filter(
      (user) => !!user.role && role.includes(user.role)
    );
  }


  if (tradingStatus && tradingStatus !== 'all') {
    inputData = inputData.filter((user) => user.tradingStatus === tradingStatus);
  }

  return inputData;
}
