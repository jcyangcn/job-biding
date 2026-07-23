import { useCallback, useMemo, useState } from 'react';

function getSortValue(row, sortKey) {
  if (typeof sortKey === 'function') {
    return sortKey(row);
  }
  return row[sortKey];
}

function compareValues(a, b) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) {
    return 0;
  }
  if (aEmpty) {
    return 1;
  }
  if (bEmpty) {
    return -1;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  const aText = String(a);
  const bText = String(b);
  const aTime = Date.parse(aText);
  const bTime = Date.parse(bText);
  if (
    !Number.isNaN(aTime) &&
    !Number.isNaN(bTime) &&
    (aText.includes('-') || aText.includes('T'))
  ) {
    return aTime - bTime;
  }

  return aText.localeCompare(bText, undefined, { sensitivity: 'base', numeric: true });
}

function useTableSort(rows, { defaultSort = null } = {}) {
  const [sortField, setSortField] = useState(defaultSort?.field ?? null);
  const [sortDirection, setSortDirection] = useState(defaultSort?.direction ?? 'asc');

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }
      // A sort accessor can itself be a function. Wrap it so React stores the
      // function instead of executing it as a state updater.
      setSortField(() => field);
      setSortDirection('asc');
    },
    [sortField]
  );

  const sortedRows = useMemo(() => {
    if (!sortField) {
      return rows;
    }

    return [...rows].sort((rowA, rowB) => {
      const comparison = compareValues(getSortValue(rowA, sortField), getSortValue(rowB, sortField));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortField, sortDirection]);

  return {
    sortedRows,
    sortField,
    sortDirection,
    handleSort
  };
}

export default useTableSort;
