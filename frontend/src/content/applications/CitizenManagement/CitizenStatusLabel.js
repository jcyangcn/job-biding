import PropTypes from 'prop-types';
import Label from 'src/components/Label';
import { formatCitizenStatus, getCitizenStatusColor } from 'src/data/citizenStatusOptions';

function CitizenStatusLabel({ status }) {
  const value = status || 'None';

  return <Label color={getCitizenStatusColor(value)}>{formatCitizenStatus(value)}</Label>;
}

CitizenStatusLabel.propTypes = {
  status: PropTypes.string
};

export default CitizenStatusLabel;
