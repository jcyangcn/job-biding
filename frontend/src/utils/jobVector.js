/**
 * Build job_vector scores from a job description and skill keywords.
 *
 * Keyword source: skill.keyword JSON → array of { item, weight } → use item.
 * Match: case-insensitive substring include.
 * Scoring:
 *   0 mentions → 0
 *   1 → 1.0
 *   2 → 1.5
 *   3 → 2.0
 *   4+ → 2.5
 */

export function mentionScore(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1.0;
  if (count === 2) return 1.5;
  if (count === 3) return 2.0;
  return 2.5;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function countMentions(jobDescription, keyword) {
  const text = String(keyword || '').trim();
  if (!text) return 0;
  const pattern = new RegExp(escapeRegExp(text), 'gi');
  const matches = String(jobDescription || '').match(pattern);
  return matches ? matches.length : 0;
}

export function buildJobVector(jobDescription, keywords = []) {
  return keywords.map((keyword) => mentionScore(countMentions(jobDescription, keyword)));
}

function entryToKeyword(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string' || typeof entry === 'number') {
    return String(entry).trim();
  }
  if (typeof entry === 'object') {
    if (entry.item != null && String(entry.item).trim()) {
      return String(entry.item).trim();
    }
    if (entry.keyword != null && String(entry.keyword).trim()) {
      return String(entry.keyword).trim();
    }
  }
  return '';
}

/** Turn JS-object-like skill keyword text into JSON-parseable text when needed. */
function normalizeKeywordJsonText(text) {
  let normalized = String(text || '').trim();
  if (!normalized) return '';
  // Quote bare keys: {item : "react", weight:1} → {"item":"react","weight":1}
  normalized = normalized.replace(
    /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,
    '$1"$2":'
  );
  return normalized;
}

function extractItemsByRegex(text) {
  const keywords = [];
  const pattern = /\bitem\s*:\s*"([^"]+)"/gi;
  let match = pattern.exec(text);
  while (match) {
    const value = String(match[1] || '').trim();
    if (value) keywords.push(value);
    match = pattern.exec(text);
  }
  return keywords;
}

export function parseKeywordEntries(raw) {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map(entryToKeyword).filter(Boolean);
  }

  if (typeof raw === 'object') {
    if (Array.isArray(raw.items)) {
      return raw.items.map(entryToKeyword).filter(Boolean);
    }
    if (Array.isArray(raw.keywords)) {
      return raw.keywords.map(entryToKeyword).filter(Boolean);
    }
    const single = entryToKeyword(raw);
    return single ? [single] : [];
  }

  const text = String(raw).trim();
  if (!text) return [];

  try {
    return parseKeywordEntries(JSON.parse(text));
  } catch {
    /* try lenient key quoting */
  }

  try {
    return parseKeywordEntries(JSON.parse(normalizeKeywordJsonText(text)));
  } catch {
    /* fall through to regex */
  }

  const fromRegex = extractItemsByRegex(text);
  if (fromRegex.length) {
    return fromRegex;
  }

  return [text];
}

export function flattenSkillKeywords(skills = []) {
  const keywords = [];
  skills.forEach((skill) => {
    keywords.push(...parseKeywordEntries(skill.keyword));
  });
  return keywords;
}
