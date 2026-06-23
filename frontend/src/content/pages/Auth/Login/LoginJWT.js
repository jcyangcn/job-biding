import * as Yup from 'yup';

import { Formik } from 'formik';

import {
  Box,
  Button,
  FormHelperText,
  TextField,
  Checkbox,
  Typography,
  Link,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import useAuth from 'src/hooks/useAuth';
import useRefMounted from 'src/hooks/useRefMounted';
import { useTranslation } from 'react-i18next';

const LoginJWT = () => {
  const { login } = useAuth();
  const isMountedRef = useRefMounted();
  const { t } = useTranslation();

  return (
    <Formik
      initialValues={{
        username: '',
        password: '',
        terms: true,
        submit: null
      }}
      validationSchema={Yup.object().shape({
        username: Yup.string()
          .max(100)
          .required(t('The username field is required')),
        password: Yup.string()
          .max(255)
          .required(t('The password field is required')),
        terms: Yup.boolean().oneOf(
          [true],
          t('You must agree to our terms and conditions')
        )
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          await login(values.username, values.password);

          if (isMountedRef.current) {
            setStatus({ success: true });
            setSubmitting(false);
          }
        } catch (err) {
          console.error(err);
          if (isMountedRef.current) {
            setStatus({ success: false });
            setErrors({ submit: err.message });
            setSubmitting(false);
          }
        }
      }}
    >
      {({
        errors,
        handleBlur,
        handleChange,
        handleSubmit,
        isSubmitting,
        touched,
        values
      }) => (
        <form noValidate onSubmit={handleSubmit}>
          <TextField
            error={Boolean(touched.username && errors.username)}
            fullWidth
            margin="normal"
            autoFocus
            helperText={touched.username && errors.username}
            label={t('Username')}
            name="username"
            onBlur={handleBlur}
            onChange={handleChange}
            value={values.username}
            variant="outlined"
          />
          <TextField
            error={Boolean(touched.password && errors.password)}
            fullWidth
            margin="normal"
            helperText={touched.password && errors.password}
            label={t('Password')}
            name="password"
            onBlur={handleBlur}
            onChange={handleChange}
            type="password"
            value={values.password}
            variant="outlined"
          />
          <Box
            alignItems="center"
            display={{ xs: 'block', md: 'flex' }}
            justifyContent="space-between"
          >
            <Box display={{ xs: 'block', md: 'flex' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.terms}
                    name="terms"
                    color="primary"
                    onChange={handleChange}
                  />
                }
                label={
                  <>
                    <Typography variant="body2">
                      {t('I accept the')}{' '}
                      <Link component="a" href="#">
                        {t('terms and conditions')}
                      </Link>
                      .
                    </Typography>
                  </>
                }
              />
            </Box>
          </Box>

          {Boolean(touched.terms && errors.terms) && (
            <FormHelperText error>{errors.terms}</FormHelperText>
          )}

          {errors.submit && (
            <FormHelperText error sx={{ mt: 2 }}>
              {errors.submit}
            </FormHelperText>
          )}

          <Button
            sx={{
              mt: 3
            }}
            color="primary"
            startIcon={isSubmitting ? <CircularProgress size="1rem" /> : null}
            disabled={isSubmitting}
            type="submit"
            fullWidth
            size="large"
            variant="contained"
          >
            {t('Sign in')}
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default LoginJWT;
