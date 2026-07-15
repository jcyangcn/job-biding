import PropTypes from 'prop-types';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import Label from 'src/components/Label';
import ProfileCopyCard from 'src/components/ProfileCopyCard';
import { formatDateTime } from 'src/utils/dateFormat';

function ProgressionEmailProfileRow({ profile, identity, stats, lastCheckedAt, onViewClick }) {
  const emailStats = {
    total: stats?.total || 0,
    humanInterviews: stats?.humanInterviews || 0,
    needAction: stats?.needAction || 0
  };

  return (
    <ProfileCopyCard
      profile={profile}
      identity={identity}
      showDetails={false}
      onClick={onViewClick}
      actions={
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-end', sm: 'center' }}
          spacing={1.5}
        >
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary" display="block">
              Last checked at
            </Typography>
            <Typography variant="body2" fontWeight={600} noWrap>
              {formatDateTime(lastCheckedAt) || 'Never'}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Label color="secondary">Total {emailStats.total}</Label>
            <Label color="success">Interviews {emailStats.humanInterviews}</Label>
            <Label color={emailStats.needAction > 0 ? 'warning' : 'secondary'}>
              Need action {emailStats.needAction}
            </Label>
          </Stack>

          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityTwoToneIcon />}
            onClick={onViewClick}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Manage Emails
          </Button>
        </Stack>
      }
    />
  );
}

ProgressionEmailProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  stats: PropTypes.shape({
    total: PropTypes.number,
    humanInterviews: PropTypes.number,
    needAction: PropTypes.number
  }),
  lastCheckedAt: PropTypes.string,
  onViewClick: PropTypes.func.isRequired
};

export default ProgressionEmailProfileRow;
