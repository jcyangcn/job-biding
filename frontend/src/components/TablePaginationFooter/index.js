import PropTypes from 'prop-types';
import { TablePagination } from '@mui/material';
import { DEFAULT_ROWS_PER_PAGE_OPTIONS } from 'src/hooks/useTablePagination';

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
