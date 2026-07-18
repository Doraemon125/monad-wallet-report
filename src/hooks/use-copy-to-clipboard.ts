import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Copies text to the clipboard, with a legacy fallback for contexts where
 * the modern Clipboard API isn't available (http://, some in-app browsers).
 * Returns `copied` (true for ~1.5s after a successful copy) and a `copy` fn.
 */
export function useCopyToClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (!text) return false;
      let ok = false;
      // 1) Modern Clipboard API (needs secure context + user gesture).
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {}
      // 2) Legacy fallback (works on http:// and inside some in-app browsers).
      if (!ok) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          ta.setSelectionRange(0, text.length);
          ok = document.execCommand("copy");
          document.body.removeChild(ta);
        } catch {}
      }
      if (ok) {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
      }
      return ok;
    },
    [resetDelayMs]
  );

  return { copied, copy };
}
