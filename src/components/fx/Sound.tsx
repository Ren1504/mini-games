"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { sound } from "@/lib/motion";

export type ClipName = keyof typeof sound.clips;

const KEY = "doodle-arcade:sound";
const EVENT = "doodle-arcade:sound-change";
const SRC = "/sounds/paper-rustle.mp3";

type SoundApi = {
  enabled: boolean;
  toggle: () => void;
  /** Short paper rustle for clicks, taps and merges (no-op when muted). */
  rustle: () => void;
  /** Soft countdown tick, generated in the browser (no-op when muted). */
  tick: () => void;
  /** Bright rising two-note "ding-ding" (e.g. a matched pair). */
  chime: () => void;
  /** Low soft "bonk" (e.g. a missed pair). */
  bonk: () => void;
  /** Short happy arpeggio for a win; starts just after a chime. */
  fanfare: () => void;
  /** A recorded clip from public/sounds (chess check, victory, defeat). */
  clip: (name: ClipName) => void;
};

const SoundContext = createContext<SoundApi>({
  enabled: false,
  toggle: () => {},
  rustle: () => {},
  tick: () => {},
  chime: () => {},
  bonk: () => {},
  fanfare: () => {},
  clip: () => {},
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
 * Paper-rustle sound effects (public/sounds/paper-rustle.mp3), played with
 * Web Audio. Muted by default and remembered per browser. The file is only
 * downloaded once a visitor turns sound on. Clicks play a short slice that
 * skips the recording's silent lead-in; a new rustle fades out the previous
 * one, so rapid clicking never piles up.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => false);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const currentRef = useRef<{
    src: AudioBufferSourceNode;
    gain: GainNode;
  } | null>(null);
  const sliceRef = useRef(0);

  const context = useCallback(
    () => (ctxRef.current ??= new AudioContext()),
    [],
  );

  /** Fetch + decode once; later calls reuse the same promise. */
  const load = useCallback(() => {
    bufferRef.current ??= fetch(SRC)
      .then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))),
      )
      .then((data) => context().decodeAudioData(data))
      .catch(() => {
        bufferRef.current = null; // allow a retry on the next click
        return null;
      });
    return bufferRef.current;
  }, [context]);

  // Visitors who already have sound on get the file preloaded.
  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const play = useCallback(
    async (full: boolean) => {
      const buffer = await load();
      if (!buffer) return;
      const ctx = context();
      if (ctx.state === "suspended") await ctx.resume();
      const now = ctx.currentTime;

      // Fade out whatever is still rustling.
      const prev = currentRef.current;
      if (prev) {
        prev.gain.gain.cancelScheduledValues(now);
        prev.gain.gain.setTargetAtTime(0, now, 0.015);
        prev.src.stop(now + 0.08);
      }

      // Alternate between the softer and the louder rustle for variety.
      const offset = full
        ? sound.leadIn
        : sound.slices[sliceRef.current++ % sound.slices.length];
      const length = full ? buffer.duration - sound.leadIn : sound.sliceLength;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(sound.volume, now);
      gain.gain.setTargetAtTime(
        0,
        now + length - sound.fadeOut,
        sound.fadeOut / 3,
      );
      src.connect(gain).connect(ctx.destination);
      src.start(now, offset, length);
      src.onended = () => {
        if (currentRef.current?.src === src) currentRef.current = null;
      };
      currentRef.current = { src, gain };
    },
    [context, load],
  );

  /** A tiny pencil-tap click: a short, quickly fading sine blip. */
  const tick = useCallback(() => {
    if (!readEnabled()) return;
    const ctx = context();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(sound.tickHz, now);
    osc.frequency.exponentialRampToValueAtTime(
      sound.tickHz * 0.6,
      now + sound.tickLength,
    );
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(sound.tickVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.tickLength);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + sound.tickLength + 0.01);
  }, [context]);

  /**
   * One xylophone-ish note: a triangle wave with a quiet sine an octave
   * up, a 5ms attack and an exponential fade.
   */
  const note = useCallback(
    (hz: number, at: number, length: number, volume: number) => {
      const ctx = context();
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime + at;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      gain.connect(ctx.destination);
      for (const [type, mult, level] of [
        ["triangle", 1, 1],
        ["sine", 2, 0.25],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(hz * mult, t);
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g).connect(gain);
        osc.start(t);
        osc.stop(t + length + 0.02);
      }
    },
    [context],
  );

  const chime = useCallback(() => {
    if (!readEnabled()) return;
    for (const [hz, at, len] of sound.chime.notes)
      note(hz, at, len, sound.chime.volume);
  }, [note]);

  const fanfare = useCallback(() => {
    if (!readEnabled()) return;
    for (const [hz, at, len] of sound.fanfare.notes)
      note(hz, at, len, sound.fanfare.volume);
  }, [note]);

  const bonk = useCallback(() => {
    if (!readEnabled()) return;
    const ctx = context();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const { fromHz, toHz, length, volume } = sound.bonk;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(fromHz, now);
    osc.frequency.exponentialRampToValueAtTime(toHz, now + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }, [context]);

  /** Clip files, fetched and decoded once each (on first use). */
  const clipsRef = useRef(new Map<ClipName, Promise<AudioBuffer | null>>());
  const clip = useCallback(
    (name: ClipName) => {
      if (!readEnabled()) return;
      const { src, gain: level } = sound.clips[name];
      let buffer = clipsRef.current.get(name);
      if (!buffer) {
        buffer = fetch(src)
          .then((r) =>
            r.ok
              ? r.arrayBuffer()
              : Promise.reject(new Error(String(r.status))),
          )
          .then((data) => context().decodeAudioData(data))
          .catch(() => {
            clipsRef.current.delete(name); // retry next time
            return null;
          });
        clipsRef.current.set(name, buffer);
      }
      void buffer.then(async (decoded) => {
        if (!decoded) return;
        const ctx = context();
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        const gain = ctx.createGain();
        gain.gain.value = level;
        src.connect(gain).connect(ctx.destination);
        src.start();
      });
    },
    [context],
  );

  const rustle = useCallback(() => {
    if (readEnabled()) void play(false);
  }, [play]);

  const toggle = useCallback(() => {
    const next = !readEnabled();
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Ignore: the toggle still works for this page view via the event.
    }
    window.dispatchEvent(new Event(EVENT));
    if (next) void play(true);
  }, [play]);

  const api = useMemo(
    () => ({ enabled, toggle, rustle, tick, chime, bonk, fanfare, clip }),
    [enabled, toggle, rustle, tick, chime, bonk, fanfare, clip],
  );
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext);
}
