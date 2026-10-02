import { useEffect, useRef } from 'react';

// setInterval on the page slows to once a minute in a hidden tab.
// A worker's timer keeps its pace, so the typing never falls behind.
export function useWorkerClock(onTick, every = 50) {
  const callback = useRef(onTick);
  callback.current = onTick;

  useEffect(() => {
    const code = `setInterval(() => postMessage(0), ${every})`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = () => callback.current();
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, [every]);
}
