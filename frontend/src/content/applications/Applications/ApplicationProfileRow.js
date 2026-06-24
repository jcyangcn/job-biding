import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import QuizTwoToneIcon from '@mui/icons-material/QuizTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import ProfileIdentityCard from 'src/components/ProfileIdentityCard';

function ApplicationProfileRow({ profile, identity, onQaClick, onViewClick }) {
  return (
    <ProfileIdentityCard
      profile={profile}
      identity={identity}
      actions={
        <>
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<QuizTwoToneIcon />}
            onClick={onQaClick}
            disabled={!identity}
          >
            QA
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityTwoToneIcon />}
            onClick={onViewClick}
          >
            View
          </Button>
        </>
      }
    />
  );
}

ApplicationProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  onQaClick: PropTypes.func.isRequired,
  onViewClick: PropTypes.func.isRequired
};

export default ApplicationProfileRow;
