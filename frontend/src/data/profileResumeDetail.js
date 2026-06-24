import { formatMonthYear } from 'src/utils/dateFormat';

export const WORK_METHOD_OPTIONS = [
  { value: 'Remote', label: 'Remote' },
  { value: 'Onsite', label: 'Onsite' },
  { value: 'Hybrid', label: 'Hybrid' }
];

export function emptyWorkExperience() {
  return {
    company_name: '',
    location: '',
    role: '',
    start_date: '',
    end_date: '',
    method: ''
  };
}

export function emptyEducation() {
  return {
    university_name: '',
    start_date: '',
    end_date: '',
    degree: ''
  };
}

export function emptyProject() {
  return {
    project_name: '',
    stack: ''
  };
}

export function emptyResumeDetail() {
  return {
    work_experience: [emptyWorkExperience()],
    education: [emptyEducation()],
    certifications: [''],
    projects: [emptyProject()]
  };
}

function normalizeMonthYear(value) {
  if (!value) return '';
  const text = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text.slice(0, 7);
  }
  if (/^\d{4}-\d{2}$/.test(text.slice(0, 7))) {
    return text.slice(0, 7);
  }
  return '';
}

function normalizeYear(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 4);
  if (/^\d{4}-\d{2}$/.test(text)) return text.slice(0, 4);
  return '';
}

function toApiMonthYearDate(value) {
  if (!value) return null;
  const monthYear = normalizeMonthYear(value);
  return monthYear ? `${monthYear}-01` : null;
}

function toApiYearDate(value) {
  if (!value) return null;
  const year = normalizeYear(value);
  return year ? `${year}-01-01` : null;
}

export function normalizeResumeDetail(value) {
  const source = value && typeof value === 'object' ? value : {};

  const workExperience = Array.isArray(source.work_experience)
    ? source.work_experience.map((item) => ({
        company_name: item?.company_name || '',
        location: item?.location || '',
        role: item?.role || '',
        start_date: normalizeMonthYear(item?.start_date),
        end_date: normalizeMonthYear(item?.end_date),
        method: item?.method || ''
      }))
    : [];

  const education = Array.isArray(source.education)
    ? source.education.map((item) => ({
        university_name: item?.university_name || '',
        start_date: normalizeYear(item?.start_date),
        end_date: normalizeYear(item?.end_date),
        degree: item?.degree || ''
      }))
    : [];

  const certifications = Array.isArray(source.certifications)
    ? source.certifications.map((item) => String(item || ''))
    : [];

  const projects = Array.isArray(source.projects)
    ? source.projects.map((item) => ({
        project_name: item?.project_name || '',
        stack: item?.stack || ''
      }))
    : [];

  return {
    work_experience: workExperience.length ? workExperience : [emptyWorkExperience()],
    education: education.length ? education : [emptyEducation()],
    certifications: certifications.length ? certifications : [''],
    projects: projects.length ? projects : [emptyProject()]
  };
}

export function formatMonthYearRange(startDate, endDate) {
  const start = startDate ? formatMonthYear(startDate) : '—';
  const end = endDate ? formatMonthYear(endDate) : '—';
  if (start === '—' && end === '—') return '—';
  return `${start} – ${end}`;
}

export function formatYearRange(startDate, endDate) {
  const start = normalizeYear(startDate);
  const end = normalizeYear(endDate);
  if (!start && !end) return '—';
  if (start && end) return `${start} – ${end}`;
  return start || end || '—';
}

export function formatResumeDetailSections(resumeDetail) {
  const detail = normalizeResumeDetail(resumeDetail);

  const work = detail.work_experience
    .filter((item) =>
      [item.company_name, item.location, item.role, item.method, item.start_date, item.end_date].some(
        Boolean
      )
    )
    .map((item, index) =>
      [
        `${index + 1}. ${item.company_name || 'Company'}`,
        item.role ? `Role: ${item.role}` : null,
        item.location ? `Location: ${item.location}` : null,
        item.method ? `Method: ${item.method}` : null,
        `Dates: ${formatMonthYearRange(item.start_date, item.end_date)}`
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');

  const education = detail.education
    .filter((item) =>
      [item.university_name, item.degree, item.start_date, item.end_date].some(Boolean)
    )
    .map((item, index) =>
      [
        `${index + 1}. ${item.university_name || 'University'}`,
        item.degree ? `Degree: ${item.degree}` : null,
        `Dates: ${formatYearRange(item.start_date, item.end_date)}`
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');

  const certifications = detail.certifications.filter(Boolean).join('\n');

  const projects = detail.projects
    .filter((item) => [item.project_name, item.stack].some(Boolean))
    .map((item, index) =>
      [`${index + 1}. ${item.project_name || 'Project'}`, item.stack ? `Stack: ${item.stack}` : null]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');

  return { work, education, certifications, projects };
}

export function serializeResumeDetailForApi(resumeDetail) {
  const normalized = normalizeResumeDetail(resumeDetail);

  return {
    work_experience: normalized.work_experience.map((item) => ({
      company_name: item.company_name.trim(),
      location: item.location.trim(),
      role: item.role.trim(),
      start_date: toApiMonthYearDate(item.start_date),
      end_date: toApiMonthYearDate(item.end_date),
      method: item.method.trim()
    })),
    education: normalized.education.map((item) => ({
      university_name: item.university_name.trim(),
      start_date: toApiYearDate(item.start_date),
      end_date: toApiYearDate(item.end_date),
      degree: item.degree.trim()
    })),
    certifications: normalized.certifications
      .map((item) => item.trim())
      .filter(Boolean),
    projects: normalized.projects.map((item) => ({
      project_name: item.project_name.trim(),
      stack: item.stack.trim()
    }))
  };
}
