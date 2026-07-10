import PropTypes from 'prop-types';
import { Box, Card, Stack, Typography, alpha, useTheme } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { CountryFlag } from 'src/components/CountryLabel';
import { getCountryCode } from 'src/data/countryCodes';
import { getLinkedInNeedActionColor, getLinkedInStatusColor } from 'src/data/linkedinOptions';
import LinkedInImageThumb from './LinkedInImageThumb';
import LinkedInStatusLabel from './LinkedInStatusLabel';
import LinkedInNeedActionLabel from './LinkedInNeedActionLabel';
import { ProxyExpiryDate, RentingByDate, SecuredStatusCell } from './LinkedInRowParts';

const CARD_HEIGHT = 304;
const IMAGE_HEIGHT = 160;

function LinkedInAccountTile({ account, onView }) {
  const theme = useTheme();
  const needActionColorKey = getLinkedInNeedActionColor(account.need_action);
  const needActionColor =
    needActionColorKey === 'error' || needActionColorKey === 'warning'
      ? theme.palette[needActionColorKey].main
      : null;
  const statusColorKey = getLinkedInStatusColor(account.status);
  const statusColor = theme.palette[statusColorKey]?.main || theme.palette.secondary.main;
  const logsPreview = account.logs?.trim();
  const countryCode = account.country ? getCountryCode(account.country) : null;

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
        borderRadius: 3,
        bgcolor: 'background.paper',
        position: 'relative',
        border: '1px solid',
        borderColor: needActionColor
          ? alpha(needActionColor, 0.4)
          : alpha(theme.palette.divider, 0.5),
        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}, 0 6px 16px -10px ${alpha(
          theme.palette.common.black,
          0.24
        )}`,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: alpha(statusColor, 0.45),
          boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.05)}, 0 18px 34px -12px ${alpha(
            statusColor,
            0.32
          )}`
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
          <LinkedInImageThumb
            accountId={account.id}
            image={account.image}
            fill
            fillMode="cover"
            alt={account.title}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${alpha(statusColor, 0.08)} 0%, ${alpha(
                theme.palette.primary.main,
                0.04
              )} 55%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
            }}
          >
            <ImageOutlinedIcon sx={{ fontSize: 30, color: alpha(statusColor, 0.28) }} />
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${alpha(
              theme.palette.common.black,
              0.2
            )} 0%, transparent 42%)`,
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ position: 'absolute', top: 8, right: 8, maxWidth: '80%' }}>
          <LinkedInNeedActionLabel needAction={account.need_action} />
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: 1.6,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 1
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ minWidth: 0 }}>
          {account.country ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.4}
              title={account.country}
              sx={{ flexShrink: 0 }}
            >
              <CountryFlag country={account.country} height={12} />
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ fontSize: '0.68rem' }}
              >
                {countryCode}
              </Typography>
            </Stack>
          ) : null}
          <Typography
            variant="subtitle2"
            fontWeight={800}
            noWrap
            title={account.title || '—'}
            sx={{ flex: 1, minWidth: 0, letterSpacing: 0.1 }}
          >
            {account.title || '—'}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <LinkedInStatusLabel status={account.status} />
          </Box>
        </Stack>

        <Box
          sx={{
            borderRadius: 1,
            px: 1,
            py: 0.5,
            minHeight: 28,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography
            variant="caption"
            color={logsPreview ? 'text.primary' : 'text.disabled'}
            title={logsPreview || 'No notes'}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textTransform: 'none',
              fontSize: '0.82rem',
              lineHeight: 1.4
            }}
          >
            {logsPreview || 'Add log…'}
          </Typography>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
          <SecuredStatusCell
            emailSecured={Boolean(account.email_secured)}
            linkedinSecured={Boolean(account.linkedin_secured)}
          />
          <Box sx={{ minWidth: 0, textAlign: 'right' }}>
            {account.status === 'Renting' ? (
              <RentingByDate rentingBy={account.renting_by} />
            ) : account.status === 'Created' ? (
              <ProxyExpiryDate proxyExpiredBy={account.proxy_expired_by} />
            ) : null}
          </Box>
        </Stack>
      </Box>
    </Card>
  );
}

LinkedInAccountTile.propTypes = {
  account: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired
};

export default LinkedInAccountTile;
