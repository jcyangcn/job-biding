import PropTypes from 'prop-types';
import { Grid, Typography } from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import NotesTwoToneIcon from '@mui/icons-material/NotesTwoTone';
import TagTwoToneIcon from '@mui/icons-material/TagTwoTone';
import ProgressionEmailStatusLabel from './ProgressionEmailStatusLabel';
import ProgressionEmailTypeLabel from './ProgressionEmailTypeLabel';
import EmailLinkInfo from 'src/components/EmailLinkInfo';
import { isHumanInterviewType } from 'src/data/progressionEmailOptions';
import {
  DetailDialog,
  DetailField,
  DetailItem,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function ProgressionEmailDetailDialog({ open, email, onClose }) {
  if (!email) {
    return null;
  }

  const title = [email.reference_no, email.company?.trim()].filter(Boolean).join(' · ');
  const caption = [
    `#${email.id}`,
    formatDetailDate(email.email_date),
    isHumanInterviewType(email.type) ? 'Human interview' : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <DetailDialog
      open={open}
      onClose={onClose}
      title={title || 'Progression email'}
      caption={caption}
    >
      <Grid container spacing={2}>
        <DetailField label="Reference no" value={email.reference_no} icon={TagTwoToneIcon} />
        <DetailField label="Company" value={email.company || '—'} icon={BusinessTwoToneIcon} />
        <Grid item xs={12}>
          <EmailLinkInfo value={email.email_link} detailed />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailItem elevation={0}>
            <Typography variant="overline" color="text.secondary" display="block" mb={0.5}>
              Type
            </Typography>
            <ProgressionEmailTypeLabel type={email.type} />
          </DetailItem>
        </Grid>
        <Grid item xs={12} sm={6}>
          <DetailItem elevation={0}>
            <Typography variant="overline" color="text.secondary" display="block" mb={0.5}>
              Status
            </Typography>
            <ProgressionEmailStatusLabel status={email.status} />
          </DetailItem>
        </Grid>
        <DetailField label="Email date" icon={CalendarTodayTwoToneIcon}>
          <Typography variant="body1">{formatDetailDate(email.email_date) || '—'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Created {formatDetailDate(email.created_at) || '—'}
          </Typography>
        </DetailField>
      </Grid>

      <DetailTextSection
        title="Log"
        icon={NotesTwoToneIcon}
        text={email.log}
        emptyText="No log entries."
      />
    </DetailDialog>
  );
}

ProgressionEmailDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  email: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ProgressionEmailDetailDialog;
