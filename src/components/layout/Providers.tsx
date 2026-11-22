"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { SoundProvider } from "@/components/fx/Sound";
import { ModalStateProvider } from "./ModalState";

/**
 * reducedMotion="user": when the OS asks for less motion, Motion skips
 * transform and layout animations everywhere and keeps opacity fades.
 * Components additionally swap in their own 150ms fades.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SoundProvider>
        <ModalStateProvider>{children}</ModalStateProvider>
      </SoundProvider>
    </MotionConfig>
  );
}
