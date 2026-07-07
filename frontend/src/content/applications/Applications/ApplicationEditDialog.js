import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField
} from '@mui/material';
import DateTimeField from 'src/components/DateTimeField';
import { updateJobApplication } from 'src/services/jobApplicationApi';
import { listResumeGenerations } from 'src/services/resumeApi';
import { appliedAtToIso, formatDateTimeValue } from 'src/utils/dateFormat';

function ApplicationEditDialog({ open, application, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resumeSource, setResumeSource] = useState('none');
  const [form, setForm] = useState({
    role: '',
    company: '',
    link: '',
    job_description: '',
    resume_generated_id: '',
    resume_online_link: '',
    applied: false,
    applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
  });

  useEffect(() => {
    if (!open || !application) return;

    if (application.resume_generated_id) {
      setResumeSource('generated');
    } else if (application.resume_online_link) {
      setResumeSource('online');
    } else {
      setResumeSource('none');
    }

    setForm({
      role: application.role || '',
      company: application.company || '',
      link: application.link || '',
      job_description: application.job_description || '',
      resume_generated_id: application.resume_generated_id || '',
      resume_online_link: application.resume_online_link || '',
      applied: Boolean(application.applied),
      applied_at:
        formatDateTimeValue(application.applied_at) || format(new Date(), 'yyyy-MM-dd HH:mm')
    });

    listResumeGenerations()
      .then(setResumeGenerations)
      .catch(() => setResumeGenerations([]));
  }, [open, application]);

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleResumeSourceChange = (event) => {
    const value = event.target.value;
    setResumeSource(value);
    setForm((current) => ({
      ...current,
      resume_generated_id: value === 'generated' ? current.resume_generated_id : '',
      resume_online_link: value === 'online' ? current.resume_online_link : ''
    }));
  };

  const handleAppliedChange = (event) => {
    const checked = event.target.checked;
    setForm((current) => ({
      ...current,
      applied: checked,
      applied_at:
        checked && !current.applied_at
          ? format(new Date(), 'yyyy-MM-dd HH:mm')
          : current.applied_at
    }));
  };

  const handleSave = async () => {
    if (!application) return;
    if (!form.link.trim()) {
      enqueueSnackbar('Link is required', { variant: 'warning' });
      return;
    }
    if (form.applied && !form.applied_at) {
      enqueueSnackbar('Applied at is required when applied is enabled', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await updateJobApplication(application.id, {
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim(),
        job_description: form.job_description.trim(),
        resume_generated_id:
          resumeSource === 'generated' && form.resume_generated_id
            ? Number(form.resume_generated_id)
            : null,
        resume_online_link:
          resumeSource === 'online' && form.resume_online_link.trim()
            ? form.resume_online_link.trim()
            : null,
        applied: form.applied,
        applied_at: form.applied ? appliedAtToIso(form.applied_at) : null
      });
      enqueueSnackbar('Application updated', { variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      enqueueSnackbar(err.message || 'Update failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <DialogTitle>Edit application #{application?.id}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Role"
              value={form.role}
              onChange={handleFormChange('role')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Company"
              value={form.company}
              onChange={handleFormChange('company')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Link"
              value={form.link}
              onChange={handleFormChange('link')}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={form.applied}
                    onChange={handleAppliedChange}
                    color={form.applied ? 'success' : 'error'}
                  />
                }
                label="Applied"
              />
              {form.applied ? (
                <DateTimeField
                  label="Applied at"
                  value={form.applied_at}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, applied_at: value }))
                  }
                  required
                  sx={{ width: 210 }}
                />
              ) : null}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Job description"
              multiline
              minRows={6}
              value={form.job_description}
              onChange={handleFormChange('job_description')}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Resume source</FormLabel>
              <RadioGroup row value={resumeSource} onChange={handleResumeSourceChange}>
                <FormControlLabel value="none" control={<Radio />} label="None" />
                <FormControlLabel value="generated" control={<Radio />} label="Generated resume" />
                <FormControlLabel value="online" control={<Radio />} label="Online link" />
              </RadioGroup>
            </FormControl>
          </Grid>
          {resumeSource === 'generated' ? (
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Generated resume"
                value={form.resume_generated_id}
                onChange={handleFormChange('resume_generated_id')}
              >
                {resumeGenerations.map((generation) => (
                  <MenuItem key={generation.id} value={generation.id}>
                    #{generation.id} · {generation.job_details?.slice(0, 60) || 'Resume'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}
          {resumeSource === 'online' ? (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resume online link"
                value={form.resume_online_link}
                onChange={handleFormChange('resume_online_link')}
              />
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ApplicationEditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  application: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export default ApplicationEditDialog;
