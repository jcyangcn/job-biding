import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import { verifyImportExportPassword } from 'src/services/importExportSecurityApi';

function ImportExportPasswordDialog({
  open,
  actionLabel,
  onClose,
  onAuthorized
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setVerifying(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await verifyImportExportPassword(password);
      await onAuthorized();
      onClose();
    } catch (err) {
      setError(err.message || 'Password verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={verifying ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockTwoToneIcon color="primary" />
        Confirm {actionLabel}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Enter the import/export password to continue.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Password"
          value={password}
          error={Boolean(error)}
          helperText={error || ' '}
          disabled={verifying}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={verifying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={verifying}
          startIcon={verifying ? <CircularProgress size={18} /> : <LockTwoToneIcon />}
        >
          {verifying ? 'Verifying…' : `Continue ${actionLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ImportExportPasswordDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  actionLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onAuthorized: PropTypes.func.isRequired
};

export default ImportExportPasswordDialog;
