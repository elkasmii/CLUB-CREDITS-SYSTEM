import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useBodyTheme } from '../hooks/useBodyTheme';
import { adminService } from '../services/admin.service';

/** Faded-purple admin shell: sidebar + main content. */
export function AdminLayout() {
  useBodyTheme('admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({ members: 0, reservations: 0 });
  const location = useLocation();

  // Refresh the sidebar "pending" badges whenever the admin navigates.
  useEffect(() => {
    adminService
      .stats()
      .then((s) => setCounts({ members: s.pendingRequests, reservations: s.pendingReservations }))
      .catch(() => undefined);
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        pendingMembers={counts.members}
        pendingReservations={counts.reservations}
      />
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="icon-btn admin-topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="admin-topbar__title">CSC Credits · Admin</span>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
