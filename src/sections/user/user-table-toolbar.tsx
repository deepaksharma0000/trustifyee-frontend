import { useCallback } from 'react';
// @mui
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import Select, { SelectChangeEvent } from '@mui/material/Select';
// types
import { IUserTableFilters, IUserTableFilterValue } from 'src/types/user';
// components
import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

type Props = {
  filters: IUserTableFilters & { clientType?: string; tradingType?: string };
  onFilters: (name: string, value: IUserTableFilterValue) => void;
  //
  roleOptions: string[];
  onResetFilters?: VoidFunction;
};

export default function UserTableToolbar({
  filters,
  onFilters,
  //
  roleOptions,
  onResetFilters,
}: Props) {
  const popover = usePopover();

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilters('name', event.target.value);
    },
    [onFilters]
  );

  const handleFilterClientType = useCallback(
    (event: SelectChangeEvent<string>) => {
      onFilters('clientType', event.target.value);
    },
    [onFilters]
  );

  const handleFilterTradingType = useCallback(
    (event: SelectChangeEvent<string>) => {
      onFilters('tradingType', event.target.value);
    },
    [onFilters]
  );

  return (
    <>
      <Stack
        spacing={2}
        alignItems={{ xs: 'flex-end', md: 'center' }}
        direction={{
          xs: 'column',
          md: 'row',
        }}
        sx={{
          p: 2.5,
          pr: { xs: 2.5, md: 1 },
        }}
      >
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
          <InputLabel>Client Type</InputLabel>
          <Select
            value={filters.clientType || 'All'}
            onChange={handleFilterClientType}
            input={<OutlinedInput label="Client Type" />}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Live">Live</MenuItem>
            <MenuItem value="Paper Trading">Paper Trading</MenuItem>
            <MenuItem value="Live 2 Days Only">Live 2 Days Only</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 160 } }}>
          <InputLabel>Trading Type</InputLabel>
          <Select
            value={filters.tradingType || 'All'}
            onChange={handleFilterTradingType}
            input={<OutlinedInput label="Trading Type" />}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Ready">Ready</MenuItem>
            <MenuItem value="Demo/No-Broker">Demo/No-Broker</MenuItem>
            <MenuItem value="Unverified">Unverified</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
          <TextField
            fullWidth
            value={filters.name}
            onChange={handleFilterName}
            placeholder="Search by name or email..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {onResetFilters && (
            <Button
              color="error"
              sx={{ flexShrink: 0 }}
              onClick={onResetFilters}
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            >
              Reset
            </Button>
          )}

          <IconButton onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </Stack>
      </Stack>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
      >
        <MenuItem
          onClick={() => {
            popover.onClose();
          }}
        >
          <Iconify icon="solar:printer-minimalistic-bold" />
          Print
        </MenuItem>

        <MenuItem
          onClick={() => {
            popover.onClose();
          }}
        >
          <Iconify icon="solar:import-bold" />
          Import
        </MenuItem>

        <MenuItem
          onClick={() => {
            popover.onClose();
          }}
        >
          <Iconify icon="solar:export-bold" />
          Export
        </MenuItem>
      </CustomPopover>
    </>
  );
}
