import { isValid, parse, parseISO } from 'date-fns';
import {
  buildCsvHeaderIndex,
  csvRowsToRecords,
  parseCsv
} from 'src/utils/parseCsv';

const GENERATED_RESUME_PATTERN = /^Generated\s+#(\d+)$/i;

const APPLIED_DATE_FORMATS = ['yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];

function tryParseAppliedDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const parsedFromFormat = APPLIED_DATE_FORMATS.map((dateFormat) =>
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

export function parseResumeImportValue(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') {
    return { resume_generated_id: null, resume_online_link: null };
  }

  const generatedMatch = text.match(GENERATED_RESUME_PATTERN);
  if (generatedMatch) {
    return {
      resume_generated_id: Number(generatedMatch[1]),
      resume_online_link: null
    };
  }

  return { resume_generated_id: null, resume_online_link: text };
}

export function parseAppliedImportValue(value) {
  const text = String(value ?? '').trim();
  if (!text || /^not applied$/i.test(text) || text === '—') {
    return { applied: false, applied_at: null };
  }

  const parsed = tryParseAppliedDate(text);
  return {
    applied: true,
    applied_at: (parsed || new Date()).toISOString()
  };
}

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

export function parseApplicationCsv(text, options = {}) {
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
  const requiredHeaders = ['Role', 'Company', 'Link', 'Resume', 'Applied'];
  const missingHeaders = requiredHeaders.filter(
    (header) => headerIndex[header.toLowerCase()] === undefined
  );

  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  if (hasProfileColumn && !defaultProfileId && headerIndex.profile === undefined) {
    throw new Error('Missing required column: Profile');
  }

  return records.map((record, index) => {
    const rowNumber = index + 2;
    const role = getRecordField(record, 'Role');
    const company = getRecordField(record, 'Company');
    const link = getRecordField(record, 'Link');
    const resume = getRecordField(record, 'Resume');
    const appliedValue = getRecordField(record, 'Applied');
    const jobDescription = getRecordField(record, 'Job description', 'Job Description');
    const profileLabel = getRecordField(record, 'Profile');

    if (!role && !company && !link && !resume && !appliedValue) {
      return { rowNumber, error: 'Empty row' };
    }

    if (!link) {
      return { rowNumber, error: 'Link is required' };
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

    const resumeFields = parseResumeImportValue(resume);
    const appliedFields = parseAppliedImportValue(appliedValue);

    return {
      rowNumber,
      payload: {
        profile_id: profileId,
        role,
        company,
        link,
        job_description: jobDescription,
        resume_generated_id: resumeFields.resume_generated_id,
        resume_online_link: resumeFields.resume_online_link,
        applied: appliedFields.applied,
        applied_at: appliedFields.applied_at
      }
    };
  });
}

function appendImportFailure(state, rowNumber, message) {
  return {
    created: state.created,
    failed: state.failed + 1,
    firstError: state.firstError || `Row ${rowNumber}: ${message}`
  };
}

export function importJobApplicationsSequentially(parsedRows, createApplication) {
  return parsedRows.reduce(
    (chain, row) =>
      chain.then((state) => {
        if (row.error) {
          return appendImportFailure(state, row.rowNumber, row.error);
        }

        return createApplication(row.payload)
          .then(() => ({
            created: state.created + 1,
            failed: state.failed,
            firstError: state.firstError
          }))
          .catch((err) =>
            appendImportFailure(
              state,
              row.rowNumber,
              err.message || 'Import failed'
            )
          );
      }),
    Promise.resolve({ created: 0, failed: 0, firstError: '' })
  );
}
