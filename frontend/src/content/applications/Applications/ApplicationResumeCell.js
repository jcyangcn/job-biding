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
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import { downloadResumePdf, openResumePdf } from 'src/services/resumeApi';

function ApplicationResumeCell({ row }) {
  const { enqueueSnackbar } = useSnackbar();
  const [busyAction, setBusyAction] = useState(null);
  const filename = row.resume_pdf_filename;
  const hasGeneratedPdf = Boolean(row.resume_generated_id && filename);

  const handleOpenPdf = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (busyAction) return;

    setBusyAction('open');
    try {
      await openResumePdf(filename);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to open PDF', { variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPdf = async (event) => {
    event.stopPropagation();
    if (busyAction) return;

    setBusyAction('download');
    try {
      await downloadResumePdf(filename);
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to download PDF', { variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  };

  if (hasGeneratedPdf) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.25}
        minWidth={0}
        onClick={(event) => event.stopPropagation()}
      >
        <Tooltip title="Open PDF">
          <Link
            component="button"
            type="button"
            underline="hover"
            disabled={Boolean(busyAction)}
            onClick={handleOpenPdf}
            sx={{
              wordBreak: 'break-all',
              fontWeight: 500,
              minWidth: 0,
              textAlign: 'left'
            }}
          >
            {filename}
          </Link>
        </Tooltip>
        <Tooltip title="Download PDF">
          <span>
            <IconButton
              size="small"
              color="primary"
              aria-label={`Download ${filename}`}
              disabled={Boolean(busyAction)}
              onClick={handleDownloadPdf}
            >
              {busyAction === 'download' ? (
                <CircularProgress size={16} />
              ) : (
                <FileDownloadTwoToneIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  }

  if (row.resume_online_link) {
    return (
      <Tooltip title={row.resume_online_link}>
        <Link
          href={row.resume_online_link}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          onClick={(event) => event.stopPropagation()}
          sx={{ wordBreak: 'break-all' }}
        >
          Online link
        </Link>
      </Tooltip>
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
