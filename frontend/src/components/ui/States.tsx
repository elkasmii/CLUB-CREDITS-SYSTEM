import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '../../services/api';

export function Spinner({ size = 20 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <Spinner size={28} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <AlertTriangle size={28} aria-hidden />
      <p>{getErrorMessage(error)}</p>
      {onRetry && (
        <button className="btn btn--secondary btn--sm" onClick={onRetry}>
          <RefreshCw size={14} /> <span>Try again</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="state state--empty">
      {icon ?? <Inbox size={28} aria-hidden />}
      <p className="state__title">{title}</p>
      {children && <div className="state__body">{children}</div>}
    </div>
  );
}

/** Skeleton blocks shown while cards load. */
export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <span className="skeleton" style={{ height, width }} aria-hidden />;
}
