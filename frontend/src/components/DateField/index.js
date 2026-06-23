import PropTypes from 'prop-types';
import DatePicker from '@mui/lab/DatePicker';
import TextField from '@mui/material/TextField';
import { format, isValid, parseISO } from 'date-fns';

export const DATE_INPUT_FORMAT = 'yyyy-MM-dd';

function toDateValue(value) {
  if (!value) return null;

  const parsed = parseISO(String(value));
  if (isValid(parsed)) return parsed;

  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

function DateField({
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
    <DatePicker
      label={label}
      inputFormat={DATE_INPUT_FORMAT}
      mask="____-__-__"
      value={toDateValue(value)}
      onChange={(newValue) => {
        if (!newValue || !isValid(newValue)) {
          onChange('');
          return;
        }

        onChange(format(newValue, DATE_INPUT_FORMAT));
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
            placeholder: DATE_INPUT_FORMAT
          }}
        />
      )}
    />
  );
}

DateField.propTypes = {
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

export default DateField;
