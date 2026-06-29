function copyWithExecCommand(value) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('Copy command was rejected');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyToClipboard(text) {
  const value = String(text ?? '');

  // HTTP on LAN is not a secure context; execCommand is more reliable there.
  if (!window.isSecureContext) {
    copyWithExecCommand(value);
    return;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back when the async API is blocked or denied.
    }
  }

  copyWithExecCommand(value);
}
