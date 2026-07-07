import PropTypes from 'prop-types';
import { Autocomplete, Box, InputAdornment, TextField } from '@mui/material';
import { CountryFlag } from 'src/components/CountryLabel';

function CountrySelectField({
  value,
  onChange,
  options,
  label = 'Country',
  required = false,
  margin = 'normal',
  placeholder = 'Search country...',
  fullWidth = true,
  disabled = false,
  size = 'medium'
}) {
  return (
    <Autocomplete
      fullWidth={fullWidth}
      size={size}
      options={options}
      value={value || null}
      onChange={(_, newValue) => onChange(newValue || '')}
      autoHighlight
      openOnFocus
      disablePortal
      disabled={disabled}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CountryFlag country={option} />
          <span>{option}</span>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          margin={margin}
          size={size}
          label={label}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          InputProps={{
            ...params.InputProps,
            startAdornment: value ? (
              <>
                <InputAdornment position="start" sx={{ mr: 0 }}>
                  <CountryFlag country={value} />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ) : (
              params.InputProps.startAdornment
            )
          }}
        />
      )}
    />
  );
}

CountrySelectField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  label: PropTypes.string,
  required: PropTypes.bool,
  margin: PropTypes.string,
  placeholder: PropTypes.string,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium'])
};

export default CountrySelectField;
