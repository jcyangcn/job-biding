import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  CircularProgress,
  Grid,
  Link,
  Paper,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import CalendarTodayTwoToneIcon from '@mui/icons-material/CalendarTodayTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import PersonPinTwoToneIcon from '@mui/icons-material/PersonPinTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import {
  DetailDialog,
  DetailField,
  DetailTextSection,
  formatDetailDate
} from 'src/components/DetailDialog';
import CitizenImagePreviewOverlay from 'src/content/applications/CitizenManagement/CitizenImagePreviewOverlay';
import ApplicationScreenshotThumb from './ApplicationScreenshotThumb';
import { getJobApplication } from 'src/services/jobApplicationApi';
import { parseProfileDefaultResumeRef } from 'src/utils/profileDefaultResumeRef';
import externalUrl from 'src/utils/externalUrl';

function ApplicationDetailDialog({ open, application, onClose }) {
  const theme = useTheme();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const applicationId = application?.id;

  useEffect(() => {
    let cancelled = false;

    if (!open || !applicationId) {
      setDetail(null);
      setError('');
      setLoading(false);
      setImagePreview(null);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      setDetail(null);
      try {
        const full = await getJobApplication(applicationId);
        if (!cancelled) {
          setDetail(full);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load application details');
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, applicationId]);

  if (!application) {
    return null;
  }

  const view = detail || application;
  const company = view.company?.trim();
  const role = view.role?.trim();
  const title = [company, role].filter(Boolean).join(' · ') || 'Application details';
  const caption = `#${view.id}${
    formatDetailDate(view.applied_at) ? ` · ${formatDetailDate(view.applied_at)}` : ''
  }`;
  const hasJobLink = Boolean(view.link?.trim());
  const hasSuccessLink = Boolean(view.success_link?.trim());
  const hasResumeLink = Boolean(view.resume_online_link?.trim());
  const hasGeneratedResume = Boolean(view.resume_generated_id);
  const defaultResumeRef = parseProfileDefaultResumeRef(view.resume_online_link);
  const jobDescription = detail?.job_description;
  const screenshot = view.applied_screenshot;

  return (
    <>
      <DetailDialog open={open} onClose={onClose} title={title} caption={caption}>
        {error ? (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        ) : null}
        <Grid container spacing={2}>
          <DetailField
            label="Company"
            value={view.company?.trim() || '—'}
            icon={BusinessTwoToneIcon}
          />
          <DetailField label="Role" value={view.role?.trim() || '—'} icon={WorkTwoToneIcon} />
          <DetailField
            label="Bidder"
            value={view.bidder_name?.trim() || view.bidder_username?.trim() || '—'}
            icon={PersonPinTwoToneIcon}
          />
          <DetailField label="Applied" icon={CalendarTodayTwoToneIcon}>
            <Typography variant="body1">
              {view.applied ? formatDetailDate(view.applied_at) || '—' : 'Not applied'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Created {formatDetailDate(view.created_at) || '—'}
            </Typography>
          </DetailField>
          <DetailField label="Resume" icon={PictureAsPdfTwoToneIcon}>
            {hasGeneratedResume ? (
              <Typography variant="body1">Generated resume #{view.resume_generated_id}</Typography>
            ) : defaultResumeRef ? (
              <Typography variant="body1">{defaultResumeRef.filename}</Typography>
            ) : hasResumeLink ? (
              <Link
                href={externalUrl(view.resume_online_link)}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ wordBreak: 'break-all' }}
              >
                Online resume
              </Link>
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </DetailField>
          <DetailField label="Job link" icon={LinkTwoToneIcon} xs={12} sm={12}>
            {hasJobLink ? (
              <Link
                href={externalUrl(view.link)}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ wordBreak: 'break-all', display: 'inline-block', mt: 0.5 }}
              >
                {view.link}
              </Link>
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </DetailField>
          <DetailField label="Success link" icon={CheckCircleTwoToneIcon} xs={12} sm={12}>
            {hasSuccessLink ? (
              <Link
                href={externalUrl(view.success_link)}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{ wordBreak: 'break-all', display: 'inline-block', mt: 0.5 }}
              >
                {view.success_link}
              </Link>
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </DetailField>
        </Grid>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mt: 2.5,
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Applied screenshot
          </Typography>
          {screenshot ? (
            <Box
              sx={{
                width: '100%',
                height: 200,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.primary.main, 0.04)
              }}
            >
              <ApplicationScreenshotThumb
                applicationId={view.id}
                image={screenshot}
                fill
                fillMode="contain"
                alt={role || 'Application screenshot'}
                onPreview={setImagePreview}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                height: 200,
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled'
              }}
            >
              <Typography variant="caption">No screenshot</Typography>
            </Box>
          )}
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" gap={1} py={3}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">
              Loading job description…
            </Typography>
          </Box>
        ) : (
          <DetailTextSection
            title="Job description"
            icon={DescriptionTwoToneIcon}
            text={jobDescription}
            emptyText={error ? 'Could not load job description.' : 'No job description provided.'}
          />
        )}
      </DetailDialog>

      <CitizenImagePreviewOverlay
        open={Boolean(imagePreview?.src)}
        src={imagePreview?.src}
        title={imagePreview?.title}
        onClose={() => setImagePreview(null)}
      />
    </>
  );
}

ApplicationDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  application: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default ApplicationDetailDialog;
