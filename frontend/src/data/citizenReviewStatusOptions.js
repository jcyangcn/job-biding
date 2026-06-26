export const CITIZEN_REVIEW_STATUSES = [
  { value: 'Good', label: 'Good' },
  { value: 'Bad', label: 'Bad' },
  { value: 'None', label: 'None' }
];

export const DEFAULT_CITIZEN_REVIEW_STATUS = 'None';

export function getCitizenReviewStatusColor(status) {
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

export function formatCitizenReviewStatus(status) {
  return CITIZEN_REVIEW_STATUSES.find((item) => item.value === status)?.label || status || 'None';
}
