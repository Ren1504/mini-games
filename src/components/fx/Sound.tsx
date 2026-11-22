"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const KEY = "doodle-arcade:sound";
const EVENT = "doodle-arcade:sound-change";

type SoundApi = { enabled: boolean; toggle: () => void; scratch: () => void };

const SoundContext = createContext<SoundApi>({
  enabled: false,
  toggle: () => {},
  scratch: () => {},
});

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * Pencil-scratch SFX synthesised with Web Audio (filtered noise bursts),
 * so there are no audio files to load. Muted by default; the choice is
 * remembered per browser.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    const ctx = (ctxRef.current ??= new AudioContext());
    if (ctx.state === "suspended") void ctx.resume();
    const strokes = 3;
    for (let s = 0; s < strokes; s++) {
      const start = ctx.currentTime + s * 0.07;
      const len = 0.06;
      const buffer = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * len),
        ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2600 + s * 500;
      band.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      src.connect(band).connect(gain).connect(ctx.destination);
      src.start(start);
      src.stop(start + len);
    }
  }, []);

  const scratch = useCallback(() => {
    if (readEnabled()) play();
  }, [play]);

  const toggle = useCallback(() => {
    const next = !readEnabled();
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Ignore: the toggle still works for this page view via the event.
    }
    window.dispatchEvent(new Event(EVENT));
    if (next) play();
  }, [play]);

  const api = useMemo(
    () => ({ enabled, toggle, scratch }),
    [enabled, toggle, scratch],
  );
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext);
}
