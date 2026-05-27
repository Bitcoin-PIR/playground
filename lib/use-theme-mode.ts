import { useEffect, useState } from 'react';

/**
 * Tracks the live theme by observing the `dark` class on <html> — the single
 * source of truth, set by the inline script and flipped by the toggle. Used by
 * non-Tailwind surfaces (e.g. the Monaco editor) that can't read `dark:` classes.
 */
export function useThemeMode(): boolean {
  const [dark, setDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
