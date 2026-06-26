import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { alpha, Box, CircularProgress, useTheme } from '@mui/material';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfTwoTone';
import { fetchCitizenImageBlob } from 'src/services/citizenApi';

export function isCitizenImagePreviewable(filename) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(filename || '');
}

function CitizenImageThumb({ citizenId, image, size = 72, alt, onPreview }) {
  const theme = useTheme();
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const displayName = image?.original_name || image?.filename || alt || 'Image';
  const previewable = isCitizenImagePreviewable(displayName) && isCitizenImagePreviewable(image?.filename);

  useEffect(() => {
    if (!citizenId || !image?.filename || !previewable) {
      setLoading(false);
      setFailed(!previewable);
      return undefined;
    }

    let objectUrl;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSrc(null);

    fetchCitizenImageBlob(citizenId, image.filename)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [citizenId, image?.filename, previewable]);

  const frameSx = {
    width: size,
    height: size,
    borderRadius: 1,
    border: `1px solid ${theme.colors.alpha.black[10]}`,
    bgcolor: alpha(theme.colors.alpha.black[100], 0.04),
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };

  if (!previewable) {
    return (
      <Box sx={frameSx} title={displayName}>
        <PictureAsPdfTwoToneIcon color="action" />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={frameSx}>
        <CircularProgress size={Math.min(size * 0.4, 24)} />
      </Box>
    );
  }

  if (failed || !src) {
    return (
      <Box sx={frameSx} title={displayName}>
        <PictureAsPdfTwoToneIcon color="disabled" />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={displayName}
      title={displayName}
      onClick={(event) => {
        event.stopPropagation();
        if (onPreview) {
          onPreview({ src, title: displayName, citizenId, image });
        }
      }}
      sx={{
        ...frameSx,
        objectFit: 'cover',
        cursor: onPreview ? 'zoom-in' : 'default'
      }}
    />
  );
}

CitizenImageThumb.propTypes = {
  citizenId: PropTypes.number.isRequired,
  image: PropTypes.shape({
    filename: PropTypes.string.isRequired,
    original_name: PropTypes.string
  }).isRequired,
  size: PropTypes.number,
  alt: PropTypes.string,
  onPreview: PropTypes.func
};

export default CitizenImageThumb;
