import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function profileName(profile) {
  if (!profile || typeof profile !== 'object') return '—';
  return profile.name || '—';
}

function ResumeGenerationDetailDialog({ open, generation, onClose }) {
  if (!generation) {
    return null;
  }

  const title = profileName(generation.profile);
  const caption = `#${generation.id} · ${formatDetailDate(generation.created_at) || '—'}`;

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Candidate" value={profileName(generation.profile)} icon={PersonTwoToneIcon} />
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
      </Grid>

      <DetailTextSection
        title="Job details"
        icon={DescriptionTwoToneIcon}
        text={generation.job_details}
        emptyText="No job details provided."
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
