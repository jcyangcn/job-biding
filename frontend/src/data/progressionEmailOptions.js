export const PROGRESSION_EMAIL_TYPES = [
  { value: 'human_interview', label: 'Human interview' },
  { value: 'technical_assignment', label: 'Technical assignment' },
  { value: 'test_task', label: 'Test Task' },
  { value: 'submit_availability', label: 'Submit Availability' }
];

export const PROGRESSION_EMAIL_STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'done', label: 'Done' },
  { value: 'waiting_reply', label: 'Waiting reply' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'decided_not_to_process', label: 'Decided not to process' }
];

export function formatProgressionEmailType(value) {
  return PROGRESSION_EMAIL_TYPES.find((item) => item.value === value)?.label || value;
}

export function isHumanInterviewType(value) {
  return value === 'human_interview';
}

export function getProgressionEmailTypeColor(value) {
  switch (value) {
    case 'human_interview':
      return 'success';
    case 'technical_assignment':
      return 'primary';
    case 'test_task':
      return 'warning';
    case 'submit_availability':
      return 'info';
    default:
      return 'secondary';
  }
}

export function formatProgressionEmailStatus(value) {
  return PROGRESSION_EMAIL_STATUSES.find((item) => item.value === value)?.label || value;
}

export function getProgressionEmailStatusColor(value) {
  switch (value) {
    case 'received':
      return 'info';
    case 'assigned':
      return 'primary';
    case 'waiting_reply':
      return 'warning';
    case 'done':
      return 'success';
    case 'rejected':
      return 'error';
    case 'decided_not_to_process':
      return 'secondary';
    default:
      return 'secondary';
  }
}
