import PropTypes from 'prop-types';
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import ClearAllTwoToneIcon from '@mui/icons-material/ClearAllTwoTone';
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';
import { EMPTY_FILTER_VALUE } from 'src/utils/tableListFilters';

const compactInputSx = {
  '& .MuiInputBase-root': {
    fontSize: '0.8125rem',
    minHeight: 40
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem'
  }
};

const compactButtonSx = {
  py: 0.5,
  px: 1.25,
  fontSize: '0.8125rem',
  minHeight: 40,
  minWidth: 'auto',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  '& .MuiButton-startIcon': {
    mr: 0.5,
    '& > svg': {
      fontSize: '1rem'
    }
  }
};

const filterButtonSx = {
  whiteSpace: 'nowrap',
  flexShrink: 0
};

function TableListFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  showDateRange = true,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  dateFromLabel = 'From',
  dateToLabel = 'To',
  selects = [],
  onClear,
  hasActiveFilters,
  filteredCount,
  totalCount,
  actions,
  singleLine = false
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: singleLine ? 'nowrap' : 'wrap',
        alignItems: 'center',
        gap: singleLine ? 0.75 : 1.5,
        width: '100%',
        py: 0.5,
        overflowX: singleLine ? 'auto' : 'visible',
        scrollbarWidth: 'thin'
      }}
    >
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        sx={
          singleLine
            ? {
                ...compactInputSx,
                flex: '1 1 120px',
                minWidth: 120,
                maxWidth: 170
              }
            : {
                flex: '1 1 220px',
                minWidth: 200,
                maxWidth: 360
              }
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchTwoToneIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />
      {selects.map((select) => (
        <FormControl
          key={select.id}
          size="small"
          sx={
            singleLine
              ? {
                  ...compactInputSx,
                  flex: '0 0 108px',
                  width: 108,
                  minWidth: 108
                }
              : { flex: '0 1 150px', minWidth: 140 }
          }
        >
          <InputLabel>{select.label}</InputLabel>
          <Select
            label={select.label}
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
          >
            <MenuItem value={EMPTY_FILTER_VALUE}>All</MenuItem>
            {select.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      {showDateRange ? (
        <>
          <TextField
            size="small"
            label={dateFromLabel}
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={
              singleLine
                ? {
                    ...compactInputSx,
                    flex: '0 0 118px',
                    width: 118,
                    minWidth: 118
                  }
                : { flex: '0 1 150px', minWidth: 140 }
            }
          />
          <TextField
            size="small"
            label={dateToLabel}
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={
              singleLine
                ? {
                    ...compactInputSx,
                    flex: '0 0 118px',
                    width: 118,
                    minWidth: 118
                  }
                : { flex: '0 1 150px', minWidth: 140 }
            }
          />
        </>
      ) : null}
      <Button
        variant="outlined"
        size="small"
        startIcon={<ClearAllTwoToneIcon />}
        onClick={onClear}
        disabled={!hasActiveFilters}
        sx={singleLine ? compactButtonSx : filterButtonSx}
      >
        Clear
      </Button>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: singleLine ? 0.75 : 1,
          flex: singleLine ? '0 0 auto' : '1 1 auto',
          justifyContent: 'flex-end',
          minWidth: 'fit-content',
          flexShrink: 0,
          flexWrap: singleLine ? 'nowrap' : 'wrap',
          ml: singleLine ? 'auto' : 0
        }}
      >
        {typeof filteredCount === 'number' && typeof totalCount === 'number' ? (
          <Typography
            variant={singleLine ? 'caption' : 'body2'}
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {singleLine ? `${filteredCount}/${totalCount}` : `Showing ${filteredCount} of ${totalCount}`}
          </Typography>
        ) : null}
        {actions}
      </Box>
    </Box>
  );
}

TableListFilters.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  showDateRange: PropTypes.bool,
  dateFrom: PropTypes.string.isRequired,
  dateTo: PropTypes.string.isRequired,
  onDateFromChange: PropTypes.func.isRequired,
  onDateToChange: PropTypes.func.isRequired,
  dateFromLabel: PropTypes.string,
  dateToLabel: PropTypes.string,
  selects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      onChange: PropTypes.func.isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired
        })
      ).isRequired
    })
  ),
  onClear: PropTypes.func.isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  filteredCount: PropTypes.number,
  totalCount: PropTypes.number,
  actions: PropTypes.node,
  singleLine: PropTypes.bool
};

export { compactButtonSx };
export default TableListFilters;
