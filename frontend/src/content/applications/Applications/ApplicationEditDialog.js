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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import ApplicationAppliedSection from './ApplicationAppliedSection';
import ApplicationResumePdfDialog from './ApplicationResumePdfDialog';
import {
  getJobApplication,
  listJobApplications,
  persistApplicationScreenshotChanges,
  updateJobApplication
} from 'src/services/jobApplicationApi';
import { listAllProfiles } from 'src/services/profileApi';
import {
  buildApplicationResumeFilename,
  downloadResumePdf,
  generateResumePdf,
  listAllResumeGenerations,
  matchBestResume
} from 'src/services/resumeApi';
import { parseIdentityLabel } from 'src/data/countryCodes';
import { appliedAtToIso, formatDateTime, formatDateTimeValue } from 'src/utils/dateFormat';
import {
  findApplicationsWithSameCompany,
  isExactDuplicateApplication
} from 'src/utils/normalizeCompanyName';
import DuplicateApplicationWarning from './DuplicateApplicationWarning';
import { buildJobVector } from 'src/utils/jobVector';
import { listSkillKeywords } from 'src/services/skillApi';

function resumeFilenameFromPath(pdfPath) {
  if (!pdfPath) return '';
  const parts = String(pdfPath).replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

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
  applied_at: '',
  success_link: ''
};

