import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { Box, IconButton, Link, Tooltip, Typography } from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import { copyToClipboard } from 'src/utils/copyToClipboard';

function CopyableLink({
  url,
  label = 'Link',
  maxWidth = 160,
  emptyText = '—',
  multiline = false
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = url?.trim();

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopied(true);
      enqueueSnackbar(`${label} copied`, { variant: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      enqueueSnackbar(`Failed to copy ${label}`, { variant: 'error' });
    }
  };

  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box
      display="inline-flex"
      alignItems={multiline ? 'flex-start' : 'center'}
      gap={0.25}
      maxWidth="100%"
      onClick={(event) => event.stopPropagation()}
    >
      <Link
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
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
      </Link>
      <Tooltip title={copied ? 'Copied' : 'Copy'}>
        <IconButton size="small" onMouseDown={handleCopy} aria-label={`Copy ${label}`}>
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

CopyableLink.propTypes = {
  url: PropTypes.string,
  label: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  emptyText: PropTypes.string,
  multiline: PropTypes.bool
};

export default CopyableLink;
