/**
 * Print the cover letter at true A4 size by temporarily promoting the
 * preview root to a direct child of <body>. Nested layout/positioning makes
 * Chrome leave a blank strip beside a 210mm block.
 */
export function printCoverLetter(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const fullscreenRoot = document.querySelector(
    ".a4-fullscreen-preview .cover-letter-print-root",
  );
  const pageRoot = document.querySelector(".cover-letter-print-root");
  const root =
    (fullscreenRoot instanceof HTMLElement ? fullscreenRoot : null) ??
    (pageRoot instanceof HTMLElement ? pageRoot : null);
  if (!root) {
    window.print();
    return;
  }

  const parent = root.parentNode;
  if (!parent) {
    window.print();
    return;
  }

  const placeholder = document.createComment("cover-letter-print-placeholder");
  parent.insertBefore(placeholder, root);
  document.body.appendChild(root);
  document.documentElement.classList.add("printing-cover-letter");

  const scroller = root;
  scroller.scrollTop = 0;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.documentElement.classList.remove("printing-cover-letter");
    if (placeholder.parentNode) {
      placeholder.parentNode.insertBefore(root, placeholder);
      placeholder.remove();
    }
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  // Fallback if afterprint doesn't fire (some browsers).
  window.setTimeout(cleanup, 60_000);

  window.print();
}
