import { formatDateTime } from 'src/utils/dateFormat';

export const APPLICATION_CSV_HEADERS = [
  'Profile ID',
  'Profile',
  'Role',
  'Company',
  'Link',
  'Job description',
  'Resume generated ID',
  'Resume online link',
  'Applied',
  'Applied at'
];

export function buildApplicationExportRows(rows) {
  return rows.map((row) => [
    row.profile_id ?? '',
    row.profile_label || '',
    row.role || '',
    row.company || '',
    row.link || '',
    row.job_description || '',
    row.resume_generated_id ?? '',
    row.resume_online_link || '',
    row.applied ? 'true' : 'false',
    row.applied_at ? formatDateTime(row.applied_at) : ''
  ]);
}
