import { NavLink } from 'react-router';
import { Coins, LayoutDashboard, LogOut, QrCode, ShoppingBag, Ticket, Users, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { initials } from '../utils/format';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pendingMembers?: number;
  pendingReservations?: number;
}

export function Sidebar({ open, onClose, pendingMembers = 0, pendingReservations = 0 }: SidebarProps) {
  const { user, logout } = useAuth();

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/members', label: 'Members', icon: Users, badge: pendingMembers },
    { to: '/admin/qr', label: 'QR Credits', icon: QrCode },
    { to: '/admin/credits', label: 'Give Credits', icon: Coins },
    { to: '/admin/store', label: 'Store', icon: ShoppingBag },
    { to: '/admin/reservations', label: 'Reservations', icon: Ticket, badge: pendingReservations },
  ];

  return (
    <>
      <div className={`sidebar-scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar__brand">
          <span className="sidebar__logo">CSC</span>
          <span>
            <strong>CSC Credits</strong>
            <small>Admin panel</small>
          </span>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {links.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className="sidebar__link" onClick={onClose}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
              {!!badge && (
                <span className="sidebar__badge" aria-label={`${badge} pending`}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="sidebar__user">
            <span className="avatar">{initials(user.fullName)}</span>
            <span className="sidebar__user-info">
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
            </span>
            <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
