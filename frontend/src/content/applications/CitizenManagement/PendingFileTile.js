import PropTypes from 'prop-types';
import { Box, IconButton, Tooltip } from '@mui/material';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import PendingFileThumb from './PendingFileThumb';

function PendingFileTile({ file, size = 96, onPreview, onCancel, disabled = false }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <PendingFileThumb file={file} size={size} onPreview={onPreview} />
      {onCancel ? (
        <Tooltip title="Cancel upload">
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              p: 0,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'background.paper'
              }
            }}
          >
            <CancelTwoToneIcon color="error" sx={{ fontSize: size <= 56 ? 18 : 22 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}

PendingFileTile.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  size: PropTypes.number,
  onPreview: PropTypes.func,
  onCancel: PropTypes.func,
  disabled: PropTypes.bool
};

export default PendingFileTile;
