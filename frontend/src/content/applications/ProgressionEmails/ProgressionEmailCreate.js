import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import {
  PROGRESSION_EMAIL_STATUSES,
  PROGRESSION_EMAIL_TYPES
} from 'src/data/progressionEmailOptions';
import {
  createProgressionEmail,
  previewProgressionEmailReference
} from 'src/services/progressionEmailApi';
import { listProfiles } from 'src/services/profileApi';

function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ProgressionEmailCreate() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company: '',
    type: 'human_interview',
    email_link: '',
    email_date: toDateTimeLocalValue(new Date()),
    status: 'received',
    log: ''
  });

  const headerLeading = useMemo(
    () => (
      <IconButton
        color="primary"
        onClick={() => navigate(`/applications/progression-emails/${profileId}`)}
      >
        <ArrowBackTwoToneIcon />
      </IconButton>
    ),
    [navigate, profileId]
  );

  useSetPageHeader(
    'Add progression email',
    profile ? `${profile.identity_name} · ${profile.email}` : '',
    profile ? headerLeading : null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const numericId = Number(profileId);
      const [profileRows, referencePreview] = await Promise.all([
        listProfiles(),
        previewProgressionEmailReference(numericId)
      ]);
      const match = profileRows.find((row) => row.id === numericId && row.is_active);
      if (!match) {
        enqueueSnackbar('Profile not found or access denied', { variant: 'warning' });
        navigate('/applications/progression-emails', { replace: true });
        return;
      }
      setProfile(match);
      setReferenceNo(referencePreview.reference_no);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load form data', { variant: 'error' });
      navigate(`/applications/progression-emails/${profileId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, navigate, profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.company.trim() || !form.email_link.trim() || !form.email_date) {
      enqueueSnackbar('Company, email link, and email date are required', {
        variant: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      await createProgressionEmail({
        profile_id: profile.id,
        company: form.company.trim(),
        type: form.type,
        email_link: form.email_link.trim(),
        email_date: new Date(form.email_date).toISOString(),
        status: form.status,
        log: form.log
      });
      enqueueSnackbar('Progression email created', { variant: 'success' });
      navigate(`/applications/progression-emails/${profile.id}`);
    } catch (err) {
      enqueueSnackbar(err.message || 'Create failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>New progression email - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Profile ID"
                  value={profile.id}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reference no"
                  value={referenceNo}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-generated from profile reference tag"
                />
              </Grid>
              <Grid item xs={12}>
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
                  >
                    {PROGRESSION_EMAIL_TYPES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
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
                  >
                    {PROGRESSION_EMAIL_STATUSES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email link"
                  placeholder="https://..."
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
            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                variant="contained"
                startIcon={<SaveTwoToneIcon />}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Create progression email'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

export default ProgressionEmailCreate;
