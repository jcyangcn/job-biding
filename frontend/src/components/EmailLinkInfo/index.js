import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { alpha, Box, IconButton, Link, Tooltip, Typography } from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import { copyOnUserClick } from 'src/utils/copyToClipboard';

function EmailLinkInfo({ value, maxWidth = 220, multiline = false, detailed = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value?.trim();

  const handleCopy = (event) => {
    if (!text) return;

    copyOnUserClick(event, text, {
      onSuccess: () => {
        setCopied(true);
        enqueueSnackbar('Email link copied', { variant: 'success' });
        window.setTimeout(() => setCopied(false), 2000);
      },
      onError: () => {
        enqueueSnackbar('Failed to copy email link', { variant: 'error' });
      }
    });
  };

  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  if (detailed) {
    return (
      <Box
        onClick={(event) => event.stopPropagation()}
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
          p: 1.25,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`
        })}
      >
        <OpenInNewTwoToneIcon color="primary" fontSize="small" />
        <Link
          href={text}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          title={text}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {text}
        </Link>
        <Tooltip title={copied ? 'Copied' : 'Copy link'}>
          <IconButton
            size="small"
            type="button"
            onClick={handleCopy}
            aria-label="Copy email link"
            sx={{ flexShrink: 0 }}
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
          type="button"
          onClick={handleCopy}
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
  multiline: PropTypes.bool,
  detailed: PropTypes.bool
};

export default EmailLinkInfo;
