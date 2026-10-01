import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FormError, TextInput } from '../../components/ui/Form';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../../services/api';
import { authService } from '../../services/auth.service';

/** Opened from the link in the reset email: /reset-password?token=... */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);
    if (password !== confirm) {
      setErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError({ code: getErrorCode(err), message: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-card auth-card--center">
        <CheckCircle2 size={48} className="glow-icon" aria-hidden />
        <h1 className="auth-card__title">Password changed</h1>
        <p className="auth-card__subtitle">You can now log in with your new password.</p>
        <Link to="/login" className="btn btn--primary btn--lg btn--block">
          <span>Log in</span>
        </Link>
      </div>
    );
  }

  if (!token || error?.code === 'INVALID_RESET_TOKEN') {
    return (
      <div className="auth-card auth-card--center">
        <h1 className="auth-card__title">Link not valid</h1>
        <p className="auth-card__subtitle">
          {error?.message ?? 'This reset link is incomplete.'} Reset links expire after 1 hour and work only once.
        </p>
        <Link to="/forgot-password" className="btn btn--primary btn--lg btn--block">
          <span>Request a new link</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Choose a new password</h1>
      <p className="auth-card__subtitle">You'll be logged out of every other device.</p>
      <FormError message={error?.message} />
      <form onSubmit={onSubmit} className="stack">
        <TextInput
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <TextInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" block size="lg" loading={submitting} icon={<KeyRound size={18} />}>
          Change password
        </Button>
      </form>
    </div>
  );
}
