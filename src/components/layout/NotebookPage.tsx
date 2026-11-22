"use client";

import type { ReactNode } from "react";
import { PaperBackground } from "@/components/paper/PaperBackground";
import { useModalState } from "./ModalState";

/**
 * The notebook page everything sits on. It stays perfectly still when a
 * game opens in the modal; while the modal is open the page is made inert
 * (and hidden from screen readers) so focus and clicks stay in the modal.
 */
export function NotebookPage({ children }: { children: ReactNode }) {
  const { open } = useModalState();

  return (
    <div
      className="relative isolate flex min-h-dvh flex-col"
      aria-hidden={open || undefined}
      inert={open || undefined}
    >
      <PaperBackground />
      {children}
    </div>
  );
}
