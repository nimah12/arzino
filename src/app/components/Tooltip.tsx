"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Custom themed tooltip replacing the native `title` attribute.
 *
 * The bubble is rendered through a portal into <body>, so it is never clipped
 * by overflow containers (the table panel, the modal, …). It shows on:
 *  - mouse hover  (mouseenter / mouseleave)
 *  - keyboard focus (focus/blur capture — Tab reaches the wrapped control)
 *  - touch tap (touchstart shows, hides ~1.6s after touchend)
 *
 * While visible it re-measures on scroll/resize so it stays glued to the
 * anchor. The bubble flips below the anchor when it would overflow the
 * viewport top (and vice versa). Interactive children keep their own
 * aria-labels; the bubble is decorative for sighted users.
 */
export default function Tooltip({
  label,
  position = "top",
  className = "",
  children,
}: {
  /** Localized tooltip text. */
  label: string;
  /** Preferred side; auto-flips when it would leave the viewport. */
  position?: "top" | "bottom";
  /** Passed to the wrapper span (it becomes the flex child). */
  className?: string;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number; width: number; height: number } | null>(null);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
  }, []);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setRect(null);
  }, []);

  // Keep the bubble anchored while the page scrolls or resizes.
  useEffect(() => {
    if (!rect) return;
    const update = () => show();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [rect, show]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  // Geometry: centered horizontally, flipped to the other side when it would
  // leave the viewport; clamped so a wide bubble stays on screen.
  let top = 0;
  let transform = "translate(-50%, -100%)";
  let left = 0;
  if (rect) {
    const center = rect.left + rect.width / 2;
    left = Math.min(Math.max(center, 72), window.innerWidth - 72);
    if (position === "top" && rect.top < 56) {
      top = rect.bottom + 8;
      transform = "translate(-50%, 0)";
    } else if (position === "bottom" && rect.bottom > window.innerHeight - 56) {
      top = rect.top - 8;
      transform = "translate(-50%, -100%)";
    } else if (position === "top") {
      top = rect.top - 8;
    } else {
      top = rect.bottom + 8;
    }
  }

  return (
    <span
      ref={wrapRef}
      className={`tt ${className}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
      onTouchStart={show}
      onTouchEnd={() => {
        hideTimer.current = setTimeout(hide, 1600);
      }}
      onTouchCancel={hide}
    >
      {children}
      {rect &&
        createPortal(
          <span className="tt-bubble" role="tooltip" style={{ left, top, transform }}>
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
