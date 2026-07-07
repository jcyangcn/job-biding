import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import { getLinkedInStatusColor } from 'src/data/linkedinOptions';

function LinkedInStatusLabel({ status }) {
  return (
    <Chip
      size="small"
      label={status || 'Pending'}
      color={getLinkedInStatusColor(status)}
      variant="outlined"
    />
  );
}

LinkedInStatusLabel.propTypes = {
  status: PropTypes.string
};

export default LinkedInStatusLabel;
