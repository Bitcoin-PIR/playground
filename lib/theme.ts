// React-free so Server Components (app/layout.tsx) can import THEME_INIT_SCRIPT.
// The live theme hook lives in ./use-theme-mode (client-only).

/** localStorage key holding the user's explicit choice ('dark' | 'light'). */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Blocking <head> script: sets the `dark` class on <html> before first paint,
 * from the saved choice (localStorage) or, failing that, the OS preference.
 * Must stay dependency-free — it runs inline before any bundle loads, so it
 * prevents the flash of the wrong theme on a static-exported page.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

/** Flip the theme and persist the choice. Returns the new `dark` state. */
export function toggleTheme(): boolean {
  const isDark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    /* storage may be unavailable (private mode) — theme still applies this session */
  }
  return isDark;
}
