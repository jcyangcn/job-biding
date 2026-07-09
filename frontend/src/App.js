import { useRoutes } from 'react-router-dom';
import router from 'src/router';

import { SnackbarProvider, useSnackbar } from 'notistack';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import useAuth from 'src/hooks/useAuth';

import { CssBaseline, IconButton } from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import PropTypes from 'prop-types';
import ThemeProvider from './theme/ThemeProvider';
import AppInit from './components/AppInit';

function SnackbarDismissAction({ snackbarKey }) {
  const { closeSnackbar } = useSnackbar();
  return (
    <IconButton
      size="small"
      color="inherit"
      aria-label="Dismiss notification"
      onClick={() => closeSnackbar(snackbarKey)}
    >
      <CloseTwoToneIcon fontSize="small" />
    </IconButton>
  );
}

SnackbarDismissAction.propTypes = {
  snackbarKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

function App() {
  const content = useRoutes(router);
  const auth = useAuth();

  return (
    <ThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider
          maxSnack={6}
          autoHideDuration={2000}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
          action={(snackbarKey) => <SnackbarDismissAction snackbarKey={snackbarKey} />}
        >
          <CssBaseline />
          {auth.isInitialized ? content : <AppInit />}
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
export default App;
