import PropTypes from 'prop-types';
import {
  Box,
  Card,
  Chip,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LockOpenTwoToneIcon from '@mui/icons-material/LockOpenTwoTone';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import ReportProblemTwoToneIcon from '@mui/icons-material/ReportProblemTwoTone';
import StorageTwoToneIcon from '@mui/icons-material/StorageTwoTone';
import { formatDate } from 'src/utils/dateFormat';
import { getLinkedInStatusColor } from 'src/data/linkedinOptions';
import LinkedInImageThumb from './LinkedInImageThumb';

const CARD_HEIGHT = 328;
const IMAGE_HEIGHT = 136;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function diffDaysFromToday(value) {
  if (!value) return null;
  const target = startOfDay(new Date(value));
  const today = startOfDay(new Date());
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getRentingMeta(rentingBy) {
  if (!rentingBy) {
    return { label: 'No due date', color: 'text.disabled', tone: 'muted' };
  }

  const diffDays = diffDaysFromToday(rentingBy);
  const formatted = formatDate(rentingBy);

  if (diffDays < 0) {
    return {
      label: `${formatted} · ${Math.abs(diffDays)}d overdue`,
      color: 'error.main',
      tone: 'danger'
    };
  }

  if (diffDays === 0) {
    return { label: `${formatted} · due today`, color: 'warning.main', tone: 'warning' };
  }

  if (diffDays <= 7) {
    return {
      label: `${formatted} · in ${diffDays}d`,
      color: 'success.main',
      tone: 'soon'
    };
  }

  return { label: formatted, color: 'text.secondary', tone: 'normal' };
}

function getProxyMeta(proxyExpiredBy) {
  if (!proxyExpiredBy) return null;

  const diffDays = diffDaysFromToday(proxyExpiredBy);
  if (diffDays == null) return null;

  if (diffDays < 0) {
    return { label: 'Proxy expired', color: 'error' };
  }

  if (diffDays <= 7) {
    return { label: `Proxy ${diffDays === 0 ? 'today' : `in ${diffDays}d`}`, color: 'warning' };
  }

  return null;
}

function StatusBadge({ status }) {
  const theme = useTheme();
  const colorKey = getLinkedInStatusColor(status);
  const paletteColor = theme.palette[colorKey]?.main || theme.palette.secondary.main;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.35,
        borderRadius: 10,
        bgcolor: alpha(paletteColor, 0.12),
        border: '1px solid',
        borderColor: alpha(paletteColor, 0.28),
        boxShadow: `0 1px 0 ${alpha(paletteColor, 0.08)}`,
        maxWidth: '100%'
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: paletteColor,
          mr: 0.75,
          flexShrink: 0
        }}
      />
      <Typography variant="caption" fontWeight={700} noWrap sx={{ color: paletteColor, fontSize: '0.7rem' }}>
        {status || 'Pending'}
      </Typography>
    </Box>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string
};

function CredentialLine({ secured, label }) {
  const theme = useTheme();
  const lockColor = secured ? theme.palette.error.main : theme.palette.success.main;

  return (
    <Tooltip title={secured ? `${label} secured` : `${label} not secured`}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          minWidth: 0,
          px: 1,
          py: 0.55,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.text.primary, 0.03),
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.8)
        }}
      >
        <Box sx={{ color: lockColor, display: 'flex', flexShrink: 0, lineHeight: 0 }}>
          {secured ? <LockTwoToneIcon sx={{ fontSize: 15 }} /> : <LockOpenTwoToneIcon sx={{ fontSize: 15 }} />}
        </Box>
        <Typography variant="caption" fontWeight={600} sx={{ color: 'text.primary', fontSize: '0.75rem' }}>
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

CredentialLine.propTypes = {
  secured: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired
};

