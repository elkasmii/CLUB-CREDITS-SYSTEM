import { useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { CreditAmount, CreditTypeBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { memberService } from '../../services/member.service';
import type { CreditType } from '../../types';
import { CREDIT_TYPE_LABELS, formatCredits, formatDate } from '../../utils/format';

const FILTERS: (CreditType | '')[] = ['', 'QR_REWARD', 'ADMIN_GRANT', 'STORE_RESERVATION', 'STORE_REFUND', 'ADJUSTMENT'];

export function CreditsPage() {
  const [type, setType] = useState<CreditType | ''>('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const summary = useAsync(() => memberService.credits(), []);
  const history = useAsync(() => memberService.transactions({ type: type || undefined, sort }), [type, sort]);

  return (
    <div className="m-stack">
      <header className="m-page-header">
        <h1 className="m-title">CSC Credit History</h1>
        <p className="m-subtitle">Exactly when and why you earned or spent credits.</p>
      </header>

      {summary.data && (
        <div className="summary-row">
          <div className="summary">
            <span className="summary__label">Balance</span>
            <span className="summary__value neon-text">{formatCredits(summary.data.balance)}</span>
          </div>
          <div className="summary">
            <span className="summary__label">Total earned</span>
            <span className="summary__value amount--plus">+{formatCredits(summary.data.totalEarned)}</span>
          </div>
          <div className="summary">
            <span className="summary__label">Total spent</span>
            <span className="summary__value amount--minus">−{formatCredits(summary.data.totalSpent)}</span>
          </div>
        </div>
      )}

      <section className="m-card m-card--flush">
        <div className="m-toolbar">
          <div className="chips" role="tablist" aria-label="Filter by type">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={type === f}
                className={`chip ${type === f ? 'is-active' : ''}`}
                onClick={() => setType(f)}
              >
                {f ? CREDIT_TYPE_LABELS[f] : 'All'}
              </button>
            ))}
          </div>
          <button className="chip" onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}>
            {sort === 'newest' ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
            {sort === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {history.loading && !history.data ? (
          <LoadingState />
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={history.reload} />
        ) : (
          <Table
            rows={history.data ?? []}
            rowKey={(t) => t.id}
            empty={<EmptyState title={type ? 'No transactions of this type' : 'No credit history yet'} />}
            columns={[
              { header: 'Date', render: (t) => formatDate(t.createdAt) },
              { header: 'Description', render: (t) => t.description },
              { header: 'Type', render: (t) => <CreditTypeBadge type={t.type} /> },
              { header: 'Credits', render: (t) => <CreditAmount amount={t.amount} />, className: 'num' },
              { header: 'Balance', render: (t) => formatCredits(t.balanceAfter), className: 'num', hideOnMobile: true },
            ]}
          />
        )}
      </section>
    </div>
  );
}
