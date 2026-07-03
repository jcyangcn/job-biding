import PropTypes from 'prop-types';
import { TableCell, TableSortLabel } from '@mui/material';

function SortableTableCell({
  label,
  sortKey,
  sortField,
  sortDirection,
  onSort,
  align,
  ...tableCellProps
}) {
  const active = sortField === sortKey;

  return (
    <TableCell align={align} sortDirection={active ? sortDirection : false} {...tableCellProps}>
      <TableSortLabel
        active={active}
        direction={active ? sortDirection : 'asc'}
        onClick={() => onSort(sortKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

SortableTableCell.propTypes = {
  label: PropTypes.node.isRequired,
  sortKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
  sortField: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  sortDirection: PropTypes.oneOf(['asc', 'desc']).isRequired,
  onSort: PropTypes.func.isRequired,
  align: PropTypes.string
};

export default SortableTableCell;
