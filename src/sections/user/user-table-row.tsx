import { format } from 'date-fns';
// @mui
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// types
import { IUserItem } from 'src/types/user';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Props = {
  selected: boolean;
  onEditRow: VoidFunction;
  row: IUserItem;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
  index: number;
};

export default function UserTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  index,
}: Props) {
  const { name, fullname, email, phoneNumber, broker, month, status, startdate, enddate } = row;
  const theme = useTheme();
  const confirm = useBoolean();
  const popover = usePopover();

  const handleGoToDashboard = () => {
    if (status === 'active' || String(status) === 'true') {
      // Impersonation logic
      const impersonatedUser = {
        ...row,
        role: 'user',
        impersonated: true,
        originalAdmin: localStorage.getItem('authUser')
      };
      localStorage.setItem('authUser', JSON.stringify(impersonatedUser));
      window.location.href = '/dashboard';
    }
  };

  const isActive = status === 'active' || String(status) === 'true';

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onClick={onSelectRow} />
        </TableCell>

        <TableCell>{index + 1}</TableCell>

        <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar alt={name} src={row.avatarUrl} sx={{ mr: 2 }} />
          <ListItemText
            primary={name}
            primaryTypographyProps={{ typography: 'body2' }}
          />
        </TableCell>

        <TableCell>{email}</TableCell>
        <TableCell>{fullname}</TableCell>
        <TableCell>{phoneNumber}</TableCell>
        <TableCell>{broker || 'N/A'}</TableCell>
        <TableCell>{month || 'N/A'}</TableCell>

        <TableCell align="center">
          <Tooltip title={isActive ? "Visit User Dashboard" : "User is Inactive"} arrow>
            <IconButton
              onClick={handleGoToDashboard}
              disabled={!isActive}
              sx={{
                color: isActive ? 'primary.main' : 'text.disabled',
                bgcolor: isActive ? theme.palette.primary.lighter : 'transparent',
                '&:hover': {
                  bgcolor: isActive ? theme.palette.primary.light : 'transparent',
                }
              }}
            >
              <Iconify icon="solar:round-alt-arrow-right-bold-duotone" width={24} />
            </IconButton>
          </Tooltip>
        </TableCell>

        <TableCell>{startdate ? format(new Date(startdate), 'dd MMM yyyy') : 'N/A'}</TableCell>
        <TableCell>{enddate ? format(new Date(enddate), 'dd MMM yyyy') : 'N/A'}</TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Tooltip title="Edit" placement="top" arrow>
            <IconButton color="primary" onClick={onEditRow}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>

          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
      >
        <MenuItem
          onClick={() => {
            confirm.onTrue();
            popover.onClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>

        <MenuItem
          onClick={() => {
            onEditRow();
            popover.onClose();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete this client?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
