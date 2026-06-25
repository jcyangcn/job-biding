import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import DateField from 'src/components/DateField';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import { PROJECT_NAME } from 'src/config/app';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import { useSetPageHeader } from 'src/contexts/PageHeaderContext';
import { createJobApplication } from 'src/services/jobApplicationApi';
import { listIdentities } from 'src/services/identityApi';
import { listProfiles } from 'src/services/profileApi';
import { buildProfileContentFromJobProfile } from 'src/data/jobProfileResumeContent';
import {
  buildResumeRequest,
  generateResumePdf,
  listResumeGenerations
} from 'src/services/resumeApi';
import { formatDateTime } from 'src/utils/dateFormat';

const compactButtonSx = {
  py: 0.25,
  px: 1,
  minHeight: 26,
  fontSize: '0.75rem',
  lineHeight: 1.2,
  '& .MuiButton-startIcon': {
    mr: 0.4,
    '& > svg': { fontSize: '0.95rem' }
  }
};

const compactTabSx = {
  minHeight: 26,
  '& .MuiTabs-flexContainer': { gap: 0.25 },
  '& .MuiTab-root': {
    minHeight: 26,
    minWidth: 'auto',
    py: 0,
    px: 0.75,
    fontSize: '0.75rem',
    textTransform: 'none',
    fontWeight: 600
  },
  '& .MuiTabs-indicator': { height: 2 }
};

