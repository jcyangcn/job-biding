function copyWithExecCommand(value) {
  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const selectedRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  textarea.style.top = `${window.scrollY || document.documentElement.scrollTop}px`;

  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);

  if (selectedRange && selection) {
    selection.removeAllRanges();
    selection.addRange(selectedRange);
  }

  if (activeElement && typeof activeElement.focus === 'function') {
    activeElement.focus({ preventScroll: true });
  }

  if (!copied) {
    throw new Error('Copy command was rejected');
  }
}

export function copyTextSync(text) {
  const value = String(text ?? '').trim();
  if (!value) {
    throw new Error('Nothing to copy');
  }

  copyWithExecCommand(value);
}

export async function copyToClipboard(text) {
  const value = String(text ?? '').trim();
  if (!value) {
    throw new Error('Nothing to copy');
  }

  try {
    copyWithExecCommand(value);
    return;
  } catch {
    // Fall through to the async Clipboard API when available.
  }

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error('Copy failed');
}

/**
 * Run copy synchronously inside a click handler so user activation is preserved
 * on production HTTP (non-secure context). Falls back to the async API only when needed.
 */
export function copyOnUserClick(event, text, { onSuccess, onError } = {}) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const value = String(text ?? '').trim();
  if (!value) {
    return;
  }

  try {
    copyTextSync(value);
    onSuccess?.();
    return;
  } catch {
    // Keep the async fallback for secure contexts where execCommand can fail.
  }

  void copyToClipboard(value).then(onSuccess).catch(onError);
}
