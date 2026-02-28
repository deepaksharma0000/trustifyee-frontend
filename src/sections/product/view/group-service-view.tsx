import { useState, useEffect, useCallback } from 'react';
// @mui
import {
    Box,
    Card,
    Table,
    Button,
    Divider,
    Container,
    TableRow,
    TableBody,
    TableCell,
    TableContainer,
    Typography,
} from '@mui/material';
// routes
import { paths } from 'src/routes/paths';
// components
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useSettingsContext } from 'src/components/settings';
import { useSnackbar } from 'src/components/snackbar';
import { HOST_API } from 'src/config-global';
import { TableHeadCustom, TableNoData, TableSkeleton } from 'src/components/table';
//
import GroupServiceNewForm from '../group-service-new-form';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'name', label: 'Group Name' },
    { id: 'services', label: 'Assigned Services' },
    { id: 'createdAt', label: 'Created At' },
    { id: 'action', label: 'Action', align: 'right' },
];

// ----------------------------------------------------------------------

export default function GroupServiceView() {
    const settings = useSettingsContext();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState<any[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${HOST_API}/api/group/all`, {
                headers: {
                    'x-access-token': localStorage.getItem('authToken') || '',
                },
            });
            const json = await res.json();
            if (json.status) {
                setTableData(json.data || []);
            }
        } catch (error) {
            enqueueSnackbar('Failed to fetch groups', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    return (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
            <CustomBreadcrumbs
                heading="Group Service Management"
                links={[
                    { name: 'Dashboard', href: paths.dashboard.root },
                    { name: 'Script Management', href: paths.dashboard.product.root },
                    { name: 'Group Services' },
                ]}
                action={
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon={showAddForm ? 'eva:arrow-ios-back-fill' : 'mingcute:add-line'} />}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? 'Back to List' : 'Add New Group Service'}
                    </Button>
                }
                sx={{ mb: { xs: 3, md: 5 } }}
            />

            {showAddForm ? (
                <GroupServiceNewForm onSuccess={() => { setShowAddForm(false); fetchGroups(); }} />
            ) : (
                <Card>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table size="medium" sx={{ minWidth: 800 }}>
                                <TableHeadCustom headLabel={TABLE_HEAD} />

                                <TableBody>
                                    {loading ? (
                                        [...Array(5)].map((_, i) => <TableSkeleton key={i} />)
                                    ) : (
                                        <>
                                            {tableData.map((row) => (
                                                <GroupTableRow key={row._id} row={row} onDelete={() => fetchGroups()} />
                                            ))}
                                            <TableNoData notFound={!tableData.length} />
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </Scrollbar>
                    </TableContainer>
                </Card>
            )}
        </Container>
    );
}

// ----------------------------------------------------------------------

function GroupTableRow({ row, onDelete }: { row: any; onDelete: () => void }) {
    const { enqueueSnackbar } = useSnackbar();

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete group "${row.name}"?`)) return;

        try {
            const res = await fetch(`${HOST_API}/api/group/${row._id}`, {
                method: 'DELETE',
                headers: { 'x-access-token': localStorage.getItem('authToken') || '' },
            });
            const json = await res.json();
            if (json.status) {
                enqueueSnackbar('Group deleted successfully');
                onDelete();
            } else {
                enqueueSnackbar(json.message || 'Delete failed', { variant: 'error' });
            }
        } catch (e) {
            enqueueSnackbar('Server error', { variant: 'error' });
        }
    };

    return (
        <TableRow hover>
            <TableCell>
                <Typography variant="subtitle2">{row.name}</Typography>
            </TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {row.result?.map((s: any, i: number) => (
                        <Box
                            key={i}
                            sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: 'primary.lighter',
                                color: 'primary.darker',
                                fontSize: 11,
                                fontWeight: 'bold',
                            }}
                        >
                            {s.name} - {s.segment} ({s.group_qty} Qty)
                        </Box>
                    ))}
                </Box>
            </TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {new Date(row.createdAt).toLocaleDateString()}
                </Typography>
            </TableCell>
            <TableCell align="right">
                <Button
                    size="small"
                    color="error"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                    onClick={handleDelete}
                >
                    Delete
                </Button>
            </TableCell>
        </TableRow>
    );
}
