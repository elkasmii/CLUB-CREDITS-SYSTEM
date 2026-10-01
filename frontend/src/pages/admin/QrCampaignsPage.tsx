import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Plus, QrCode } from 'lucide-react';
import { emptyQrForm, QrCampaignForm, type QrFormValues } from '../../components/QrCampaignForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { FormError } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { QrCampaign } from '../../types';
import { formatDate, formatDateTime, localInputToIso } from '../../utils/format';

export function campaignState(c: Pick<QrCampaign, 'isActive' | 'expiresAt'>) {
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return <Badge tone="danger">Expired</Badge>;
  if (!c.isActive) return <Badge tone="neutral">Inactive</Badge>;
  return <Badge tone="success">Active</Badge>;
}

export function QrCampaignsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: campaigns, loading, error, reload } = useAsync(() => adminService.qrCampaigns(), []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<QrFormValues>(emptyQrForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      const campaign = await adminService.createQrCampaign({
        title: form.title,
        description: form.description || null,
        credits: Number(form.credits),
        expiresAt: localInputToIso(form.expiresAt),
        isActive: form.isActive,
      });
      toast.success('QR code generated.');
      setOpen(false);
      setForm(emptyQrForm);
      navigate(`/admin/qr/${campaign.id}`);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="QR Credits"
        subtitle="Create QR codes that award CSC Credits. Each member can redeem a given QR code only once."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            New QR code
          </Button>
        }
      />

      <Card padded={false}>
        {loading && !campaigns ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            rows={campaigns ?? []}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/admin/qr/${c.id}`)}
            empty={
              <EmptyState title="No QR codes yet" icon={<QrCode size={28} />}>
                Create one for your next workshop or event.
              </EmptyState>
            }
            columns={[
              {
                header: 'Title',
                render: (c) => (
                  <div>
                    <strong>{c.title}</strong>
                    {c.description && <div className="muted small truncate">{c.description}</div>}
                  </div>
                ),
              },
              { header: 'Credits', render: (c) => <strong>+{c.credits}</strong>, className: 'num' },
              { header: 'Redeemed', render: (c) => `${c._count.redemptions}×`, className: 'num' },
              { header: 'Status', render: (c) => campaignState(c) },
              { header: 'Expires', render: (c) => (c.expiresAt ? formatDateTime(c.expiresAt) : 'Never'), hideOnMobile: true },
              { header: 'Created', render: (c) => formatDate(c.createdAt), hideOnMobile: true },
            ]}
          />
        )}
      </Card>

      <Modal
        open={open}
        title="New QR credit code"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="qr-create-form" loading={saving} icon={<QrCode size={16} />}>
              Generate QR
            </Button>
          </>
        }
      >
        <FormError message={formError} />
        <form id="qr-create-form" onSubmit={create}>
          <QrCampaignForm values={form} errors={errors} onChange={setForm} showPresets />
        </form>
      </Modal>
    </>
  );
}
