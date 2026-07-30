import { useEffect, useRef } from 'react';

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
export default function useModalScrollLock(active: boolean, onSwipeBack?: () => void) {
  const onSwipeBackRef = useRef(onSwipeBack);
  onSwipeBackRef.current = onSwipeBack;

  useEffect(() => {
    if (!active || !onSwipeBackRef.current) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    const isMobileGesture = () =>
      window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    const handleTouchStart = (event: TouchEvent) => {
      if (!isMobileGesture() || event.touches.length !== 1) return;
      const touch = event.touches[0];
      tracking = touch.clientX <= 42;
      startX = touch.clientX;
      startY = touch.clientY;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking || event.changedTouches.length !== 1) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX >= 80 && deltaX > deltaY * 1.35) {
        onSwipeBackRef.current?.();
      }
    };
    const cancelTracking = () => { tracking = false; };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', cancelTracking, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', cancelTracking);
    };
  }, [active]);
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
