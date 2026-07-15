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
import { fetchCitizenReviewFileBlob } from 'src/services/citizenApi';

function CitizenReviewPdfDialog({ open, citizenId, file, onClose }) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const title = file?.original_name || file?.filename || 'Review PDF';

  useEffect(() => {
    if (!open || !citizenId || !file?.filename) {
      setPdfUrl('');
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    let objectUrl = '';

    const loadPdf = async () => {
      setLoading(true);
      setError('');
      setPdfUrl('');

      try {
        const blob = await fetchCitizenReviewFileBlob(citizenId, file.filename);
        if (cancelled) return;

        const pdfBlob =
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(objectUrl);
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
  }, [open, citizenId, file]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          height: '94vh',
          maxHeight: '94vh',
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
        <Typography variant="h4" component="span" noWrap sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        <IconButton aria-label="Close PDF preview" onClick={onClose} size="small">
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
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center" px={3}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : pdfUrl ? (
          <Box
            component="iframe"
            title={title}
            src={pdfUrl}
            sx={{ border: 0, width: '100%', height: '100%', flex: 1, minHeight: 480 }}
          />
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

CitizenReviewPdfDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  citizenId: PropTypes.number,
  file: PropTypes.shape({
    filename: PropTypes.string,
    original_name: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

export default CitizenReviewPdfDialog;
