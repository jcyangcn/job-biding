import PropTypes from 'prop-types';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Typography,
  useTheme
} from '@mui/material';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function ProgressionEmailProfileRow({ profile, onViewClick }) {
  const theme = useTheme();

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        px={2}
        py={1.5}
        flexWrap={{ xs: 'wrap', md: 'nowrap' }}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: theme.colors.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {getInitials(profile.identity_name)}
        </Avatar>

        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h5" noWrap>
              {profile.identity_name}
            </Typography>
            <Chip label="Active" color="success" size="small" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary" noWrap>
            {profile.roles || 'No roles listed'}
          </Typography>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mt={0.25}>
            <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
              <EmailTwoToneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {profile.email}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
              <WorkTwoToneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                Bidder: {profile.bidder_name}
                {profile.caller_name ? ` · Caller: ${profile.caller_name}` : ''}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" flexShrink={0}>
          <Button
            variant="contained"
            size="small"
            startIcon={<VisibilityTwoToneIcon />}
            onClick={onViewClick}
          >
            View
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

ProgressionEmailProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  onViewClick: PropTypes.func.isRequired
};

export default ProgressionEmailProfileRow;
