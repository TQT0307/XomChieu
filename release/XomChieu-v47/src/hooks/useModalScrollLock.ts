import { useEffect } from 'react';

let activeModalLocks = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousBodyOverscrollBehavior = '';
let previousHtmlOverflow = '';
let previousHtmlOverscrollBehavior = '';

/**
 * Locks the page behind a modal without changing its current scroll position.
 *
 * A shared lock counter keeps nested detail/image modals safe: closing one
 * modal cannot accidentally unlock the page while another modal is still open.
 */
export default function useModalScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    const html = document.documentElement;

    if (activeModalLocks === 0) {
      previousBodyOverflow = body.style.overflow;
      previousBodyPaddingRight = body.style.paddingRight;
      previousBodyOverscrollBehavior = body.style.overscrollBehavior;
      previousHtmlOverflow = html.style.overflow;
      previousHtmlOverscrollBehavior = html.style.overscrollBehavior;

      const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);
      const currentPaddingRight =
        Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';

      // Prevent the page from shifting sideways when its scrollbar disappears.
      if (scrollbarGap > 0) {
        body.style.paddingRight = `${currentPaddingRight + scrollbarGap}px`;
      }
    }

    activeModalLocks += 1;

    return () => {
      activeModalLocks = Math.max(0, activeModalLocks - 1);

      if (activeModalLocks === 0) {
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
        body.style.overscrollBehavior = previousBodyOverscrollBehavior;
        html.style.overflow = previousHtmlOverflow;
        html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      }
    };
  }, [active]);
}
