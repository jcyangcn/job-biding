import PropTypes from 'prop-types';
import { Box, IconButton, Modal, Tooltip, Typography } from '@mui/material';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';

function CitizenImagePreviewOverlay({ open, src, title, onClose, onDownload }) {
  if (!open || !src) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="citizen-image-preview-title"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          cursor: 'zoom-out'
        }}
      >
        <Box
          onClick={(event) => event.stopPropagation()}
          sx={{
            maxWidth: '92vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'default'
          }}
        >
          <Box
            component="img"
            src={src}
            alt={title || 'Citizen image'}
            sx={{
              maxWidth: '92vw',
              maxHeight: '86vh',
              objectFit: 'contain',
              borderRadius: 1,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)'
            }}
          />
          {title ? (
            <Typography
              id="citizen-image-preview-title"
              variant="caption"
              color="common.white"
              sx={{ mt: 1.5, textAlign: 'center' }}
            >
              {title}
            </Typography>
          ) : null}
          {onDownload ? (
            <Tooltip title="Download">
              <IconButton
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload();
                }}
                sx={{
                  mt: 1,
                  color: 'common.white',
                  border: '1px solid rgba(255,255,255,0.35)'
                }}
              >
                <DownloadTwoToneIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      </Box>
    </Modal>
  );
}

CitizenImagePreviewOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  src: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func
};

export default CitizenImagePreviewOverlay;
