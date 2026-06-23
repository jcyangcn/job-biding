import { useCallback, useMemo, useState } from 'react';
import { EMPTY_FILTER_VALUE, matchesDateRange, matchesSearch, matchesSelectFilter } from 'src/utils/tableListFilters';

function useTableListFilters(rows, { searchFields, dateField, selects = [] }) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectValues, setSelectValues] = useState(() =>
    Object.fromEntries(selects.map((select) => [select.id, EMPTY_FILTER_VALUE]))
  );

  const setSelectValue = useCallback((id, value) => {
    setSelectValues((current) => ({ ...current, [id]: value }));
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSelects = selects.every((select) => {
          const raw = select.getValue ? select.getValue(row) : row[select.field];
          return matchesSelectFilter(raw, selectValues[select.id], select.emptyValue ?? '');
        });

        return (
          matchesSearch(row, search, searchFields) &&
          (dateField ? matchesDateRange(row[dateField], dateFrom, dateTo) : true) &&
          matchesSelects
        );
      }),
    [rows, search, dateFrom, dateTo, searchFields, dateField, selects, selectValues]
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectValues(Object.fromEntries(selects.map((select) => [select.id, EMPTY_FILTER_VALUE])));
  }, [selects]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      dateFrom ||
      dateTo ||
      selects.some((select) => selectValues[select.id] !== EMPTY_FILTER_VALUE)
  );

  return {
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectValues,
    setSelectValue,
    filteredRows,
    clearFilters,
    hasActiveFilters,
    showDateRange: Boolean(dateField)
  };
}

export default useTableListFilters;
