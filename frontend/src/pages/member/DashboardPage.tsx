import { useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, History, ScanLine, ShoppingBag, Sparkles } from 'lucide-react';
import { CountUp } from '../../components/CountUp';
import { StoreItemCard } from '../../components/StoreItemCard';
import { CreditAmount, ReservationStatusBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { memberService } from '../../services/member.service';
import { CREDIT_TYPE_LABELS, formatCredits, formatShortDate } from '../../utils/format';

export function MemberDashboardPage() {
  const { patchUser } = useAuth();
  const { data, loading, error, reload } = useAsync(() => memberService.dashboard(), []);

  // Keep the navbar balance in sync with the freshest server value.
  useEffect(() => {
    if (data) patchUser(data.user);
  }, [data, patchUser]);

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { user, recentTransactions, activeReservations, featuredItems } = data;
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="m-stack">
      <section className="hero">
        <p className="hero__welcome">
          Welcome, <span className="neon-text">{firstName}</span>
        </p>
        <p className="hero__label">CSC CREDITS</p>
        <p className="hero__balance" aria-live="polite">
          <CountUp value={user.creditBalance} />
        </p>
        <div className="hero__actions">
          <Link to="/member/scanner" className="btn btn--primary btn--lg">
            <ScanLine size={20} /> <span>Scan QR</span>
          </Link>
          <Link to="/member/store" className="btn btn--secondary btn--lg">
            <ShoppingBag size={20} /> <span>Store</span>
          </Link>
        </div>
      </section>

      <div className="m-grid">
        <section className="m-card">
          <header className="m-card__header">
            <h2 className="m-card__title">
              <History size={18} aria-hidden /> Recent activity
            </h2>
            <Link to="/member/credits" className="m-link">
              All history <ArrowRight size={14} />
            </Link>
          </header>
          {recentTransactions.length === 0 ? (
            <EmptyState title="No credits yet" icon={<Sparkles size={28} />}>
              Scan a QR code at your next CSC event to earn your first credits.
            </EmptyState>
          ) : (
            <ul className="tx-list">
              {recentTransactions.map((t) => (
                <li key={t.id} className="tx">
                  <div className="tx__main">
                    <span className="tx__desc">{t.description}</span>
                    <span className="tx__meta">
                      {CREDIT_TYPE_LABELS[t.type]} · {formatShortDate(t.createdAt)}
                    </span>
                  </div>
                  <CreditAmount amount={t.amount} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="m-stack">
          <section className="m-card">
            <header className="m-card__header">
              <h2 className="m-card__title">My reservations</h2>
              <Link to="/member/reservations" className="m-link">
                View all <ArrowRight size={14} />
              </Link>
            </header>
            {activeReservations.length === 0 ? (
              <p className="muted">No active reservations.</p>
            ) : (
              <ul className="tx-list">
                {activeReservations.map((r) => (
                  <li key={r.id} className="tx">
                    <div className="tx__main">
                      <span className="tx__desc">{r.item.name}</span>
                      <span className="tx__meta">{formatCredits(r.priceAtReservation)} credits</span>
                    </div>
                    <ReservationStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="m-card">
            <h2 className="m-card__title">Member info</h2>
            <dl className="details">
              <dt>Name</dt>
              <dd>{user.fullName}</dd>
              {user.studentId && (
                <>
                  <dt>Student ID</dt>
                  <dd>{user.studentId}</dd>
                </>
              )}
              {user.program && (
                <>
                  <dt>Program</dt>
                  <dd>{user.program}</dd>
                </>
              )}
              <dt>Member since</dt>
              <dd>{formatShortDate(user.approvedAt ?? user.createdAt)}</dd>
            </dl>
          </section>
        </div>
      </div>

      {featuredItems.length > 0 && (
        <section>
          <header className="m-section-header">
            <h2 className="m-card__title">
              <ShoppingBag size={18} aria-hidden /> Store rewards
            </h2>
            <Link to="/member/store" className="m-link">
              Open store <ArrowRight size={14} />
            </Link>
          </header>
          <div className="m-item-grid m-item-grid--compact">
            {featuredItems.map((item) => (
              <Link key={item.id} to="/member/store" className="plain-link">
                <StoreItemCard item={item} balance={user.creditBalance} compact />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
