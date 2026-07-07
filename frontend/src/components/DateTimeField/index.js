import PropTypes from 'prop-types';
import { DateTimePicker } from '@mui/lab';
import TextField from '@mui/material/TextField';
import { format, isValid, parse, parseISO } from 'date-fns';

export const DATETIME_INPUT_FORMAT = 'yyyy-MM-dd HH:mm';

function toDateValue(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  const fromFormat = parse(text, DATETIME_INPUT_FORMAT, new Date());
  if (isValid(fromFormat)) return fromFormat;

  const isoParsed = parseISO(text.includes(' ') ? text.replace(' ', 'T') : text);
  if (isValid(isoParsed)) return isoParsed;

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

function DateTimeField({
  label,
  value,
  onChange,
  size = 'small',
  fullWidth = false,
  margin,
  required = false,
  disabled = false,
  sx
}) {
  return (
    <DateTimePicker
      label={label}
      inputFormat={DATETIME_INPUT_FORMAT}
      mask="____-__-__ __:__"
      value={toDateValue(value)}
      onChange={(newValue) => {
        if (!newValue || !isValid(newValue)) {
          onChange('');
          return;
        }

        onChange(format(newValue, DATETIME_INPUT_FORMAT));
      }}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          size={size}
          fullWidth={fullWidth}
          margin={margin}
          required={required}
          sx={sx}
          inputProps={{
            ...params.inputProps,
            placeholder: DATETIME_INPUT_FORMAT
          }}
        />
      )}
    />
  );
}

DateTimeField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'medium']),
  fullWidth: PropTypes.bool,
  margin: PropTypes.oneOf(['none', 'dense', 'normal']),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  sx: PropTypes.object
};

export default DateTimeField;
