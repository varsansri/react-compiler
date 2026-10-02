import { useEffect } from 'react';

// Keeps the screen on while the page is visible and the typist is running.
// The keep-awake helper covers the time when the window is minimised.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let lock = null;

    const request = async () => {
      if (document.hidden) return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        lock = null;
      }
    };

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      lock?.release();
    };
  }, [active]);
}
