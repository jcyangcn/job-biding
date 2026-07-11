import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_FILTER_VALUE } from 'src/utils/tableListFilters';
import {
  DEFAULT_ROWS_PER_PAGE,
  DEFAULT_ROWS_PER_PAGE_OPTIONS
} from 'src/hooks/useTablePagination';

/**
 * Server-driven table state: page/limit/filters/sort trigger refetch via `fetcher`.
 *
 * fetcher({ page, pageSize, search, dateFrom, dateTo, sortBy, sortDir, filters })
 *   => Promise<{ items, total }>
 */
function useServerTable({
  fetcher,
  enabled = true,
  defaultLimit = DEFAULT_ROWS_PER_PAGE,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
  defaultSort = null,
  selectIds = [],
  dateField = null,
  debounceMs = 300
}) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectValues, setSelectValues] = useState(() =>
    Object.fromEntries(selectIds.map((id) => [id, EMPTY_FILTER_VALUE]))
  );
  const [sortField, setSortField] = useState(defaultSort?.field ?? null);
  const [sortDirection, setSortDirection] = useState(defaultSort?.direction ?? 'asc');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, dateFrom, dateTo, selectValues, sortField, sortDirection, limit]);

  const setSelectValue = useCallback((id, value) => {
    setSelectValues((current) => ({ ...current, [id]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectValues(Object.fromEntries(selectIds.map((id) => [id, EMPTY_FILTER_VALUE])));
    setPage(0);
  }, [selectIds]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      dateFrom ||
      dateTo ||
      selectIds.some((id) => selectValues[id] !== EMPTY_FILTER_VALUE)
  );

  const handleSort = useCallback(
    (field) => {
      const key =
        typeof field === 'function' ? field.__sortKey || String(field) : field;
      if (sortField === key || sortField === field) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortField(typeof field === 'function' ? key : field);
      setSortDirection('asc');
    },
    [sortField]
  );

  const handlePageChange = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((event) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const refresh = useCallback((options = {}) => {
    setReloadToken((token) => token + 1);
    return options;
  }, []);

  const queryKey = useMemo(
    () => ({
      page,
      limit,
      debouncedSearch,
      dateFrom,
      dateTo,
      selectValues,
      sortField,
      sortDirection,
      reloadToken,
      enabled
    }),
    [
      page,
      limit,
      debouncedSearch,
      dateFrom,
      dateTo,
      selectValues,
      sortField,
      sortDirection,
      reloadToken,
      enabled
    ]
  );

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const silent = false;

    const load = async () => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const sortBy =
          typeof sortField === 'function'
            ? sortField.__sortKey || null
            : sortField;
        const result = await fetcherRef.current({
          page: page + 1,
          pageSize: limit,
          search: debouncedSearch,
          dateFrom,
          dateTo,
          sortBy,
          sortDir: sortDirection,
          filters: selectValues
        });
        if (cancelled) return;
        setRows(Array.isArray(result?.items) ? result.items : []);
        setTotal(Number(result?.total) || 0);
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setRows([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [queryKey, page, limit, debouncedSearch, dateFrom, dateTo, sortField, sortDirection, selectValues, enabled]);

  return {
    rows,
    setRows,
    total,
    loading,
    error,
    page,
    limit,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectValues,
    setSelectValue,
    clearFilters,
    hasActiveFilters,
    showDateRange: Boolean(dateField),
    sortField,
    sortDirection,
    handleSort,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    rowOffset: page * limit,
    refresh,
    paginatedRows: rows
  };
}

export default useServerTable;
