import { useCallback, useEffect, useMemo, useState } from 'react';

export const DEFAULT_ROWS_PER_PAGE = 10;
export const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function useTablePagination(
  rows,
  {
    defaultLimit = DEFAULT_ROWS_PER_PAGE,
    rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS
  } = {}
) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(defaultLimit);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  useEffect(() => {
    if (page > 0 && page * limit >= rows.length) {
      setPage(Math.max(0, Math.ceil(rows.length / limit) - 1));
    }
  }, [rows.length, page, limit]);

  const paginatedRows = useMemo(
    () => rows.slice(page * limit, page * limit + limit),
    [rows, page, limit]
  );

  const handlePageChange = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((event) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  return {
    page,
    limit,
    paginatedRows,
    handlePageChange,
    handleLimitChange,
    rowsPerPageOptions,
    rowOffset: page * limit
  };
}

export default useTablePagination;
