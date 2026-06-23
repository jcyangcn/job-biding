const PROFILE_ANSWER_FIELDS = [
  { key: 'language', label: 'Language?', placeholder: 'English' },
  { key: 'gender', label: 'Gender?', placeholder: 'Male' },
  { key: 'ethnicity', label: 'Ethnicity?', placeholder: 'White' },
  { key: 'veteran_status', label: 'Veteran status?', placeholder: 'No' },
  { key: 'disability', label: 'Disability?', placeholder: 'No' },
  {
    key: 'current_salary_expectation',
    label: 'Current salary & expectation?',
    placeholder: '8~12k$/month'
  },
  {
    key: 'authorized_in_job_country',
    label: 'Authorized in job country?',
    placeholder: 'yes'
  },
  {
    key: 'valid_driving_license',
    label: 'Valid driving license?',
    placeholder: 'yes'
  },
  {
    key: 'visa_sponsorship',
    label: 'Do you need visa sponsorship?',
    placeholder: 'no'
  },
  {
    key: 'date_available_for_work',
    label: 'Date available for work?',
    placeholder: 'asap'
  },
  {
    key: 'years_of_experience',
    label: 'How many years of professional experience?',
    placeholder: '12'
  },
  {
    key: 'desired_job_type',
    label: 'Desired job type Remote/Contract?',
    placeholder: 'only remote'
  }
];

const PREDEFINED_FIELD_MAP = Object.fromEntries(
  PROFILE_ANSWER_FIELDS.map((field) => [field.key, field])
);

export function getAnswerFieldLabel(key) {
  return PREDEFINED_FIELD_MAP[key]?.label || key.replace(/_/g, ' ');
}

export function getAnswerFieldPlaceholder(key) {
  return PREDEFINED_FIELD_MAP[key]?.placeholder || '';
}

function slugifyQuestion(text) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || `custom_${Date.now()}`;
}

export function buildEmptyAnswerItems() {
  return PROFILE_ANSWER_FIELDS.map((field) => ({
    id: field.key,
    key: field.key,
    question: field.label,
    answer: '',
    predefined: true
  }));
}

export function buildSampleAnswerItems() {
  return PROFILE_ANSWER_FIELDS.map((field) => ({
    id: field.key,
    key: field.key,
    question: field.label,
    answer: field.placeholder || '',
    predefined: true
  }));
}

export function answersToItems(answers = {}) {
  const items = buildEmptyAnswerItems().map((item) => ({
    ...item,
    answer: answers[item.key] || ''
  }));
  const usedKeys = new Set(items.map((item) => item.key));

  Object.entries(answers).forEach(([key, answer]) => {
    if (usedKeys.has(key)) return;
    items.push({
      id: key,
      key,
      question: getAnswerFieldLabel(key),
      answer: answer || '',
      predefined: false
    });
  });

  return items;
}

export function itemsToAnswers(items) {
  return items.reduce((acc, item) => {
    const question = item.question?.trim() || '';
    const answer = item.answer?.trim() || '';
    if (!question && !answer) return acc;

    const key = item.predefined
      ? item.key
      : slugifyQuestion(question || item.key || item.id);
    acc[key] = answer;
    return acc;
  }, {});
}

export function buildEmptyAnswers() {
  return PROFILE_ANSWER_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

export default PROFILE_ANSWER_FIELDS;
