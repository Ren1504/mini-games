"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Origin = "card" | "featured";

type ModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Which element the detail modal should grow out of (shared layoutId). */
  origin: Origin;
  setOrigin: (origin: Origin) => void;
};

const Ctx = createContext<ModalState | null>(null);

export function ModalStateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<Origin>("card");
  const value = useMemo(
    () => ({ open, setOpen, origin, setOrigin }),
    [open, origin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useModalState(): ModalState {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useModalState must be used inside ModalStateProvider");
  return v;
}

export const layoutIdFor = (origin: Origin, slug: string) =>
  `${origin}-${slug}`;
