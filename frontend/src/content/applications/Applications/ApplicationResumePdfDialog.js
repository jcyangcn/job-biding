import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadTwoToneIcon from '@mui/icons-material/FileDownloadTwoTone';
import { getResumeDownloadUrl, getResumeInlineUrl } from 'src/services/resumeApi';
import { getStoredAccessToken } from 'src/services/authApi';

function ApplicationResumePdfDialog({ open, filename, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !filename) {
      setBlobUrl(null);
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    const loadPdf = async () => {
      setLoading(true);
      setError('');
      setBlobUrl(null);

      try {
        const token = getStoredAccessToken();
        const headers = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(getResumeInlineUrl(filename), { headers });
        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }

        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' })
        );
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load PDF');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, filename]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          height: '90vh',
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
        <Typography variant="h4" component="span" noWrap sx={{ minWidth: 0 }}>
          {filename || 'Resume PDF'}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 0,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.100'
        }}
      >
        {loading ? (
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={360}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={360}
            px={3}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        ) : blobUrl ? (
          <Box
            component="iframe"
            title={filename || 'Resume PDF'}
            src={blobUrl}
            sx={{
              border: 0,
              width: '100%',
              height: '100%',
              flex: 1,
              minHeight: 480
            }}
          />
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, flexShrink: 0 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadTwoToneIcon />}
          component="a"
          href={getResumeDownloadUrl(filename)}
          download={filename || 'resume.pdf'}
          rel="noopener noreferrer"
          disabled={!filename}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ApplicationResumePdfDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  filename: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export default ApplicationResumePdfDialog;
