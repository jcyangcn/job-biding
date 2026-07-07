import { format, isValid, parse, parseISO } from 'date-fns';

const DATETIME_INPUT_FORMAT = 'yyyy-MM-dd HH:mm';

function parseDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    const parsed = parse(text, DATETIME_INPUT_FORMAT, new Date());
    return isValid(parsed) ? parsed : null;
  }

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

export function appliedAtToIso(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  const fromFormat = parse(text, DATETIME_INPUT_FORMAT, new Date());
  if (isValid(fromFormat)) return fromFormat.toISOString();

  const date = parseDateValue(value);
  return date ? date.toISOString() : null;
}

export function formatMonthYear(value) {
  if (!value) return '—';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }
  const date = parseDateValue(value);
  if (!date) return '—';
  return format(date, 'yyyy-MM');
}
