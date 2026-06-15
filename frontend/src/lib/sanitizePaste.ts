import DOMPurify from "dompurify";

/**
 * Strip all HTML from a pasted string, returning plain text only.
 * Prevents clipboard-hijacking payloads (HTML/script injection via paste).
 */
export function sanitizePastedText(raw: string): string {
  // DOMPurify with no allowed tags = pure plain-text extraction
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * React paste-event handler factory.
 *
 * Usage on any <input> or <textarea>:
 *   <input onPaste={onSafePaste(setValue)} />
 *
 * Extracts plain text from the clipboard (rejects HTML payloads),
 * sanitizes it, then calls your setter.
 */
export function onSafePaste(
  setter: (val: string) => void,
): (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
  return (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    setter(sanitizePastedText(text));
  };
}
