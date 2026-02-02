import { useState } from "react";
import {
  Box,
  Container,
  ToggleButton,
  ToggleButtonGroup,
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
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

type Client = {
  id: number;
  user: string;
  email: string;
  name: string;
  phone: string;
  date: string;
  status: "active" | "inactive";
};

export default function ClientView() {
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const rowsPerPage = 5;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newTab: "active" | "inactive" | null
  ) => {
    if (newTab !== null) {
      setTab(newTab);
      setPage(1);
    }
  };

  const activeClients: Client[] = [
    { id: 1, user: "Cutabeta2019", email: "Cutabeta2019@gmail.com", name: "Rakesh Kumar", phone: "9458568524", date: "2024/11/13", status: "active" },
    { id: 2, user: "varun", email: "vvarun2019@gmail.com", name: "Varun P V", phone: "9016829055", date: "2024/12/10", status: "active" },
    { id: 3, user: "MANU585", email: "manukurian585@gmail.com", name: "Manu Kurian", phone: "9539984585", date: "2024/12/11", status: "active" },
    { id: 4, user: "Kumar", email: "deepakk89417@gmail.com", name: "Deepak", phone: "7061380873", date: "2025/01/21", status: "active" },
  ];

  const inactiveClients: Client[] = [
    { id: 1, user: "bala88777", email: "balabala88777@gmail.com", name: "Johnpaul N", phone: "9962600122", date: "2024/07/30", status: "inactive" },
    { id: 2, user: "Narendra2410", email: "narendrakumarkmr49@gmail.com", name: "Narendra Kumar", phone: "8542059300", date: "2024/08/16", status: "inactive" },
    { id: 3, user: "Dharmesh", email: "dnkavaiya@gmail.com", name: "Dharmesh Natubhai", phone: "9904260148", date: "2024/08/21", status: "inactive" },
    { id: 4, user: "Hp", email: "Harendrap2437@gmail.com", name: "Harendra Pal", phone: "9140122437", date: "2024/08/30", status: "inactive" },
  ];

  const clients = tab === "active" ? activeClients : inactiveClients;

  const filteredClients = clients.filter(
    (c) =>
      c.user.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedClients = filteredClients.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Container maxWidth="lg">
      {/* Toggle */}
      <Box display="flex" justifyContent="center" mb={3}>
        <ToggleButtonGroup exclusive value={tab} onChange={handleChange}>
          <ToggleButton value="active">Active Clients</ToggleButton>
          <ToggleButton value="inactive">Inactive Clients</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Search */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <TextField
          size="small"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: 300 }}
        />
      </Box>

      {/* Desktop */}
      {!isMobile ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SR</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedClients.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>{(page - 1) * rowsPerPage + i + 1}</TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      color={row.status === "active" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                      Edit
                    </Button>
                    <Button size="small" variant="outlined" color="error">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* Mobile */
        <Box display="grid" gap={2}>
          {paginatedClients.map((row) => (
            <Card key={row.id}>
              <CardContent>
                <Typography variant="h6">{row.name}</Typography>
                <Typography variant="body2">{row.email}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">Phone: {row.phone}</Typography>
                <Typography variant="body2">Date: {row.date}</Typography>
                <Chip
                  label={row.status}
                  color={row.status === "active" ? "success" : "error"}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
              <CardActions>
                <Button size="small">Edit</Button>
                <Button size="small" color="error">
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={Math.ceil(filteredClients.length / rowsPerPage)}
          page={page}
          onChange={(_, val) => setPage(val)}
        />
      </Box>
    </Container>
  );
}
