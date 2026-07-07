import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import { copyToClipboard } from 'src/utils/copyToClipboard';

export function CopyFieldAdornment({ label, value, disabled = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const text = value == null ? '' : String(value).trim();
  const canCopy = Boolean(text) && !disabled;

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canCopy) {
      return;
    }

    try {
      await copyToClipboard(text);
      setCopied(true);
      enqueueSnackbar(`Copied ${label}`, { variant: 'success' });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      enqueueSnackbar(`Failed to copy ${label}`, { variant: 'error' });
    }
  };

  return (
    <Tooltip title={!canCopy ? 'Nothing to copy' : copied ? 'Copied' : 'Copy'}>
      <span>
        <IconButton
          size="small"
          edge="end"
          aria-label={`Copy ${label}`}
          onClick={handleCopy}
          disabled={!canCopy}
        >
          {copied ? (
            <CheckTwoToneIcon fontSize="small" color="success" />
          ) : (
            <ContentCopyTwoToneIcon fontSize="small" />
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
