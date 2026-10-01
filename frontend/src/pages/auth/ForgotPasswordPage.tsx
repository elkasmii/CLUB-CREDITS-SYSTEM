import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { MailCheck, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FormError, TextInput } from '../../components/ui/Form';
import { getErrorMessage } from '../../services/api';
import { authService } from '../../services/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-card auth-card--center">
        <MailCheck size={48} className="glow-icon" aria-hidden />
        <h1 className="auth-card__title">Check your inbox</h1>
        <p className="auth-card__subtitle">
          If an active account uses <strong>{email}</strong>, we've sent a link to reset your password. It's valid for
          1 hour. Don't forget to check your spam folder.
        </p>
        <Link to="/login" className="btn btn--primary btn--lg btn--block">
          <span>Back to login</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Forgot password?</h1>
      <p className="auth-card__subtitle">Enter your account email and we'll send you a reset link.</p>
      <FormError message={error} />
      <form onSubmit={onSubmit} className="stack">
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" block size="lg" loading={submitting} icon={<Send size={18} />}>
          Send reset link
        </Button>
      </form>
      <p className="auth-card__footer">
        Remembered it? <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
