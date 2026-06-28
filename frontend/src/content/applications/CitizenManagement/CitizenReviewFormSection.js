import PropTypes from 'prop-types';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CloudUploadTwoToneIcon from '@mui/icons-material/CloudUploadTwoTone';
import DateField from 'src/components/DateField';
import { CITIZEN_REVIEW_STATUSES } from 'src/data/citizenReviewStatusOptions';
import CitizenReviewFileList from './CitizenReviewFileList';
import CitizenReviewStatusLabel from './CitizenReviewStatusLabel';

function CitizenReviewFormSection({
  form,
  onFormChange,
  onReviewedAtChange,
  reviewFileInputRef,
  onPickReviewFiles,
  onReviewFilesSelected,
  pendingReviewFiles,
  onRemovePendingReviewFile,
  editingRecord,
  currentReviewFiles,
  onDownloadReviewFile,
  onDeleteReviewFile,
  saving,
  uploading,
  theme
}) {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h5" mb={1}>
          Review
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Review status</InputLabel>
          <Select
            label="Review status"
            value={form.review_status}
            onChange={onFormChange('review_status')}
            renderValue={(value) => <CitizenReviewStatusLabel status={value} />}
          >
            {CITIZEN_REVIEW_STATUSES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <CitizenReviewStatusLabel status={option.value} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Reviewer"
          value={form.reviewer}
          onChange={onFormChange('reviewer')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <DateField
          fullWidth
          label="Reviewed at"
          value={form.reviewed_at}
          onChange={onReviewedAtChange}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Review log"
          multiline
          minRows={3}
          value={form.review_log}
          onChange={onFormChange('review_log')}
        />
      </Grid>
      <Grid item xs={12}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Review files</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloudUploadTwoToneIcon />}
            onClick={onPickReviewFiles}
            disabled={uploading || saving}
          >
            Upload
          </Button>
          <input
            ref={reviewFileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
            onChange={onReviewFilesSelected}
          />
        </Stack>

        {pendingReviewFiles.length ? (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Pending upload (saved when you click Save)
            </Typography>
            <Stack spacing={0.75}>
              {pendingReviewFiles.map((file, index) => (
                <Stack
                  key={`${file.name}-${index}`}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: `1px solid ${theme.colors.alpha.black[10]}`
                  }}
                >
                  <Typography variant="body2" flex={1} noWrap title={file.name}>
                    {file.name}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onRemovePendingReviewFile(index)}
                    disabled={saving || uploading}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : null}

        {editingRecord ? (
          <CitizenReviewFileList
            files={currentReviewFiles}
            onDownload={(file) => onDownloadReviewFile(editingRecord.id, file)}
            onDelete={(filename) => onDeleteReviewFile(editingRecord.id, filename)}
            disabled={uploading}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Save the citizen first, or select files now to upload on save.
          </Typography>
        )}
      </Grid>
    </>
  );
}

CitizenReviewFormSection.propTypes = {
  form: PropTypes.shape({
    review_status: PropTypes.string.isRequired,
    reviewer: PropTypes.string.isRequired,
    reviewed_at: PropTypes.string.isRequired,
    review_log: PropTypes.string.isRequired
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onReviewedAtChange: PropTypes.func.isRequired,
  reviewFileInputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any })
  ]).isRequired,
  onPickReviewFiles: PropTypes.func.isRequired,
  onReviewFilesSelected: PropTypes.func.isRequired,
  pendingReviewFiles: PropTypes.arrayOf(PropTypes.instanceOf(File)).isRequired,
  onRemovePendingReviewFile: PropTypes.func.isRequired,
  editingRecord: PropTypes.object,
  currentReviewFiles: PropTypes.array,
  onDownloadReviewFile: PropTypes.func.isRequired,
  onDeleteReviewFile: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  uploading: PropTypes.bool.isRequired,
  theme: PropTypes.object.isRequired
};

export default CitizenReviewFormSection;
