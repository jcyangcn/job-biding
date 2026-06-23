import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import PersonPinTwoToneIcon from '@mui/icons-material/PersonPinTwoTone';
import PhoneTwoToneIcon from '@mui/icons-material/PhoneTwoTone';
import TagTwoToneIcon from '@mui/icons-material/TagTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import Label from 'src/components/Label';
import { DetailDialog, DetailField, formatDetailDate } from 'src/components/DetailDialog';

function ProfileDetailDialog({ open, profile, onClose }) {
  if (!profile) {
    return null;
  }

  const title = profile.identity_name || 'Profile details';
  const caption = `#${profile.id} · ${profile.email}`;

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
      <Grid container spacing={2}>
        <DetailField label="Identity" value={profile.identity_name} icon={PersonPinTwoToneIcon} />
        <DetailField label="Bidder" value={profile.bidder_name} icon={WorkTwoToneIcon} />
        <DetailField label="Caller" value={profile.caller_name || '—'} icon={WorkTwoToneIcon} />
        <DetailField label="Roles" value={profile.roles || '—'} icon={WorkTwoToneIcon} />
        <DetailField label="Reference tag" value={profile.reference_tag || '—'} icon={TagTwoToneIcon} />
        <DetailField label="Email" value={profile.email} icon={EmailTwoToneIcon} />
        <DetailField label="Email password" value={profile.email_password} icon={EmailTwoToneIcon} />
        <DetailField label="Phone" value={profile.phone || '—'} icon={PhoneTwoToneIcon} />
        <DetailField label="Proxy" value={profile.proxy || '—'} xs={12} sm={12} />
        <DetailField label="Active">
          <Label color={profile.is_active ? 'success' : 'error'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </Label>
        </DetailField>
        <DetailField label="Created" value={formatDetailDate(profile.created_at) || '—'} />
      </Grid>
    </DetailDialog>
  );
}

ProfileDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  profile: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ProfileDetailDialog;
