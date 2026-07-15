import PropTypes from 'prop-types';
import { Button, Stack } from '@mui/material';
import QuizTwoToneIcon from '@mui/icons-material/QuizTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import Label from 'src/components/Label';
import ProfileCopyCard from 'src/components/ProfileCopyCard';

function ApplicationProfileRow({ profile, identity, stats, onQaClick, onViewClick }) {
  const applicationStats = {
    total: stats?.total || 0,
    applied: stats?.applied || 0,
    notApplied: stats?.notApplied || 0
  };

  return (
    <ProfileCopyCard
      profile={profile}
      identity={identity}
      onClick={onViewClick}
      subtitle={profile.email}
      actions={
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Label color="secondary">Total {applicationStats.total}</Label>
          <Label color="success">Applied {applicationStats.applied}</Label>
          <Label color={applicationStats.notApplied > 0 ? 'warning' : 'secondary'}>
            Not applied {applicationStats.notApplied}
          </Label>
          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityTwoToneIcon />}
            onClick={onViewClick}
          >
            Manage Application
          </Button>
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
        </Stack>
      }
    />
  );
}

ApplicationProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  stats: PropTypes.shape({
    total: PropTypes.number,
    applied: PropTypes.number,
    notApplied: PropTypes.number
  }),
  onQaClick: PropTypes.func.isRequired,
  onViewClick: PropTypes.func.isRequired
};

export default ApplicationProfileRow;
