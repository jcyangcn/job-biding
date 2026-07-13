import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { alpha, Box, CircularProgress, useTheme } from '@mui/material';
import { fetchApplicationScreenshotBlob } from 'src/services/jobApplicationApi';

function isPreviewableImage(filename) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(filename || '');
}

function ApplicationScreenshotThumb({
  applicationId,
  image,
  size = 72,
  alt,
  fill = false,
  fillMode = 'contain',
  onPreview
}) {
  const theme = useTheme();
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const displayName = image?.original_name || image?.filename || alt || 'Screenshot';
  const previewable =
    isPreviewableImage(displayName) && isPreviewableImage(image?.filename);

  useEffect(() => {
    if (!applicationId || !image?.filename || !previewable) {
      setLoading(false);
      setFailed(!previewable);
      return undefined;
    }

    let objectUrl;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSrc(null);

    fetchApplicationScreenshotBlob(applicationId, image.filename)
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
  }, [applicationId, image?.filename, previewable]);

  const wrapperSx = fill
    ? {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.04)
      }
    : null;

  const frameSx = fill
    ? fillMode === 'cover'
      ? {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block'
        }
      : {
          maxHeight: '100%',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block'
        }
    : {
        width: size,
        height: size,
        borderRadius: 1.5,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${theme.palette.divider}`
      };

  const handlePreviewClick = (event) => {
    event.stopPropagation();
    if (onPreview && src) {
      onPreview({ src, title: displayName, applicationId, image });
    }
  };

  const previewSx = onPreview
    ? {
        cursor: 'zoom-in'
      }
    : null;

  if (loading) {
    return (
      <Box sx={fill ? wrapperSx : frameSx}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (failed || !src) {
    return (
      <Box sx={fill ? wrapperSx : frameSx}>
        <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', px: 1, textAlign: 'center' }}>
          {displayName}
        </Box>
      </Box>
    );
  }

  if (fill) {
    return (
      <Box sx={wrapperSx} onClick={onPreview ? handlePreviewClick : undefined}>
        <Box
          component="img"
          src={src}
          alt={displayName}
          sx={{ ...frameSx, ...previewSx }}
        />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={displayName}
      onClick={onPreview ? handlePreviewClick : undefined}
      sx={{ ...frameSx, objectFit: 'cover', ...previewSx }}
    />
  );
}

ApplicationScreenshotThumb.propTypes = {
  applicationId: PropTypes.number,
  image: PropTypes.object,
  size: PropTypes.number,
  alt: PropTypes.string,
  fill: PropTypes.bool,
  fillMode: PropTypes.oneOf(['contain', 'cover']),
  onPreview: PropTypes.func
};

export default ApplicationScreenshotThumb;
