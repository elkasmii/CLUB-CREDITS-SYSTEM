import { Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useBodyTheme } from '../hooks/useBodyTheme';

/** Vaporwave member shell. */
export function MemberLayout() {
  useBodyTheme('member');
  return (
    <div className="member-shell">
      <div className="vw-backdrop" aria-hidden>
        <div className="vw-sun" />
        <div className="vw-grid" />
      </div>
      <Navbar />
      <main className="member-content">
        <Outlet />
      </main>
    </div>
  );
}
