import PropTypes from 'prop-types';
import DatePicker from '@mui/lab/DatePicker';
import TextField from '@mui/material/TextField';
import { format, isValid, parseISO } from 'date-fns';

export const MONTH_YEAR_INPUT_FORMAT = 'yyyy-MM';

function toMonthYearValue(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(text)) {
    const parsed = parseISO(`${text}-01`);
    return isValid(parsed) ? parsed : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = parseISO(text);
    return isValid(parsed) ? parsed : null;
  }

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}

function MonthYearField({
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
      views={['year', 'month']}
      openTo="month"
      inputFormat={MONTH_YEAR_INPUT_FORMAT}
      mask="____-__"
      value={toMonthYearValue(value)}
      onChange={(newValue) => {
        if (!newValue || !isValid(newValue)) {
          onChange('');
          return;
        }

        onChange(format(newValue, MONTH_YEAR_INPUT_FORMAT));
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
            placeholder: MONTH_YEAR_INPUT_FORMAT
          }}
        />
      )}
    />
  );
}

MonthYearField.propTypes = {
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

export default MonthYearField;
