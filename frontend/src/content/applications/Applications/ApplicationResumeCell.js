import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import {
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import LinkTwoToneIcon from '@mui/icons-material/LinkTwoTone';
import Label from 'src/components/Label';
import ApplicationResumePdfDialog from './ApplicationResumePdfDialog';
import { downloadProfileDefaultResume } from 'src/services/profileApi';
import { buildApplicationResumeFilename, downloadResumePdf } from 'src/services/resumeApi';
import { parseProfileDefaultResumeRef } from 'src/utils/profileDefaultResumeRef';
import { parseIdentityLabel } from 'src/data/countryCodes';

function ApplicationResumeCell({ row }) {
  const { enqueueSnackbar } = useSnackbar();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const filename = row.resume_pdf_filename;
  const status = row.resume_generation_status;
  const hasGeneratedPdf = Boolean(row.resume_generated_id && filename);
  const defaultResumeRef = parseProfileDefaultResumeRef(row.resume_online_link);
  const downloadFilename = buildApplicationResumeFilename(
    parseIdentityLabel(row.profile_label).name,
    row.company
  );

  if (status === 'generating') {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={(event) => event.stopPropagation()}
      >
        <CircularProgress size={16} thickness={5} color="warning" />
        <Label color="warning">Generating…</Label>
      </Stack>
    );
  }

  if (status === 'failed') {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={(event) => event.stopPropagation()}
      >
        <ErrorTwoToneIcon color="error" sx={{ fontSize: 18 }} />
        <Label color="error">Failed</Label>
      </Stack>
    );
  }

  if (hasGeneratedPdf) {
    const handleDownload = async (event) => {
      event.stopPropagation();
      setDownloading(true);
      try {
        const resolvedName = await downloadResumePdf(filename, {
          applicationId: row.id
        });
        enqueueSnackbar(`Downloaded ${resolvedName}`, { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(err.message || 'Download failed', { variant: 'error' });
      } finally {
        setDownloading(false);
      }
    };

    return (
      <>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          minWidth={0}
          onClick={(event) => event.stopPropagation()}
        >
          <Tooltip title="View resume PDF">
            <Typography
              component="button"
              type="button"
              variant="body2"
              onClick={(event) => {
                event.stopPropagation();
                setViewerOpen(true);
              }}
              sx={{
                all: 'unset',
                wordBreak: 'break-all',
                fontWeight: 500,
                minWidth: 0,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'primary.main',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                '&:hover': {
                  textDecorationColor: 'currentColor'
                }
              }}
            >
              {downloadFilename}
            </Typography>
          </Tooltip>
          <Tooltip title="Download PDF">
            <span>
              <IconButton
                size="small"
                color="primary"
                aria-label={`Download ${downloadFilename}`}
                disabled={downloading}
                onClick={handleDownload}
                sx={{ flexShrink: 0 }}
              >
                {downloading ? (
                  <CircularProgress size={16} thickness={5} />
                ) : (
                  <FileDownloadTwoToneIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <ApplicationResumePdfDialog
          open={viewerOpen}
          filename={filename}
          applicationId={row.id}
          downloadFilename={downloadFilename}
          onClose={() => setViewerOpen(false)}
        />
      </>
    );
  }

  if (defaultResumeRef) {
    const handleDownloadDefault = async (event) => {
      event.stopPropagation();
      setDownloading(true);
      try {
        await downloadProfileDefaultResume(
          defaultResumeRef.profileId,
          downloadFilename || defaultResumeRef.filename
        );
        enqueueSnackbar(`Downloaded ${downloadFilename || defaultResumeRef.filename}`, {
          variant: 'success'
        });
      } catch (err) {
        enqueueSnackbar(err.message || 'Download failed', { variant: 'error' });
      } finally {
        setDownloading(false);
      }
    };

    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        minWidth={0}
        onClick={(event) => event.stopPropagation()}
      >
        <Tooltip title="Download default resume">
          <Typography
            component="button"
            type="button"
            variant="body2"
            onClick={handleDownloadDefault}
            disabled={downloading}
            sx={{
              all: 'unset',
              wordBreak: 'break-all',
              fontWeight: 500,
              minWidth: 0,
              textAlign: 'left',
              cursor: downloading ? 'default' : 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              opacity: downloading ? 0.7 : 1,
              '&:hover': {
                textDecorationColor: downloading ? 'transparent' : 'currentColor'
              }
            }}
          >
            {downloading ? 'Downloading…' : downloadFilename}
          </Typography>
        </Tooltip>
        <Tooltip title="Download PDF">
          <span>
            <IconButton
              size="small"
              color="primary"
              aria-label={`Download ${downloadFilename}`}
              disabled={downloading}
              onClick={handleDownloadDefault}
              sx={{ flexShrink: 0 }}
            >
              <FileDownloadTwoToneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  }

  if (row.resume_online_link) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        minWidth={0}
        onClick={(event) => event.stopPropagation()}
      >
        <LinkTwoToneIcon color="info" sx={{ fontSize: 18, flexShrink: 0 }} />
        <Tooltip title={row.resume_online_link}>
          <Link
            href={row.resume_online_link}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ wordBreak: 'break-all' }}
          >
            Online link
          </Link>
        </Tooltip>
      </Stack>
    );
  }

  if (row.resume_generated_id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Generated #{row.resume_generated_id}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );
}

ApplicationResumeCell.propTypes = {
  row: PropTypes.object.isRequired
};

export default ApplicationResumeCell;
