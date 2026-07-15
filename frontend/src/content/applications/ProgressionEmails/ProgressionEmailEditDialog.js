import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import {
  PROGRESSION_EMAIL_STATUSES,
  PROGRESSION_EMAIL_TYPES
} from 'src/data/progressionEmailOptions';
import ProgressionEmailStatusLabel from './ProgressionEmailStatusLabel';
import ProgressionEmailTypeLabel from './ProgressionEmailTypeLabel';
import { updateProgressionEmail } from 'src/services/progressionEmailApi';
import { formatDateTime } from 'src/utils/dateFormat';

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ProgressionEmailEditDialog({ open, email, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company: '',
    type: 'human_interview',
    email_link: '',
    email_date: '',
    status: 'received',
    log: ''
  });

  useEffect(() => {
    if (!open || !email) return;
    setForm({
      company: email.company || '',
      type: email.type || 'human_interview',
      email_link: email.email_link || '',
      email_date: toDateTimeLocalValue(email.email_date),
      status: email.status || 'received',
      log: email.log || ''
    });
  }, [open, email]);

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    if (!email) return;
    if (!form.company.trim() || !form.email_link.trim() || !form.email_date) {
      enqueueSnackbar('Company, email link, and email date are required', {
        variant: 'warning'
      });
      return;
    }

    setSaving(true);
    try {
      await updateProgressionEmail(email.id, {
        company: form.company.trim(),
        type: form.type,
        email_link: form.email_link.trim(),
        email_date: new Date(form.email_date).toISOString(),
        status: form.status,
        log: form.log
      });
      enqueueSnackbar('Progression email updated', { variant: 'success' });
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
      <DialogTitle>Edit progression email · {email?.reference_no}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Reference no"
              value={email?.reference_no || ''}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Created"
              value={formatDateTime(email?.created_at) || ''}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Company"
              value={form.company}
              onChange={handleFormChange('company')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={form.type}
                onChange={handleFormChange('type')}
                renderValue={(value) => <ProgressionEmailTypeLabel type={value} />}
              >
                {PROGRESSION_EMAIL_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <ProgressionEmailTypeLabel type={option.value} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={form.status}
                onChange={handleFormChange('status')}
                renderValue={(value) => <ProgressionEmailStatusLabel status={value} />}
              >
                {PROGRESSION_EMAIL_STATUSES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <ProgressionEmailStatusLabel status={option.value} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Link"
              value={form.email_link}
              onChange={handleFormChange('email_link')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email date"
              type="datetime-local"
              value={form.email_date}
              onChange={handleFormChange('email_date')}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Log"
              multiline
              minRows={4}
              value={form.log}
              onChange={handleFormChange('log')}
            />
          </Grid>
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

ProgressionEmailEditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  email: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export default ProgressionEmailEditDialog;
