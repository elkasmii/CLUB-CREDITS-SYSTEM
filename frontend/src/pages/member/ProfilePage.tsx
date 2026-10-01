import { useEffect } from 'react';
import { Link } from 'react-router';
import { History, LogOut, Ticket } from 'lucide-react';
import { UserStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { memberService } from '../../services/member.service';
import { formatCredits, formatDate, initials } from '../../utils/format';

export function ProfilePage() {
  const { logout, patchUser } = useAuth();
  const profile = useAsync(() => memberService.profile(), []);
  const credits = useAsync(() => memberService.credits(), []);

  useEffect(() => {
    if (profile.data) patchUser(profile.data);
  }, [profile.data, patchUser]);

  if (profile.loading && !profile.data) return <LoadingState />;
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.reload} />;
  const user = profile.data;
  if (!user) return null;

  return (
    <div className="m-stack profile">
      <section className="m-card profile__card">
        <span className="m-avatar m-avatar--lg">{initials(user.fullName)}</span>
        <h1 className="m-title">{user.fullName}</h1>
        <p className="muted">{user.email}</p>
        <UserStatusBadge status={user.status} />
      </section>

      <div className="summary-row">
        <div className="summary">
          <span className="summary__label">Balance</span>
          <span className="summary__value neon-text">{formatCredits(user.creditBalance)}</span>
        </div>
        <div className="summary">
          <span className="summary__label">Earned all-time</span>
          <span className="summary__value">{credits.data ? formatCredits(credits.data.totalEarned) : '—'}</span>
        </div>
        <div className="summary">
          <span className="summary__label">Transactions</span>
          <span className="summary__value">{credits.data?.transactionCount ?? '—'}</span>
        </div>
      </div>

      <section className="m-card">
        <h2 className="m-card__title">Member information</h2>
        <dl className="details">
          <dt>Student ID</dt>
          <dd>{user.studentId ?? '—'}</dd>
          <dt>Program</dt>
          <dd>{user.program ?? '—'}</dd>
          <dt>Year of study</dt>
          <dd>{user.yearOfStudy ?? '—'}</dd>
          <dt>Phone</dt>
          <dd>{user.phone ?? '—'}</dd>
          <dt>Member since</dt>
          <dd>{formatDate(user.approvedAt ?? user.createdAt)}</dd>
        </dl>
        <p className="muted small">Need to change your details? Ask a CSC admin.</p>
      </section>

      <div className="profile__links">
        <Link to="/member/credits" className="btn btn--secondary btn--md">
          <History size={16} /> <span>Credit history</span>
        </Link>
        <Link to="/member/reservations" className="btn btn--secondary btn--md">
          <Ticket size={16} /> <span>My reservations</span>
        </Link>
        <Button variant="ghost" icon={<LogOut size={16} />} onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
