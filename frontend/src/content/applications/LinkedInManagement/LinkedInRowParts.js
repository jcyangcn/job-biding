import PropTypes from 'prop-types';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import LockOpenTwoToneIcon from '@mui/icons-material/LockOpenTwoTone';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import { formatDate } from 'src/utils/dateFormat';

export function getRentingDateMeta(rentingBy) {
  if (!rentingBy) {
    return null;
  }

  const target = new Date(rentingBy);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { color: 'error.main', label: `Expired ${Math.abs(diffDays)}d ago` };
  }
  if (diffDays <= 7) {
    return {
      color: 'warning.main',
      label: diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`
    };
  }
  return { color: 'success.main', label: `Available (${diffDays}d)` };
}

export function RentingByDate({ rentingBy }) {
  const meta = getRentingDateMeta(rentingBy);

  if (!meta) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
        No renting date
      </Typography>
    );
  }

  return (
    <Tooltip title={`Renting by ${formatDate(rentingBy)} · ${meta.label}`}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
        <CalendarTodayTwoToneIcon sx={{ fontSize: 13, color: meta.color }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: meta.color }}>
          {formatDate(rentingBy)}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

RentingByDate.propTypes = {
  rentingBy: PropTypes.string
};

export function ProxyExpiryDate({ proxyExpiredBy }) {
  const meta = getRentingDateMeta(proxyExpiredBy);

  if (!meta) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
        No proxy expiry
      </Typography>
    );
  }

  return (
    <Tooltip title={`Proxy expired by ${formatDate(proxyExpiredBy)} · ${meta.label}`}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
        <CalendarTodayTwoToneIcon sx={{ fontSize: 13, color: meta.color }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: meta.color }}>
          {formatDate(proxyExpiredBy)}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

ProxyExpiryDate.propTypes = {
  proxyExpiredBy: PropTypes.string
};

export function SecuredLockBadge({ secured, label }) {
  const isSecured = Boolean(secured);

  return (
    <Tooltip title={`${label} ${isSecured ? 'secured' : 'not secured'}`}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          color: isSecured ? 'success.main' : 'error.main'
        }}
      >
        {isSecured ? (
          <LockTwoToneIcon sx={{ fontSize: 16 }} />
        ) : (
          <LockOpenTwoToneIcon sx={{ fontSize: 16 }} />
        )}
        <Typography
          component="span"
          variant="caption"
          fontWeight={600}
          sx={{ fontSize: '0.72rem', lineHeight: 1 }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

SecuredLockBadge.propTypes = {
  secured: PropTypes.bool,
  label: PropTypes.string.isRequired
};

export function SecuredStatusCell({ emailSecured, linkedinSecured }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        whiteSpace: 'nowrap',
        flexWrap: 'nowrap'
      }}
    >
      <SecuredLockBadge secured={emailSecured} label="Email" />
      <SecuredLockBadge secured={linkedinSecured} label="LinkedIn" />
    </Box>
  );
}

SecuredStatusCell.propTypes = {
  emailSecured: PropTypes.bool,
  linkedinSecured: PropTypes.bool
};
