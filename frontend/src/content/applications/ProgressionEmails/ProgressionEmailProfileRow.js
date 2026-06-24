import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import ProfileIdentityCard from 'src/components/ProfileIdentityCard';

function ProgressionEmailProfileRow({ profile, identity, onViewClick }) {
  return (
    <ProfileIdentityCard
      profile={profile}
      identity={identity}
      actions={
        <Button
          variant="contained"
          size="small"
          startIcon={<VisibilityTwoToneIcon />}
          onClick={onViewClick}
        >
          View
        </Button>
      }
    />
  );
}

ProgressionEmailProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  onViewClick: PropTypes.func.isRequired
};

export default ProgressionEmailProfileRow;
