"use client";

import { useEffect } from "react";

/** Keep screen on during gate duty (Chrome/Android; Safari iOS 16.4+). */
export function useScreenWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        if (lock) return;
        lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => {
          lock = null;
        });
      } catch {
        /* permission denied or unsupported */
      }
    }

    void acquire();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
      lock = null;
    };
  }, [enabled]);
}
