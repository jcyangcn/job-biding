import PropTypes from 'prop-types';
import { Box, IconButton, Modal, Tooltip, Typography } from '@mui/material';
import ChevronLeftTwoToneIcon from '@mui/icons-material/ChevronLeftTwoTone';
import ChevronRightTwoToneIcon from '@mui/icons-material/ChevronRightTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';

function CitizenImagePreviewOverlay({
  open,
  src,
  title,
  onClose,
  onDownload,
  onPrevious,
  onNext,
  navigating = false
}) {
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
        {onPrevious ? (
          <IconButton
            aria-label="Previous image"
            disabled={navigating}
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            sx={{
              position: 'absolute',
              left: { xs: 4, sm: 20 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              color: 'common.white',
              bgcolor: 'rgba(0, 0, 0, 0.45)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
            }}
          >
            <ChevronLeftTwoToneIcon fontSize="large" />
          </IconButton>
        ) : null}

        <Box
          onClick={(event) => event.stopPropagation()}
          sx={{
            maxWidth: { xs: '84vw', sm: '78vw' },
            maxHeight: '82vh',
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
              maxWidth: { xs: '84vw', sm: '78vw' },
              maxHeight: '76vh',
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

        {onNext ? (
          <IconButton
            aria-label="Next image"
            disabled={navigating}
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            sx={{
              position: 'absolute',
              right: { xs: 4, sm: 20 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              color: 'common.white',
              bgcolor: 'rgba(0, 0, 0, 0.45)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
            }}
          >
            <ChevronRightTwoToneIcon fontSize="large" />
          </IconButton>
        ) : null}
      </Box>
    </Modal>
  );
}

CitizenImagePreviewOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  src: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func,
  onPrevious: PropTypes.func,
  onNext: PropTypes.func,
  navigating: PropTypes.bool
};

export default CitizenImagePreviewOverlay;
