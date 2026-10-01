import { Outlet } from 'react-router';
import { useBodyTheme } from '../hooks/useBodyTheme';

/** Public pages (login / register) share the vaporwave look of the member side. */
export function AuthLayout() {
  useBodyTheme('member');
  return (
    <div className="member-shell auth-shell">
      <div className="vw-backdrop" aria-hidden>
        <div className="vw-sun" />
        <div className="vw-grid" />
      </div>
      <main className="auth-content">
        <div className="auth-brand">
          <span className="m-logo m-logo--lg">CSC</span>
          <p className="auth-brand__tag">Computer Science Club · Credits</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
