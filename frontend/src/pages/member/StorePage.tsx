import { useState } from 'react';
import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';
import { StoreItemCard } from '../../components/StoreItemCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/api';
import { memberService } from '../../services/member.service';
import type { StoreItem } from '../../types';
import { formatCredits } from '../../utils/format';

export function MemberStorePage() {
  const { user, patchUser, refreshUser } = useAuth();
  const toast = useToast();
  const { data: items, loading, error, reload } = useAsync(() => memberService.storeItems(), []);
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const [reserving, setReserving] = useState(false);
  const balance = user?.creditBalance ?? 0;

  async function reserve() {
    if (!selected) return;
    setReserving(true);
    try {
      const { newBalance } = await memberService.reserve(selected.id);
      patchUser({ creditBalance: newBalance });
      toast.success(`${selected.name} reserved! An admin will confirm it soon.`);
      setSelected(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSelected(null);
      // Balance or stock may have changed elsewhere — resync both.
      void refreshUser();
      void reload();
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="m-stack">
      <header className="m-page-header m-page-header--row">
        <div>
          <h1 className="m-title">CSC Store</h1>
          <p className="m-subtitle">Spend your credits on official CSC merch.</p>
        </div>
        <div className="balance-chip">
          <span className="muted">Your balance</span>
          <strong className="neon-text">{formatCredits(balance)}</strong>
        </div>
      </header>

      {loading && !items ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items?.length === 0 ? (
        <EmptyState title="The store is empty right now" icon={<ShoppingBag size={28} />}>
          Check back soon!
        </EmptyState>
      ) : (
        <div className="m-item-grid">
          {items?.map((item) => (
            <StoreItemCard key={item.id} item={item} balance={balance} onReserve={setSelected} />
          ))}
        </div>
      )}

      <p className="muted small center">
        Reserved credits are held right away and refunded if a reservation is rejected or cancelled.{' '}
        <Link to="/member/reservations" className="m-link">
          My reservations
        </Link>
      </p>

      <ConfirmDialog
        open={!!selected}
        title="Reserve this item?"
        message={
          selected && (
            <>
              Reserve <strong>{selected.name}</strong> for <strong>{formatCredits(selected.priceInCredits)} CSC Credits</strong>?
              <br />
              <span className="muted">
                Balance after reservation: {formatCredits(balance - selected.priceInCredits)} credits.
              </span>
            </>
          )
        }
        confirmLabel="Reserve"
        loading={reserving}
        onConfirm={reserve}
        onCancel={() => setSelected(null)}
      />
    </div>
  );
}
