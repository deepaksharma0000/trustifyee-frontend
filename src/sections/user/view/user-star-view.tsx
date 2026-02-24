import { useState, useCallback, useEffect, useMemo } from 'react';
// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Container from '@mui/material/Container';
import ListItemText from '@mui/material/ListItemText';
import {
    DataGrid,
    GridColDef,
    GridToolbar,
} from '@mui/x-data-grid';
// routes
import { paths } from 'src/routes/paths';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSettingsContext } from 'src/components/settings';
import axiosInstance from 'src/utils/axios';

// ----------------------------------------------------------------------

interface ClientData {
    id: string;
    user_name: string;
    email: string;
    full_name: string;
    phone_number: string;
    licence: string;
    status: string;
    is_star: boolean;
    avatar_color?: string;
}

export default function UserStarView() {
    const settings = useSettingsContext();
    const [tableData, setTableData] = useState<ClientData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStarClients = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/user/star-clients');
            const data = response.data.data || [];
            setTableData(data.map((c: any) => ({
                ...c,
                id: c.id || c._id,
                avatar_color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
            })));
        } catch (error) {
            console.error('Error fetching star clients:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStarClients();
    }, [fetchStarClients]);

    const handleToggleStar = useCallback(async (id: string) => {
        try {
            const res = await axiosInstance.post(`/api/user/toggle-star-client/${id}`);
            if (res.data.status) {
                // Since we are in the "Star" page, toggling it off should remove it from the list
                setTableData((prev) => prev.filter((c) => c.id !== id));
            }
        } catch (error) {
            console.error('Error toggling star status:', error);
        }
    }, []);

    const columns: GridColDef[] = useMemo(() => [
        {
            field: 'is_star',
            headerName: '',
            width: 50,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    onClick={() => handleToggleStar(params.row.id)}
                    sx={{ color: 'warning.main' }}
                >
                    <Iconify icon="solar:star-bold" width={20} />
                </IconButton>
            )
        },
        {
            field: 'user_name',
            headerName: 'Client',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: params.row.avatar_color, width: 36, height: 36, fontSize: 16 }}>
                        {params.value.charAt(0).toUpperCase()}
                    </Avatar>
                    <ListItemText
                        primary={params.row.full_name}
                        secondary={params.row.email}
                        primaryTypographyProps={{ variant: 'subtitle2' }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                </Box>
            )
        },
        {
            field: 'phone_number',
            headerName: 'Phone Number',
            width: 150,
        },
        {
            field: 'licence',
            headerName: 'Licence',
            width: 120,
            renderCell: (params) => (
                <Label color={params.value === 'Live' ? 'success' : 'warning'} variant="soft">
                    {params.value}
                </Label>
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Label color={params.value === 'active' ? 'success' : 'error'} variant="soft">
                    {params.value}
                </Label>
            )
        }
    ], [handleToggleStar]);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <CustomBreadcrumbs
                heading="Star Clients"
                links={[
                    { name: 'Dashboard', href: paths.dashboard.root },
                    { name: 'User', href: paths.dashboard.user.root },
                    { name: 'Star Clients' },
                ]}
                sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
                <DataGrid
                    rows={tableData}
                    columns={columns}
                    loading={loading}
                    autoHeight
                    slots={{ toolbar: GridToolbar }}
                    sx={{ px: 2 }}
                />
            </Card>
        </Container>
    );
}
