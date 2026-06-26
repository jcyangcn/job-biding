import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { alpha, Box, CircularProgress, useTheme } from '@mui/material';
import InsertDriveFileTwoToneIcon from '@mui/icons-material/InsertDriveFileTwoTone';
import { isCitizenImagePreviewable } from './CitizenImageThumb';

function PendingFileThumb({ file, size = 72, onPreview }) {
  const theme = useTheme();
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!file || !isCitizenImagePreviewable(file.name)) {
      setSrc(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

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

  if (!isCitizenImagePreviewable(file.name)) {
    return (
      <Box sx={frameSx} title={file.name}>
        <InsertDriveFileTwoToneIcon color="action" />
      </Box>
    );
  }

  if (!src) {
    return (
      <Box sx={frameSx}>
        <CircularProgress size={Math.min(size * 0.4, 24)} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={file.name}
      title={file.name}
      onClick={(event) => {
        event.stopPropagation();
        if (onPreview && src) {
          onPreview({ src, title: file.name });
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

PendingFileThumb.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  size: PropTypes.number,
  onPreview: PropTypes.func
};

export default PendingFileThumb;
