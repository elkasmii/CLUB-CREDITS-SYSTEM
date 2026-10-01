import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { emptyMemberForm, MemberFields, toMemberInput, type MemberFormValues } from '../../components/MemberFields';
import { UserStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormError } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table, type Column } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';
import { adminService, type MemberStatusAction } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { User, UserStatus } from '../../types';
import { formatCredits, formatDate } from '../../utils/format';

const TABS: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending requests' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function MembersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as UserStatus | '';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());

  const { data: members, loading, error, reload } = useAsync(
    () => adminService.members({ search: debouncedSearch || undefined, status: status || undefined }),
    [debouncedSearch, status],
  );

  // ----- approve / reject -----
  const [pendingAction, setPendingAction] = useState<{ member: User; action: MemberStatusAction } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function runAction() {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      const updated = await adminService.setMemberStatus(pendingAction.member.id, pendingAction.action);
      toast.success(
        pendingAction.action === 'approve'
          ? `${updated.fullName} is now an active member.`
          : `${updated.fullName}'s request was rejected.`,
      );
      setPendingAction(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  // ----- create member -----
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<MemberFormValues>(emptyMemberForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createMember(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormErrors({});
    setFormError(null);
    try {
      const member = await adminService.createMember(toMemberInput(form));
      toast.success(`Account created for ${member.fullName}.`);
      setCreateOpen(false);
      setForm(emptyMemberForm);
      void reload();
    } catch (err) {
      setFormErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const columns: Column<User>[] = [
    {
      header: 'Member',
      render: (m) => (
        <div>
          <strong>{m.fullName}</strong>
          <div className="muted small">{m.email}</div>
        </div>
      ),
    },
    { header: 'Student ID', render: (m) => m.studentId ?? '—', hideOnMobile: true },
    { header: 'Program', render: (m) => m.program ?? '—', hideOnMobile: true },
    { header: 'Status', render: (m) => <UserStatusBadge status={m.status} /> },
    { header: 'Credits', render: (m) => <strong>{formatCredits(m.creditBalance)}</strong>, className: 'num' },
    { header: 'Joined', render: (m) => formatDate(m.createdAt), hideOnMobile: true },
    {
      header: 'Actions',
      className: 'actions',
      render: (m) =>
        m.status === 'PENDING' ? (
          <div className="row-actions" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="success" icon={<Check size={14} />} onClick={() => setPendingAction({ member: m, action: 'approve' })}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setPendingAction({ member: m, action: 'reject' })}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="muted small">View →</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Approve registrations, manage accounts and view balances."
        actions={
          <Button icon={<UserPlus size={16} />} onClick={() => setCreateOpen(true)}>
            Create member
          </Button>
        }
      />

      <Card padded={false}>
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={status === t.value}
                className={`tab ${status === t.value ? 'is-active' : ''}`}
                onClick={() => setParams(t.value ? { status: t.value } : {})}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={16} aria-hidden />
            <input
              className="search__input"
              placeholder="Search name, email, student ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search members"
            />
          </label>
        </div>

        {loading && !members ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            columns={columns}
            rows={members ?? []}
            rowKey={(m) => m.id}
            onRowClick={(m) => navigate(`/admin/members/${m.id}`)}
            empty={
              <EmptyState title={status === 'PENDING' ? 'No pending registration requests' : 'No members found'}>
                {debouncedSearch && 'Try a different search.'}
              </EmptyState>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.action === 'approve' ? 'Approve member?' : 'Reject request?'}
        message={
          pendingAction?.action === 'approve' ? (
            <>
              <strong>{pendingAction.member.fullName}</strong> will be able to log in and earn CSC Credits.
            </>
          ) : (
            <>
              <strong>{pendingAction?.member.fullName}</strong>'s registration request will be rejected. They can
              register again later.
            </>
          )
        }
        confirmLabel={pendingAction?.action === 'approve' ? 'Approve' : 'Reject'}
        tone={pendingAction?.action === 'approve' ? 'primary' : 'danger'}
        loading={actionLoading}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />

      <Modal
        open={createOpen}
        title="Create member account"
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-member-form" loading={creating}>
              Create account
            </Button>
          </>
        }
      >
        <p className="muted">Accounts created here are active immediately — no approval needed.</p>
        <FormError message={formError} />
        <form id="create-member-form" onSubmit={createMember}>
          <MemberFields values={form} errors={formErrors} onChange={setForm} passwordLabel="Initial password" />
        </form>
      </Modal>
    </>
  );
}
