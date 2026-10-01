import { useEffect } from 'react';

/**
 * Sets <body data-theme="admin|member"> so CSS variables (and things rendered
 * in portals, like modals and toasts) pick up the right panel style.
 */
export function useBodyTheme(theme: 'admin' | 'member') {
  useEffect(() => {
    document.body.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'admin' ? '#f6f4fb' : '#1a0b36');
  }, [theme]);
}
