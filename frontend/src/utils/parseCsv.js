export function stripCsvBom(text) {
  const value = String(text ?? '');
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const content = stripCsvBom(text);

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => String(value).trim()));
}

export function csvRowsToRecords(rows) {
  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => String(header).trim());
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    return record;
  });

  return { headers, records };
}

function normalizeHeaderName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function buildCsvHeaderIndex(headers) {
  const index = {};
  headers.forEach((header, position) => {
    index[normalizeHeaderName(header)] = position;
  });
  return index;
}

export function getCsvCell(row, headerIndex, ...headerNames) {
  const matchedName = headerNames.find(
    (name) => headerIndex[normalizeHeaderName(name)] !== undefined
  );
  if (matchedName === undefined) {
    return '';
  }
  const position = headerIndex[normalizeHeaderName(matchedName)];
  return String(row[position] ?? '').trim();
}
