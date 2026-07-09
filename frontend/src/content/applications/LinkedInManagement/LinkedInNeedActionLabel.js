import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import ReportProblemTwoToneIcon from '@mui/icons-material/ReportProblemTwoTone';
import MarkEmailUnreadTwoToneIcon from '@mui/icons-material/MarkEmailUnreadTwoTone';
import { getLinkedInNeedActionColor, isLinkedInNeedActionActive } from 'src/data/linkedinOptions';

export function getLinkedInNeedActionIcon(needAction) {
  switch (needAction) {
    case 'Need Reverify':
      return ReportProblemTwoToneIcon;
    case 'Email out of control':
      return MarkEmailUnreadTwoToneIcon;
    default:
      return null;
  }
}

function LinkedInNeedActionLabel({ needAction, variant = 'filled' }) {
  if (!isLinkedInNeedActionActive(needAction)) {
    return null;
  }

  const color = getLinkedInNeedActionColor(needAction);
  const ActionIcon = getLinkedInNeedActionIcon(needAction);

  return (
    <Chip
      size="small"
      icon={ActionIcon ? <ActionIcon /> : undefined}
      label={needAction}
      color={color === 'default' ? 'default' : color}
      variant={variant}
    />
  );
}

LinkedInNeedActionLabel.propTypes = {
  needAction: PropTypes.string,
  variant: PropTypes.oneOf(['filled', 'outlined'])
};

export default LinkedInNeedActionLabel;
