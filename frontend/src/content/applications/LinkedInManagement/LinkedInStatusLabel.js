import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import { getLinkedInStatusColor } from 'src/data/linkedinOptions';

function LinkedInStatusLabel({ status, prominent = false }) {
  const color = getLinkedInStatusColor(status);

  if (prominent) {
    return (
      <Chip
        size="small"
        label={status || 'Pending'}
        color={color}
        variant="filled"
        sx={{
          height: 24,
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: 0.2,
          boxShadow: (theme) => `0 1px 4px ${theme.palette[color].main}33`,
          '& .MuiChip-label': {
            px: 1
          }
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label={status || 'Pending'}
      color={color}
      variant="outlined"
    />
  );
}

LinkedInStatusLabel.propTypes = {
  status: PropTypes.string,
  prominent: PropTypes.bool
};

export default LinkedInStatusLabel;
