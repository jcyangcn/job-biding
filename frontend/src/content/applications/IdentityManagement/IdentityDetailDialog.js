import PropTypes from 'prop-types';
import { Grid, Link, Typography } from '@mui/material';
import BadgeTwoToneIcon from '@mui/icons-material/BadgeTwoTone';
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';
import { getAnswerFieldLabel } from 'src/data/profileAnswerFields';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate,
  formatDetailDateOnly
} from 'src/components/DetailDialog';

function IdentityDetailDialog({ open, identity, onClose }) {
  if (!identity) {
    return null;
  }

  const title = identity.name || 'Identity details';
  const caption = `#${identity.id} · ${identity.country}`;
  const answerLines = Object.entries(identity.answers || {})
    .map(([key, value]) => {
      const trimmed = value?.trim();
      if (!trimmed) return null;
      return `${getAnswerFieldLabel(key)} ${trimmed}`;
    })
    .filter(Boolean)
    .join('\n');

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Name" value={identity.name} icon={BadgeTwoToneIcon} />
        <DetailField label="Country" value={identity.country} icon={PublicTwoToneIcon} />
        <DetailField label="City/State" value={identity.city_state || '—'} icon={HomeTwoToneIcon} />
        <DetailField label="Zipcode" value={identity.zipcode || '—'} icon={HomeTwoToneIcon} />
        <DetailField label="DOB" value={formatDetailDateOnly(identity.dob) || '—'} />
        <DetailField label="SSN" value={identity.ssn || '—'} />
        <DetailField label="Address" value={identity.address || '—'} xs={12} sm={12} icon={HomeTwoToneIcon} />
        <DetailField label="LinkedIn" icon={LinkTwoToneIcon} xs={12} sm={6}>
          {identity.linkedin ? (
            <Link href={identity.linkedin} target="_blank" rel="noopener noreferrer" underline="hover">
              {identity.linkedin}
            </Link>
          ) : (
            <Typography variant="body1">—</Typography>
          )}
        </DetailField>
        <DetailField label="GitHub" icon={LinkTwoToneIcon} xs={12} sm={6}>
          {identity.github ? (
            <Link href={identity.github} target="_blank" rel="noopener noreferrer" underline="hover">
              {identity.github}
            </Link>
          ) : (
            <Typography variant="body1">—</Typography>
          )}
        </DetailField>
        <DetailField label="Created" value={formatDetailDate(identity.created_at) || '—'} />
      </Grid>

      <DetailTextSection
        title="Answers"
        icon={BadgeTwoToneIcon}
        text={answerLines}
        emptyText="No answers provided."
      />
    </DetailDialog>
  );
}

IdentityDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  identity: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default IdentityDetailDialog;
