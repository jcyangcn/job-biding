function findFieldInput(event) {
  const root = event?.currentTarget?.closest?.('.MuiInputBase-root');
  if (!root) {
    return null;
  }

  return root.querySelector('textarea, input:not([type="hidden"])');
}

function getCopyContainer(event) {
  return event?.currentTarget?.closest?.('[role="dialog"]') || document.body;
}

function copyViaInputElement(input, value) {
  const text = String(value ?? '');
  if (!text) {
    throw new Error('Nothing to copy');
  }

  const previousSelectionStart = input.selectionStart;
  const previousSelectionEnd = input.selectionEnd;

  input.focus({ preventScroll: true });
  input.select();

  if (typeof input.setSelectionRange === 'function') {
    input.setSelectionRange(0, text.length);
  }

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  if (typeof input.setSelectionRange === 'function') {
    input.setSelectionRange(previousSelectionStart ?? 0, previousSelectionEnd ?? 0);
  }

  if (!copied) {
    throw new Error('Copy command was rejected');
  }
}

function copyWithExecCommand(value, event) {
  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const selectedRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  const container = getCopyContainer(event);
  container.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  container.removeChild(textarea);

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

export function copyTextSync(text, event) {
  const value = String(text ?? '').trim();
  if (!value) {
    throw new Error('Nothing to copy');
  }

  copyWithExecCommand(value, event);
}

export async function copyToClipboard(text, event) {
  const value = String(text ?? '').trim();
  if (!value) {
    throw new Error('Nothing to copy');
  }

  try {
    copyWithExecCommand(value, event);
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
 * on production HTTP (non-secure context). Works inside MUI dialogs by copying
 * from the field input or placing the fallback textarea inside the dialog.
 */
export function copyOnUserClick(event, text, { onSuccess, onError } = {}) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const value = String(text ?? '').trim();
  if (!value) {
    return;
  }

  const input = findFieldInput(event);
  if (input && String(input.value ?? '').trim() === value) {
    try {
      copyViaInputElement(input, value);
      onSuccess?.();
      return;
    } catch {
      // Fall through to hidden textarea copy.
    }
  }

  try {
    copyTextSync(value, event);
    onSuccess?.();
    return;
  } catch {
    // Keep the async fallback for secure contexts where execCommand can fail.
  }

  copyToClipboard(value, event).then(onSuccess).catch(onError);
}
