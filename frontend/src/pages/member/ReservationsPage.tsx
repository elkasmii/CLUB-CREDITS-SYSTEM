import { useState } from 'react';
import { Link } from 'react-router';
import { Package, Ticket } from 'lucide-react';
import { ReservationStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { assetUrl, getErrorMessage } from '../../services/api';
import { memberService } from '../../services/member.service';
import type { Reservation } from '../../types';
import { formatCredits, formatDateTime } from '../../utils/format';

const STATUS_HINTS: Record<Reservation['status'], string> = {
  PENDING: 'Waiting for an admin to confirm.',
  APPROVED: 'Approved — collect it from the CSC team.',
  FULFILLED: 'Collected. Enjoy!',
  REJECTED: 'Rejected — your credits were refunded.',
  CANCELLED: 'Cancelled — your credits were refunded.',
};

export function MemberReservationsPage() {
  const { patchUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => memberService.reservations(), []);
  const [toCancel, setToCancel] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      const { newBalance } = await memberService.cancelReservation(toCancel.id);
      patchUser({ creditBalance: newBalance });
      toast.success(`Reservation cancelled. ${formatCredits(toCancel.priceAtReservation)} credits refunded.`);
      setToCancel(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="m-stack">
      <header className="m-page-header">
        <h1 className="m-title">My Reservations</h1>
        <p className="m-subtitle">Items you reserved in the CSC Store.</p>
      </header>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data?.length === 0 ? (
        <EmptyState title="No reservations yet" icon={<Ticket size={28} />}>
          <Link to="/member/store" className="m-link">
            Browse the store
          </Link>
        </EmptyState>
      ) : (
        <ul className="res-list">
          {data?.map((r) => (
            <li key={r.id} className="res">
              <div className="res__image">
                {r.item.imageUrl ? <img src={assetUrl(r.item.imageUrl)!} alt="" loading="lazy" /> : <Package size={24} aria-hidden />}
              </div>
              <div className="res__main">
                <div className="res__top">
                  <strong>{r.item.name}</strong>
                  <ReservationStatusBadge status={r.status} />
                </div>
                <p className="res__meta">
                  {formatCredits(r.priceAtReservation)} credits · {formatDateTime(r.createdAt)}
                </p>
                <p className="res__hint">{STATUS_HINTS[r.status]}</p>
                {r.adminNote && <p className="res__note">“{r.adminNote}”</p>}
              </div>
              {r.status === 'PENDING' && (
                <Button size="sm" variant="ghost" onClick={() => setToCancel(r)}>
                  Cancel
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel reservation?"
        message={
          toCancel && (
            <>
              Cancel your <strong>{toCancel.item.name}</strong> reservation? {formatCredits(toCancel.priceAtReservation)}{' '}
              credits will be returned to your balance.
            </>
          )
        }
        confirmLabel="Cancel reservation"
        tone="danger"
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
