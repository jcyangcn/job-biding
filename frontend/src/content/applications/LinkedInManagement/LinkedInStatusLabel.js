import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import HourglassEmptyTwoToneIcon from '@mui/icons-material/HourglassEmptyTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import AttachMoneyTwoToneIcon from '@mui/icons-material/AttachMoneyTwoTone';
import SellTwoToneIcon from '@mui/icons-material/SellTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import { getLinkedInStatusColor } from 'src/data/linkedinOptions';

export function getLinkedInStatusIcon(status) {
  switch (status) {
    case 'Created':
      return CheckCircleTwoToneIcon;
    case 'Renting':
      return AttachMoneyTwoToneIcon;
    case 'Sold':
      return SellTwoToneIcon;
    case 'Suspended':
      return CancelTwoToneIcon;
    case 'Pending':
    default:
      return HourglassEmptyTwoToneIcon;
  }
}

function LinkedInStatusLabel({ status, prominent = false }) {
  const color = getLinkedInStatusColor(status);
  const StatusIcon = getLinkedInStatusIcon(status);

  if (prominent) {
    return (
      <Chip
        size="small"
        icon={<StatusIcon />}
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
      icon={<StatusIcon />}
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
