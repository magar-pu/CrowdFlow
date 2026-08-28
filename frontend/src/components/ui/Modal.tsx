import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const TRANSITION_MS = 180;

// Page-level (position="fixed") modals lock body scroll while any of them is
// mounted (including mid-exit-animation). A module-level counter survives
// multiple modals ever being open at once without one clobbering the other's
// restore.
let lockCount = 0;
let previousBodyOverflow = "";

function lockBodyScroll() {
  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

interface ModalProps {
  /** Whether the modal is open. The component stays mounted for a beat after this goes false so the close transition can play. */
  open: boolean;
  /** Omit to hide the close (X) button and disable backdrop-click dismissal. */
  onClose?: () => void;
  /** Dismiss when the backdrop (not the card) is clicked. Off by default so mid-edit forms are never lost by a stray click. */
  closeOnBackdropClick?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  /** 'fixed' covers the viewport; 'absolute' covers the nearest positioned ancestor (for modals nested inside a fixed-height panel). */
  position?: "fixed" | "absolute";
  /** Render only the backdrop and let children supply their own container — for non-standard shells (e.g. a phone-mockup simulator) that shouldn't get the white card chrome. */
  bare?: boolean;
  backdropClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

function ModalChrome({
  visible,
  onClose,
  closeOnBackdropClick = false,
  title,
  description,
  icon,
  size = "md",
  position = "fixed",
  bare = false,
  backdropClassName = "bg-black/50 backdrop-blur-sm",
  contentClassName,
  children,
}: Omit<ModalProps, "open"> & { visible: boolean }) {
  const handleBackdropClick = () => {
    if (closeOnBackdropClick && onClose) onClose();
  };

  // `visible` drives the transition: false on the very first paint (so the
  // enter transition has a starting point to animate from) and again during
  // the close animation, true otherwise.
  const transitionClasses = visible ? "opacity-100" : "opacity-0";
  const cardTransitionClasses = visible ? "opacity-100 scale-100" : "opacity-0 scale-95";

  if (bare) {
    return (
      <div
        className={`${position} inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-[180ms] ease-out ${transitionClasses} ${backdropClassName}`}
        onClick={handleBackdropClick}
      >
        <div
          className={`transition-all duration-[180ms] ease-out ${cardTransitionClasses}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${position} inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-[180ms] ease-out ${transitionClasses} ${backdropClassName}`}
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-xl border border-border-subtle shadow-2xl w-full ${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto transition-all duration-[180ms] ease-out ${cardTransitionClasses}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between gap-3 p-5 border-b border-border-subtle">
            <div className="flex items-center gap-2 min-w-0">
              {icon && (
                <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h3 className="text-sm font-bold text-text-primary truncate">{title}</h3>}
                {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-on-surface-variant hover:text-text-primary p-1 rounded transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className={contentClassName ?? "p-5"}>{children}</div>
      </div>
    </div>
  );
}

export default function Modal(props: ModalProps) {
  const { open, position = "fixed" } = props;
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // Snapshot the content-bearing props so that when `open` flips false the
  // exit animation fades out the modal's last real content, not a
  // suddenly-blank shell — callers commonly null the underlying data
  // (selected item, target id) in the same state update that closes them.
  const snapshotRef = useRef(props);
  if (open) snapshotRef.current = props;
  const shown = open ? props : snapshotRef.current;

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setRendered(false), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!rendered || position !== "fixed") return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [rendered, position]);

  if (!rendered) return null;

  const chrome = <ModalChrome {...shown} visible={visible} />;

  if (position !== "fixed") return chrome;
  if (!portalReady) return null;
  return createPortal(chrome, document.body);
}
