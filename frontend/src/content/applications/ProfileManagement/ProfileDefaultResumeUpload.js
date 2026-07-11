import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { Box, Button, Typography } from '@mui/material';
import FileUploadTwoToneIcon from '@mui/icons-material/FileUploadTwoTone';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import { uploadProfileDefaultResume } from 'src/services/profileApi';

function ProfileDefaultResumeUpload({
  editingRecord,
  pendingFile,
  saving,
  onUploaded,
  onPendingFileChange
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const filename =
    editingRecord?.default_resume_original_name || pendingFile?.name || '';

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    // On Add profile, queue the file until the profile is created.
    if (!editingRecord) {
      onPendingFileChange?.(file);
      enqueueSnackbar('Resume selected — it will upload when you save the profile', {
        variant: 'info'
      });
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadProfileDefaultResume(editingRecord.id, file);
      enqueueSnackbar('Default resume uploaded', { variant: 'success' });
      onPendingFileChange?.(null);
      onUploaded(updated);
    } catch (err) {
      enqueueSnackbar(err.message || 'Resume upload failed', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box mt={1.5} mb={1}>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelected}
      />
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileUploadTwoToneIcon />}
          onClick={handlePickFile}
          disabled={saving || uploading}
        >
          {uploading ? 'Uploading…' : 'Upload default resume'}
        </Button>
        {filename ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              maxWidth: '100%',
              wordBreak: 'break-word'
            }}
          >
            <PictureAsPdfTwoToneIcon fontSize="small" color="action" />
            {filename}
            {!editingRecord && pendingFile ? ' (pending save)' : ''}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            PDF, DOC, or DOCX
          </Typography>
        )}
      </Box>
    </Box>
  );
}

ProfileDefaultResumeUpload.propTypes = {
  editingRecord: PropTypes.object,
  pendingFile: PropTypes.object,
  saving: PropTypes.bool.isRequired,
  onUploaded: PropTypes.func.isRequired,
  onPendingFileChange: PropTypes.func
};

export default ProfileDefaultResumeUpload;
