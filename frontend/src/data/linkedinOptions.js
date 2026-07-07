export const LINKEDIN_PROVIDERS = [
  { value: 'proxyo.io', label: 'proxyo.io' },
  { value: 'ixbrowser', label: 'ixbrowser' },
  { value: 'iproyal', label: 'iproyal' }
];

export const LINKEDIN_STATUSES = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Created', label: 'Created' },
  { value: 'Secured', label: 'Secured' },
  { value: 'Renting', label: 'Renting' },
  { value: 'Suspended', label: 'Suspended' }
];

export const LINKEDIN_NEED_ACTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Need Reverify', label: 'Need Reverify' }
];

export const DEFAULT_LINKEDIN_STATUS = 'Pending';
export const DEFAULT_LINKEDIN_NEED_ACTION = 'None';

export function getLinkedInStatusColor(status) {
  switch (status) {
    case 'Created':
      return 'info';
    case 'Secured':
      return 'success';
    case 'Renting':
      return 'warning';
    case 'Suspended':
      return 'error';
    case 'Pending':
    default:
      return 'secondary';
  }
}
