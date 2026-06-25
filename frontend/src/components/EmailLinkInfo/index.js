import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import { copyToClipboard } from 'src/utils/copyToClipboard';

function EmailLinkInfo({ value, maxWidth = 220, multiline = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value?.trim();

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopied(true);
      enqueueSnackbar('Email link copied', { variant: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      enqueueSnackbar('Failed to copy email link', { variant: 'error' });
    }
  };

  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Box
      display="inline-flex"
      alignItems={multiline ? 'flex-start' : 'center'}
      gap={0.5}
      maxWidth="100%"
      onClick={(event) => event.stopPropagation()}
    >
      <Typography
        variant="body2"
        title={text}
        sx={{
          maxWidth: multiline ? '100%' : maxWidth,
          wordBreak: multiline ? 'break-all' : undefined,
          whiteSpace: multiline ? 'normal' : 'nowrap',
          overflow: multiline ? undefined : 'hidden',
          textOverflow: multiline ? undefined : 'ellipsis'
        }}
      >
        {text}
      </Typography>
      <Tooltip title={copied ? 'Copied' : 'Copy'}>
        <IconButton
          size="small"
          onMouseDown={handleCopy}
          aria-label="Copy email link"
        >
          {copied ? (
            <CheckTwoToneIcon fontSize="small" color="success" />
          ) : (
            <ContentCopyTwoToneIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

EmailLinkInfo.propTypes = {
  value: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  multiline: PropTypes.bool
};

export default EmailLinkInfo;
