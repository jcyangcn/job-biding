import {
  alpha,
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  Divider,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import ChevronRightTwoToneIcon from '@mui/icons-material/ChevronRightTwoTone';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import PhoneTwoToneIcon from '@mui/icons-material/PhoneTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';

const CardWrapper = styled(Card)(
  ({ theme }) => `
  transition: ${theme.transitions.create(['box-shadow', 'transform'])};
  transform: translateY(0);

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 0.56875rem 3.3rem ${alpha(theme.colors.alpha.black[100], 0.05)},
      0 0.9975rem 2.4rem ${alpha(theme.colors.alpha.black[100], 0.07)},
      0 0.35rem 1rem ${alpha(theme.colors.alpha.black[100], 0.1)};
  }
`
);

const CardActionAreaWrapper = styled(CardActionArea)(
  () => `
  .MuiTouchRipple-root {
    opacity: 0.2;
  }
`
);

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function ProfileCard({ profile, onClick }) {
  const theme = useTheme();

  return (
    <CardWrapper variant="outlined">
      <CardActionAreaWrapper onClick={onClick}>
        <Box p={2.5}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between">
            <Box display="flex" alignItems="center" minWidth={0}>
              <Avatar
                sx={{
                  background: theme.colors.primary.main,
                  color: theme.palette.primary.contrastText,
                  width: 52,
                  height: 52,
                  fontWeight: 'bold',
                  boxShadow: `0 .113rem .5rem ${theme.colors.alpha.black[10]}`
                }}
              >
                {getInitials(profile.identity_name)}
              </Avatar>
              <Box ml={1.5} minWidth={0}>
                <Typography variant="h4" noWrap>
                  {profile.identity_name}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" noWrap>
                  {profile.roles || 'No roles listed'}
                </Typography>
              </Box>
            </Box>
            <ChevronRightTwoToneIcon color="action" />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <EmailTwoToneIcon fontSize="small" color="action" />
              <Typography variant="body2" noWrap>
                {profile.email}
              </Typography>
            </Box>
            {profile.phone ? (
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneTwoToneIcon fontSize="small" color="action" />
                <Typography variant="body2">{profile.phone}</Typography>
              </Box>
            ) : null}
            <Box display="flex" alignItems="center" gap={1}>
              <WorkTwoToneIcon fontSize="small" color="action" />
              <Typography variant="body2" noWrap>
                Bidder: {profile.bidder_name}
                {profile.caller_name ? ` · Caller: ${profile.caller_name}` : ''}
              </Typography>
            </Box>
          </Box>

          <Box mt={2}>
            <Chip label="Active" color="success" size="small" variant="outlined" />
          </Box>
        </Box>
      </CardActionAreaWrapper>
    </CardWrapper>
  );
}

export default ProfileCard;
