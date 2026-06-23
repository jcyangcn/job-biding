import PropTypes from 'prop-types';
import Label from 'src/components/Label';
import {
  formatProgressionEmailStatus,
  getProgressionEmailStatusColor
} from 'src/data/progressionEmailOptions';

function ProgressionEmailStatusLabel({ status }) {
  return (
    <Label color={getProgressionEmailStatusColor(status)}>
      {formatProgressionEmailStatus(status)}
    </Label>
  );
}

ProgressionEmailStatusLabel.propTypes = {
  status: PropTypes.string.isRequired
};

export default ProgressionEmailStatusLabel;
