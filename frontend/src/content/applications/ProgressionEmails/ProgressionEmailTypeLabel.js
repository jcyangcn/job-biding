import PropTypes from 'prop-types';
import RecordVoiceOverTwoToneIcon from '@mui/icons-material/RecordVoiceOverTwoTone';
import Label from 'src/components/Label';
import {
  formatProgressionEmailType,
  getProgressionEmailTypeColor,
  isHumanInterviewType
} from 'src/data/progressionEmailOptions';

function ProgressionEmailTypeLabel({ type }) {
  const label = formatProgressionEmailType(type);

  if (isHumanInterviewType(type)) {
    return (
      <Label color="black" sx={{ gap: 0.5, fontWeight: 600, px: 1.25 }}>
        <RecordVoiceOverTwoToneIcon sx={{ fontSize: 15 }} />
        {label}
      </Label>
    );
  }

  return <Label color={getProgressionEmailTypeColor(type)}>{label}</Label>;
}

ProgressionEmailTypeLabel.propTypes = {
  type: PropTypes.string.isRequired
};

export default ProgressionEmailTypeLabel;