function RentingPill({ rentingBy }) {
  const meta = getRentingMeta(rentingBy);

  return (
    <Tooltip title={rentingBy ? `Renting by ${formatDate(rentingBy)}` : 'No renting due date'}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.4}
        sx={{
          px: 0.85,
          py: 0.35,
          borderRadius: 10,
          bgcolor: (theme) =>
            meta.tone === 'danger'
              ? alpha(theme.palette.error.main, 0.1)
              : meta.tone === 'warning'
                ? alpha(theme.palette.warning.main, 0.12)
                : meta.tone === 'soon'
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.text.primary, 0.04),
          border: '1px solid',
          borderColor: (theme) =>
            meta.tone === 'danger'
              ? alpha(theme.palette.error.main, 0.24)
              : meta.tone === 'warning'
                ? alpha(theme.palette.warning.main, 0.28)
                : meta.tone === 'soon'
                  ? alpha(theme.palette.success.main, 0.22)
                  : alpha(theme.palette.divider, 0.9),
          maxWidth: '100%'
        }}
      >
        <CalendarTodayTwoToneIcon sx={{ fontSize: 13, color: meta.color, flexShrink: 0 }} />
        <Typography variant="caption" fontWeight={700} noWrap sx={{ color: meta.color, fontSize: '0.68rem' }}>
          {meta.label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

RentingPill.propTypes = {
  rentingBy: PropTypes.string
};

function LinkedInAccountTile({ account, onView }) {
  const theme = useTheme();
  const needsAction = account.need_action === 'Need Reverify';
  const statusColorKey = getLinkedInStatusColor(account.status);
  const statusColor = theme.palette[statusColorKey]?.main || theme.palette.secondary.main;
  const proxyMeta = getProxyMeta(account.proxy_expired_by);
  const logsPreview = account.logs?.trim();

  return (
    <Card
      variant="outlined"
      onClick={() => onView(account)}
      sx={{
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        position: 'relative',
        borderColor: needsAction ? alpha(theme.palette.warning.main, 0.45) : alpha(theme.palette.divider, 0.9),
        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: statusColor,
          zIndex: 2
        },
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: alpha(statusColor, 0.55),
          boxShadow: `0 10px 24px ${alpha(statusColor, 0.16)}`
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: IMAGE_HEIGHT,
          flexShrink: 0,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          overflow: 'hidden'
        }}
      >
        {account.image ? (
          <LinkedInImageThumb accountId={account.id} image={account.image} fill fillMode="cover" alt={account.title} />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${alpha(statusColor, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 55%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
            }}
          >
            <ImageOutlinedIcon sx={{ fontSize: 44, color: alpha(statusColor, 0.28) }} />
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.08)} 0%, transparent 38%, ${alpha(theme.palette.common.black, 0.18)} 100%)`,
            pointerEvents: 'none'
          }}
        />

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 1 }}
          useFlexGap
        >
          <Chip
            size="small"
            label={`#${account.id}`}
            sx={{
              height: 22,
              fontSize: '0.68rem',
              fontWeight: 700,
              bgcolor: alpha(theme.palette.background.paper, 0.88),
              backdropFilter: 'blur(6px)',
              border: `1px solid ${alpha(theme.palette.common.white, 0.5)}`
            }}
          />
          {account.profile_no != null ? (
            <Chip
              size="small"
              label={`P${account.profile_no}`}
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.background.paper, 0.88),
                backdropFilter: 'blur(6px)'
              }}
            />
          ) : null}
          <Box sx={{ flex: 1 }} />
          {needsAction ? (
            <Chip
              size="small"
              icon={<ReportProblemTwoToneIcon sx={{ fontSize: '14px !important' }} />}
              label="Reverify"
              color="warning"
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
            />
          ) : null}
          {proxyMeta ? (
            <Chip
              size="small"
              label={proxyMeta.label}
              color={proxyMeta.color}
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
            />
          ) : null}
        </Stack>

        {account.provider ? (
          <Chip
            size="small"
            icon={<StorageTwoToneIcon sx={{ fontSize: '14px !important' }} />}
            label={account.provider}
            sx={{
              position: 'absolute',
              left: 8,
              bottom: 8,
              zIndex: 1,
              height: 22,
              fontSize: '0.68rem',
              fontWeight: 600,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(6px)'
            }}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: 1.35,
          py: 1.15,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gridTemplateRows: 'auto auto auto auto',
          columnGap: 0.85,
          rowGap: 0.7,
          alignContent: 'start'
        }}
      >
        <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={800}
            noWrap
            title={account.title || '—'}
            sx={{ letterSpacing: 0.1, lineHeight: 1.3 }}
          >
            {account.title || '—'}
          </Typography>
          {account.browser ? (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.15 }}>
              {account.browser}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            minWidth: 0,
            alignSelf: 'start',
            px: 0.85,
            py: 0.55,
            borderRadius: 1.5,
            bgcolor: logsPreview ? alpha(theme.palette.text.primary, 0.035) : 'transparent',
            border: logsPreview ? `1px dashed ${alpha(theme.palette.divider, 0.95)}` : 'none',
            minHeight: 34
          }}
        >
          <Typography
            variant="caption"
            color={logsPreview ? 'text.secondary' : 'text.disabled'}
            title={logsPreview || 'No notes'}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
              fontSize: '0.72rem'
            }}
          >
            {logsPreview || 'No notes yet'}
          </Typography>
        </Box>

        <Box sx={{ justifySelf: 'end', alignSelf: 'start' }}>
          <StatusBadge status={account.status} />
        </Box>

        <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
          <CredentialLine secured={Boolean(account.email_secured)} label="Email" />
        </Box>

        <Box sx={{ minWidth: 0, alignSelf: 'end' }}>
          <CredentialLine secured={Boolean(account.linkedin_secured)} label="LinkedIn" />
        </Box>

        <Box sx={{ justifySelf: 'end', alignSelf: 'end', maxWidth: '100%' }}>
          <RentingPill rentingBy={account.renting_by} />
        </Box>
      </Box>
    </Card>
  );
}

LinkedInAccountTile.propTypes = {
  account: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired
};

export default LinkedInAccountTile;
