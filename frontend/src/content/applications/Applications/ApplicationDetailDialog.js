import PropTypes from 'prop-types';
import { Grid, Link, Typography } from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PersonPinTwoToneIcon from '@mui/icons-material/PersonPinTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function ApplicationDetailDialog({ open, application, onClose }) {
  if (!application) {
    return null;
  }

  const company = application.company?.trim();
  const role = application.role?.trim();
  const title = [company, role].filter(Boolean).join(' · ') || 'Application details';
  const caption = `#${application.id}${
    formatDetailDate(application.applied_at) ? ` · ${formatDetailDate(application.applied_at)}` : ''
  }`;
  const hasJobLink = Boolean(application.link?.trim());
  const hasResumeLink = Boolean(application.resume_online_link?.trim());
  const hasGeneratedResume = Boolean(application.resume_generated_id);

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField
          label="Company"
          value={application.company?.trim() || '—'}
          icon={BusinessTwoToneIcon}
        />
        <DetailField label="Role" value={application.role?.trim() || '—'} icon={WorkTwoToneIcon} />
        <DetailField
          label="Bidder"
          value={application.bidder_name?.trim() || application.bidder_username?.trim() || '—'}
          icon={PersonPinTwoToneIcon}
        />
        <DetailField label="Applied" icon={CalendarTodayTwoToneIcon}>
          <Typography variant="body1">
            {application.applied
              ? formatDetailDate(application.applied_at) || '—'
              : 'Not applied'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Created {formatDetailDate(application.created_at) || '—'}
          </Typography>
        </DetailField>
        <DetailField label="Resume" icon={PictureAsPdfTwoToneIcon}>
          {hasGeneratedResume ? (
            <Typography variant="body1">Generated resume #{application.resume_generated_id}</Typography>
          ) : hasResumeLink ? (
            <Link
              href={application.resume_online_link}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ wordBreak: 'break-all' }}
            >
              Online resume
            </Link>
          ) : (
            <Typography variant="body1">—</Typography>
          )}
        </DetailField>
        <DetailField label="Job link" icon={LinkTwoToneIcon} xs={12} sm={12}>
          {hasJobLink ? (
            <Link
              href={application.link}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ wordBreak: 'break-all', display: 'inline-block', mt: 0.5 }}
            >
              {application.link}
            </Link>
          ) : (
            <Typography variant="body1">—</Typography>
          )}
        </DetailField>
      </Grid>

      <DetailTextSection
        title="Job description"
        icon={DescriptionTwoToneIcon}
        text={application.job_description}
        emptyText="No job description provided."
      />
    </DetailDialog>
  );
}

ApplicationDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  application: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ApplicationDetailDialog;
