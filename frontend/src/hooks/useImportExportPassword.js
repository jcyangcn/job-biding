import { useCallback, useState } from 'react';

function useImportExportPassword() {
  const [pending, setPending] = useState(null);

  const requestImportExportConfirmation = useCallback((actionLabel, action) => {
    setPending({ actionLabel, action });
  }, []);

  const closeImportExportPasswordDialog = useCallback(() => {
    setPending(null);
  }, []);

  const runAuthorizedImportExportAction = useCallback(async () => {
    if (pending?.action) {
      await pending.action();
    }
  }, [pending]);

  return {
    requestImportExportConfirmation,
    importExportPasswordDialogProps: {
      open: Boolean(pending),
      actionLabel: pending?.actionLabel || 'action',
      onClose: closeImportExportPasswordDialog,
      onAuthorized: runAuthorizedImportExportAction
    }
  };
}

export default useImportExportPassword;
