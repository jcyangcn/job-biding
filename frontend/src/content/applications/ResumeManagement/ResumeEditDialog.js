import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import DeleteOutlineTwoToneIcon from '@mui/icons-material/DeleteOutlineTwoTone';
import AutorenewTwoToneIcon from '@mui/icons-material/AutorenewTwoTone';
import { rebuildResumeGeneration } from 'src/services/resumeApi';

const emptyExperience = () => ({
  company: '',
  city: '',
  role: '',
  mode: 'Remote',
  period: '',
  bullets: []
});

const emptySkill = () => ({ label: '', value: '' });
const emptyProject = () => ({ name: '', bullets: [] });

function normalizeContent(generation) {
  const content = generation?.resume_content || {};
  return {
    title: content.title || generation?.role || '',
    summary: content.summary || '',
    experience: Array.isArray(content.experience)
      ? content.experience.map((job) => ({
          ...emptyExperience(),
          ...job,
          bullets: Array.isArray(job?.bullets) ? job.bullets : []
        }))
      : [],
    skills: Array.isArray(content.skills)
      ? content.skills.map((skill) =>
          typeof skill === 'string' ? { label: 'Skills', value: skill } : skill
        )
      : [],
    projects: Array.isArray(content.projects)
      ? content.projects.map((project) => ({
          ...emptyProject(),
          ...project,
          bullets: Array.isArray(project?.bullets) ? project.bullets : []
        }))
      : []
  };
}

function ResumeEditDialog({ open, generation, onClose, onRebuilt }) {
  const [form, setForm] = useState(() => normalizeContent(generation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(normalizeContent(generation));
      setError('');
      setSaving(false);
    }
  }, [generation, open]);

  const updateListItem = (field, index, patch) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  };

  const removeListItem = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((_item, itemIndex) => itemIndex !== index)
    }));
  };

  const addListItem = (field, value) => {
    setForm((current) => ({ ...current, [field]: [...current[field], value] }));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Professional title is required.';
    if (!form.summary.trim()) return 'Professional summary is required.';
    if (form.summary.length >= 520) return 'Professional summary must be under 520 characters.';
    if (!form.experience.length) return 'At least one work experience is required.';
    if (form.experience.some((job) => !job.bullets.some((bullet) => bullet.trim()))) {
      return 'Every work experience must contain at least one bullet.';
    }
    return '';
  };

  const handleRebuild = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        experience: form.experience.map((job) => ({
          company: job.company.trim(),
          city: job.city.trim(),
          role: job.role.trim(),
          mode: job.mode.trim(),
          period: job.period.trim(),
          bullets: job.bullets.map((bullet) => bullet.trim()).filter(Boolean)
        })),
        skills: form.skills
          .map((skill) => ({
            label: (skill.label || '').trim(),
            value: (skill.value || '').trim()
          }))
          .filter((skill) => skill.label || skill.value),
        projects: form.projects
          .map((project) => ({
            name: (project.name || '').trim(),
            bullets: project.bullets.map((bullet) => bullet.trim()).filter(Boolean)
          }))
          .filter((project) => project.name || project.bullets.length)
      };
      const rebuilt = await rebuildResumeGeneration(generation.id, payload);
      onRebuilt(rebuilt);
    } catch (err) {
      setError(err.message || 'Failed to rebuild resume');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Edit and rebuild resume
        {generation ? (
          <Typography variant="body2" color="text.secondary">
            {generation.profile_label || `Profile #${generation.profile_id}`} ·{' '}
            {[generation.company, generation.role].filter(Boolean).join(' · ')}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Professional title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Professional summary"
              value={form.summary}
              helperText={`${form.summary.length}/519 characters`}
              error={form.summary.length >= 520}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </Grid>
        </Grid>

        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Work experience</Typography>
          <Button
            size="small"
            startIcon={<AddTwoToneIcon />}
            onClick={() => addListItem('experience', emptyExperience())}
          >
            Add experience
          </Button>
        </Box>
        {form.experience.map((job, index) => (
          <Paper key={`experience-${index}`} variant="outlined" sx={{ p: 2, mt: 1.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography fontWeight={700}>Experience {index + 1}</Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeListItem('experience', index)}
              >
                <DeleteOutlineTwoToneIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              {['role', 'company', 'city', 'mode', 'period'].map((field) => (
                <Grid item xs={12} sm={field === 'period' ? 4 : 6} key={field}>
                  <TextField
                    fullWidth
                    size="small"
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={job[field] || ''}
                    onChange={(event) =>
                      updateListItem('experience', index, { [field]: event.target.value })
                    }
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  label="Bullets — one per line"
                  value={job.bullets.join('\n')}
                  onChange={(event) =>
                    updateListItem('experience', index, {
                      bullets: event.target.value.split('\n')
                    })
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        ))}

        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Skills</Typography>
          <Button
            size="small"
            startIcon={<AddTwoToneIcon />}
            onClick={() => addListItem('skills', emptySkill())}
          >
            Add skill group
          </Button>
        </Box>
        {form.skills.map((skill, index) => (
          <Grid container spacing={1.5} mt={0.25} key={`skill-${index}`} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Category"
                value={skill.label || ''}
                onChange={(event) =>
                  updateListItem('skills', index, { label: event.target.value })
                }
              />
            </Grid>
            <Grid item xs={11} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Skills"
                value={skill.value || ''}
                onChange={(event) =>
                  updateListItem('skills', index, { value: event.target.value })
                }
              />
            </Grid>
            <Grid item xs={1}>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeListItem('skills', index)}
              >
                <DeleteOutlineTwoToneIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Projects</Typography>
          <Button
            size="small"
            startIcon={<AddTwoToneIcon />}
            onClick={() => addListItem('projects', emptyProject())}
          >
            Add project
          </Button>
        </Box>
        {form.projects.map((project, index) => (
          <Paper key={`project-${index}`} variant="outlined" sx={{ p: 2, mt: 1.5 }}>
            <Box display="flex" gap={1} alignItems="flex-start">
              <Box flex={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Project name"
                  value={project.name || ''}
                  onChange={(event) =>
                    updateListItem('projects', index, { name: event.target.value })
                  }
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mt: 1.5 }}
                  label="Bullets — one per line"
                  value={project.bullets.join('\n')}
                  onChange={(event) =>
                    updateListItem('projects', index, {
                      bullets: event.target.value.split('\n')
                    })
                  }
                />
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeListItem('projects', index)}
              >
                <DeleteOutlineTwoToneIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}

        {error ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography color="error">{error}</Typography>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} /> : <AutorenewTwoToneIcon />}
          onClick={handleRebuild}
          disabled={saving || !generation}
        >
          {saving ? 'Rebuilding…' : 'Rebuild Resume'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ResumeEditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  generation: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onRebuilt: PropTypes.func.isRequired
};

export default ResumeEditDialog;
