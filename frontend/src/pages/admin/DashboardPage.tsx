import { Link } from 'react-router';
import { Coins, QrCode, Ticket, UserCheck, UserPlus, Users } from 'lucide-react';
import { CreditAmount, CreditTypeBadge } from '../../components/ui/Badge';
import { Card, PageHeader, StatCard } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services/admin.service';
import { formatCredits, formatDateTime, formatShortDate } from '../../utils/format';

export function AdminDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => adminService.stats(), []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="An overview of CSC Credits." />
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard label="Total members" value={data.totalMembers} icon={<Users size={20} />} />
            <StatCard label="Active members" value={data.activeMembers} icon={<UserCheck size={20} />} tone="success" />
            <StatCard
              label="Pending requests"
              value={data.pendingRequests}
              icon={<UserPlus size={20} />}
              tone={data.pendingRequests ? 'warning' : 'default'}
              hint={data.pendingRequests ? <Link to="/admin/members?status=PENDING">Review now →</Link> : 'All caught up'}
            />
            <StatCard
              label="QR campaigns"
              value={data.qrCampaigns}
              icon={<QrCode size={20} />}
              hint={`${data.activeQrCampaigns} active`}
            />
            <StatCard
              label="Credits distributed"
              value={formatCredits(data.totalCreditsDistributed)}
              icon={<Coins size={20} />}
            />
            <StatCard
              label="Pending reservations"
              value={data.pendingReservations}
              icon={<Ticket size={20} />}
              tone={data.pendingReservations ? 'warning' : 'default'}
              hint={data.pendingReservations ? <Link to="/admin/reservations?status=PENDING">Review now →</Link> : undefined}
            />
          </div>

          <div className="grid-2">
            <Card title="Registration requests" actions={<Link to="/admin/members?status=PENDING">View all</Link>}>
              {data.latestPending.length === 0 ? (
                <EmptyState title="No pending requests" />
              ) : (
                <ul className="list">
                  {data.latestPending.map((m) => (
                    <li key={m.id} className="list__item">
                      <div>
                        <Link to={`/admin/members/${m.id}`} className="list__title">
                          {m.fullName}
                        </Link>
                        <p className="list__meta">
                          {m.email}
                          {m.studentId ? ` · ${m.studentId}` : ''}
                        </p>
                      </div>
                      <span className="list__meta">{formatShortDate(m.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Recent credit activity">
              {data.recentTransactions.length === 0 ? (
                <EmptyState title="No transactions yet" />
              ) : (
                <ul className="list">
                  {data.recentTransactions.map((t) => (
                    <li key={t.id} className="list__item">
                      <div>
                        <Link to={`/admin/members/${t.member.id}`} className="list__title">
                          {t.member.fullName}
                        </Link>
                        <p className="list__meta">
                          {t.description} · {formatDateTime(t.createdAt)}
                        </p>
                      </div>
                      <div className="list__end">
                        <CreditTypeBadge type={t.type} />
                        <CreditAmount amount={t.amount} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}
