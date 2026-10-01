import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowLeft, Copy, Download, Maximize2, Pencil, Power, RefreshCw, X } from 'lucide-react';
import { QrCampaignForm, type QrFormValues } from '../../components/QrCampaignForm';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormError } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Table } from '../../components/ui/Table';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { formatDateTime, isoToLocalInput, localInputToIso } from '../../utils/format';
import { buildQrValue } from '../../utils/qr';
import { campaignState } from './QrCampaignsPage';

export function QrCampaignDetailPage() {
  const id = Number(useParams().id);
  const toast = useToast();
  const { data: campaign, loading, error, reload } = useAsync(() => adminService.qrCampaign(id), [id]);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const [presenting, setPresenting] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [busy, setBusy] = useState(false);

  // ----- edit -----
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<QrFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !campaign) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!campaign) return null;

  const qrValue = buildQrValue(campaign.token);

  function download() {
    const canvas = canvasWrap.current?.querySelector('canvas');
    if (!canvas || !campaign) return;
    const link = document.createElement('a');
    link.download = `csc-qr-${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qrValue);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access.');
    }
  }

  async function update(input: Parameters<typeof adminService.updateQrCampaign>[1], message: string) {
    setBusy(true);
    try {
      await adminService.updateQrCampaign(id, input);
      toast.success(message);
      await reload();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    if (!campaign) return;
    setForm({
      title: campaign.title,
      description: campaign.description ?? '',
      credits: String(campaign.credits),
      expiresAt: isoToLocalInput(campaign.expiresAt),
      isActive: campaign.isActive,
    });
    setErrors({});
    setFormError(null);
    setEditOpen(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await adminService.updateQrCampaign(id, {
        title: form.title,
        description: form.description || null,
        credits: Number(form.credits),
        expiresAt: localInputToIso(form.expiresAt),
        isActive: form.isActive,
      });
      toast.success('QR code updated.');
      setEditOpen(false);
      void reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/admin/qr" className="back-link">
        <ArrowLeft size={16} /> All QR codes
      </Link>
      <PageHeader
        title={campaign.title}
        subtitle={campaign.description ?? undefined}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={openEdit}>
              Edit
            </Button>
            <Button
              variant={campaign.isActive ? 'ghost' : 'primary'}
              icon={<Power size={16} />}
              loading={busy}
              onClick={() =>
                update({ isActive: !campaign.isActive }, campaign.isActive ? 'QR code deactivated.' : 'QR code activated.')
              }
            >
              {campaign.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      />

      <div className="qr-layout">
        <Card title="QR code">
          <div className="qr-display" ref={canvasWrap}>
            <QRCodeCanvas value={qrValue} size={260} level="M" marginSize={2} />
          </div>
          <div className="qr-meta">
            <span className="qr-meta__credits">+{campaign.credits} CSC Credits</span>
            {campaignState(campaign)}
          </div>
          <div className="qr-actions">
            <Button variant="primary" icon={<Maximize2 size={16} />} onClick={() => setPresenting(true)}>
              Present
            </Button>
            <Button variant="secondary" icon={<Download size={16} />} onClick={download}>
              PNG
            </Button>
            <Button variant="secondary" icon={<Copy size={16} />} onClick={copyLink}>
              Copy link
            </Button>
          </div>
          <p className="muted small qr-note">
            The QR contains only a random code — never the credit amount. Each member can redeem it once.
          </p>
        </Card>

        <div className="stack">
          <Card title="Details">
            <dl className="details">
              <dt>Credits</dt>
              <dd>+{campaign.credits}</dd>
              <dt>Redeemed by</dt>
              <dd>{campaign._count.redemptions} member(s)</dd>
              <dt>Expires</dt>
              <dd>{campaign.expiresAt ? formatDateTime(campaign.expiresAt) : 'Never'}</dd>
              <dt>Created</dt>
              <dd>
                {formatDateTime(campaign.createdAt)} by {campaign.createdBy.fullName}
              </dd>
            </dl>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => setConfirmRegen(true)}>
              Regenerate code
            </Button>
          </Card>

          <Card title={`Redemptions (${campaign.redemptions.length})`} padded={false}>
            <Table
              rows={campaign.redemptions}
              rowKey={(r) => r.id}
              empty={<EmptyState title="Nobody has redeemed this yet" />}
              columns={[
                {
                  header: 'Member',
                  render: (r) => (
                    <Link to={`/admin/members/${r.member.id}`}>
                      <strong>{r.member.fullName}</strong>
                    </Link>
                  ),
                },
                { header: 'Student ID', render: (r) => r.member.studentId ?? '—', hideOnMobile: true },
                { header: 'Redeemed', render: (r) => formatDateTime(r.redeemedAt) },
              ]}
            />
          </Card>
        </div>
      </div>

      {presenting && (
        <div className="present" role="dialog" aria-modal="true" aria-label="Present QR code">
          <button className="icon-btn present__close" onClick={() => setPresenting(false)} aria-label="Close">
            <X size={24} />
          </button>
          <h2 className="present__title">{campaign.title}</h2>
          <div className="present__qr">
            <QRCodeCanvas value={qrValue} size={720} level="M" marginSize={2} style={{ width: '100%', height: 'auto' }} />
          </div>
          <p className="present__credits">Scan to earn +{campaign.credits} CSC Credits</p>
        </div>
      )}

      <ConfirmDialog
        open={confirmRegen}
        title="Regenerate QR code?"
        message="A new random code will be created. The current QR (printed or shared) will stop working immediately. Members who already redeemed keep their credits and still can't redeem again."
        confirmLabel="Regenerate"
        tone="danger"
        loading={busy}
        onConfirm={async () => {
          if (await update({ regenerateToken: true }, 'New QR code generated.')) setConfirmRegen(false);
        }}
        onCancel={() => setConfirmRegen(false)}
      />

      <Modal
        open={editOpen}
        title="Edit QR code"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="qr-edit-form" loading={busy}>
              Save changes
            </Button>
          </>
        }
      >
        <FormError message={formError} />
        {form && (
          <form id="qr-edit-form" onSubmit={saveEdit}>
            <QrCampaignForm values={form} errors={errors} onChange={setForm} />
          </form>
        )}
      </Modal>
    </>
  );
}
