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

export function buildEmptyAnswers() {
  return PROFILE_ANSWER_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
}

export default PROFILE_ANSWER_FIELDS;
