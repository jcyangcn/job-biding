import PropTypes from 'prop-types';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import InsertDriveFileTwoToneIcon from '@mui/icons-material/InsertDriveFileTwoTone';
import { formatDateTime } from 'src/utils/dateFormat';

function CitizenReviewFileList({
  files,
  onDownload,
  onDelete,
  disabled = false
}) {
  if (!files?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No review files uploaded.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {files.map((file) => (
        <Stack
          key={file.filename}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.colors.alpha.black[10]}`
          }}
        >
          <InsertDriveFileTwoToneIcon color="action" fontSize="small" />
          <Stack flex={1} minWidth={0}>
            <Typography variant="body2" noWrap title={file.original_name}>
              {file.original_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(file.uploaded_at)}
            </Typography>
          </Stack>
          <Tooltip title="Download">
            <span>
              <IconButton size="small" onClick={() => onDownload(file)} disabled={disabled}>
                <DownloadTwoToneIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {onDelete ? (
            <Tooltip title="Delete">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(file.filename)}
                  disabled={disabled}
                >
                  <DeleteTwoToneIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}

CitizenReviewFileList.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      filename: PropTypes.string.isRequired,
      original_name: PropTypes.string.isRequired,
      uploaded_at: PropTypes.string
    })
  ),
  onDownload: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  disabled: PropTypes.bool
};

export default CitizenReviewFileList;
