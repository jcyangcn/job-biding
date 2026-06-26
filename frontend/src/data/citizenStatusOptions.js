export const CITIZEN_STATUSES = [
  { value: 'Good', label: 'Good' },
  { value: 'Bad', label: 'Bad' },
  { value: 'None', label: 'None' }
];

export const DEFAULT_CITIZEN_STATUS = 'None';

export function getCitizenStatusColor(status) {
  switch (status) {
    case 'Good':
      return 'success';
    case 'Bad':
      return 'error';
    case 'None':
    default:
      return 'secondary';
  }
}

export function formatCitizenStatus(status) {
  return CITIZEN_STATUSES.find((item) => item.value === status)?.label || status || 'None';
}
