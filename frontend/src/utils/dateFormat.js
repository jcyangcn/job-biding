import { format, isValid, parseISO } from 'date-fns';

function parseDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const isoDate = parseISO(text);
    return isValid(isoDate) ? isoDate : null;
  }

  const isoParsed = parseISO(text);
  if (isValid(isoParsed)) return isoParsed;

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

export function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTime(value) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return format(date, 'yyyy-MM-dd HH:mm');
}

export function formatDateValue(value) {
  if (!value) return '';
  const formatted = formatDate(value);
  return formatted === '—' ? '' : formatted;
}

export function formatDateTimeValue(value) {
  if (!value) return '';
  const formatted = formatDateTime(value);
  return formatted === '—' ? '' : formatted;
}
