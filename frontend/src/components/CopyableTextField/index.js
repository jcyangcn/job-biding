import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import { copyOnUserClick } from 'src/utils/copyToClipboard';

export function CopyFieldAdornment({ label, value, disabled = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value == null ? '' : String(value);
  const canCopy = Boolean(text.trim()) && !disabled;

  const handleCopy = (event) => {
    if (!canCopy) {
      return;
    }

    copyOnUserClick(event, text, {
      onSuccess: () => {
        setCopied(true);
        enqueueSnackbar(`Copied ${label}`, { variant: 'success' });
        window.setTimeout(() => setCopied(false), 2000);
      },
      onError: () => {
        enqueueSnackbar(`Failed to copy ${label}`, { variant: 'error' });
      }
    });
  };

  const handleMouseDown = (event) => {
    // Keep focus on the text field so dialog focus traps do not break copy.
    event.preventDefault();
  };

  return (
    <Tooltip title={!canCopy ? 'Nothing to copy' : copied ? 'Copied' : 'Copy'}>
      <span>
        <IconButton
          size="small"
          type="button"
          edge="end"
          aria-label={`Copy ${label}`}
          onMouseDown={handleMouseDown}
          onClick={handleCopy}
          disabled={!canCopy}
          sx={{ p: 0.35 }}
        >
          {copied ? (
            <CheckTwoToneIcon color="success" sx={{ fontSize: 14 }} />
          ) : (
            <ContentCopyTwoToneIcon sx={{ fontSize: 14 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

CopyFieldAdornment.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  disabled: PropTypes.bool
};

function CopyableTextField({ copyLabel, value, InputProps, inputProps, ...rest }) {
  const label = copyLabel || rest.label || 'value';
  const textFieldProps = {
    ...rest,
    value,
    inputProps,
    InputProps: {
      ...InputProps,
      endAdornment: (
        <>
          {InputProps?.endAdornment}
          <InputAdornment position="end">
            <CopyFieldAdornment label={label} value={value} disabled={rest.disabled} />
          </InputAdornment>
        </>
      )
    }
  };

  return <TextField {...textFieldProps} />;
}

CopyableTextField.propTypes = {
  copyLabel: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  InputProps: PropTypes.object,
  inputProps: PropTypes.object,
  label: PropTypes.string,
  disabled: PropTypes.bool
};

export default CopyableTextField;
