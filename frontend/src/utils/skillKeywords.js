function normalizeKeywordItem(entry) {
  if (entry == null) {
    return { item: '', weight: 1 };
  }
  if (typeof entry === 'string' || typeof entry === 'number') {
    return { item: String(entry).trim(), weight: 1 };
  }
  if (typeof entry === 'object') {
    const item = String(entry.item ?? entry.keyword ?? '').trim();
    const weightRaw = entry.weight;
    const weight =
      weightRaw == null || weightRaw === '' || Number.isNaN(Number(weightRaw))
        ? 1
        : Number(weightRaw);
    return { item, weight: weight < 0 ? 0 : weight };
  }
  return { item: '', weight: 1 };
}

function normalizeKeywordJsonText(text) {
  return String(text || '')
    .trim()
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
}

function stripFieldLabel(line) {
  return String(line || '')
    .trim()
    .replace(/\s*\(\s*\d+\s*\)\s*$/, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();
}

function splitSkillNames(line) {
  return String(line || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((entry) => {
    const key = entry.item.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function parseKeywordItems(raw) {
  if (raw == null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map(normalizeKeywordItem).filter((entry) => entry.item);
  }

  const text = String(raw).trim();
  if (!text) {
    return [];
  }

  try {
    return parseKeywordItems(JSON.parse(text));
  } catch {
    /* try lenient JSON */
  }

  try {
    return parseKeywordItems(JSON.parse(normalizeKeywordJsonText(text)));
  } catch {
    /* plain keyword string */
  }

  return [{ item: text, weight: 1 }];
}

export function serializeKeywordItems(items = []) {
  const cleaned = items
    .map((entry) => normalizeKeywordItem(entry))
    .filter((entry) => entry.item);

  return JSON.stringify(
    cleaned.map((entry) => ({
      item: entry.item,
      weight: entry.weight == null || entry.weight === '' ? 1 : Number(entry.weight)
    }))
  );
}

/**
 * Parse pasted skill blocks:
 *   Category name (25)
 *   JavaScript, TypeScript, React, ...
 */
export function parseSkillBulkText(text) {
  const fields = [];
  let currentField = null;

  String(text || '')
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const isHeader = /\(\s*\d+\s*\)\s*$/.test(line) || !line.includes(',');
      if (isHeader) {
        const fieldName = stripFieldLabel(line);
        if (!fieldName) {
          return;
        }
        currentField = { field: fieldName, items: [] };
        fields.push(currentField);
        return;
      }

      const names = splitSkillNames(line);
      if (!names.length) {
        return;
      }

      if (!currentField) {
        currentField = { field: 'General', items: [] };
        fields.push(currentField);
      }

      names.forEach((name) => {
        currentField.items.push({ item: name, weight: 1 });
      });
    });

  return fields
    .map((entry) => ({
      field: entry.field,
      items: dedupeItems(entry.items)
    }))
    .filter((entry) => entry.field && entry.items.length);
}

export function groupSkillsByRole(rows = []) {
  const fieldMap = new Map();

  rows.forEach((row) => {
    const role = String(row.role || '').trim() || 'Default';
    const field = String(row.field || '').trim() || 'General';
    const keyword = String(row.keyword || '').trim();
    if (!keyword) {
      return;
    }

    const key = `${role}\u0000${field}`;
    let group = fieldMap.get(key);
    if (!group) {
      group = { role, field, items: [] };
      fieldMap.set(key, group);
    }

    group.items.push({
      id: row.id,
      item: keyword,
      weight: row.weight == null || row.weight === '' ? 1 : Number(row.weight)
    });
  });

  const roleMap = new Map();
  fieldMap.forEach((group) => {
    group.items = dedupeItems(group.items);

    if (!roleMap.has(group.role)) {
      roleMap.set(group.role, []);
    }
    roleMap.get(group.role).push(group);
  });

  return Array.from(roleMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, fieldGroups]) => ({
      role,
      fields: fieldGroups.sort((left, right) => left.field.localeCompare(right.field))
    }));
}
