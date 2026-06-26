import PropTypes from 'prop-types';
import { Grid, Stack, Typography } from '@mui/material';
import BadgeTwoToneIcon from '@mui/icons-material/BadgeTwoTone';
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';
import CountryLabel from 'src/components/CountryLabel';
import CopyableLink from 'src/components/CopyableLink';
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
  const caption = (
    <Stack direction="row" alignItems="center" gap={0.75} component="span">
      <Typography variant="caption" color="text.secondary" component="span">
        #{identity.id} ·
      </Typography>
      <CountryLabel country={identity.country} flagHeight={12} variant="caption" />
    </Stack>
  );
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
        <DetailField label="Country" icon={PublicTwoToneIcon}>
          <CountryLabel country={identity.country} variant="body1" />
        </DetailField>
        <DetailField label="City/State" value={identity.city_state || '—'} icon={HomeTwoToneIcon} />
        <DetailField label="Zipcode" value={identity.zipcode || '—'} icon={HomeTwoToneIcon} />
        <DetailField label="DOB" value={formatDetailDateOnly(identity.dob) || '—'} />
        <DetailField label="SSN" value={identity.ssn || '—'} />
        <DetailField label="Address" value={identity.address || '—'} xs={12} sm={12} icon={HomeTwoToneIcon} />
        <DetailField label="LinkedIn" icon={LinkTwoToneIcon} xs={12} sm={6}>
          <CopyableLink url={identity.linkedin} label="LinkedIn" maxWidth="100%" multiline />
        </DetailField>
        <DetailField label="GitHub" icon={LinkTwoToneIcon} xs={12} sm={6}>
          <CopyableLink url={identity.github} label="GitHub" maxWidth="100%" multiline />
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
