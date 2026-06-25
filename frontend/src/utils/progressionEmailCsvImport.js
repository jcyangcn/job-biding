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

function hasCsvHeader(headerIndex, ...headerNames) {
  return headerNames.some(
    (headerName) => headerIndex[normalizeHeaderName(headerName)] !== undefined
  );
}

function resolveProfileId({
  profileIdRaw,
  profileLabel,
  defaultProfileId,
  profileLabelToId,
  needsProfileResolution
}) {
  if (defaultProfileId) {
    return { profileId: defaultProfileId };
  }

  if (profileIdRaw) {
    const parsed = Number(profileIdRaw);
    if (!Number.isFinite(parsed)) {
      return { error: `Invalid profile ID "${profileIdRaw}"` };
    }
    return { profileId: parsed };
  }

  if (!needsProfileResolution) {
    return { profileId: null };
  }

  if (!profileLabel) {
    return { profileId: null };
  }

  const profileId = profileLabelToId[profileLabel] ?? null;
  if (!profileId) {
    return { error: `Unknown profile "${profileLabel}"` };
  }

  return { profileId };
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
  const hasEmailLinkColumn =
    hasCsvHeader(headerIndex, 'Email link', 'Email Link') ||
    hasCsvHeader(headerIndex, 'Email');
  const hasEmailDateColumn = hasCsvHeader(headerIndex, 'Email date', 'Email Date');
  const missingHeaders = [];

  if (!hasCsvHeader(headerIndex, 'Company')) missingHeaders.push('Company');
  if (!hasCsvHeader(headerIndex, 'Type')) missingHeaders.push('Type');
  if (!hasEmailLinkColumn) missingHeaders.push('Email link');
  if (!hasEmailDateColumn) missingHeaders.push('Email date');
  if (!hasCsvHeader(headerIndex, 'Status')) missingHeaders.push('Status');

  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  const needsProfileResolution = !defaultProfileId;
  const hasProfileIdColumn = hasCsvHeader(headerIndex, 'Profile ID');
  const hasProfileLabelColumn = hasCsvHeader(headerIndex, 'Profile');

  if (needsProfileResolution && !hasProfileIdColumn && !hasProfileLabelColumn) {
    throw new Error('Missing required column: Profile ID or Profile');
  }

  if (
    hasProfileColumn &&
    !defaultProfileId &&
    !hasProfileIdColumn &&
    !hasProfileLabelColumn
  ) {
    throw new Error('Missing required column: Profile ID or Profile');
  }

  return records.map((record, index) => {
    const rowNumber = index + 2;
    const referenceNo = getRecordField(record, 'Reference no', 'Reference No');
    const company = getRecordField(record, 'Company');
    const typeValue = getRecordField(record, 'Type');
    const emailLink = getRecordField(record, 'Email link', 'Email Link', 'Email');
    const emailDateValue = getRecordField(record, 'Email date', 'Email Date');
    const statusValue = getRecordField(record, 'Status');
    const log = getRecordField(record, 'Log');
    const profileIdRaw = getRecordField(record, 'Profile ID', 'Profile Id');
    const profileLabel = getRecordField(record, 'Profile');

    if (
      !referenceNo &&
      !company &&
      !typeValue &&
      !emailLink &&
      !emailDateValue &&
      !statusValue &&
      !profileIdRaw
    ) {
      return { rowNumber, error: 'Empty row' };
    }

    if (!company) {
      return { rowNumber, error: 'Company is required' };
    }

    if (!emailLink) {
      return { rowNumber, error: 'Email link is required' };
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

    const profileResult = resolveProfileId({
      profileIdRaw,
      profileLabel,
      defaultProfileId,
      profileLabelToId,
      needsProfileResolution
    });

    if (profileResult.error) {
      return { rowNumber, error: profileResult.error };
    }

    if (!profileResult.profileId) {
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
        profile_id: profileResult.profileId,
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
