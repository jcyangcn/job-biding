import PropTypes from 'prop-types';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  Grid,
  Link,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import BadgeTwoToneIcon from '@mui/icons-material/BadgeTwoTone';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import PersonPinTwoToneIcon from '@mui/icons-material/PersonPinTwoTone';
import PhoneTwoToneIcon from '@mui/icons-material/PhoneTwoTone';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';
import QuizTwoToneIcon from '@mui/icons-material/QuizTwoTone';
import TagTwoToneIcon from '@mui/icons-material/TagTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import VpnKeyTwoToneIcon from '@mui/icons-material/VpnKeyTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import Label from 'src/components/Label';
import {
  DetailItem,
  formatDetailDate,
  formatDetailDateOnly
} from 'src/components/DetailDialog';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

function InfoTile({ icon: Icon, label, value, children, iconColor = 'primary.main' }) {
  const content = children ?? value;
  if (!hasValue(content) && content !== 0) {
    return null;
  }

  return (
    <Grid item xs={12} sm={6}>
      <DetailItem elevation={0}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          {Icon ? (
            <Icon
              sx={{
                fontSize: 22,
                color: iconColor,
                mt: 0.15,
                flexShrink: 0
              }}
            />
          ) : null}
          <Box minWidth={0} flex={1}>
            <Typography variant="overline" color="text.secondary" lineHeight={1.2}>
              {label}
            </Typography>
            {typeof content === 'string' || typeof content === 'number' ? (
              <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 500 }}>
                {content}
              </Typography>
            ) : (
              content
            )}
          </Box>
        </Stack>
      </DetailItem>
    </Grid>
  );
}

InfoTile.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.node,
  iconColor: PropTypes.string
};

function SectionHeader({ icon: Icon, title, subtitle, color = 'primary' }) {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" mb={1.5}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: theme.general.borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette[color].main, 0.12),
          color: `${color}.main`,
          flexShrink: 0
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box minWidth={0}>
        <Typography variant="h5" lineHeight={1.2}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

SectionHeader.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  color: PropTypes.string
};

function ApplicationProfileRow({ profile, identity, onQaClick, onViewClick }) {
  const theme = useTheme();
  const displayName = profile.identity_name || identity?.name || 'Profile';
  const roleItems = (profile.roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        overflow: 'hidden',
        transition: theme.transitions.create(['box-shadow', 'border-color']),
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: alpha(theme.palette.primary.main, 0.35)
        }
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.75,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
          borderBottom: `1px solid ${theme.colors.alpha.black[10]}`
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
        >
          <Stack direction="row" spacing={1.75} alignItems="center" flex={1} minWidth={0}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: theme.colors.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 700,
                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                flexShrink: 0
              }}
            >
              {getInitials(displayName)}
            </Avatar>

            <Box minWidth={0} flex={1}>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
                <Typography variant="h4" noWrap>
                  {displayName}
                </Typography>
                <Label color="success">Active</Label>
                {profile.reference_tag ? <Label color="info">{profile.reference_tag}</Label> : null}
              </Stack>

              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" mb={0.75}>
                {roleItems.length ? (
                  roleItems.map((role) => (
                    <Label key={role} color="primary">
                      {role}
                    </Label>
                  ))
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No roles listed
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                <Stack direction="row" alignItems="center" gap={0.5} minWidth={0}>
                  <EmailTwoToneIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {profile.email}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={0.5} minWidth={0}>
                  <WorkTwoToneIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {profile.bidder_name}
                    {profile.caller_name ? ` · ${profile.caller_name}` : ''}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexShrink={0} justifyContent={{ xs: 'flex-end', md: 'center' }}>
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
          </Stack>
        </Stack>
      </Box>

      <Box px={2} py={2}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <SectionHeader
              icon={PersonPinTwoToneIcon}
              title="Profile"
              subtitle={`#${profile.id}`}
              color="primary"
            />
            <Grid container spacing={1.25}>
              <InfoTile icon={WorkTwoToneIcon} label="Bidder" value={profile.bidder_name} />
              <InfoTile icon={WorkTwoToneIcon} label="Caller" value={profile.caller_name} iconColor="secondary.main" />
              <InfoTile icon={TagTwoToneIcon} label="Reference tag" value={profile.reference_tag} iconColor="info.main" />
              <InfoTile icon={EmailTwoToneIcon} label="Email" value={profile.email} />
              <InfoTile icon={LockTwoToneIcon} label="Email password" value={profile.email_password} iconColor="warning.main" />
              <InfoTile icon={PhoneTwoToneIcon} label="Phone" value={profile.phone} iconColor="success.main" />
              <InfoTile icon={VpnKeyTwoToneIcon} label="Proxy" value={profile.proxy} iconColor="secondary.main" />
              <InfoTile
                icon={CalendarTodayTwoToneIcon}
                label="Created"
                value={formatDetailDate(profile.created_at)}
                iconColor="text.secondary"
              />
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            {identity ? (
              <>
                <SectionHeader
                  icon={BadgeTwoToneIcon}
                  title="Identity"
                  subtitle={`#${identity.id}${identity.country ? ` · ${identity.country}` : ''}`}
                  color="secondary"
                />
                <Grid container spacing={1.25}>
                  <InfoTile icon={BadgeTwoToneIcon} label="Name" value={identity.name} iconColor="secondary.main" />
                  <InfoTile icon={PublicTwoToneIcon} label="Country" value={identity.country} iconColor="info.main" />
                  <InfoTile icon={HomeTwoToneIcon} label="City / State" value={identity.city_state} />
                  <InfoTile icon={HomeTwoToneIcon} label="Zipcode" value={identity.zipcode} />
                  <InfoTile
                    icon={CalendarTodayTwoToneIcon}
                    label="Date of birth"
                    value={formatDetailDateOnly(identity.dob)}
                    iconColor="warning.main"
                  />
                  <InfoTile icon={VpnKeyTwoToneIcon} label="SSN" value={identity.ssn} iconColor="error.main" />
                  <InfoTile icon={HomeTwoToneIcon} label="Address" value={identity.address} />
                  <InfoTile icon={LinkTwoToneIcon} label="LinkedIn" iconColor="info.main">
                    {identity.linkedin ? (
                      <Link
                        href={identity.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 500, wordBreak: 'break-all' }}
                      >
                        {identity.linkedin}
                      </Link>
                    ) : null}
                  </InfoTile>
                  <InfoTile icon={LinkTwoToneIcon} label="GitHub" iconColor="text.primary">
                    {identity.github ? (
                      <Link
                        href={identity.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 500, wordBreak: 'break-all' }}
                      >
                        {identity.github}
                      </Link>
                    ) : null}
                  </InfoTile>
                  <InfoTile
                    icon={CalendarTodayTwoToneIcon}
                    label="Created"
                    value={formatDetailDate(identity.created_at)}
                    iconColor="text.secondary"
                  />
                </Grid>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.general.borderRadius,
                  border: `1px dashed ${theme.colors.alpha.black[20]}`,
                  bgcolor: alpha(theme.colors.alpha.black[100], 0.02),
                  px: 2
                }}
              >
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Identity data unavailable for this profile.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
}

ApplicationProfileRow.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  onQaClick: PropTypes.func.isRequired,
  onViewClick: PropTypes.func.isRequired
};

export default ApplicationProfileRow;
