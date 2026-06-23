import {
  Box,
  Card,
  Typography,
  Container,
  styled
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import JWTLogin from '../LoginJWT';
import Logo from 'src/components/Logo';
import Scrollbar from 'src/components/Scrollbar';
import { PROJECT_DESCRIPTION, PROJECT_NAME } from 'src/config/app';

const Content = styled(Box)(
  () => `
    display: flex;
    flex: 1;
    width: 100%;
`
);

const MainContent = styled(Box)(
  ({ theme }) => `
  @media (min-width: ${theme.breakpoints.values.md}px) {
    padding: 0 0 0 440px;
  }
  width: 100%;
  display: flex;
  align-items: center;
`
);

const SidebarWrapper = styled(Box)(
  ({ theme }) => `
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    background: ${theme.colors.alpha.white[100]};
    width: 440px;
`
);

const SidebarContent = styled(Box)(
  ({ theme }) => `
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing(6)};
`
);

const TypographyH1 = styled(Typography)(
  ({ theme }) => `
    font-size: ${theme.typography.pxToRem(33)};
`
);

function LoginCover() {
  return (
    <>
      <Helmet>
        <title>Login - {PROJECT_NAME}</title>
      </Helmet>
      <Content>
        <SidebarWrapper
          sx={{
            display: { xs: 'none', md: 'flex' }
          }}
        >
          <Scrollbar>
            <SidebarContent>
              <Logo />
              <Box mt={6}>
                <TypographyH1
                  variant="h1"
                  sx={{
                    mb: 3,
                    textTransform: 'capitalize'
                  }}
                >
                  {PROJECT_NAME}
                </TypographyH1>
                <Typography variant="subtitle1" color="text.secondary">
                  {PROJECT_DESCRIPTION}
                </Typography>
              </Box>
            </SidebarContent>
          </Scrollbar>
        </SidebarWrapper>
        <MainContent>
          <Container
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column'
            }}
            maxWidth="sm"
          >
            <Card
              sx={{
                p: 4,
                my: 4,
                width: '100%'
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
        </MainContent>
      </Content>
    </>
  );
}

export default LoginCover;
