import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import SendTwoToneIcon from '@mui/icons-material/SendTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { createJobApplication } from 'src/services/jobApplicationApi';
import { listProfiles } from 'src/services/profileApi';
import SaveResumeDialog from 'src/components/SaveResumeDialog';
import {
  buildResumeRequest,
  fetchResumePdf,
  listResumeGenerations,
  loadDefaultProfileJson,
  loadDefaultProfileMarkdown
} from 'src/services/resumeApi';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function ApplicationDetails() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);
  const [resumeSource, setResumeSource] = useState('generated');
  const [profileMode, setProfileMode] = useState('markdown');
  const [profileMarkdown, setProfileMarkdown] = useState('');
  const [profileJson, setProfileJson] = useState('');
  const [form, setForm] = useState({
    role: '',
    company: '',
    link: '',
    job_description: '',
    resume_generated_id: '',
    resume_online_link: ''
  });

  const selectedGeneration = resumeGenerations.find(
    (generation) => generation.id === form.resume_generated_id
  );

  const headerLeading = useMemo(
    () => (
      <IconButton
        color="primary"
        onClick={() => navigate(`/applications/job-applications/${profileId}`)}
      >
        <ArrowBackTwoToneIcon />
      </IconButton>
    ),
    [navigate, profileId]
  );

  useSetPageHeader(
    'New application',
    profile ? `${profile.identity_name} · ${profile.email}` : '',
    profile ? headerLeading : null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, generationRows] = await Promise.all([
        listProfiles(),
        listResumeGenerations()
      ]);
      const numericId = Number(profileId);
      const match = profileRows.find(
        (row) => row.id === numericId && row.is_active
      );
      if (!match) {
        enqueueSnackbar('Profile not found or access denied', { variant: 'warning' });
        navigate('/applications/job-applications', { replace: true });
        return;
      }
      setProfile(match);
      setResumeGenerations(generationRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load application data', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, navigate, profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDefaultProfileMarkdown()
      .then(setProfileMarkdown)
      .catch(() => {});
  }, []);

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

  const handleLoadProfileMarkdown = async () => {
    try {
      setProfileMarkdown(await loadDefaultProfileMarkdown());
      setProfileMode('markdown');
      enqueueSnackbar('Loaded default profile markdown', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  const handleLoadProfileJson = async () => {
    try {
      const profileData = await loadDefaultProfileJson();
      setProfileJson(JSON.stringify(profileData, null, 2));
      setProfileMode('json');
      enqueueSnackbar('Loaded default profile as JSON', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    enqueueSnackbar('Generating resume… this usually takes 1–3 minutes.', {
      variant: 'info'
    });

    try {
      const body = buildResumeRequest({
        jobDescription: form.job_description,
        profileMode,
        profileMarkdown,
        profileJson
      });
      const { buffer, filename, generationId } = await fetchResumePdf(body);
      const generationRows = await listResumeGenerations();
      setResumeGenerations(generationRows);
      const selectedId = generationId || generationRows[0]?.id || '';
      if (selectedId) {
        setForm((current) => ({ ...current, resume_generated_id: selectedId }));
      }
      setPendingResume({ buffer, filename });
      setSaveDialogOpen(true);
      enqueueSnackbar('Resume generated. Choose where to save it.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || 'Something went wrong.', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleResumeSaved = (result) => {
    if (result.error) {
      enqueueSnackbar(result.error, { variant: 'error' });
      return;
    }
    if (result.cancelled) {
      enqueueSnackbar('Save cancelled — try Save PDF or Download PDF', { variant: 'info' });
      return;
    }
    if (result.usedFallback) {
      enqueueSnackbar(
        `Save dialog failed — downloaded ${result.filename} instead. Enable “Ask where to save” in browser settings for Save As.`,
        { variant: 'warning' }
      );
    } else {
      enqueueSnackbar(`Done — saved ${result.filename}`, { variant: 'success' });
    }
    setSaveDialogOpen(false);
    setPendingResume(null);
  };

  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
    setPendingResume(null);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.link.trim()) {
      enqueueSnackbar('Link is required', { variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      await createJobApplication({
        profile_id: profile.id,
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim(),
        job_description: form.job_description.trim(),
        resume_generated_id:
          resumeSource === 'generated' && form.resume_generated_id
            ? form.resume_generated_id
            : null,
        resume_online_link:
          resumeSource === 'online' && form.resume_online_link.trim()
            ? form.resume_online_link.trim()
            : null
      });
      enqueueSnackbar('Application submitted', { variant: 'success' });
      navigate(`/applications/job-applications/${profile.id}`);
    } catch (err) {
      enqueueSnackbar(err.message || 'Submit failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{profile.identity_name} - Application - {PROJECT_NAME}</title>
      </Helmet>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={form.role}
                      onChange={handleFormChange('role')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Company"
                      value={form.company}
                      onChange={handleFormChange('company')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Link"
                      value={form.link}
                      onChange={handleFormChange('link')}
                      required
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  sx={{ mt: 2 }}
                  label="Job description"
                  placeholder="Paste the full job posting here…"
                  multiline
                  minRows={10}
                  value={form.job_description}
                  onChange={handleFormChange('job_description')}
                />

                <FormControl sx={{ mt: 3 }}>
                  <FormLabel>Resume source</FormLabel>
                  <RadioGroup row value={resumeSource} onChange={handleResumeSourceChange}>
                    <FormControlLabel
                      value="generated"
                      control={<Radio />}
                      label="Generated resume"
                    />
                    <FormControlLabel
                      value="online"
                      control={<Radio />}
                      label="Resume online link"
                    />
                  </RadioGroup>
                </FormControl>

                {resumeSource === 'generated' ? (
                  <Box sx={{ mt: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <PersonTwoToneIcon color="primary" />
                      <Typography variant="h5">Profile source</Typography>
                    </Box>
                    <Tabs
                      value={profileMode}
                      onChange={(_e, value) => setProfileMode(value)}
                      sx={{ mb: 2 }}
                    >
                      <Tab label="Custom markdown" value="markdown" />
                      <Tab label="Custom JSON" value="json" />
                    </Tabs>

                    {profileMode === 'markdown' ? (
                      <>
                        <TextField
                          fullWidth
                          multiline
                          minRows={14}
                          placeholder="Same format as profiles.md…"
                          value={profileMarkdown}
                          onChange={(e) => setProfileMarkdown(e.target.value)}
                        />
                        <Box mt={2}>
                          <Button variant="outlined" onClick={handleLoadProfileMarkdown}>
                            Load default template
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        <TextField
                          fullWidth
                          multiline
                          minRows={14}
                          placeholder='{ "name": "…", "experience": […] }'
                          value={profileJson}
                          onChange={(e) => setProfileJson(e.target.value)}
                          inputProps={{ style: { fontFamily: 'monospace' } }}
                        />
                        <Box mt={2}>
                          <Button variant="outlined" onClick={handleLoadProfileJson}>
                            Load default as JSON
                          </Button>
                        </Box>
                      </>
                    )}

                    <Box mt={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        startIcon={<PictureAsPdfTwoToneIcon />}
                        disabled={generating}
                        onClick={handleGenerateResume}
                      >
                        {generating ? 'Generating…' : 'Generate PDF resume'}
                      </Button>
                      {form.resume_generated_id ? (
                        <Chip
                          color="success"
                          variant="outlined"
                          label={
                            selectedGeneration
                              ? `Resume #${selectedGeneration.id} · ${formatDate(selectedGeneration.created_at)}`
                              : `Resume #${form.resume_generated_id} selected`
                          }
                        />
                      ) : null}
                    </Box>
                  </Box>
                ) : (
                  <TextField
                    fullWidth
                    sx={{ mt: 1 }}
                    label="Resume online link"
                    placeholder="https://..."
                    value={form.resume_online_link}
                    onChange={handleFormChange('resume_online_link')}
                  />
                )}

                <Box display="flex" justifyContent="flex-end" mt={3}>
                  <Button
                    variant="contained"
                    startIcon={<SendTwoToneIcon />}
                    onClick={handleSubmit}
                    disabled={submitting || generating}
                  >
                    {submitting ? 'Submitting…' : 'Submit application'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <SaveResumeDialog
        open={saveDialogOpen}
        filename={pendingResume?.filename}
        buffer={pendingResume?.buffer}
        onClose={handleCloseSaveDialog}
        onSaved={handleResumeSaved}
      />
    </>
  );
}

export default ApplicationDetails;
