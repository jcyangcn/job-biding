import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FormControl, InputLabel, OutlinedInput } from '@mui/material';

const DEFAULT_HEIGHT = 320;
const INPUT_PADDING_OFFSET = 24;

const NativeTextarea = forwardRef(function NativeTextarea(props, ref) {
  return <textarea ref={ref} {...props} />;
});

NativeTextarea.displayName = 'NativeTextarea';

function FixedHeightMultilineField({
  height = DEFAULT_HEIGHT,
  monospace = false,
  label,
  placeholder,
  value,
  onChange,
  sx,
  id,
  name,
  disabled,
  required
}) {
  const textareaHeight = height - INPUT_PADDING_OFFSET;
  const inputId = id || (label ? `fixed-multiline-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <FormControl fullWidth variant="outlined" sx={sx} required={required} disabled={disabled}>
      {label ? (
        <InputLabel htmlFor={inputId} shrink>
          {label}
        </InputLabel>
      ) : null}
      <OutlinedInput
        id={inputId}
        name={name}
        multiline
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        notched={Boolean(label)}
        inputComponent={NativeTextarea}
        sx={{
          height,
          maxHeight: height,
          overflow: 'hidden',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          '& .MuiOutlinedInput-input': {
            height: `${textareaHeight}px !important`,
            minHeight: `${textareaHeight}px !important`,
            maxHeight: `${textareaHeight}px !important`,
            overflowY: 'auto !important',
            overflowX: 'hidden !important',
            resize: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.5,
            py: 1.5,
            px: 1.75,
            fontFamily: monospace ? 'monospace' : 'inherit'
          }
        }}
      />
    </FormControl>
  );
}

FixedHeightMultilineField.propTypes = {
  height: PropTypes.number,
  monospace: PropTypes.bool,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  sx: PropTypes.object,
  id: PropTypes.string,
  name: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool
};

export default FixedHeightMultilineField;
export { DEFAULT_HEIGHT as FIXED_MULTILINE_FIELD_HEIGHT };
