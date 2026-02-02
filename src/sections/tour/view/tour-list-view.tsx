import orderBy from 'lodash/orderBy';
import { useState, useCallback } from 'react';
// @mui
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// utils
import { fTimestamp } from 'src/utils/format-time';
// components
import Iconify from 'src/components/iconify';
import EmptyContent from 'src/components/empty-content';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// types
import { ITourItem, ITourFilters, ITourFilterValue } from 'src/types/tour';

// ----------------------------------------------------------------------

// Mock data for demonstration
const _licenses = [
  { id: '1', email: 'njpanchery9l@gmail.com', licenseCount: 1, createdAt: '18/09/2025 09:10:22' },
  { id: '2', email: 'rovindrasatokar79@gmail.com', licenseCount: 1, createdAt: '15/09/2025 10:16:53' },
  { id: '3', email: 'Dipeshpr21@gmail.com', licenseCount: 1, createdAt: '02/09/2025 10:40:34' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

// ----------------------------------------------------------------------

export default function TransactionLicenseView() {
  const settings = useSettingsContext();

  const [monthFilter, setMonthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Summary data
  const summaryData = {
    startDate: '01/07/2024 04:13:09',
    remainingLicenses: 0,
    totalLicenses: 124,
    currentMonthLicenses: 'Please Select Month',
    totalUsedLicenses: 124,
  };

  // Filter data based on search and month
  const filteredLicenses = _licenses.filter((license) => {
    const matchesSearch = license.email.toLowerCase().includes(searchQuery.toLowerCase());
    // For demonstration, we're not implementing actual month filtering
    return matchesSearch;
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMonthFilter(event.target.value);
  };

  const handleReset = () => {
    setSearchQuery('');
    setMonthFilter('all');
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Transaction License"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          {
            name: 'Transaction License',
            href: paths.dashboard.tour.root,
          },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Start Date
              </Typography>
              <Typography variant="h6" component="div">
                {summaryData.startDate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Remaining License
              </Typography>
              <Typography 
                variant="h4" 
                component="div" 
                color={summaryData.remainingLicenses === 0 ? 'error.main' : 'success.main'}
              >
                {summaryData.remainingLicenses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Total License
              </Typography>
              <Typography variant="h4" component="div">
                {summaryData.totalLicenses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Current Month License
              </Typography>
              <Typography variant="h6" component="div">
                {summaryData.currentMonthLicenses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Total Used License
              </Typography>
              <Typography variant="h4" component="div">
                {summaryData.totalUsedLicenses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Something Here
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Please Select Month"
              value={monthFilter}
              onChange={handleMonthChange}
            >
              {MONTH_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth onClick={handleReset} startIcon={<Iconify icon="eva:refresh-fill" />}>
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* License Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="license table">
          <TableHead>
            <TableRow>
              <TableCell>S.No.</TableCell>
              <TableCell>User Name</TableCell>
              <TableCell align="center">License</TableCell>
              <TableCell>Create At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLicenses.map((row, index) => (
              <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {index + 1}
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell align="center">
                  <Chip label={row.licenseCount} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{row.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredLicenses.length === 0 && (
        <EmptyContent title="No licenses found" sx={{ py: 10 }} />
      )}
    </Container>
  );
}