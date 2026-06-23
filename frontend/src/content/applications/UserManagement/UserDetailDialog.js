import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import PeopleTwoToneIcon from '@mui/icons-material/PeopleTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import { DetailDialog, DetailField, DetailTextSection } from 'src/components/DetailDialog';

const USER_ROLE_LABELS = {
  admin: 'Admin',
  bidder: 'Bidder',
  caller: 'Caller'
};

function UserDetailDialog({ open, user, onClose }) {
  if (!user) {
    return null;
  }

  const title = user.full_name || user.username || 'User details';
  const caption = `#${user.id} · @${user.username}`;

  return (
    <DetailDialog open={open} onClose={onClose} title={title} caption={caption} maxWidth="sm">
      <Grid container spacing={2}>
        <DetailField label="Full name" value={user.full_name} icon={PersonTwoToneIcon} />
        <DetailField label="Username" value={user.username} icon={PeopleTwoToneIcon} />
        <DetailField
          label="Role"
          value={USER_ROLE_LABELS[user.role] || user.role}
          icon={PeopleTwoToneIcon}
        />
      </Grid>

      <DetailTextSection
        title="Description"
        icon={PeopleTwoToneIcon}
        text={user.description}
        emptyText="No description provided."
      />
    </DetailDialog>
  );
}

UserDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default UserDetailDialog;
