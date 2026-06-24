import { format, isValid, parseISO } from 'date-fns';
import { normalizeResumeDetail } from './profileResumeDetail';

function parseProfileDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  const parsed = parseISO(text);
  return isValid(parsed) ? parsed : null;
}

function formatMonthYearComma(value) {
  const date = parseProfileDate(value);
  if (!date) return '';
  return format(date, 'MMM, yyyy');
}

function formatExperiencePeriod(startDate, endDate) {
  const start = formatMonthYearComma(startDate);
  const end = formatMonthYearComma(endDate);
  if (!start && !end) return '';
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function formatYearOnly(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return text;
  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 4);
  const date = parseProfileDate(value);
  return date ? format(date, 'yyyy') : '';
}

function formatEducationPeriod(startDate, endDate) {
  const start = formatYearOnly(startDate);
  const end = formatYearOnly(endDate);
  if (!start && !end) return '';
  if (start && end) return `${start}-${end}`;
  return start || end;
}

function buildLocation(identity) {
  if (!identity) return '';
  return [identity.city_state, identity.country].filter(Boolean).join(', ');
}

function mapExperienceItem(item) {
  const mode = item.method || 'Remote';
  const period = formatExperiencePeriod(item.start_date, item.end_date);

  return {
    company: item.company_name || '',
    city: item.location || '',
    role: item.role || '',
    mode,
    period
  };
}

export function buildProfileJsonFromJobProfile(profile, identity) {
  const detail = normalizeResumeDetail(profile?.resume_detail);
  const experience = detail.work_experience
    .filter((item) =>
      [item.company_name, item.role, item.location, item.start_date, item.end_date].some(Boolean)
    )
    .map(mapExperienceItem);

  const educationRow =
    detail.education.find((item) =>
      [item.university_name, item.degree, item.start_date, item.end_date].some(Boolean)
    ) || detail.education[0];

  const education = {
    school: educationRow?.university_name || '',
    degree: educationRow?.degree || '',
    period: formatEducationPeriod(educationRow?.start_date, educationRow?.end_date)
  };

  const certifications = detail.certifications.filter(Boolean);
  const projects = detail.projects
    .filter((item) => [item.project_name, item.stack].some(Boolean))
    .map((item) => {
      if (item.project_name && item.stack) {
        return `${item.project_name} (${item.stack})`;
      }
      return item.project_name || item.stack || '';
    })
    .filter(Boolean);

  return {
    name: identity?.name || profile?.identity_name || '',
    title: profile?.roles || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    location: buildLocation(identity),
    linkedin: identity?.linkedin || '',
    portfolio: identity?.github || '',
    experience,
    education,
    certifications,
    projects
  };
}

export function buildProfileMarkdownFromJobProfile(profile, identity) {
  const content = buildProfileJsonFromJobProfile(profile, identity);
  const lines = ['## profile'];

  const addField = (label, value) => {
    if (value) {
      lines.push(`- ${label}`);
      lines.push(String(value));
    }
  };

  addField('Name', content.name);
  addField('Title', content.title);
  addField('Email', content.email);
  addField('Phone', content.phone);
  addField('Location', content.location);
  addField('Linkedin', content.linkedin);
  addField('Portfolio', content.portfolio);

  if (content.experience.length) {
    lines.push('- Work experience');
    content.experience.forEach((job) => {
      lines.push(`${job.company}:`);
      lines.push(job.city);
      lines.push(`${job.role} | ${job.mode} | ${job.period}`.trim());
    });
  }

  if (content.education.school || content.education.degree || content.education.period) {
    lines.push('- Education');
    lines.push(content.education.school);
    lines.push(
      `${content.education.degree}(left-aligned) ${content.education.period}(right-align)`.trim()
    );
  }

  if (content.certifications.length) {
    lines.push('- Certification');
    content.certifications.forEach((certification) => lines.push(certification));
  }

  if (content.projects.length) {
    lines.push('- Projects');
    content.projects.forEach((project) => lines.push(project));
  }

  return `${lines.join('\n')}\n`;
}

export function buildProfileContentFromJobProfile(profile, identity) {
  const jsonObject = buildProfileJsonFromJobProfile(profile, identity);

  return {
    markdown: buildProfileMarkdownFromJobProfile(profile, identity),
    json: JSON.stringify(jsonObject, null, 2)
  };
}
