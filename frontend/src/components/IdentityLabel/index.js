import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { CountryFlag } from 'src/components/CountryLabel';
import { parseIdentityLabel } from 'src/data/countryCodes';

export function resolveIdentityDisplay({
  identity,
  identityId,
  identityName,
  label,
  identityById
}) {
  const resolvedIdentity = identity || identityById?.get?.(identityId);
  const sourceLabel = identityName || label || '';
  const parsed = parseIdentityLabel(sourceLabel);
  const country = resolvedIdentity?.country || parsed.countryCode;
  const name = resolvedIdentity?.name || parsed.name || sourceLabel;

  return {
    country,
    name: name || '',
    title: sourceLabel || name
  };
}

function IdentityLabel({
  identity,
  identityId,
  identityName,
  label,
  identityById,
  flagHeight = 12,
  variant = 'body2',
  noWrap = true,
  emptyText = '—',
  sx,
  typographySx
}) {
  const { country, name, title } = resolveIdentityDisplay({
    identity,
    identityId,
    identityName,
    label,
    identityById
  });

  if (!name) {
    return (
      <Typography variant={variant} color="text.secondary" sx={typographySx}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={0.75}
      maxWidth="100%"
      title={title}
      sx={sx}
    >
      {country ? <CountryFlag country={country} height={flagHeight} /> : null}
      <Typography variant={variant} noWrap={noWrap} sx={typographySx}>
        {name}
      </Typography>
    </Box>
  );
}

IdentityLabel.propTypes = {
  identity: PropTypes.shape({
    id: PropTypes.number,
    country: PropTypes.string,
    name: PropTypes.string
  }),
  identityId: PropTypes.number,
  identityName: PropTypes.string,
  label: PropTypes.string,
  identityById: PropTypes.instanceOf(Map),
  flagHeight: PropTypes.number,
  variant: PropTypes.string,
  noWrap: PropTypes.bool,
  emptyText: PropTypes.string,
  sx: PropTypes.object,
  typographySx: PropTypes.object
};

export default IdentityLabel;
