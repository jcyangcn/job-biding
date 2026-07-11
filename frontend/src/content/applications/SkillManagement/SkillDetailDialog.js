import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';

function formatJsonDisplay(value) {
  const text = value == null ? '' : String(value);
  if (!text.trim()) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function SkillDetailDialog({ open, skill, onClose }) {
  if (!skill) {
    return null;
  }

  const title = skill.role || 'Skill details';
  const caption = `#${skill.id}`;

  return (
    <DetailDialog
      open={open}
      onClose={onClose}
      title={title}
      caption={caption}
      maxWidth="md"
    >
      <Grid container spacing={2}>
        <DetailField label="Role" value={skill.role || '—'} icon={WorkTwoToneIcon} />
        <DetailField label="Weight" value={skill.weight == null ? '—' : String(skill.weight)} />
        <DetailField label="Created" value={formatDetailDate(skill.created_at) || '—'} />
      </Grid>

      <DetailTextSection
        title="Field (JSON)"
        text={formatJsonDisplay(skill.field)}
        emptyText="No field JSON."
      />
      <DetailTextSection
        title="Keyword (JSON)"
        text={formatJsonDisplay(skill.keyword)}
        emptyText="No keyword JSON."
      />
    </DetailDialog>
  );
}

SkillDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  skill: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default SkillDetailDialog;
