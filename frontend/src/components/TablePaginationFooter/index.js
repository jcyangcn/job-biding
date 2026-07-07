import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  TablePagination,
  useTheme
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon
} from '@mui/icons-material';
import { DEFAULT_ROWS_PER_PAGE_OPTIONS } from 'src/hooks/useTablePagination';

function TablePaginationActions({ count, page, rowsPerPage, onPageChange }) {
  const theme = useTheme();
  const lastPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1);

  const handleFirstPage = (event) => {
    onPageChange(event, 0);
  };

  const handleBackPage = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextPage = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPage = (event) => {
    onPageChange(event, lastPage);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPage}
        disabled={page === 0}
        aria-label="first page"
        size="small"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackPage}
        disabled={page === 0}
        aria-label="previous page"
        size="small"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextPage}
        disabled={page >= lastPage}
        aria-label="next page"
        size="small"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPage}
        disabled={page >= lastPage}
        aria-label="last page"
        size="small"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired
};

function TablePaginationFooter({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS
}) {
  if (count === 0) {
    return null;
  }

  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={rowsPerPageOptions}
      ActionsComponent={TablePaginationActions}
    />
  );
}

TablePaginationFooter.propTypes = {
  count: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired,
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number)
};

export default TablePaginationFooter;
