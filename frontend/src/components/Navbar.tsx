import { Link, NavLink } from 'react-router';
import { History, Home, LogOut, ScanLine, ShoppingBag, Ticket, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatCredits, initials } from '../utils/format';

const LINKS = [
  { to: '/member/dashboard', label: 'Home', icon: Home },
  { to: '/member/credits', label: 'Credits', icon: History },
  { to: '/member/scanner', label: 'Scan', icon: ScanLine, primary: true },
  { to: '/member/store', label: 'Store', icon: ShoppingBag },
  { to: '/member/reservations', label: 'Reservations', icon: Ticket, desktopOnly: true },
  { to: '/member/profile', label: 'Profile', icon: UserRound, mobileOnly: true },
];

/** Member navigation: top bar on desktop, bottom tab bar on phones. */
export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="m-nav">
        <Link to="/member/dashboard" className="m-nav__brand" aria-label="CSC home">
          <span className="m-logo">CSC</span>
          <span className="m-nav__brand-text">Credits</span>
        </Link>

        <nav className="m-nav__links" aria-label="Main">
          {LINKS.filter((l) => !l.mobileOnly).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="m-nav__link">
              <Icon size={17} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-nav__right">
          {user && (
            <Link to="/member/credits" className="credit-pill" title="Your CSC Credits">
              <span className="credit-pill__value">{formatCredits(user.creditBalance)}</span>
              <span className="credit-pill__unit">CR</span>
            </Link>
          )}
          {user && (
            <Link to="/member/profile" className="m-avatar" aria-label="Profile">
              {initials(user.fullName)}
            </Link>
          )}
          <button className="icon-btn m-nav__logout" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="m-tabbar" aria-label="Main">
        {LINKS.filter((l) => !l.desktopOnly).map(({ to, label, icon: Icon, primary }) => (
          <NavLink key={to} to={to} className={`m-tabbar__item ${primary ? 'm-tabbar__item--primary' : ''}`}>
            <span className="m-tabbar__icon">
              <Icon size={primary ? 24 : 20} aria-hidden />
            </span>
            <span className="m-tabbar__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
