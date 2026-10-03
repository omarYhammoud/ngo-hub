 'use client';
import { useLayoutEffect } from 'react';
export default function HomeScrollReset() {
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const reset = () => {
      if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    reset();
    const frame = requestAnimationFrame(reset);
    window.addEventListener('pageshow', reset);
    window.addEventListener('load', reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pageshow', reset);
      window.removeEventListener('load', reset);
      window.history.scrollRestoration = previous;
    };
  }, []);
  return null;
}
