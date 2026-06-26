import PropTypes from 'prop-types';
import Label from 'src/components/Label';
import {
  formatCitizenReviewStatus,
  getCitizenReviewStatusColor
} from 'src/data/citizenReviewStatusOptions';

function CitizenReviewStatusLabel({ status }) {
  const value = status || 'None';

  return <Label color={getCitizenReviewStatusColor(value)}>{formatCitizenReviewStatus(value)}</Label>;
}

CitizenReviewStatusLabel.propTypes = {
  status: PropTypes.string
};

export default CitizenReviewStatusLabel;
