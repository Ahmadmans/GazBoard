// Writing to the clipboard from a browser page (the web build, and Android's
// WebView), for "Copy as picture" and "Copy text".
//
// A browser only allows this in answer to something the person just did, and
// may refuse anyway. A refusal comes back as false, and the app says so,
// rather than pretending the copy happened.

export async function browserClipboardWrite(payload = {}) {
  try {
    const cb = navigator.clipboard;
    if (!cb) return false;
    if (payload.image && cb.write && typeof ClipboardItem !== 'undefined') {
      const blob = await (await fetch(payload.image)).blob();
      await cb.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      return true;
    }
    if (payload.html && cb.write && typeof ClipboardItem !== 'undefined') {
      await cb.write([new ClipboardItem({
        'text/plain': new Blob([payload.text || ''], { type: 'text/plain' }),
        'text/html': new Blob([payload.html], { type: 'text/html' })
      })]);
      return true;
    }
    if (payload.text && cb.writeText) { await cb.writeText(payload.text); return true; }
    return false;
  } catch {
    return false;
  }
}
