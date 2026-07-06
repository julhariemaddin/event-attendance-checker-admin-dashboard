import { useEffect, useState, useCallback } from 'react';

// ASEADO theme system
// - Defaults to the OS/browser theme (prefers-color-scheme)
// - Live-updates if the system theme changes while the app is open
// - A manual override (from the toggle) is remembered in localStorage
//   and takes priority over the system preference until cleared.
const STORAGE_KEY = 'aseado_theme'; // 'light' | 'dark' | absent = follow system

function systemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

// Call once, as early as possible (before first paint) to avoid a flash.
export function initTheme() {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('data-theme') || resolveTheme())
    : 'dark'));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow system changes live, unless the user picked a manual override.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(mq.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const followSystem = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTheme(systemTheme());
  }, []);

  return { theme, toggleTheme, followSystem, isSystem: !localStorage.getItem(STORAGE_KEY) };
}
