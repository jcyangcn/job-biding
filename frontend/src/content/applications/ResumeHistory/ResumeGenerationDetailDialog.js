import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
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

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Candidate" value={profileLabel(generation)} icon={PersonTwoToneIcon} />
        <DetailField
          label="Created"
          value={formatDetailDate(generation.created_at) || '—'}
          icon={CalendarTodayTwoToneIcon}
        />
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
        title="Job details"
        icon={DescriptionTwoToneIcon}
        text={generation.job_details}
        emptyText="No job details provided."
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
