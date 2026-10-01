import { Package } from 'lucide-react';
import { assetUrl } from '../services/api';
import type { StoreItem } from '../types';
import { formatCredits } from '../utils/format';
import { Button } from './ui/Button';

interface Props {
  item: StoreItem;
  balance: number;
  onReserve?: (item: StoreItem) => void;
  compact?: boolean;
}

/** Member-facing store card. The "can afford" check is UX only — the backend re-checks. */
export function StoreItemCard({ item, balance, onReserve, compact }: Props) {
  const outOfStock = item.stock <= 0;
  const missing = Math.max(0, item.priceInCredits - balance);
  const progress = Math.min(100, Math.round((balance / item.priceInCredits) * 100));

  return (
    <article className={`m-item ${compact ? 'm-item--compact' : ''}`}>
      <div className="m-item__image">
        {item.imageUrl ? <img src={assetUrl(item.imageUrl)!} alt="" loading="lazy" /> : <Package size={compact ? 28 : 40} aria-hidden />}
        <span className="m-item__price">
          {formatCredits(item.priceInCredits)} <small>CR</small>
        </span>
      </div>
      <div className="m-item__body">
        <h3 className="m-item__name">{item.name}</h3>
        {!compact && item.description && <p className="m-item__desc">{item.description}</p>}
        {!outOfStock && missing > 0 && (
          <div className="m-progress" aria-label={`${progress}% of the price`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="m-item__status">
          {outOfStock ? (
            <span className="text-danger">Out of stock</span>
          ) : missing > 0 ? (
            <>{formatCredits(missing)} more credits needed</>
          ) : (
            <span className="text-success">You can reserve this!</span>
          )}
          {!outOfStock && !compact && <span className="muted"> · {item.stock} left</span>}
        </p>
        {onReserve && (
          <Button block disabled={outOfStock || missing > 0} onClick={() => onReserve(item)}>
            {outOfStock ? 'Out of stock' : missing > 0 ? 'Not enough credits' : 'Reserve'}
          </Button>
        )}
      </div>
    </article>
  );
}