function ApplicationDetails() {
  const theme = useTheme();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [appliedConfirmOpen, setAppliedConfirmOpen] = useState(false);
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
    resume_online_link: '',
    applied: false,
    applied_at: format(new Date(), 'yyyy-MM-dd')
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

  const applyProfileResumeContent = useCallback((profileRow, identityRow) => {
    const { markdown, json } = buildProfileContentFromJobProfile(profileRow, identityRow);
    setProfileMarkdown(markdown);
    setProfileJson(json);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRows, generationRows, identityRows] = await Promise.all([
        listProfiles(),
        listResumeGenerations(),
        listIdentities()
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
      const matchedIdentity =
        identityRows.find((row) => row.id === match.identity_id) || null;
      setProfile(match);
      setIdentity(matchedIdentity);
      applyProfileResumeContent(match, matchedIdentity);
      setResumeGenerations(generationRows);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load application data', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [applyProfileResumeContent, enqueueSnackbar, navigate, profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAppliedChange = (event) => {
    const checked = event.target.checked;
    if (checked) {
      setAppliedConfirmOpen(true);
      return;
    }

    setForm((current) => ({
      ...current,
      applied: false
    }));
  };

  const handleConfirmApplied = () => {
    setForm((current) => ({
      ...current,
      applied: true,
      applied_at: current.applied_at || format(new Date(), 'yyyy-MM-dd')
    }));
    setAppliedConfirmOpen(false);
  };

  const handleCancelApplied = () => {
    setAppliedConfirmOpen(false);
  };

  const handleResumeSourceChange = (event) => {
    const value = event.target.value;
    setResumeSource(value);
    setForm((current) => ({
      ...current,
      resume_generated_id: value === 'generated' ? current.resume_generated_id : '',
      resume_online_link: value === 'online' ? current.resume_online_link : ''
    }));
    if (value === 'generated' && profile) {
      applyProfileResumeContent(profile, identity);
    }
  };

  const handleReloadProfileContent = () => {
    if (!profile) return;
    applyProfileResumeContent(profile, identity);
    enqueueSnackbar('Reloaded profile resume data', { variant: 'success' });
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
      const { filename, generationId } = await generateResumePdf(body);
      enqueueSnackbar(`Downloaded ${filename} to your browser downloads folder`, {
        variant: 'success'
      });

      try {
        const generationRows = await listResumeGenerations();
        setResumeGenerations(generationRows);
        const selectedId = generationId || generationRows[0]?.id || '';
        if (selectedId) {
          setForm((current) => ({ ...current, resume_generated_id: selectedId }));
        }
      } catch {
        if (generationId) {
          setForm((current) => ({ ...current, resume_generated_id: generationId }));
        }
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Something went wrong.', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.link.trim()) {
      enqueueSnackbar('Link is required', { variant: 'warning' });
      return;
    }
    if (form.applied && !form.applied_at) {
      enqueueSnackbar('Applied at is required when applied is enabled', { variant: 'warning' });
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
            : null,
        applied: form.applied,
        applied_at: form.applied ? new Date(form.applied_at).toISOString() : null
      });
      enqueueSnackbar('Application saved', { variant: 'success' });
      navigate(`/applications/job-applications/${profile.id}`);
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
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
      <Box
        sx={{
          height: `calc(100vh - ${theme.header.height})`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, md: 3 },
          py: 1.5,
          boxSizing: 'border-box'
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <CardContent
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              py: 1.5,
              px: 2,
              '&:last-child': { pb: 1.5 }
            }}
          >
            <Grid container spacing={3} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <Grid
                item
                xs={12}
                md={6}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: '100%',
                  pr: { md: 1 }
                }}
              >
                <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, height: '100%' }}>
                  <Stack spacing={1.5} sx={{ flexShrink: 0 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role"
                      value={form.role}
                      onChange={handleFormChange('role')}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Company"
                      value={form.company}
                      onChange={handleFormChange('company')}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Link"
                      value={form.link}
                      onChange={handleFormChange('link')}
                      required
                    />
                  </Stack>

                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <FixedHeightMultilineField
                      fillHeight
                      label="Job description"
                      placeholder="Paste the full job posting here…"
                      value={form.job_description}
                      onChange={handleFormChange('job_description')}
                    />
                  </Box>
                </Stack>
              </Grid>

              <Grid
                item
                xs={12}
                md={6}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: '100%',
                  pl: { md: 1 },
                  borderLeft: { md: `1px solid ${theme.colors.alpha.black[10]}` }
                }}
              >
                <FormControl size="small" sx={{ flexShrink: 0, mb: 2 }}>
                  <FormLabel sx={{ fontSize: theme.typography.pxToRem(12), mb: 0.75 }}>
                    Resume source
                  </FormLabel>
                  <RadioGroup row value={resumeSource} onChange={handleResumeSourceChange}>
                    <FormControlLabel
                      value="generated"
                      control={<Radio size="small" sx={{ py: 0.25 }} />}
                      label={<Typography variant="caption">Generated resume</Typography>}
                      sx={{ mr: 1.5 }}
                    />
                    <FormControlLabel
                      value="online"
                      control={<Radio size="small" sx={{ py: 0.25 }} />}
                      label={<Typography variant="caption">Resume online link</Typography>}
                    />
                  </RadioGroup>
                </FormControl>

                {resumeSource === 'generated' ? (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={0.75}
                      sx={{ flexShrink: 0, mb: 1.5 }}
                    >
                      <Tabs
                        value={profileMode}
                        onChange={(_e, value) => setProfileMode(value)}
                        sx={compactTabSx}
                      >
                        <Tab label="Markdown" value="markdown" />
                        <Tab label="JSON" value="json" />
                      </Tabs>
                      <Button
                        size="small"
                        variant="text"
                        sx={compactButtonSx}
                        onClick={handleReloadProfileContent}
                      >
                        Reload profile
                      </Button>
                    </Box>

                    {profileMode === 'markdown' ? (
                      <FixedHeightMultilineField
                        fillHeight
                        placeholder="Same format as profiles.md…"
                        value={profileMarkdown}
                        onChange={(e) => setProfileMarkdown(e.target.value)}
                      />
                    ) : (
                      <FixedHeightMultilineField
                        fillHeight
                        monospace
                        placeholder='{ "name": "…", "experience": […] }'
                        value={profileJson}
                        onChange={(e) => setProfileJson(e.target.value)}
                      />
                    )}

                    <Box
                      mt={1.5}
                      display="flex"
                      alignItems="center"
                      gap={0.75}
                      flexWrap="wrap"
                      sx={{ flexShrink: 0 }}
                    >
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PictureAsPdfTwoToneIcon />}
                        disabled={generating}
                        onClick={handleGenerateResume}
                        sx={compactButtonSx}
                      >
                        {generating ? 'Generating…' : 'Generate PDF'}
                      </Button>
                      {form.resume_generated_id ? (
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 24, fontSize: '0.7rem' }}
                          label={
                            selectedGeneration
                              ? `#${selectedGeneration.id} · ${formatDateTime(selectedGeneration.created_at)}`
                              : `#${form.resume_generated_id} selected`
                          }
                        />
                      ) : null}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Resume online link"
                      placeholder="https://..."
                      value={form.resume_online_link}
                      onChange={handleFormChange('resume_online_link')}
                      sx={{ flexShrink: 0 }}
                    />
                    <Box flex={1} minHeight={0} />
                  </Box>
                )}

                <Divider sx={{ my: 1, flexShrink: 0 }} />

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="flex-end"
                  gap={2}
                  flexWrap="wrap"
                  sx={{ flexShrink: 0, py: 0.5 }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={form.applied ? 1.25 : 2}
                    flexWrap="wrap"
                    sx={{
                      px: form.applied ? 1.5 : 2,
                      py: form.applied ? 0.75 : 1.25,
                      borderRadius: theme.general.borderRadius,
                      bgcolor: form.applied
                        ? alpha(theme.palette.success.main, 0.14)
                        : alpha(theme.palette.error.main, 0.14),
                      border: `${form.applied ? 1 : 2}px solid ${
                        form.applied ? theme.palette.success.main : theme.palette.error.main
                      }`
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.applied}
                          onChange={handleAppliedChange}
                          color={form.applied ? 'success' : 'error'}
                          size={form.applied ? 'small' : 'medium'}
                        />
                      }
                      label={
                        <Typography
                          variant={form.applied ? 'body2' : 'subtitle1'}
                          fontWeight={700}
                        >
                          Applied
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                    {form.applied ? (
                      <DateField
                        size="small"
                        label="Applied at"
                        value={form.applied_at}
                        onChange={(value) =>
                          setForm((current) => ({ ...current, applied_at: value }))
                        }
                        required
                        sx={{ width: 150 }}
                      />
                    ) : null}
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveTwoToneIcon />}
                    onClick={handleSubmit}
                    disabled={submitting || generating}
                  >
                    {submitting ? 'Saving…' : 'Save'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={appliedConfirmOpen} onClose={handleCancelApplied} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm applied</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure applied correctly?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelApplied}>Cancel</Button>
          <Button onClick={handleConfirmApplied} variant="contained" autoFocus>
            Yes, applied
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ApplicationDetails;
