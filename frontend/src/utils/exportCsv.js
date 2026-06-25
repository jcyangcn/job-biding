function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ];
  return lines.join('\r\n');
}

export function downloadCsv(filename, headers, rows) {
  const csv = buildCsv(headers, rows);
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function sanitizeCsvFilename(filename) {
  const safeName = (filename || 'export.csv').replace(/[\\/:*?"<>|]+/g, '_').trim();
  if (!safeName) return 'export.csv';
  return /\.csv$/i.test(safeName) ? safeName : `${safeName}.csv`;
}
