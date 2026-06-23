import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import {
  downloadResumePdfBuffer,
  saveResumePdfBuffer
} from 'src/services/resumeApi';

function SaveResumeDialog({ open, filename, buffer, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const bufferRef = useRef(null);

  useEffect(() => {
    if (open && buffer) {
      bufferRef.current = buffer;
    }
  }, [open, buffer]);

  const getBuffer = () => bufferRef.current || buffer;

  const handleSave = async () => {
    const pdfBuffer = getBuffer();
    if (!pdfBuffer) return;
    setSaving(true);
    try {
      const result = await saveResumePdfBuffer(pdfBuffer, filename);
      onSaved(result);
    } catch (err) {
      try {
        const fallback = downloadResumePdfBuffer(pdfBuffer, filename);
        onSaved({
          ...fallback,
          usedFallback: true,
          fallbackReason: err.message || 'Save failed'
        });
      } catch (fallbackErr) {
        onSaved({
          saved: false,
          cancelled: false,
          error: fallbackErr.message || err.message || 'Save failed'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const pdfBuffer = getBuffer();
    if (!pdfBuffer) return;
    try {
      onSaved(downloadResumePdfBuffer(pdfBuffer, filename));
    } catch (err) {
      onSaved({ saved: false, cancelled: false, error: err.message || 'Download failed' });
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Resume generated</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Your PDF is ready. Use <b>Save PDF…</b> to pick a folder and filename, or{' '}
          <b>Download PDF</b> if Save fails on Windows.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Tip: In Chrome/Edge, enable Settings → Downloads → “Ask where to save each file”
          to get a Save As dialog when downloading.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button onClick={handleDownload} disabled={saving || !getBuffer()}>
          Download PDF
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !getBuffer()}>
          {saving ? 'Saving…' : 'Save PDF…'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SaveResumeDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  filename: PropTypes.string,
  buffer: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export default SaveResumeDialog;
