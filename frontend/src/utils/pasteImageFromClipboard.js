function normalizePastedImageFile(file) {
  if (!file) {
    return null;
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  if (file.name) {
    return file;
  }

  return new File([file], `pasted-image.${ext}`, { type: file.type });
}

export function extractImageFileFromPasteEvent(event) {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }

  const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
  if (!imageItem) {
    return null;
  }

  return normalizePastedImageFile(imageItem.getAsFile());
}

async function readFirstClipboardImage(items) {
  const files = await Promise.all(
    items.map(async (item) => {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (!imageType) {
        return null;
      }

      const blob = await item.getType(imageType);
      return normalizePastedImageFile(
        new File([blob], `pasted-image.${imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'}`, {
          type: imageType
        })
      );
    })
  );

  return files.find(Boolean) || null;
}

export async function readImageFromClipboardApi() {
  if (!window.isSecureContext || !navigator.clipboard?.read) {
    return null;
  }

  const items = await navigator.clipboard.read();
  return readFirstClipboardImage(items);
}

export function waitForPasteImage({ target, container, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    const pasteContainer = container || document;
    let settled = false;

    const finish = (action, value) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      pasteContainer.removeEventListener('paste', onPaste, true);
      action(value);
    };

    const onPaste = (event) => {
      const file = extractImageFileFromPasteEvent(event);
      if (!file) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      finish(resolve, file);
    };

    const timer = window.setTimeout(() => {
      finish(reject, new Error('Paste timed out'));
    }, timeoutMs);

    pasteContainer.addEventListener('paste', onPaste, true);
    target?.focus?.({ preventScroll: true });
  });
}

/**
 * Read an image from the clipboard on button click.
 * Uses the async Clipboard API in secure contexts, otherwise waits for the next
 * real paste event (Ctrl+V), which works on production HTTP.
 */
export async function pasteImageOnUserClick({ getPasteTarget, getPasteContainer }) {
  try {
    const file = await readImageFromClipboardApi();
    if (file) {
      return file;
    }
  } catch {
    // Fall through to paste-event capture.
  }

  const target = getPasteTarget?.();
  const container = getPasteContainer?.() || target?.closest?.('[role="dialog"]') || document;

  return waitForPasteImage({ target, container });
}
