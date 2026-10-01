import { Link } from 'react-router';
import { useBodyTheme } from '../hooks/useBodyTheme';

export function NotFoundPage() {
  useBodyTheme('member');
  return (
    <div className="member-shell auth-shell">
      <div className="vw-backdrop" aria-hidden>
        <div className="vw-sun" />
        <div className="vw-grid" />
      </div>
      <main className="auth-content">
        <div className="auth-card auth-card--center">
          <p className="hero__balance">404</p>
          <h1 className="auth-card__title">Page not found</h1>
          <p className="auth-card__subtitle">This page drifted off into cyberspace.</p>
          <Link to="/" className="btn btn--primary btn--lg btn--block">
            <span>Go home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
