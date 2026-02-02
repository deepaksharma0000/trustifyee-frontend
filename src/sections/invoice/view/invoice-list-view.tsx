import React, { useState, ChangeEvent } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Box,
  Paper,
} from '@mui/material';

// Define the License type
interface License {
  id: number;
  userName: string;
  email: string;
  phoneNumber: string;
  startDate: string;
  endDate: string;
}

// Sample data
const licenseData: License[] = [
  {
    id: 1,
    userName: 'nehaikhedkar33',
    email: 'nehaikhedkar33@gmail.com',
    phoneNumber: '8788354451',
    startDate: '16/09/2025 05:00:00',
    endDate: '23/09/2025 05:00:00',
  },
  {
    id: 2,
    userName: 'johnsmith',
    email: 'johnsmith@example.com',
    phoneNumber: '9123456780',
    startDate: '01/10/2025 10:00:00',
    endDate: '15/10/2025 10:00:00',
  },
  {
    id: 3,
    userName: 'sarahjones',
    email: 'sarahjones@example.com',
    phoneNumber: '8765432109',
    startDate: '05/11/2025 08:30:00',
    endDate: '19/11/2025 08:30:00',
  },
  {
    id: 4,
    userName: 'mikerodriguez',
    email: 'mikerodriguez@example.com',
    phoneNumber: '8901234567',
    startDate: '10/12/2025 09:15:00',
    endDate: '24/12/2025 09:15:00',
  },
  {
    id: 5,
    userName: 'emilywilson',
    email: 'emilywilson@example.com',
    phoneNumber: '9012345678',
    startDate: '15/01/2026 11:45:00',
    endDate: '29/01/2026 11:45:00',
  },
];

export default function ExpiredLicenseView() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredData = licenseData.filter(
    (item) =>
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phoneNumber.includes(searchQuery)
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Expired Soon License
      </Typography>

      {/* Search Card */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#555' }}>
          Search Something Here
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by username, email or phone"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            mt: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 3, overflow: 'hidden' }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>SR. No.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>User Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { backgroundColor: theme.palette.action.hover },
                    }}
                  >
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{row.userName}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phoneNumber}</TableCell>
                    <TableCell>{row.startDate}</TableCell>
                    <TableCell sx={{ color: theme.palette.error.main, fontWeight: 500 }}>
                      {row.endDate}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </Card>
    </Box>
  );
}
