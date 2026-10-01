import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { Clock, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FormError, TextInput } from '../../components/ui/Form';
import { homePathFor, useAuth } from '../../hooks/useAuth';
import { getErrorCode, getErrorMessage } from '../../services/api';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  // Once logged in (or if already logged in), go back to the page they wanted — e.g. a
  // scanned QR link — as long as it belongs to their own panel; otherwise to their home.
  if (user) {
    const panel = user.role === 'ADMIN' ? '/admin/' : '/member/';
    return <Navigate to={from?.startsWith(panel) ? from : homePathFor(user)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password); // setting the user triggers the redirect above
    } catch (err) {
      setError({ code: getErrorCode(err), message: getErrorMessage(err) });
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Welcome back</h1>
      <p className="auth-card__subtitle">Log in to see your CSC Credits.</p>

      {error?.code === 'ACCOUNT_PENDING' ? (
        <div className="notice notice--warning" role="alert">
          <Clock size={18} aria-hidden />
          <div>
            <strong>Account pending approval</strong>
            <p>{error.message}</p>
          </div>
        </div>
      ) : (
        <FormError message={error?.message} />
      )}

      <form onSubmit={onSubmit} className="stack">
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link to="/forgot-password" className="forgot-link">
          Forgot password?
        </Link>
        <Button type="submit" block size="lg" loading={submitting} icon={<LogIn size={18} />}>
          Log in
        </Button>
      </form>

      <p className="auth-card__footer">
        New to CSC? <Link to="/register">Request an account</Link>
      </p>
    </div>
  );
}
