export function matchesSearch(row, query, fields) {
  if (!query?.trim()) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  return fields.some((field) => {
    const value = typeof field === 'function' ? field(row) : row[field];
    if (value == null) {
      return false;
    }
    return String(value).toLowerCase().includes(normalized);
  });
}

export function matchesDateRange(dateValue, from, to) {
  if (!from && !to) {
    return true;
  }
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (date < start) {
      return false;
    }
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) {
      return false;
    }
  }

  return true;
}

export const EMPTY_FILTER_VALUE = '__all__';

export function matchesSelectFilter(value, selected, emptyValue = '') {
  if (!selected || selected === EMPTY_FILTER_VALUE) {
    return true;
  }

  const normalized =
    value == null || String(value).trim() === '' ? emptyValue : String(value).trim();
  return normalized === selected;
}

export function uniqueFieldValues(rows, field, { emptyValue = '' } = {}) {
  const values = new Set();
  rows.forEach((row) => {
    const raw = row[field];
    const normalized =
      raw == null || String(raw).trim() === '' ? emptyValue : String(raw).trim();
    values.add(normalized);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
