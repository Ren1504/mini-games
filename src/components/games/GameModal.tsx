"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { layoutIdFor, useModalState } from "@/components/layout/ModalState";
import { TornEdge } from "@/components/paper/TornEdge";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, softSpring } from "@/lib/motion";
import { GameDetail } from "./GameDetail";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Game detail as a page torn out of the notebook, opened over the hub.
 * It grows out of the clicked card (shared layoutId), traps focus, closes
 * on Esc / backdrop / Back, and returns focus to the card afterwards.
 */
export function GameModal({ slug }: { slug: string }) {
  const router = useRouter();
  const { setOpen, origin } = useModalState();
  const reduced = useReducedMotionSafe();
  const [visible, setVisible] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [layoutId] = useState(() => layoutIdFor(origin, slug));

  const close = useCallback(() => {
    setOpen(false);
    setVisible(false);
  }, [setOpen]);

  // Open: turn the page, lock scroll, move focus in. Close: undo, restore focus.
  useEffect(() => {
    const returnTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const t = window.setTimeout(
      () => closeRef.current?.focus({ preventScroll: true }),
      60,
    );
    return () => {
      window.clearTimeout(t);
      setOpen(false);
      root.style.overflow = prevOverflow;
      // The page underneath is inert until the context update commits.
      window.setTimeout(() => returnTo?.focus({ preventScroll: true }), 80);
    };
  }, [setOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <AnimatePresence onExitComplete={() => router.back()}>
      {visible && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 overflow-y-auto"
          exit={{ opacity: 1 }}
        >
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 bg-graphite/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduced ? duration.reduced : duration.pageTurn,
            }}
            onClick={close}
          />
          <div className="pointer-events-none relative flex min-h-full items-start justify-center px-3 py-6 sm:items-center sm:px-8 sm:py-10">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="detail-title"
              layoutId={layoutId}
              transition={softSpring}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: duration.reduced } }
                  : undefined
              }
              className="pointer-events-auto relative w-full max-w-5xl"
            >
              <TornEdge
                seed={slug}
                paperClassName="px-5 pt-14 pb-8 sm:px-10 sm:pt-16 sm:pb-10"
              >
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute top-6 right-5 grid size-11 place-items-center sm:right-8"
                >
                  <DoodleIcon name="close" size={28} strokeWidth={2.4} />
                </button>
                <GameDetail slug={slug} onBack={close} />
              </TornEdge>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