function ApplicationEditDialog({ open, application, onClose, onSaved }) {
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

  const [profile, setProfile] = useState(null);
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [pendingScreenshotFile, setPendingScreenshotFile] = useState(null);
  const [existingScreenshot, setExistingScreenshot] = useState(null);
  const [removeExistingScreenshot, setRemoveExistingScreenshot] = useState(false);
  const [existingApplications, setExistingApplications] = useState([]);
  const [resumeSource, setResumeSource] = useState('generated');
  const [resumePdfFilename, setResumePdfFilename] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [skillKeywords, setSkillKeywords] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    applied_at: format(new Date(), 'yyyy-MM-dd HH:mm')
  });

  const selectedGeneration = resumeGenerations.find(
    (generation) => String(generation.id) === String(form.resume_generated_id)
  );
  const generatedFilename =
    resumePdfFilename ||
    application?.resume_pdf_filename ||
    resumeFilenameFromPath(selectedGeneration?.pdf_path);
  const hasGeneratedResume = Boolean(form.resume_generated_id);
  const resumeFromAi = profile?.resume_fromAI !== false;

  const duplicateCompanyApps = useMemo(
    () =>
      findApplicationsWithSameCompany(form.company, existingApplications, {
        excludeId: application?.id
      }),
    [form.company, existingApplications, application?.id]
  );
  const isExactDuplicate = useMemo(
    () =>
      isExactDuplicateApplication(
        { company: form.company, role: form.role, link: form.link },
        existingApplications,
        { excludeId: application?.id }
      ),
    [form.company, form.role, form.link, existingApplications, application?.id]
  );

  const busy = submitting || generating || choosing || loading;
  const mountedRef = useRef(true);
  const onSavedRef = useRef(onSaved);
  const generateTokenRef = useRef(0);

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

    if (!open || !application) {
      return () => {
        cancelled = true;
      };
    }

    const loadData = async () => {
      generateTokenRef.current += 1;
      setGenerating(false);
      setChoosing(false);
      setSubmitting(false);
      setLoading(true);
      setPendingScreenshotFile(null);
      setExistingScreenshot(null);
      setRemoveExistingScreenshot(false);

      const nextSource = application.resume_generated_id
        ? 'generated'
        : application.resume_online_link
          ? 'online'
          : 'generated';
      setResumeSource(nextSource);
      setResumePdfFilename(application.resume_pdf_filename || '');
      setViewerOpen(false);
      setForm({
        role: application.role || '',
        company: application.company || '',
        link: application.link || '',
        job_description: application.job_description || '',
        job_vector: Array.isArray(application.job_vector) ? application.job_vector : [],
        resume_generated_id: application.resume_generated_id || '',
        resume_online_link: application.resume_online_link || '',
        applied: Boolean(application.applied),
        applied_at:
          formatDateTimeValue(application.applied_at) || format(new Date(), 'yyyy-MM-dd HH:mm'),
        success_link: application.success_link || ''
      });

      try {
        const skillRole =
          (application.role || '').trim() || 'Full stack engineer';
        const [fullApplication, generationRows, profileRows, applicationRows, keywords] =
          await Promise.all([
            getJobApplication(application.id),
            listAllResumeGenerations(),
            listAllProfiles(),
            listJobApplications(application.profile_id),
            listSkillKeywords(skillRole)
          ]);
        if (cancelled) return;

        setSkillKeywords(Array.isArray(keywords) ? keywords : []);
        const jd = fullApplication.job_description || '';
        const existingVector = Array.isArray(fullApplication.job_vector)
          ? fullApplication.job_vector
          : null;
        setForm({
          role: fullApplication.role || '',
          company: fullApplication.company || '',
          link: fullApplication.link || '',
          job_description: jd,
          job_vector:
            !jd.trim()
              ? buildJobVector('', keywords || [])
              : existingVector && existingVector.length === (keywords || []).length
                ? existingVector
                : buildJobVector(jd, keywords || []),
          resume_generated_id: fullApplication.resume_generated_id || '',
          resume_online_link: fullApplication.resume_online_link || '',
          applied: Boolean(fullApplication.applied),
          applied_at:
            formatDateTimeValue(fullApplication.applied_at) ||
            format(new Date(), 'yyyy-MM-dd HH:mm'),
          success_link: fullApplication.success_link || ''
        });
        setExistingScreenshot(fullApplication.applied_screenshot || null);
        setRemoveExistingScreenshot(false);
        setPendingScreenshotFile(null);
        setResumePdfFilename(
          fullApplication.resume_pdf_filename || application.resume_pdf_filename || ''
        );
        const loadedSource = fullApplication.resume_generated_id
          ? 'generated'
          : fullApplication.resume_online_link
            ? 'online'
            : 'generated';
        setResumeSource(loadedSource);

        const profiles = Array.isArray(profileRows) ? profileRows : [];
        const applications = Array.isArray(applicationRows) ? applicationRows : [];
        const generations = Array.isArray(generationRows) ? generationRows : [];

        const matchedProfile =
          profiles.find((row) => row.id === application.profile_id) || null;

        setProfile(matchedProfile);
        setExistingApplications(applications);
        setResumeGenerations(generations);

        if (!fullApplication.resume_pdf_filename && fullApplication.resume_generated_id) {
          const matchedGeneration = generations.find(
            (generation) =>
              String(generation.id) === String(fullApplication.resume_generated_id)
          );
          const fromPath = resumeFilenameFromPath(matchedGeneration?.pdf_path);
          if (fromPath) {
            setResumePdfFilename(fromPath);
          }
        }

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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [open, application, notify]);

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
      resume_online_link: value === 'online' ? current.resume_online_link : ''
    }));
  };

  const handleGenerateResume = async () => {
    if (!profile) {
      notify('Profile not found for this application', { variant: 'warning' });
      return;
    }
    if (!application?.id) {
      notify('Application not found', { variant: 'warning' });
      return;
    }

    setGenerating(true);
    const generateToken = generateTokenRef.current + 1;
    generateTokenRef.current = generateToken;
    notify(
      'Generating PDF… this usually takes 1–3 minutes. You can close this dialog; the list will update automatically.',
      { variant: 'info' }
    );

    try {
      await updateJobApplication(application.id, {
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim() || application.link,
        job_description: form.job_description.trim(),
        job_vector: buildJobVector(form.job_description.trim(), skillKeywords),
        resume_generated_id: form.resume_generated_id ? Number(form.resume_generated_id) : null,
        resume_online_link: null,
        success_link: form.success_link.trim() ? form.success_link.trim() : null,
        applied: form.applied,
        applied_at: form.applied ? appliedAtToIso(form.applied_at) : null
      });
      if (generateTokenRef.current !== generateToken) return;
      onSavedRef.current?.({ silent: true });

      // The backend reads the job description and profile from these IDs.
      const { filename, downloadedFilename, generationId } = await generateResumePdf({
        profile_id: profile.id,
        application_id: application.id
      });
      if (generateTokenRef.current !== generateToken) return;

      notify(
        `Resume PDF finished and saved to the application${
          generationId ? ` (#${generationId})` : ''
        }. Downloaded ${downloadedFilename || filename}.`,
        { variant: 'success' }
      );
      onSavedRef.current?.({ silent: true });

      if (!mountedRef.current) return;

      if (filename) {
        setResumePdfFilename(filename);
      }

      try {
        const generationRows = await listAllResumeGenerations();
        if (generateTokenRef.current !== generateToken) return;
        setResumeGenerations(generationRows);
        const selectedId = generationId || generationRows[0]?.id || '';
        if (selectedId) {
          setForm((current) => ({ ...current, resume_generated_id: selectedId }));
          setResumeSource('generated');
        }
      } catch {
        if (generationId && generateTokenRef.current === generateToken) {
          setForm((current) => ({ ...current, resume_generated_id: generationId }));
          setResumeSource('generated');
        }
      }
    } catch (err) {
      if (generateTokenRef.current !== generateToken) return;
      notify(err.message || 'Something went wrong.', { variant: 'error' });
      onSavedRef.current?.({ silent: true });
    } finally {
      if (mountedRef.current && generateTokenRef.current === generateToken) {
        setGenerating(false);
      }
    }
  };

  const handleChooseResume = async () => {
    if (!profile) {
      notify('Profile not found for this application', { variant: 'warning' });
      return;
    }

    const jobVector = buildJobVector(form.job_description, skillKeywords);
    if (!jobVector.length) {
      notify('No skill keywords available to score this job description.', {
        variant: 'warning'
      });
      return;
    }

    setChoosing(true);
    notify('Matching best resume for this job vector…', { variant: 'info' });

    try {
      const { filename, downloadedFilename, generationId, score } = await matchBestResume({
        profileId: profile.id,
        jobVector,
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
        resume_online_link: generationId ? '' : current.resume_online_link
      }));
      if (generationId) {
        setResumeSource('generated');
      }

      try {
        const generationRows = await listAllResumeGenerations();
        if (!mountedRef.current) return;
        setResumeGenerations(generationRows);
      } catch {
        /* keep generation id already set above */
      }

      notify(
        `Best match selected${generationId ? ` (#${generationId})` : ''}${
          Number.isFinite(score) ? ` · score ${score}` : ''
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

  const handleSubmit = async () => {
    if (!application) return;
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
      const appliedAtValue = form.applied
        ? appliedAtToIso(form.applied_at || format(new Date(), 'yyyy-MM-dd HH:mm'))
        : null;
      await updateJobApplication(application.id, {
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim(),
        job_description: form.job_description.trim(),
        job_vector: buildJobVector(form.job_description.trim(), skillKeywords),
        resume_generated_id:
          resumeSource === 'generated' && form.resume_generated_id
            ? Number(form.resume_generated_id)
            : null,
        resume_online_link:
          resumeSource === 'online' && form.resume_online_link.trim()
            ? form.resume_online_link.trim()
            : null,
        success_link: form.success_link.trim() ? form.success_link.trim() : null,
        applied: form.applied,
        applied_at: appliedAtValue
      });

      if (pendingScreenshotFile || removeExistingScreenshot) {
        await persistApplicationScreenshotChanges(application.id, {
          pendingFile: pendingScreenshotFile,
          removeExisting: removeExistingScreenshot
        });
      }

      notify('Application updated', { variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message || 'Update failed', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    if (submitting) return;
    setGenerating(false);
    setChoosing(false);
    onClose();
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
            pr: 1.5,
            flexShrink: 0
          }}
        >
          <Box minWidth={0}>
            <Typography variant="h4" component="span">
              Edit application #{application?.id}
            </Typography>
            {profile ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {profile.identity_name}
                {profile.email ? ` · ${profile.email}` : ''}
              </Typography>
            ) : application?.profile_label ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {application.profile_label}
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
                      gap={0.75}
                      sx={{ flex: 1, minWidth: 0, flexWrap: 'wrap' }}
                    >
                      {resumeSource === 'generated' ? (
                        generating ? (
                          <Chip size="small" color="warning" label="Generating PDF…" />
                        ) : choosing ? (
                          <Chip size="small" color="info" label="Matching resume…" />
                        ) : hasGeneratedResume ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            sx={{ minWidth: 0 }}
                          >
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<PictureAsPdfTwoToneIcon />}
                              label={
                                generatedFilename ||
                                (selectedGeneration
                                  ? `#${selectedGeneration.id} · ${formatDateTime(selectedGeneration.created_at)}`
                                  : `#${form.resume_generated_id}`)
                              }
                              onClick={
                                generatedFilename ? () => setViewerOpen(true) : undefined
                              }
                              sx={{
                                maxWidth: 240,
                                cursor: generatedFilename ? 'pointer' : 'default',
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                            {generatedFilename ? (
                              <Tooltip title="Download PDF">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    aria-label={`Download ${generatedFilename}`}
                                    disabled={downloadingResume}
                                    onClick={async () => {
                                      setDownloadingResume(true);
                                      try {
                                        const resolvedName = await downloadResumePdf(
                                          generatedFilename,
                                          { applicationId: application.id }
                                        );
                                        notify(`Downloaded ${resolvedName}`, {
                                          variant: 'success'
                                        });
                                      } catch (err) {
                                        notify(err.message || 'Download failed', {
                                          variant: 'error'
                                        });
                                      } finally {
                                        setDownloadingResume(false);
                                      }
                                    }}
                                  >
                                    <FileDownloadTwoToneIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : null}
                            {resumeFromAi ? (
                              <Tooltip title="Regenerate resume PDF">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={loading}
                                    onClick={handleGenerateResume}
                                    aria-label="Regenerate resume PDF"
                                  >
                                    <RefreshTwoToneIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Choose a different resume">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    disabled={loading}
                                    onClick={handleChooseResume}
                                    aria-label="Choose a different resume"
                                  >
                                    <RefreshTwoToneIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        ) : resumeFromAi ? (
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            endIcon={<PictureAsPdfTwoToneIcon />}
                            disabled={loading}
                            onClick={handleGenerateResume}
                          >
                            Generate Resume PDF
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            endIcon={<DescriptionTwoToneIcon />}
                            disabled={loading}
                            onClick={handleChooseResume}
                          >
                            Choose Resume
                          </Button>
                        )
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
                  existingScreenshot={existingScreenshot}
                  removeExistingScreenshot={removeExistingScreenshot}
                  onRemoveExistingScreenshot={() => setRemoveExistingScreenshot(true)}
                  applicationId={application?.id}
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

      <ApplicationResumePdfDialog
        open={viewerOpen}
        filename={generatedFilename}
        applicationId={application.id}
        downloadFilename={buildApplicationResumeFilename(
          parseIdentityLabel(profile?.identity_name).name,
          form.company
        )}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

ApplicationEditDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  application: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export default ApplicationEditDialog;
