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
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import SaveTwoToneIcon from '@mui/icons-material/SaveTwoTone';
import FixedHeightMultilineField from 'src/components/FixedHeightMultilineField';
import ApplicationResumePdfDialog from './ApplicationResumePdfDialog';
import { listJobApplications, updateJobApplication, getJobApplication } from 'src/services/jobApplicationApi';
import { listAllIdentities } from 'src/services/identityApi';
import { listAllProfiles } from 'src/services/profileApi';
import { buildProfileContentFromJobProfile } from 'src/data/jobProfileResumeContent';
import {
  buildResumeRequest,
  generateResumePdf,
  getResumeDownloadUrl,
  listAllResumeGenerations
} from 'src/services/resumeApi';
import { appliedAtToIso, formatDateTime, formatDateTimeValue } from 'src/utils/dateFormat';
import { isDuplicateCompanyName } from 'src/utils/normalizeCompanyName';
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
  applied_at: ''
};

function ApplicationEditDialog({ open, application, onClose, onSaved }) {
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

  const [profile, setProfile] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [resumeGenerations, setResumeGenerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [appliedConfirmOpen, setAppliedConfirmOpen] = useState(false);
  const [companyDuplicate, setCompanyDuplicate] = useState(false);
  const [existingApplications, setExistingApplications] = useState([]);
  const [resumeSource, setResumeSource] = useState('generated');
  const [resumePdfFilename, setResumePdfFilename] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
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

  const busy = submitting || generating || loading;
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

  const checkCompanyDuplicate = useCallback(
    (companyValue) => {
      const trimmed = companyValue.trim();
      if (!trimmed) {
        return false;
      }
      const existingCompanies = existingApplications
        .filter((app) => app.id !== application?.id)
        .map((app) => app.company);
      return isDuplicateCompanyName(trimmed, existingCompanies);
    },
    [existingApplications, application?.id]
  );

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
      setSubmitting(false);
      setLoading(true);
      setCompanyDuplicate(false);
      setAppliedConfirmOpen(false);

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
          formatDateTimeValue(application.applied_at) || format(new Date(), 'yyyy-MM-dd HH:mm')
      });

      try {
        const skillRole =
          (application.role || '').trim() || 'Full stack engineer';
        const [fullApplication, generationRows, identityRows, profileRows, applicationRows, keywords] =
          await Promise.all([
            getJobApplication(application.id),
            listAllResumeGenerations(),
            listAllIdentities(),
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
            format(new Date(), 'yyyy-MM-dd HH:mm')
        });
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
        const identities = Array.isArray(identityRows) ? identityRows : [];
        const applications = Array.isArray(applicationRows) ? applicationRows : [];
        const generations = Array.isArray(generationRows) ? generationRows : [];

        const matchedProfile =
          profiles.find((row) => row.id === application.profile_id) || null;
        const matchedIdentity = matchedProfile
          ? identities.find((row) => row.id === matchedProfile.identity_id) || null
          : null;

        setProfile(matchedProfile);
        setIdentity(matchedIdentity);
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

        setCompanyDuplicate(
          isDuplicateCompanyName(
            (fullApplication.company || '').trim(),
            applications
              .filter((app) => app.id !== application.id)
              .map((app) => app.company)
          )
        );
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
      if (form.applied) return;
      setAppliedConfirmOpen(true);
      return;
    }

    setForm((current) => ({
      ...current,
      applied: false
    }));
  };

  const handleAppliedSectionClick = () => {
    if (loading) return;
    if (form.applied) {
      setForm((current) => ({
        ...current,
        applied: false
      }));
      return;
    }
    setAppliedConfirmOpen(true);
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

  const handleGenerateResume = async () => {
    if (!profile) {
      notify('Profile not found for this application', { variant: 'warning' });
      return;
    }
    if (!application?.id) {
      notify('Application not found', { variant: 'warning' });
      return;
    }
    if (form.job_description.trim().length < 50) {
      notify('Job description must be at least 50 characters.', { variant: 'warning' });
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
        job_vector: Array.isArray(form.job_vector) ? form.job_vector : [],
        resume_generated_id: form.resume_generated_id ? Number(form.resume_generated_id) : null,
        resume_online_link: null,
        applied: form.applied,
        applied_at: form.applied ? appliedAtToIso(form.applied_at) : null
      });
      if (generateTokenRef.current !== generateToken) return;
      onSavedRef.current?.({ silent: true });

      const { markdown } = buildProfileContentFromJobProfile(profile, identity);
      const body = buildResumeRequest({
        jobDescription: form.job_description,
        profileMode: 'markdown',
        profileMarkdown: markdown,
        profileJson: '',
        profileId: profile.id,
        applicationId: application.id
      });
      const { filename, generationId } = await generateResumePdf(body);
      if (generateTokenRef.current !== generateToken) return;

      notify(
        `Resume PDF finished and saved to the application${generationId ? ` (#${generationId})` : ''}. Downloaded ${filename}.`,
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

  const handleSubmit = async () => {
    if (!application) return;
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
      const appliedAtValue = form.applied
        ? appliedAtToIso(form.applied_at || format(new Date(), 'yyyy-MM-dd HH:mm'))
        : null;
      await updateJobApplication(application.id, {
        role: form.role.trim(),
        company: form.company.trim(),
        link: form.link.trim(),
        job_description: form.job_description.trim(),
        job_vector: Array.isArray(form.job_vector) ? form.job_vector : [],
        resume_generated_id:
          resumeSource === 'generated' && form.resume_generated_id
            ? Number(form.resume_generated_id)
            : null,
        resume_online_link:
          resumeSource === 'online' && form.resume_online_link.trim()
            ? form.resume_online_link.trim()
            : null,
        applied: form.applied,
        applied_at: appliedAtValue
      });
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
    onClose();
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
                      gap={0.75}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      {resumeSource === 'generated' ? (
                        generating ? (
                          <Chip size="small" color="warning" label="Generating PDF…" />
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
                                <IconButton
                                  component="a"
                                  href={getResumeDownloadUrl(generatedFilename)}
                                  download={generatedFilename}
                                  size="small"
                                  color="primary"
                                  aria-label={`Download ${generatedFilename}`}
                                  rel="noopener noreferrer"
                                >
                                  <FileDownloadTwoToneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
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
                          </Stack>
                        ) : (
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
                    role="button"
                    tabIndex={loading ? -1 : 0}
                    aria-pressed={form.applied}
                    onClick={handleAppliedSectionClick}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleAppliedSectionClick();
                      }
                    }}
                    sx={{
                      flexShrink: 0,
                      width: '100%',
                      minHeight: 56,
                      px: 1.75,
                      py: 1.1,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: theme.general.borderRadiusSm || theme.general.borderRadius,
                      bgcolor: form.applied
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.error.main, 0.1),
                      border: `2px solid ${
                        form.applied ? theme.palette.success.main : theme.palette.error.main
                      }`,
                      cursor: loading ? 'default' : 'pointer',
                      userSelect: 'none',
                      transition: theme.transitions.create(['background-color', 'border-color']),
                      '&:hover': loading
                        ? undefined
                        : {
                            bgcolor: form.applied
                              ? alpha(theme.palette.success.main, 0.18)
                              : alpha(theme.palette.error.main, 0.16)
                          }
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1.5}
                      width="100%"
                    >
                      <Stack direction="row" alignItems="center" spacing={1.25} minWidth={0}>
                        {form.applied ? (
                          <CheckCircleTwoToneIcon
                            sx={{ fontSize: 28, color: 'success.main', flexShrink: 0 }}
                          />
                        ) : (
                          <HighlightOffTwoToneIcon
                            sx={{ fontSize: 28, color: 'error.main', flexShrink: 0 }}
                          />
                        )}
                        <Box minWidth={0}>
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            color={form.applied ? 'success.main' : 'error.main'}
                            lineHeight={1.2}
                          >
                            {form.applied ? 'Applied' : 'Not applied'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {form.applied
                              ? 'This application has been submitted to the company.'
                              : 'Click to mark as applied after submitting to the company.'}
                          </Typography>
                        </Box>
                      </Stack>

                      <FormControlLabel
                        onClick={(event) => event.stopPropagation()}
                        control={
                          <Switch
                            checked={form.applied}
                            onChange={handleAppliedChange}
                            color={form.applied ? 'success' : 'error'}
                            disabled={loading}
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={700}>
                            {form.applied ? 'On' : 'Off'}
                          </Typography>
                        }
                        sx={{
                          m: 0,
                          flexShrink: 0,
                          pl: 1,
                          pr: 1.25,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: alpha(
                            form.applied
                              ? theme.palette.success.main
                              : theme.palette.error.main,
                            0.08
                          )
                        }}
                      />
                    </Stack>
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

      <ApplicationResumePdfDialog
        open={viewerOpen}
        filename={generatedFilename}
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
