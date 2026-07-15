import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  alpha,
  Box,
  Button,
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
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import Label from 'src/components/Label';
import { CountryFlag } from 'src/components/CountryLabel';
import { formatDetailDateOnly } from 'src/components/DetailDialog';
import { resolveIdentityDisplay } from 'src/components/IdentityLabel';
import { downloadProfileDefaultResume } from 'src/services/profileApi';
import { copyOnUserClick } from 'src/utils/copyToClipboard';

function buildProfileFields(profile, identity) {
  return [
    { label: 'Name', value: identity?.name || profile.identity_name || '', copyable: true },
    { label: 'Bidder', value: profile.bidder_name || '' },
    { label: 'Caller', value: profile.caller_name || '' },
    { label: 'Roles', value: profile.roles || '', multiline: true, columns: { xs: 12, md: 8 } },
    { label: 'Email', value: profile.email || '', copyable: true, columns: { xs: 12, sm: 8, lg: 6 } },
    { label: 'Email password', value: profile.email_password || '', copyable: true, columns: { xs: 12, sm: 6, lg: 4 } },
    { label: 'Phone', value: profile.phone || '', copyable: true },
    {
      label: 'Cover letter',
      value: profile.cover_letter || '',
      copyable: true,
      multiline: true,
      columns: { xs: 12 }
    },
    { label: 'Proxy', value: profile.proxy || '', copyable: true, columns: { xs: 12, sm: 6, lg: 8 } },
    { label: 'Country', value: identity?.country || '', showCountryFlag: true },
    { label: 'City / State', value: identity?.city_state || '' },
    { label: 'Zipcode', value: identity?.zipcode || '', copyable: true },
    { label: 'Date of birth', value: formatDetailDateOnly(identity?.dob) || '' },
    { label: 'SSN', value: identity?.ssn || '', copyable: true },
    { label: 'Address', value: identity?.address || '', copyable: true, multiline: true, columns: { xs: 12, lg: 8 } },
    { label: 'LinkedIn', value: identity?.linkedin || '', copyable: true, columns: { xs: 12, sm: 6, lg: 6 } },
    { label: 'GitHub', value: identity?.github || '', copyable: true, columns: { xs: 12, sm: 6, lg: 6 } }
  ];
}

const DEFAULT_COLUMNS = { xs: 12, sm: 6, lg: 4 };

function CopyableReadOnlyField({
  label,
  value,
  multiline = false,
  showCountryFlag = false,
  copyable = false
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value ?? '';

  const handleCopy = (event) => {
    if (!text) return;

    copyOnUserClick(event, text, {
      onSuccess: () => {
        setCopied(true);
        enqueueSnackbar(`Copied ${label}`, { variant: 'success' });
        window.setTimeout(() => setCopied(false), 2000);
      },
      onError: () => {
        enqueueSnackbar(`Failed to copy ${label}`, { variant: 'error' });
      }
    });
  };

  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={text}
      InputProps={{
        readOnly: true,
        startAdornment:
          showCountryFlag && text ? (
            <InputAdornment position="start">
              <CountryFlag country={text} />
            </InputAdornment>
          ) : undefined,
        endAdornment: copyable ? (
          <InputAdornment position="end">
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton
                size="small"
                edge="end"
                type="button"
                aria-label={`Copy ${label}`}
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckTwoToneIcon fontSize="small" color="success" />
                ) : (
                  <ContentCopyTwoToneIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ) : undefined
      }}
      multiline={multiline}
      minRows={multiline ? 2 : 1}
    />
  );
}

CopyableReadOnlyField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  multiline: PropTypes.bool,
  showCountryFlag: PropTypes.bool,
  copyable: PropTypes.bool
};

function DefaultResumeDownload({ profile }) {
  const { enqueueSnackbar } = useSnackbar();
  const [downloading, setDownloading] = useState(false);
  const filename = profile.default_resume_original_name;

  if (!filename) {
    return null;
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProfileDefaultResume(profile.id, filename);
      enqueueSnackbar(`Downloaded ${filename}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || 'Download failed', { variant: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Grid item xs={12}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PictureAsPdfTwoToneIcon />}
        onClick={handleDownload}
        disabled={downloading}
        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
      >
        {downloading ? 'Downloading…' : filename}
      </Button>
    </Grid>
  );
}

DefaultResumeDownload.propTypes = {
  profile: PropTypes.object.isRequired
};

function getFieldColumns(field) {
  return field.columns || DEFAULT_COLUMNS;
}

function ProfileCopyCard({ profile, identity, actions, onClick, showDetails = true }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { country, name: resolvedName } = resolveIdentityDisplay({
    identity,
    identityId: profile.identity_id,
    identityName: profile.identity_name
  });
  const displayName = resolvedName || 'Profile';
  const roleItems = (profile.roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
  const fields = useMemo(() => buildProfileFields(profile, identity), [profile, identity]);

  const handleToggleExpand = (event) => {
    event.stopPropagation();
    setExpanded((current) => !current);
  };

  const handleActionsClick = (event) => {
    event.stopPropagation();
  };

  const handleHeaderKeyDown = (event) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
    }
  };

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
        onClick={onClick}
        onKeyDown={onClick ? handleHeaderKeyDown : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        sx={{
          px: 2,
          py: 1.5,
          cursor: onClick ? 'pointer' : 'default',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {country ? <CountryFlag country={country} height={24} /> : null}
            </Box>

            <Box minWidth={0} flex={1}>
              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                <Typography variant="h4" noWrap>
                  {displayName}
                </Typography>
                {roleItems.map((role) => (
                  <Label key={role} color="primary">
                    {role}
                  </Label>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="flex-end"
            onClick={handleActionsClick}
          >
            {actions}
            {showDetails ? (
              <Button
                size="small"
                color="inherit"
                onClick={handleToggleExpand}
                aria-label={expanded ? 'Hide details' : 'Show details'}
                endIcon={
                  <ExpandMoreTwoToneIcon
                    sx={{
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: theme.transitions.create('transform')
                    }}
                  />
                }
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {expanded ? 'Hide details' : 'Show details'}
              </Button>
            ) : null}
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
                    showCountryFlag={field.showCountryFlag}
                    copyable={field.copyable}
                  />
                </Grid>
              );
            })}
            <DefaultResumeDownload profile={profile} />
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
}

ProfileCopyCard.propTypes = {
  profile: PropTypes.object.isRequired,
  identity: PropTypes.object,
  actions: PropTypes.node,
  onClick: PropTypes.func,
  showDetails: PropTypes.bool
};

export default ProfileCopyCard;
