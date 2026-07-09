export const LINKEDIN_PROVIDERS = [
  { value: 'proxyo.io', label: 'proxyo.io' },
  { value: 'ixbrowser', label: 'ixbrowser' },
  { value: 'iproyal', label: 'iproyal' }
];

export const LINKEDIN_STATUSES = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Created', label: 'Created' },
  { value: 'Renting', label: 'Renting' },
  { value: 'Sold', label: 'Sold' },
  { value: 'Suspended', label: 'Suspended' }
];

export const LINKEDIN_NEED_ACTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Need Reverify', label: 'Need Reverify' },
  { value: 'Email out of control', label: 'Email out of control' }
];

export const DEFAULT_LINKEDIN_STATUS = 'Pending';
export const DEFAULT_LINKEDIN_NEED_ACTION = 'None';

export function isLinkedInNeedActionActive(needAction) {
  return Boolean(needAction && needAction !== 'None');
}

export function getLinkedInNeedActionColor(needAction) {
  switch (needAction) {
    case 'Need Reverify':
      return 'error';
    case 'Email out of control':
      return 'warning';
    default:
      return 'default';
  }
}

export function getLinkedInStatusColor(status) {
  switch (status) {
    case 'Created':
      return 'info';
    case 'Renting':
      return 'success';
    case 'Sold':
      return 'primary';
    case 'Suspended':
      return 'error';
    case 'Pending':
    default:
      return 'secondary';
  }
}
