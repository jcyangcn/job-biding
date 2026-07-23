import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import ApplicationAppliedSection from './ApplicationAppliedSection';
import {
  createJobApplication,
  listJobApplications,
  persistApplicationScreenshotChanges,
  updateJobApplication
} from 'src/services/jobApplicationApi';
import {
  buildApplicationResumeFilename,
  generateResumePdf,
  listAllResumeGenerations,
  matchBestResume
} from 'src/services/resumeApi';
import { parseIdentityLabel } from 'src/data/countryCodes';
import { appliedAtToIso, formatDateTime } from 'src/utils/dateFormat';
import { resolveAppliedFromEvidence } from 'src/utils/applicationAppliedHelpers';
import {
  findApplicationsWithSameCompany,
  isExactDuplicateApplication
} from 'src/utils/normalizeCompanyName';
import DuplicateApplicationWarning from './DuplicateApplicationWarning';
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
  resume_distance: null,
  applied: false,
  applied_at: '',
  success_link: ''
};

function resumeFilenameFromPath(path) {
  return String(path || '').split(/[\\/]/).pop();
}

function ApplicationCreateDialog({ open, profile, onClose, onSaved }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
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

  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pendingScreenshotFile, setPendingScreenshotFile] = useState(null);
  const [existingApplications, setExistingApplications] = useState([]);
  const [resumeSource, setResumeSource] = useState('generated');
  const [choosing, setChoosing] = useState(false);
  const [draftApplicationId, setDraftApplicationId] = useState(null);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
  });

  const resumeFromAi = profile?.resume_fromAI !== false;
  const selectedGeneration = resumeGenerations.find(
    (generation) => generation.id === form.resume_generated_id
  );

  const duplicateCompanyApps = useMemo(
    () => findApplicationsWithSameCompany(form.company, existingApplications),
    [form.company, existingApplications]
  );
  const isExactDuplicate = useMemo(
    () =>
      isExactDuplicateApplication(
        { company: form.company, role: form.role, link: form.link },
        existingApplications
      ),
    [form.company, form.role, form.link, existingApplications]
  );

  const busy = submitting || generating || choosing || loading;
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
      setPendingScreenshotFile(null);
      setResumeSource('generated');
      setChoosing(false);
      setDraftApplicationId(null);
      setSkillKeywords([]);
      setForm({
        ...EMPTY_FORM,
        role: profile.roles || '',
        applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
      });

      try {
        const skillRole = (profile.roles || '').trim() || 'Full stack engineer';
        const [generationRows, applicationRows, keywords] = await Promise.all([
          listAllResumeGenerations(),
          listJobApplications(profile.id),
          listSkillKeywords(skillRole)
        ]);
        if (cancelled) return;

        const applications = Array.isArray(applicationRows) ? applicationRows : [];
        const generations = Array.isArray(generationRows) ? generationRows : [];
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

  const handleJobDescriptionChange = (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      job_description: value,
      job_vector: buildJobVector(value, skillKeywords)
    }));
  };

  const handleAppliedSectionChange = (updates) => {
    setForm((current) => ({ ...current, ...updates }));
  };

  const handleResumeSourceChange = (_event, value) => {
    if (!value) return;
    setResumeSource(value);
    setForm((current) => ({
      ...current,
      resume_generated_id: value === 'generated' ? current.resume_generated_id : '',
      resume_online_link: value === 'online' ? current.resume_online_link : '',
      resume_distance: value === 'generated' ? current.resume_distance : null
    }));
  };

  const buildApplicationPayload = useCallback(
    (resumeGeneratedId = null) => {
      const jobDescription = form.job_description.trim();
      const hasEvidence =
        Boolean(pendingScreenshotFile) || Boolean(form.success_link?.trim());
      const appliedState = hasEvidence
        ? resolveAppliedFromEvidence({
            successLink: form.success_link,
            hasScreenshot: Boolean(pendingScreenshotFile),
            appliedAt: form.applied_at
          })
        : { applied: form.applied, applied_at: form.applied_at };

      return {
        profile_id: profile.id,
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim(),
        job_description: jobDescription,
        job_vector: buildJobVector(jobDescription, skillKeywords),
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
        resume_distance:
          resumeSource === 'generated' && Number.isFinite(form.resume_distance)
            ? form.resume_distance
            : null,
        success_link: form.success_link.trim() ? form.success_link.trim() : null,
        applied: appliedState.applied,
        applied_at: appliedState.applied
          ? appliedAtToIso(
              appliedState.applied_at || format(new Date(), 'yyyy-MM-dd HH:mm')
            )
          : null
      };
    },
    [profile, form, resumeSource, skillKeywords, pendingScreenshotFile]
  );

  const ensureApplicationRecord = useCallback(async () => {
    if (!profile) {
      throw new Error('Profile is required');
    }
    if (!form.link.trim()) {
      throw new Error('Link is required before generating a resume');
    }

    const payload = buildApplicationPayload();
    if (draftApplicationId) {
      const updated = await updateJobApplication(draftApplicationId, {
        role: payload.role,
        company: payload.company,
        link: payload.link,
        job_description: payload.job_description,
        job_vector: payload.job_vector,
        resume_generated_id: payload.resume_generated_id,
        resume_online_link: payload.resume_online_link,
        resume_distance: payload.resume_distance,
        success_link: payload.success_link,
        applied: payload.applied,
        applied_at: payload.applied_at
      });
      if (pendingScreenshotFile) {
        await persistApplicationScreenshotChanges(updated.id, {
          pendingFile: pendingScreenshotFile,
          removeExisting: false
        });
      }
      return updated.id;
    }

    const created = await createJobApplication(payload);
    if (mountedRef.current) {
      setDraftApplicationId(created.id);
    }
    if (pendingScreenshotFile) {
      await persistApplicationScreenshotChanges(created.id, {
        pendingFile: pendingScreenshotFile,
        removeExisting: false
      });
    }
    onSavedRef.current?.({ silent: true });
    return created.id;
  }, [profile, form.link, form.job_description, buildApplicationPayload, draftApplicationId, pendingScreenshotFile]);

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
      onSaved?.({ silent: true });
    } catch (err) {
      if (mountedRef.current) {
        setGenerating(false);
      }
      notifyFn(err.message || 'Something went wrong.', { variant: 'error' });
      return;
    }

    try {
      // The backend reads the job description and profile from these IDs.
      const { filename, downloadedFilename, generationId } = await generateResumePdf({
        profile_id: profile.id,
        application_id: applicationId
      });

      notifyFn(
        `Resume PDF finished and saved to the application${
          generationId ? ` (#${generationId})` : ''
        }. Downloaded ${downloadedFilename || filename}.`,
        { variant: 'success' }
      );
      onSaved?.({ silent: true });

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

  const handleChooseResume = async () => {
    if (!profile) return;

    const jobVector = buildJobVector(form.job_description, skillKeywords);
    if (!jobVector.length) {
      notify('No skill keywords available to compare this job description.', {
        variant: 'warning'
      });
      return;
    }

    setChoosing(true);
    notify('Finding the resume with the smallest weighted distance…', {
      variant: 'info'
    });

    try {
      const applicationId = await ensureApplicationRecord();
      const { filename, downloadedFilename, generationId, distance } = await matchBestResume({
        profileId: profile.id,
        jobVector,
        applicationId,
        downloadFilename: buildApplicationResumeFilename(
          parseIdentityLabel(profile.identity_name).name,
          form.company
        )
      });

      if (!mountedRef.current) return;

      setForm((current) => ({
        ...current,
        job_vector: jobVector,
        resume_generated_id: generationId || current.resume_generated_id,
        resume_online_link: generationId ? '' : current.resume_online_link,
        resume_distance: Number.isFinite(distance) ? distance : null
      }));
      if (generationId) {
        setResumeSource('generated');
      }
      onSaved?.({ silent: true });

      try {
        const generationRows = await listAllResumeGenerations();
        if (!mountedRef.current) return;
        setResumeGenerations(generationRows);
        const selectedId = generationId || '';
        if (selectedId) {
          setForm((current) => ({
            ...current,
            resume_generated_id: selectedId,
            resume_online_link: ''
          }));
        }
      } catch {
        /* keep generation id already set above */
      }

      notify(
        `Best match selected${generationId ? ` (#${generationId})` : ''}${
          Number.isFinite(distance) ? ` · distance ${distance.toFixed(2)}` : ''
        }. Downloaded ${downloadedFilename || filename}.`,
        { variant: 'success' }
      );
    } catch (err) {
      if (mountedRef.current) {
        notify(err.message || 'Failed to choose resume', { variant: 'error' });
      }
    } finally {
      if (mountedRef.current) {
        setChoosing(false);
      }
    }
  };

  const handleDialogClose = () => {
    if (submitting) return;
    // Closing must always clear this dialog's generating UI. Background PDF work
    // continues via captured refreshList/notifyFn above; a new Add opens a fresh dialog.
    setGenerating(false);
    setChoosing(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!form.link.trim()) {
      notify('Link is required', { variant: 'warning' });
      return;
    }
    if (isExactDuplicate) {
      notify(
        'An identical application (same company, role, and link) already exists.',
        { variant: 'warning' }
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildApplicationPayload();
      let applicationId = draftApplicationId;
      if (draftApplicationId) {
        await updateJobApplication(draftApplicationId, {
          role: payload.role,
          company: payload.company,
          link: payload.link,
          job_description: payload.job_description,
          job_vector: payload.job_vector,
          resume_generated_id: payload.resume_generated_id,
          resume_online_link: payload.resume_online_link,
          resume_distance: payload.resume_distance,
          success_link: payload.success_link,
          applied: payload.applied,
          applied_at: payload.applied_at
        });
      } else {
        const created = await createJobApplication(payload);
        applicationId = created.id;
      }

      if (applicationId && pendingScreenshotFile) {
        await persistApplicationScreenshotChanges(applicationId, {
          pendingFile: pendingScreenshotFile,
          removeExisting: false
        });
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
        fullScreen={isSmallScreen}
        maxWidth="lg"
        PaperProps={{
          sx: {
            height: { xs: '100%', md: '55vh' },
            minHeight: { md: 'min(560px, 90vh)' },
            maxHeight: { xs: '100%', md: '90vh' },
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
            overflowX: 'hidden',
            overflowY: 'auto',
            py: 1.5
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: { md: 360 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'stretch'
            }}
          >
            <Box
              sx={{
                flex: { xs: 'none', md: 1 },
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
                  fillHeight={!isSmallScreen}
                  height={isSmallScreen ? 200 : undefined}
                  label="Job description"
                  placeholder="Paste the full job posting here…"
                  value={form.job_description}
                  onChange={handleJobDescriptionChange}
                  disabled={loading}
                />

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
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    gap={1}
                    sx={{
                      minWidth: 0,
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}
                  >
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={resumeSource}
                      onChange={handleResumeSourceChange}
                      disabled={loading}
                      sx={{
                        flexShrink: 0,
                        alignSelf: { xs: 'flex-start', sm: 'auto' },
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
                      <ToggleButton
                        value="generated"
                        aria-label={resumeFromAi ? 'AI generate' : 'Choose resume'}
                      >
                        {resumeFromAi ? (
                          <AutoAwesomeTwoToneIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <DescriptionTwoToneIcon sx={{ fontSize: 16 }} />
                        )}
                        {resumeFromAi ? 'AI generate' : 'Choose'}
                      </ToggleButton>
                      <ToggleButton value="online" aria-label="Online">
                        <LinkTwoToneIcon sx={{ fontSize: 16 }} />
                        Online
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                      gap={1}
                      sx={{ flex: 1, minWidth: 0, flexWrap: 'wrap' }}
                    >
                      {resumeSource === 'generated' ? (
                        <>
                          {resumeFromAi ? (
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
                          ) : (
                            <Button
                              size="small"
                              color="primary"
                              variant="contained"
                              endIcon={<DescriptionTwoToneIcon />}
                              disabled={choosing || loading}
                              onClick={handleChooseResume}
                            >
                              {choosing ? 'Choosing…' : 'Choose Resume'}
                            </Button>
                          )}
                          {form.resume_generated_id ? (
                            <>
                              <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label={
                                  resumeFilenameFromPath(selectedGeneration?.pdf_path) ||
                                  (selectedGeneration
                                    ? `#${selectedGeneration.id} · ${formatDateTime(
                                        selectedGeneration.created_at
                                      )}`
                                    : `#${form.resume_generated_id} selected`)
                                }
                              />
                              {form.resume_distance != null &&
                              Number.isFinite(Number(form.resume_distance)) ? (
                                <Chip
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  label={`Distance: ${Number(form.resume_distance).toFixed(2)}`}
                                />
                              ) : null}
                            </>
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
                flex: { xs: 'none', md: 1 },
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
                  onChange={handleFormChange('company')}
                  error={isExactDuplicate}
                  disabled={loading}
                />
                <DuplicateApplicationWarning
                  matches={duplicateCompanyApps}
                  exact={isExactDuplicate}
                />

                <Box sx={{ flex: 1, minHeight: 0, display: { xs: 'none', md: 'block' } }} />

                <ApplicationAppliedSection
                  applied={form.applied}
                  successLink={form.success_link}
                  appliedAt={form.applied_at}
                  onChange={handleAppliedSectionChange}
                  pendingScreenshotFile={pendingScreenshotFile}
                  onPendingScreenshotChange={setPendingScreenshotFile}
                  applicationId={draftApplicationId}
                  disabled={loading || submitting}
                />
              </Stack>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, flexShrink: 0 }}>
          <Button onClick={handleDialogClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveTwoToneIcon />}
            onClick={handleSubmit}
            disabled={busy || isExactDuplicate}
          >
            {submitting ? 'Saving…' : 'Save'}
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
