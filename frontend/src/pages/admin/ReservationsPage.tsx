import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, PackageCheck, X } from 'lucide-react';
import { ReservationStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TextInput } from '../../components/ui/Form';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api';
import type { Reservation, ReservationStatus } from '../../types';
import { formatCredits, formatDateTime, RESERVATION_STATUS_LABELS } from '../../utils/format';

type Target = Exclude<ReservationStatus, 'PENDING'>;

const TABS: (ReservationStatus | '')[] = ['', 'PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED'];

const COPY: Record<Target, { title: string; label: string; text: string; tone: 'primary' | 'danger' }> = {
  APPROVED: { title: 'Approve reservation?', label: 'Approve', text: 'The member will see their item is approved and ready to collect.', tone: 'primary' },
  FULFILLED: { title: 'Mark as fulfilled?', label: 'Mark fulfilled', text: 'Confirm the member has received the item.', tone: 'primary' },
  REJECTED: { title: 'Reject reservation?', label: 'Reject', text: 'The credits will be refunded to the member and the item restocked.', tone: 'danger' },
  CANCELLED: { title: 'Cancel reservation?', label: 'Cancel reservation', text: 'The credits will be refunded to the member and the item restocked.', tone: 'danger' },
};

export function ReservationsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as ReservationStatus | '';
  const { data, loading, error, reload } = useAsync(() => adminService.reservations(status || undefined), [status]);

  const [pending, setPending] = useState<{ reservation: Reservation; to: Target } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function ask(reservation: Reservation, to: Target) {
    setNote('');
    setPending({ reservation, to });
  }

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      await adminService.updateReservation(pending.reservation.id, pending.to, note.trim() || undefined);
      toast.success(`Reservation ${RESERVATION_STATUS_LABELS[pending.to].toLowerCase()}.`);
      setPending(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Reservations" subtitle="Approve, fulfil or reject store reservations. Rejecting refunds the credits." />

      <Card padded={false}>
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={status === t}
                className={`tab ${status === t ? 'is-active' : ''}`}
                onClick={() => setParams(t ? { status: t } : {})}
              >
                {t ? RESERVATION_STATUS_LABELS[t] : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            rows={data ?? []}
            rowKey={(r) => r.id}
            empty={<EmptyState title="No reservations here" />}
            columns={[
              {
                header: 'Member',
                render: (r) =>
                  r.member ? (
                    <Link to={`/admin/members/${r.member.id}`}>
                      <strong>{r.member.fullName}</strong>
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              { header: 'Item', render: (r) => r.item.name },
              { header: 'Cost', render: (r) => formatCredits(r.priceAtReservation), className: 'num' },
              {
                header: 'Status',
                render: (r) => (
                  <div>
                    <ReservationStatusBadge status={r.status} />
                    {r.adminNote && <div className="muted small">{r.adminNote}</div>}
                  </div>
                ),
              },
              { header: 'Reserved', render: (r) => formatDateTime(r.createdAt), hideOnMobile: true },
              {
                header: 'Actions',
                className: 'actions',
                render: (r) => (
                  <div className="row-actions">
                    {r.status === 'PENDING' && (
                      <Button size="sm" variant="success" icon={<Check size={14} />} onClick={() => ask(r, 'APPROVED')}>
                        Approve
                      </Button>
                    )}
                    {r.status === 'APPROVED' && (
                      <Button size="sm" variant="success" icon={<PackageCheck size={14} />} onClick={() => ask(r, 'FULFILLED')}>
                        Fulfilled
                      </Button>
                    )}
                    {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                      <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => ask(r, 'REJECTED')}>
                        Reject
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!pending}
        title={pending ? COPY[pending.to].title : ''}
        message={
          pending && (
            <>
              <strong>{pending.reservation.member?.fullName}</strong> · {pending.reservation.item.name} (
              {formatCredits(pending.reservation.priceAtReservation)} credits)
              <br />
              <span className="muted">{COPY[pending.to].text}</span>
            </>
          )
        }
        confirmLabel={pending ? COPY[pending.to].label : ''}
        tone={pending ? COPY[pending.to].tone : 'primary'}
        loading={saving}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        <TextInput
          label="Note for the member (optional)"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={pending?.to === 'APPROVED' ? 'Pick it up at the CSC desk on Monday' : ''}
        />
      </ConfirmDialog>
    </>
  );
}
