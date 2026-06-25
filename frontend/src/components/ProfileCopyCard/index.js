import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  alpha,
  Avatar,
  Box,
  Card,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import ExpandMoreTwoToneIcon from '@mui/icons-material/ExpandMoreTwoTone';
import Label from 'src/components/Label';
import { formatDetailDateOnly } from 'src/components/DetailDialog';
import { copyToClipboard } from 'src/utils/copyToClipboard';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function buildProfileFields(profile, identity) {
  return [
    { label: 'Name', value: identity?.name || profile.identity_name || '' },
    { label: 'Bidder', value: profile.bidder_name || '' },
    { label: 'Caller', value: profile.caller_name || '' },
    { label: 'Roles', value: profile.roles || '', multiline: true, columns: { xs: 12, md: 8 } },
    { label: 'Reference tag', value: profile.reference_tag || '' },
    { label: 'Email', value: profile.email || '', columns: { xs: 12, sm: 8, lg: 6 } },
    { label: 'Email password', value: profile.email_password || '', columns: { xs: 12, sm: 6, lg: 4 } },
    { label: 'Phone', value: profile.phone || '' },
    { label: 'Proxy', value: profile.proxy || '', columns: { xs: 12, sm: 6, lg: 8 } },
    { label: 'Country', value: identity?.country || '' },
    { label: 'City / State', value: identity?.city_state || '' },
    { label: 'Zipcode', value: identity?.zipcode || '' },
    { label: 'Date of birth', value: formatDetailDateOnly(identity?.dob) || '' },
    { label: 'SSN', value: identity?.ssn || '' },
    { label: 'Address', value: identity?.address || '', multiline: true, columns: { xs: 12, lg: 8 } },
    { label: 'LinkedIn', value: identity?.linkedin || '', columns: { xs: 12, sm: 6, lg: 6 } },
    { label: 'GitHub', value: identity?.github || '', columns: { xs: 12, sm: 6, lg: 6 } }
  ];
}

const DEFAULT_COLUMNS = { xs: 12, sm: 6, lg: 4 };

function CopyableReadOnlyField({ label, value, multiline = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value ?? '';

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopied(true);
      enqueueSnackbar(`Copied ${label}`, { variant: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      enqueueSnackbar(`Failed to copy ${label}`, { variant: 'error' });
    }
  };

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={text}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton
                size="small"
                edge="end"
                aria-label={`Copy ${label}`}
                onMouseDown={handleCopy}
              >
                {copied ? (
                  <CheckTwoToneIcon fontSize="small" color="success" />
                ) : (
                  <ContentCopyTwoToneIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        )
      }}
      multiline={multiline}
      minRows={multiline ? 2 : 1}
    />
  );
}

CopyableReadOnlyField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  multiline: PropTypes.bool
};

function getFieldColumns(field) {
  return field.columns || DEFAULT_COLUMNS;
}

function ProfileCopyCard({ profile, identity, actions }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const displayName = profile.identity_name || identity?.name || 'Profile';
  const roleItems = (profile.roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
  const fields = useMemo(() => buildProfileFields(profile, identity), [profile, identity]);

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
          py: 1.5,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: theme.colors.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 700,
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

              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
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
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
            <Tooltip title={expanded ? 'Hide details' : 'Show details'}>
              <IconButton
                size="small"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                onClick={() => setExpanded((current) => !current)}
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: theme.transitions.create('transform')
                }}
              >
                <ExpandMoreTwoToneIcon />
              </IconButton>
            </Tooltip>
            {actions}
          </Stack>
        </Stack>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box px={2} py={2} borderTop={`1px solid ${theme.colors.alpha.black[10]}`}>
          <Grid container spacing={1.25}>
            {fields.map((field) => {
              const columns = getFieldColumns(field);
              return (
                <Grid item key={field.label} {...columns}>
                  <CopyableReadOnlyField
                    label={field.label}
                    value={field.value}
                    multiline={field.multiline}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
}

ProfileCopyCard.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  actions: PropTypes.node
};

export default ProfileCopyCard;
