import { isValid, parse, parseISO } from 'date-fns';
import {
  PROGRESSION_EMAIL_STATUSES,
  PROGRESSION_EMAIL_TYPES
} from 'src/data/progressionEmailOptions';
import { importJobApplicationsSequentially } from 'src/utils/applicationCsvImport';
import {
  buildCsvHeaderIndex,
  csvRowsToRecords,
  parseCsv
} from 'src/utils/parseCsv';

const EMAIL_DATE_FORMATS = ['yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];

function normalizeHeaderName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getRecordField(record, ...headerNames) {
  const match = headerNames
    .map((name) =>
      Object.entries(record).find(
        ([key]) => normalizeHeaderName(key) === normalizeHeaderName(name)
      )
    )
    .find(Boolean);

  return match ? String(match[1] ?? '').trim() : '';
}

function tryParseEmailDate(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') {
    return null;
  }

  const parsedFromFormat = EMAIL_DATE_FORMATS.map((dateFormat) =>
    parse(text, dateFormat, new Date())
  ).find((parsed) => isValid(parsed));
  if (parsedFromFormat) {
    return parsedFromFormat;
  }

  const isoParsed = parseISO(text.includes(' ') ? text.replace(' ', 'T') : text);
  if (isValid(isoParsed)) {
    return isoParsed;
  }

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

function resolveOptionValue(value, options) {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  const byValue = options.find((item) => item.value === text);
  if (byValue) {
    return byValue.value;
  }

  const normalized = text.toLowerCase();
  const byLabel = options.find((item) => item.label.toLowerCase() === normalized);
  return byLabel?.value ?? null;
}

function resolveProfileId({ profileLabel, defaultProfileId, profileLabelToId, hasProfileColumn }) {
  if (defaultProfileId) {
    return defaultProfileId;
  }

  if (!hasProfileColumn) {
    return null;
  }

  if (!profileLabel) {
    return null;
  }

  return profileLabelToId[profileLabel] ?? null;
}

export function parseProgressionEmailCsv(text, options = {}) {
  const {
    defaultProfileId = null,
    profileLabelToId = {},
    hasProfileColumn = false
  } = options;

  const matrix = parseCsv(text);
  const { headers, records } = csvRowsToRecords(matrix);

  if (!headers.length) {
    throw new Error('CSV file is empty');
  }

  const headerIndex = buildCsvHeaderIndex(headers);
  const requiredHeaders = ['Company', 'Type', 'Email', 'Email date', 'Status'];
  const missingHeaders = requiredHeaders.filter(
    (header) => headerIndex[normalizeHeaderName(header)] === undefined
  );

  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  if (hasProfileColumn && !defaultProfileId && headerIndex.profile === undefined) {
    throw new Error('Missing required column: Profile');
  }

  return records.map((record, index) => {
    const rowNumber = index + 2;
    const referenceNo = getRecordField(record, 'Reference no', 'Reference No');
    const company = getRecordField(record, 'Company');
    const typeValue = getRecordField(record, 'Type');
    const emailLink = getRecordField(record, 'Email', 'Email link', 'Email Link');
    const emailDateValue = getRecordField(record, 'Email date', 'Email Date');
    const statusValue = getRecordField(record, 'Status');
    const log = getRecordField(record, 'Log');
    const profileLabel = getRecordField(record, 'Profile');

    if (!referenceNo && !company && !typeValue && !emailLink && !emailDateValue && !statusValue) {
      return { rowNumber, error: 'Empty row' };
    }

    if (!company) {
      return { rowNumber, error: 'Company is required' };
    }

    if (!emailLink) {
      return { rowNumber, error: 'Email is required' };
    }

    const type = resolveOptionValue(typeValue, PROGRESSION_EMAIL_TYPES);
    if (!type) {
      return { rowNumber, error: `Unknown type "${typeValue}"` };
    }

    const status = resolveOptionValue(statusValue, PROGRESSION_EMAIL_STATUSES);
    if (!status) {
      return { rowNumber, error: `Unknown status "${statusValue}"` };
    }

    const emailDate = tryParseEmailDate(emailDateValue);
    if (!emailDate) {
      return { rowNumber, error: 'Email date is required' };
    }

    const profileId = resolveProfileId({
      profileLabel,
      defaultProfileId,
      profileLabelToId,
      hasProfileColumn: hasProfileColumn && !defaultProfileId
    });

    if (!profileId) {
      return {
        rowNumber,
        error: profileLabel
          ? `Unknown profile "${profileLabel}"`
          : 'Profile is required'
      };
    }

    return {
      rowNumber,
      payload: {
        profile_id: profileId,
        company,
        type,
        email_link: emailLink,
        email_date: emailDate.toISOString(),
        status,
        log
      }
    };
  });
}

export function importProgressionEmailsSequentially(parsedRows, createEmail) {
  return importJobApplicationsSequentially(parsedRows, createEmail);
}
