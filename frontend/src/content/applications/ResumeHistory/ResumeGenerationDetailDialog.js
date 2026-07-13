import PropTypes from 'prop-types';
import { Grid, Link } from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function profileLabel(generation) {
  if (!generation) return '—';
  if (generation.profile_label) return generation.profile_label;
  if (generation.profile_id != null) return `Profile #${generation.profile_id}`;
  return '—';
}

function jobPostLabel(generation) {
  if (!generation) return '—';
  const parts = [generation.company, generation.role].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (generation.post_id != null) return `Post #${generation.post_id}`;
  return '—';
}

function formatResumeContent(resumeContent) {
  if (!resumeContent || typeof resumeContent !== 'object') {
    return '';
  }

  const parts = [];
  if (resumeContent.summary) {
    parts.push(`Summary\n${resumeContent.summary}`);
  }

  const skills = resumeContent.skills || [];
  if (skills.length) {
    const skillLines = skills.map((skill) => {
      if (typeof skill === 'string') return `• ${skill}`;
      const label = skill?.label || 'Skills';
      const value = skill?.value || '';
      return `• ${label}: ${value}`;
    });
    parts.push(`Skills\n${skillLines.join('\n')}`);
  }

  const experience = resumeContent.experience || [];
  if (experience.length) {
    const jobBlocks = experience.map((job) => {
      const header = [job?.role, job?.company, job?.period].filter(Boolean).join(' · ');
      const bullets = (job?.bullets || []).map((bullet) => `  - ${bullet}`).join('\n');
      return `${header}${bullets ? `\n${bullets}` : ''}`;
    });
    parts.push(`Experience\n${jobBlocks.join('\n\n')}`);
  }

  return parts.join('\n\n');
}

function ResumeGenerationDetailDialog({ open, generation, onClose }) {
  if (!generation) {
    return null;
  }

  const title = profileLabel(generation);
  const caption = `#${generation.id} · ${formatDetailDate(generation.created_at) || '—'}`;
  const resumeText = formatResumeContent(generation.resume_content);
  const vectorText = Array.isArray(generation.resume_vector)
    ? generation.resume_vector.join(', ')
    : '';
  const hasJobUrl = Boolean(generation.url?.trim());

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Candidate" value={profileLabel(generation)} icon={PersonTwoToneIcon} />
        <DetailField
          label="Job post"
          value={jobPostLabel(generation)}
          icon={BusinessTwoToneIcon}
        />
        <DetailField
          label="Post ID"
          value={generation.post_id != null ? String(generation.post_id) : '—'}
          icon={WorkTwoToneIcon}
        />
        <DetailField
          label="Created"
          value={formatDetailDate(generation.created_at) || '—'}
          icon={CalendarTodayTwoToneIcon}
        />
        <DetailField label="Job URL" icon={LinkTwoToneIcon} xs={12} sm={12}>
          {hasJobUrl ? (
            <Link
              href={generation.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ wordBreak: 'break-all', display: 'inline-block', mt: 0.5 }}
            >
              {generation.url}
            </Link>
          ) : (
            '—'
          )}
        </DetailField>
        <DetailField
          label="PDF"
          value={generation.pdf_path || '—'}
          icon={PictureAsPdfTwoToneIcon}
          xs={12}
          sm={12}
        />
        <DetailField
          label="Resume vector"
          value={vectorText || '—'}
          icon={WorkTwoToneIcon}
          xs={12}
          sm={12}
        />
      </Grid>

      <DetailTextSection
        title="Job description"
        icon={DescriptionTwoToneIcon}
        text={generation.job_description}
        emptyText="No job description provided."
      />

      <DetailTextSection
        title="Resume content"
        icon={DescriptionTwoToneIcon}
        text={resumeText}
        emptyText="No resume content stored."
      />
    </DetailDialog>
  );
}

ResumeGenerationDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  generation: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ResumeGenerationDetailDialog;
