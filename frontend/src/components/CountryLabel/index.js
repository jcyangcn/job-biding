import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { getCountryCode } from 'src/data/countryCodes';

function CountryFlag({ country, height = 14, sx }) {
  const code = getCountryCode(country);
  const Flag = code ? FlagIcons[code] : null;

  if (!Flag) {
    return null;
  }

  return (
    <Flag
      title={country}
      style={{
        height,
        width: Math.round(height * 1.5),
        borderRadius: 2,
        flexShrink: 0,
        display: 'block',
        ...sx
      }}
    />
  );
}

CountryFlag.propTypes = {
  country: PropTypes.string,
  height: PropTypes.number,
  sx: PropTypes.object
};

function CountryLabel({
  country,
  showName = true,
  flagHeight = 14,
  emptyText = '—',
  noWrap = false,
  variant = 'inherit',
  fontWeight,
  title,
  sx
}) {
  const name = country?.trim();

  if (!name) {
    return (
      <Typography variant={variant} color="text.secondary" sx={sx}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box
      component="span"
      display="inline-flex"
      alignItems="center"
      gap={0.75}
      maxWidth="100%"
      title={title || name}
      sx={sx}
    >
      <CountryFlag country={name} height={flagHeight} />
      {showName ? (
        <Typography
          component="span"
          variant={variant}
          noWrap={noWrap}
          sx={{ fontWeight, minWidth: 0 }}
        >
          {name}
        </Typography>
      ) : null}
    </Box>
  );
}

CountryLabel.propTypes = {
  country: PropTypes.string,
  showName: PropTypes.bool,
  flagHeight: PropTypes.number,
  emptyText: PropTypes.string,
  noWrap: PropTypes.bool,
  variant: PropTypes.string,
  fontWeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  sx: PropTypes.object
};

export { CountryFlag };
export default CountryLabel;
