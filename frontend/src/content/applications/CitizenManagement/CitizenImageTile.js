import PropTypes from 'prop-types';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import DownloadTwoToneIcon from '@mui/icons-material/DownloadTwoTone';
import CitizenImageThumb from './CitizenImageThumb';

function CitizenImageTile({
  citizenId,
  image,
  images,
  imageIndex,
  size = 72,
  onPreview,
  onDownload,
  onDelete,
  disabled = false
}) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CitizenImageThumb
        citizenId={citizenId}
        image={image}
        size={size}
        onPreview={
          onPreview
            ? (preview) => onPreview({ ...preview, images, imageIndex })
            : undefined
        }
      />
      {onDownload || onDelete ? (
        <Stack
          direction="row"
          sx={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            bgcolor: 'background.paper',
            borderRadius: 0.75,
            boxShadow: 1
          }}
        >
          {onDownload ? (
            <Tooltip title="Download">
              <span>
                <IconButton
                  size="small"
                  disabled={disabled}
                  sx={{ p: 0.35 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDownload();
                  }}
                >
                  <DownloadTwoToneIcon sx={{ fontSize: size <= 56 ? 14 : 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {onDelete ? (
            <Tooltip title="Delete">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={disabled}
                  sx={{ p: 0.35 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                >
                  <DeleteTwoToneIcon sx={{ fontSize: size <= 56 ? 14 : 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}

CitizenImageTile.propTypes = {
  citizenId: PropTypes.number.isRequired,
  image: PropTypes.shape({
    filename: PropTypes.string.isRequired,
    original_name: PropTypes.string
  }).isRequired,
  images: PropTypes.arrayOf(
    PropTypes.shape({
      filename: PropTypes.string.isRequired,
      original_name: PropTypes.string
    })
  ),
  imageIndex: PropTypes.number,
  size: PropTypes.number,
  onPreview: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
  disabled: PropTypes.bool
};

export default CitizenImageTile;
