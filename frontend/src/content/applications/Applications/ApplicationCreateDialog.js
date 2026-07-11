import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import CloseIcon from '@mui/icons-material/Close';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import { createJobApplication, listJobApplications, updateJobApplication } from 'src/services/jobApplicationApi';
import { listAllIdentities } from 'src/services/identityApi';
import { buildProfileContentFromJobProfile } from 'src/data/jobProfileResumeContent';
import {
  buildResumeRequest,
  generateResumePdf,
  listAllResumeGenerations
} from 'src/services/resumeApi';
import { appliedAtToIso, formatDateTime } from 'src/utils/dateFormat';
import { isDuplicateCompanyName } from 'src/utils/normalizeCompanyName';
import { buildJobVector } from 'src/utils/jobVector';
import { listSkillKeywords } from 'src/services/skillApi';

const APPLICATION_SNACKBAR = {
  anchorOrigin: { vertical: 'top', horizontal: 'center' }
};

const EMPTY_FORM = {
  role: '',
  company: '',
  link: '',
  job_description: '',
  job_vector: [],
  resume_generated_id: '',
  resume_online_link: '',
  applied: false,
  applied_at: ''
};

function ApplicationCreateDialog({ open, profile, onClose, onSaved }) {
  const theme = useTheme();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const notify = useCallback(
    (message, options = {}) =>
      enqueueSnackbar(message, {
        ...options,
        anchorOrigin: options.anchorOrigin ?? APPLICATION_SNACKBAR.anchorOrigin,
        action:
          options.action ??
          ((snackbarId) => (
            <IconButton
              size="small"
              color="inherit"
              aria-label="Close"
              onClick={() => closeSnackbar(snackbarId)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ))
      }),
    [enqueueSnackbar, closeSnackbar]
  );

  const [identity, setIdentity] = useState(null);
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [appliedConfirmOpen, setAppliedConfirmOpen] = useState(false);
  const [companyDuplicate, setCompanyDuplicate] = useState(false);
  const [existingApplications, setExistingApplications] = useState([]);
  const [resumeSource, setResumeSource] = useState('generated');
  const [draftApplicationId, setDraftApplicationId] = useState(null);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
  });

  const selectedGeneration = resumeGenerations.find(
    (generation) => generation.id === form.resume_generated_id
  );

  const busy = submitting || generating || loading;
  const mountedRef = useRef(true);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const checkCompanyDuplicate = useCallback(
    (companyValue) => {
      const trimmed = companyValue.trim();
      if (!trimmed) {
        return false;
      }
      const existingCompanies = existingApplications.map((app) => app.company);
      return isDuplicateCompanyName(trimmed, existingCompanies);
    },
    [existingApplications]
  );

  useEffect(() => {
    let cancelled = false;

    if (!open || !profile) {
      return () => {
        cancelled = true;
      };
    }

    const resetAndLoad = async () => {
      setGenerating(false);
      setSubmitting(false);
      setLoading(true);
      setCompanyDuplicate(false);
      setAppliedConfirmOpen(false);
      setResumeSource('generated');
      setDraftApplicationId(null);
      setSkillKeywords([]);
      setForm({
        ...EMPTY_FORM,
        role: profile.roles || '',
        applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
      });

      try {
        const skillRole = (profile.roles || '').trim() || 'Full stack engineer';
        const [generationRows, identityRows, applicationRows, keywords] = await Promise.all([
          listAllResumeGenerations(),
          listAllIdentities(),
          listJobApplications(profile.id),
          listSkillKeywords(skillRole)
        ]);
        if (cancelled) return;

        const identities = Array.isArray(identityRows) ? identityRows : [];
        const applications = Array.isArray(applicationRows) ? applicationRows : [];
        const generations = Array.isArray(generationRows) ? generationRows : [];
        const matchedIdentity =
          identities.find((row) => row.id === profile.identity_id) || null;
        setIdentity(matchedIdentity);
        setExistingApplications(applications);
        setResumeGenerations(generations);
        setSkillKeywords(Array.isArray(keywords) ? keywords : []);
        setForm((current) => ({
          ...current,
          job_vector: buildJobVector(current.job_description, keywords || [])
        }));
      } catch (err) {
        if (!cancelled) {
          notify(err.message || 'Failed to load application data', { variant: 'error' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    resetAndLoad();

    return () => {
      cancelled = true;
    };
  }, [open, profile, notify]);

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleRefreshJobVector = () => {
    const nextVector = buildJobVector(form.job_description, skillKeywords);
    setForm((current) => ({ ...current, job_vector: nextVector }));
  };

  const handleCompanyChange = (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, company: value }));
    setCompanyDuplicate(checkCompanyDuplicate(value));
  };

  const handleCompanyBlur = () => {
    if (checkCompanyDuplicate(form.company)) {
      notify('This company has already been applied to for this profile.', {
        variant: 'warning'
      });
    }
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
      applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
    }));
    setAppliedConfirmOpen(false);
  };

  const handleCancelApplied = () => {
    setAppliedConfirmOpen(false);
  };

  const handleResumeSourceChange = (_event, value) => {
    if (!value) return;
    setResumeSource(value);
    setForm((current) => ({
      ...current,
      resume_generated_id: value === 'generated' ? current.resume_generated_id : '',
      resume_online_link: value === 'online' ? current.resume_online_link : ''
    }));
  };

  const buildApplicationPayload = useCallback(
    (resumeGeneratedId = null) => ({
      profile_id: profile.id,
      role: form.role.trim(),
      company: form.company.trim(),
      link: form.link.trim(),
      job_description: form.job_description.trim(),
      job_vector: Array.isArray(form.job_vector) ? form.job_vector : [],
      resume_generated_id:
        resumeSource === 'generated' && resumeGeneratedId
          ? resumeGeneratedId
          : resumeSource === 'generated' && form.resume_generated_id
            ? form.resume_generated_id
            : null,
      resume_online_link:
        resumeSource === 'online' && form.resume_online_link.trim()
          ? form.resume_online_link.trim()
          : null,
      applied: form.applied,
      applied_at: form.applied
        ? appliedAtToIso(form.applied_at || format(new Date(), 'yyyy-MM-dd HH:mm'))
        : null
    }),
    [profile, form, resumeSource]
  );

  const ensureApplicationRecord = useCallback(async () => {
    if (!profile) {
      throw new Error('Profile is required');
    }
    if (!form.link.trim()) {
      throw new Error('Link is required before generating a resume');
    }
    if (form.job_description.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters.');
    }

    const payload = buildApplicationPayload();
    if (draftApplicationId) {
      const updated = await updateJobApplication(draftApplicationId, {
        role: payload.role,
        company: payload.company,
        link: payload.link,
        job_description: payload.job_description,
        resume_generated_id: payload.resume_generated_id,
        resume_online_link: payload.resume_online_link,
        applied: payload.applied,
        applied_at: payload.applied_at
      });
      return updated.id;
    }

    const created = await createJobApplication(payload);
    if (mountedRef.current) {
      setDraftApplicationId(created.id);
    }
    onSavedRef.current?.({ silent: true });
    return created.id;
  }, [profile, form.link, form.job_description, buildApplicationPayload, draftApplicationId]);

  const handleGenerateResume = async () => {
    if (!profile) return;

    setGenerating(true);
    notify(
      'Generating PDF… this usually takes 1–3 minutes. You can close this dialog; the list will update automatically.',
      { variant: 'info' }
    );

    const refreshList = onSavedRef.current;
    const notifyFn = notify;

    let applicationId;
    try {
      applicationId = await ensureApplicationRecord();
      refreshList?.({ silent: true });
    } catch (err) {
      if (mountedRef.current) {
        setGenerating(false);
      }
      notifyFn(err.message || 'Something went wrong.', { variant: 'error' });
      return;
    }

    // Capture inputs now; generation continues even if this dialog unmounts.
    const { markdown } = buildProfileContentFromJobProfile(profile, identity);
    const body = buildResumeRequest({
      jobDescription: form.job_description,
      profileMode: 'markdown',
      profileMarkdown: markdown,
      profileJson: '',
      profileId: profile.id,
      applicationId
    });

    try {
      const { filename, generationId } = await generateResumePdf(body);

      notifyFn(
        `Resume PDF finished and saved to the application${generationId ? ` (#${generationId})` : ''}. Downloaded ${filename}.`,
        { variant: 'success' }
      );
      refreshList?.({ silent: true });

      // Only update this dialog instance if it is still open.
      if (!mountedRef.current) return;

      try {
        const generationRows = await listAllResumeGenerations();
        if (!mountedRef.current) return;
        setResumeGenerations(generationRows);
        const selectedId = generationId || generationRows[0]?.id || '';
        if (selectedId) {
          setForm((current) => ({ ...current, resume_generated_id: selectedId }));
          setResumeSource('generated');
        }
      } catch {
        if (generationId && mountedRef.current) {
          setForm((current) => ({ ...current, resume_generated_id: generationId }));
          setResumeSource('generated');
        }
      }
    } catch (err) {
      notifyFn(err.message || 'Something went wrong.', { variant: 'error' });
      refreshList?.({ silent: true });
    } finally {
      if (mountedRef.current) {
        setGenerating(false);
      }
    }
  };

  const handleDialogClose = () => {
    if (submitting) return;
    // Closing must always clear this dialog's generating UI. Background PDF work
    // continues via captured refreshList/notifyFn above; a new Add opens a fresh dialog.
    setGenerating(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.link.trim()) {
      notify('Link is required', { variant: 'warning' });
      return;
    }
    if (checkCompanyDuplicate(form.company)) {
      setCompanyDuplicate(true);
      notify('This company has already been applied to for this profile.', {
        variant: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildApplicationPayload();
      if (draftApplicationId) {
        await updateJobApplication(draftApplicationId, {
          role: payload.role,
          company: payload.company,
          link: payload.link,
          job_description: payload.job_description,
          resume_generated_id: payload.resume_generated_id,
          resume_online_link: payload.resume_online_link,
          applied: payload.applied,
          applied_at: payload.applied_at
        });
      } else {
        await createJobApplication(payload);
      }
      notify('Application saved', { variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            height: { md: '55vh' },
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1.5
          }}
        >
          <Box minWidth={0}>
            <Typography variant="h4" component="span">
              Add application
            </Typography>
            {profile ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {profile.identity_name}
                {profile.email ? ` · ${profile.email}` : ''}
              </Typography>
            ) : null}
          </Box>
          <IconButton
            aria-label="Close"
            onClick={handleDialogClose}
            disabled={submitting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            py: 1.5
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'stretch'
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                pr: { md: 1 },
                borderRight: { md: `1px solid ${theme.colors.alpha.black[10]}` }
              }}
            >
              <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                <FixedHeightMultilineField
                  fillHeight
                  label="Job description"
                  placeholder="Paste the full job posting here…"
                  value={form.job_description}
                  onChange={handleFormChange('job_description')}
                  disabled={loading}
                />

                <Box
                  display="flex"
                  alignItems="flex-start"
                  gap={1}
                  sx={{ flexShrink: 0 }}
                >
                  <TextField
                    fullWidth
                    label="Job vector"
                    value={JSON.stringify(form.job_vector || [])}
                    multiline
                    minRows={3}
                    maxRows={6}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.85rem'
                      }
                    }}
                    helperText={
                      skillKeywords.length
                        ? `${skillKeywords.length} keywords · empty JD = all zeros · Refresh after editing JD`
                        : 'No skill keywords found — vector stays empty'
                    }
                    disabled={loading}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<RefreshTwoToneIcon />}
                    onClick={handleRefreshJobVector}
                    disabled={loading || !skillKeywords.length}
                    sx={{ mt: 1, flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    Refresh
                  </Button>
                </Box>

                <Stack spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    Resume
                  </Typography>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    sx={{ minWidth: 0 }}
                  >
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={resumeSource}
                      onChange={handleResumeSourceChange}
                      disabled={loading}
                      sx={{
                        flexShrink: 0,
                        border: `1px solid ${theme.colors.alpha.black[30]}`,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        '& .MuiToggleButton-root': {
                          px: 1.25,
                          py: 0.5,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          border: 0,
                          gap: 0.5
                        }
                      }}
                    >
                      <ToggleButton value="generated" aria-label="AI generate">
                        <AutoAwesomeTwoToneIcon sx={{ fontSize: 16 }} />
                        AI generate
                      </ToggleButton>
                      <ToggleButton value="online" aria-label="Online">
                        <LinkTwoToneIcon sx={{ fontSize: 16 }} />
                        Online
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-end"
                      gap={1}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      {resumeSource === 'generated' ? (
                        <>
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            endIcon={<PictureAsPdfTwoToneIcon />}
                            disabled={generating || loading}
                            onClick={handleGenerateResume}
                          >
                            {generating ? 'Generating PDF…' : 'Generate Resume PDF'}
                          </Button>
                          {form.resume_generated_id ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              label={
                                selectedGeneration
                                  ? `#${selectedGeneration.id} · ${formatDateTime(selectedGeneration.created_at)}`
                                  : `#${form.resume_generated_id} selected`
                              }
                            />
                          ) : null}
                        </>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="https://..."
                          value={form.resume_online_link}
                          onChange={handleFormChange('resume_online_link')}
                          disabled={loading}
                        />
                      )}
                    </Box>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                pl: { md: 1 }
              }}
            >
              <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, height: '100%' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Link"
                  value={form.link}
                  onChange={handleFormChange('link')}
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Role"
                  value={form.role}
                  onChange={handleFormChange('role')}
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Company"
                  value={form.company}
                  onChange={handleCompanyChange}
                  onBlur={handleCompanyBlur}
                  error={companyDuplicate}
                  helperText={
                    companyDuplicate
                      ? 'This company has already been applied to for this profile.'
                      : ''
                  }
                  disabled={loading}
                />

                <Box sx={{ flex: 1, minHeight: 0 }} />

                <Stack spacing={1.25} sx={{ flexShrink: 0 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    gap={2}
                    flexWrap="wrap"
                    sx={{ flexShrink: 0 }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                      flexWrap="wrap"
                      sx={{
                        minHeight: 56,
                        px: 1.75,
                        py: 1.1,
                        borderRadius: theme.general.borderRadius,
                        bgcolor: form.applied
                          ? alpha(theme.palette.success.main, 0.14)
                          : alpha(theme.palette.error.main, 0.14),
                        border: `2px solid ${
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
                            disabled={loading}
                          />
                        }
                        label={
                          <Typography variant="h6" fontWeight={800}>
                            Applied
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    </Box>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="flex-end"
                    sx={{ flexShrink: 0 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<SaveTwoToneIcon />}
                      onClick={handleSubmit}
                      disabled={busy}
                    >
                      {submitting ? 'Saving…' : 'Save'}
                    </Button>
                    <Button onClick={handleDialogClose} disabled={submitting}>
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

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

ApplicationCreateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  profile: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export default ApplicationCreateDialog;
