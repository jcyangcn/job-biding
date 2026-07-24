import PropTypes from 'prop-types';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import EventAvailableTwoToneIcon from '@mui/icons-material/EventAvailableTwoTone';
import FactCheckTwoToneIcon from '@mui/icons-material/FactCheckTwoTone';
import MoreHorizTwoToneIcon from '@mui/icons-material/MoreHorizTwoTone';
import QuizTwoToneIcon from '@mui/icons-material/QuizTwoTone';
import RecordVoiceOverTwoToneIcon from '@mui/icons-material/RecordVoiceOverTwoTone';
import Label from 'src/components/Label';
import {
  formatProgressionEmailType,
  getProgressionEmailTypeColor
} from 'src/data/progressionEmailOptions';

const TYPE_ICONS = {
  human_interview: RecordVoiceOverTwoToneIcon,
  technical_assignment: AssignmentTwoToneIcon,
  questionnaire: FactCheckTwoToneIcon,
  test_task: QuizTwoToneIcon,
  submit_availability: EventAvailableTwoToneIcon,
  other: MoreHorizTwoToneIcon
};

function ProgressionEmailTypeLabel({ type }) {
  const label = formatProgressionEmailType(type);
  const Icon = TYPE_ICONS[type];
  const color = getProgressionEmailTypeColor(type);

  return (
    <Label color={color} sx={{ gap: 0.5, fontWeight: 600, px: 1.25 }}>
      {Icon ? <Icon sx={{ fontSize: 15 }} /> : null}
      {label}
    </Label>
  );
}

ProgressionEmailTypeLabel.propTypes = {
  type: PropTypes.string.isRequired
};

export default ProgressionEmailTypeLabel;
