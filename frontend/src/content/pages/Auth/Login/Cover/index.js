import { Box, Card, Typography, Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import JWTLogin from '../LoginJWT';
import Logo from 'src/components/Logo';
import { PROJECT_DESCRIPTION, PROJECT_NAME } from 'src/config/app';

function LoginCover() {
  return (
    <>
      <Helmet>
        <title>Login - {PROJECT_NAME}</title>
      </Helmet>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 2,
          py: 4
        }}
      >
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Logo />
            <Typography
              variant="h3"
              sx={{ mt: 3, mb: 1, textAlign: 'center', textTransform: 'capitalize' }}
            >
              {PROJECT_NAME}
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 420 }}
            >
              {PROJECT_DESCRIPTION}
            </Typography>
          </Box>
          <Card
            sx={{
              p: 4,
              width: '100%',
              mx: 'auto'
            }}
          >
            <Box textAlign="center" mb={2}>
              <Typography variant="h2" sx={{ mb: 1 }}>
                Sign in
              </Typography>
              <Typography variant="h4" color="text.secondary" fontWeight="normal">
                Enter your credentials to access {PROJECT_NAME}.
              </Typography>
            </Box>
            <JWTLogin />
          </Card>
        </Container>
      </Box>
    </>
  );
}

export default LoginCover;
