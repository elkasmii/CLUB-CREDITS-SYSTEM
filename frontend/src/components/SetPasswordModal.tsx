import { useEffect, useState, type FormEvent } from 'react';
import { Copy, Eye, EyeOff, Wand2 } from 'lucide-react';
import { Button } from './ui/Button';
import { FormError, TextInput } from './ui/Form';
import { Modal } from './ui/Modal';
import { useToast } from '../hooks/useToast';
import { adminService } from '../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../services/api';

interface Props {
  open: boolean;
  member: { id: number; fullName: string };
  onClose: () => void;
}

/** Readable but strong random password, e.g. "csc-k7Rm-p2Qx-9TfZ". */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `csc-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export function SetPasswordModal({ open, member, onClose }: Props) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setVisible(false);
      setErrors({});
      setError(null);
    }
  }, [open]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      await adminService.setMemberPassword(member.id, password);
      toast.success(`Password updated for ${member.fullName}. They've been logged out of all devices.`);
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied.');
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access.');
    }
  }

  return (
    <Modal
      open={open}
      title={`Set password · ${member.fullName}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="set-password-form" loading={saving}>
            Save password
          </Button>
        </>
      }
    >
      <p className="muted">
        The member will need this new password to log in. Share it with them privately — they can change it later
        with “Forgot password?”.
      </p>
      <FormError message={error} />
      <form id="set-password-form" onSubmit={save} className="stack">
        <TextInput
          label="New password"
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
          <Button
            size="sm"
            variant="secondary"
            icon={<Wand2 size={14} />}
            onClick={() => {
              setPassword(generatePassword());
              setVisible(true);
            }}
          >
            Generate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={visible ? <EyeOff size={14} /> : <Eye size={14} />}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? 'Hide' : 'Show'}
          </Button>
          <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={copy} disabled={!password}>
            Copy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
