import { formatDateTime } from 'src/utils/dateFormat';

export const PROGRESSION_EMAIL_CSV_HEADERS = [
  'Profile ID',
  'Profile',
  'Reference no',
  'Company',
  'Type',
  'Email link',
  'Email date',
  'Status',
  'Log'
];

export function buildProgressionEmailExportRows(rows) {
  return rows.map((row) => [
    row.profile_id ?? '',
    row.profile_label || '',
    row.reference_no || '',
    row.company || '',
    row.type || '',
    row.email_link || '',
    row.email_date ? formatDateTime(row.email_date) : '',
    row.status || '',
    row.log || ''
  ]);
}
