import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Coins } from 'lucide-react';
import { MemberPicker } from '../../components/MemberPicker';
import { CreditAmount, CreditTypeBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormError, TextInput } from '../../components/ui/Form';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { User } from '../../types';
import { formatCredits, formatDateTime } from '../../utils/format';

export function GiveCreditsPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const members = useAsync(() => adminService.members({ status: 'ACTIVE' }), []);
  const recent = useAsync(() => adminService.recentGrants(), []);

  const [member, setMember] = useState<User | null>(null);
  const [mode, setMode] = useState<'give' | 'deduct'>('give');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-select a member when coming from their profile page (?member=12).
  useEffect(() => {
    const preselect = Number(params.get('member'));
    if (preselect && members.data && !member) setMember(members.data.find((m) => m.id === preselect) ?? null);
  }, [params, members.data, member]);

  const n = Number(amount);
  const signed = mode === 'give' ? n : -n;

  function review(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!member) errs.memberId = 'Choose a member.';
    if (!Number.isInteger(n) || n <= 0) errs.amount = 'Enter a whole number greater than 0.';
    if (reason.trim().length < 3) errs.reason = 'Please give a reason.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length === 0) setConfirming(true);
  }

  async function submit() {
    if (!member) return;
    setSaving(true);
    try {
      const result = await adminService.grantCredits(member.id, signed, reason.trim());
      toast.success(
        `${mode === 'give' ? 'Gave' : 'Deducted'} ${formatCredits(n)} credits ${mode === 'give' ? 'to' : 'from'} ${member.fullName}. New balance: ${formatCredits(result.newBalance)}.`,
      );
      setConfirming(false);
      setAmount('');
      setReason('');
      setMember(null);
      void members.reload();
      void recent.reload();
    } catch (err) {
      setConfirming(false);
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Give Credits" subtitle="Manually reward members — every grant is recorded in their credit history." />

      <div className="grid-2 grid-2--form">
        <Card title="New credit grant">
          {members.loading && !members.data ? (
            <LoadingState />
          ) : members.error ? (
            <ErrorState error={members.error} onRetry={members.reload} />
          ) : (
            <form onSubmit={review} className="stack">
              <FormError message={formError} />
              <MemberPicker members={members.data ?? []} value={member} onChange={setMember} error={errors.memberId} />

              <div className="segmented" role="radiogroup" aria-label="Action">
                <button type="button" role="radio" aria-checked={mode === 'give'} className={mode === 'give' ? 'is-active' : ''} onClick={() => setMode('give')}>
                  Give credits
                </button>
                <button type="button" role="radio" aria-checked={mode === 'deduct'} className={mode === 'deduct' ? 'is-active' : ''} onClick={() => setMode('deduct')}>
                  Deduct (correction)
                </button>
              </div>

              <TextInput
                label="Credits"
                type="number"
                min={1}
                max={10000}
                step={1}
                required
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
              <TextInput
                label="Reason"
                required
                maxLength={200}
                placeholder="Helped organize the workshop"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={errors.reason}
                hint="Shown to the member in their credit history."
              />
              <Button type="submit" icon={<Coins size={16} />}>
                {mode === 'give' ? 'Give credits' : 'Deduct credits'}
              </Button>
            </form>
          )}
        </Card>

        <Card title="Recent manual grants" padded={false}>
          {recent.loading && !recent.data ? (
            <LoadingState />
          ) : recent.error ? (
            <ErrorState error={recent.error} onRetry={recent.reload} />
          ) : (
            <Table
              rows={recent.data ?? []}
              rowKey={(t) => t.id}
              empty={<EmptyState title="No manual grants yet" />}
              columns={[
                {
                  header: 'Member',
                  render: (t) => (t.member ? <Link to={`/admin/members/${t.member.id}`}>{t.member.fullName}</Link> : '—'),
                },
                { header: 'Reason', render: (t) => t.description },
                { header: 'Type', render: (t) => <CreditTypeBadge type={t.type} />, hideOnMobile: true },
                { header: 'Credits', render: (t) => <CreditAmount amount={t.amount} />, className: 'num' },
                { header: 'When', render: (t) => formatDateTime(t.createdAt), hideOnMobile: true },
              ]}
            />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        title={mode === 'give' ? 'Give credits?' : 'Deduct credits?'}
        message={
          member && (
            <>
              {mode === 'give' ? 'Give' : 'Deduct'} <strong>{formatCredits(n)} CSC Credits</strong> {mode === 'give' ? 'to' : 'from'}{' '}
              <strong>{member.fullName}</strong>?
              <br />
              <span className="muted">Reason: {reason}</span>
            </>
          )
        }
        confirmLabel={mode === 'give' ? 'Give credits' : 'Deduct credits'}
        tone={mode === 'give' ? 'primary' : 'danger'}
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
