/**
 * Build query string for paginated list APIs.
 * @param {Record<string, string|number|boolean|null|undefined>} params
 */
export function buildListQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Normalize list options from useServerTable into API query fields.
 */
export function toListQueryParams(options = {}) {
  const filters = options.filters || {};
  const params = {
    page: options.page ?? 1,
    page_size: options.pageSize ?? 10,
    search: options.search || undefined,
    date_from: options.dateFrom || undefined,
    date_to: options.dateTo || undefined,
    sort_by: options.sortBy || undefined,
    sort_dir: options.sortDir || undefined
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === '__all__') {
      return;
    }
    params[key] = value;
  });

  return params;
}
