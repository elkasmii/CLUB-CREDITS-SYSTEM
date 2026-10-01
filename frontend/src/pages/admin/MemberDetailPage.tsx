import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, Check, Coins, KeyRound, RotateCcw, X } from 'lucide-react';
import { SetPasswordModal } from '../../components/SetPasswordModal';
import { CreditAmount, CreditTypeBadge, ReservationStatusBadge, UserStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService, type MemberStatusAction } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api';
import { formatCredits, formatDate, formatDateTime } from '../../utils/format';

const ACTION_COPY: Record<MemberStatusAction, { title: string; label: string; tone: 'primary' | 'danger'; text: string }> = {
  approve: { title: 'Approve member?', label: 'Approve', tone: 'primary', text: 'They will be able to log in and earn credits.' },
  reject: { title: 'Reject request?', label: 'Reject', tone: 'danger', text: 'Their registration request will be rejected.' },
  disable: { title: 'Disable account?', label: 'Disable', tone: 'danger', text: 'They will be logged out and cannot use the member panel. Credits and history are kept.' },
  activate: { title: 'Activate account?', label: 'Activate', tone: 'primary', text: 'They will be able to log in again.' },
};

export function MemberDetailPage() {
  const id = Number(useParams().id);
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminService.member(id), [id]);
  const [action, setAction] = useState<MemberStatusAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function runAction() {
    if (!action) return;
    setSaving(true);
    try {
      await adminService.setMemberStatus(id, action);
      toast.success('Account updated.');
      setAction(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const { member, transactions, reservations, redemptionCount } = data;
  const actions: MemberStatusAction[] =
    member.status === 'PENDING' ? ['approve', 'reject'] : member.status === 'ACTIVE' ? ['disable'] : ['activate'];

  return (
    <>
      <Link to="/admin/members" className="back-link">
        <ArrowLeft size={16} /> All members
      </Link>
      <PageHeader
        title={member.fullName}
        subtitle={member.email}
        actions={
          <>
            {member.status === 'ACTIVE' && (
              <Link to={`/admin/credits?member=${member.id}`} className="btn btn--secondary btn--md">
                <Coins size={16} /> <span>Give credits</span>
              </Link>
            )}
            <Button variant="secondary" icon={<KeyRound size={16} />} onClick={() => setPasswordOpen(true)}>
              Set password
            </Button>
            {actions.map((a) => (
              <Button
                key={a}
                variant={ACTION_COPY[a].tone === 'danger' ? 'ghost' : 'primary'}
                icon={a === 'approve' ? <Check size={16} /> : a === 'reject' ? <X size={16} /> : a === 'disable' ? <Ban size={16} /> : <RotateCcw size={16} />}
                onClick={() => setAction(a)}
              >
                {ACTION_COPY[a].label}
              </Button>
            ))}
          </>
        }
      />

      <div className="grid-3">
        <Card title="Profile">
          <dl className="details">
            <dt>Status</dt>
            <dd>
              <UserStatusBadge status={member.status} />
            </dd>
            <dt>Student ID</dt>
            <dd>{member.studentId ?? '—'}</dd>
            <dt>Program</dt>
            <dd>{member.program ?? '—'}</dd>
            <dt>Year</dt>
            <dd>{member.yearOfStudy ?? '—'}</dd>
            <dt>Phone</dt>
            <dd>{member.phone ?? '—'}</dd>
            <dt>Registered</dt>
            <dd>{formatDate(member.createdAt)}</dd>
            {member.approvedAt && (
              <>
                <dt>Approved</dt>
                <dd>{formatDate(member.approvedAt)}</dd>
              </>
            )}
          </dl>
        </Card>
        <Card title="CSC Credits">
          <p className="big-number">{formatCredits(member.creditBalance)}</p>
          <p className="muted">current balance</p>
          <dl className="details details--compact">
            <dt>Transactions</dt>
            <dd>{transactions.length}</dd>
            <dt>QR codes redeemed</dt>
            <dd>{redemptionCount}</dd>
          </dl>
        </Card>
        <Card title="Reservations">
          {reservations.length === 0 ? (
            <EmptyState title="No reservations" />
          ) : (
            <ul className="list">
              {reservations.slice(0, 6).map((r) => (
                <li key={r.id} className="list__item">
                  <div>
                    <span className="list__title">{r.item.name}</span>
                    <p className="list__meta">
                      {formatCredits(r.priceAtReservation)} credits · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Credit history" padded={false}>
        <Table
          rows={transactions}
          rowKey={(t) => t.id}
          empty={<EmptyState title="No credit transactions yet" />}
          columns={[
            { header: 'Date', render: (t) => formatDateTime(t.createdAt) },
            { header: 'Description', render: (t) => t.description },
            { header: 'Type', render: (t) => <CreditTypeBadge type={t.type} /> },
            { header: 'By', render: (t) => t.createdBy?.fullName ?? '—', hideOnMobile: true },
            { header: 'Credits', render: (t) => <CreditAmount amount={t.amount} />, className: 'num' },
            { header: 'Balance', render: (t) => formatCredits(t.balanceAfter), className: 'num', hideOnMobile: true },
          ]}
        />
      </Card>

      <SetPasswordModal open={passwordOpen} member={member} onClose={() => setPasswordOpen(false)} />

      <ConfirmDialog
        open={!!action}
        title={action ? ACTION_COPY[action].title : ''}
        message={action ? ACTION_COPY[action].text : ''}
        confirmLabel={action ? ACTION_COPY[action].label : ''}
        tone={action ? ACTION_COPY[action].tone : 'primary'}
        loading={saving}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
    </>
  );
}
