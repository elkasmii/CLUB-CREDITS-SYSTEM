import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { emptyMemberForm, MemberFields, toMemberInput, type MemberFormValues } from '../../components/MemberFields';
import { Button } from '../../components/ui/Button';
import { FormError, TextInput } from '../../components/ui/Form';
import { homePathFor, useAuth } from '../../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { authService } from '../../services/auth.service';

export function RegisterPage() {
  const { user } = useAuth();
  const [values, setValues] = useState<MemberFormValues>(emptyMemberForm);
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    if (values.password !== confirm) {
      setErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await authService.register(toMemberInput(values));
      setDone(true);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-card auth-card--center">
        <CheckCircle2 size={48} className="glow-icon" aria-hidden />
        <h1 className="auth-card__title">Request sent!</h1>
        <p className="auth-card__subtitle">
          Your account is <strong>pending</strong>. A CSC administrator will review it soon — you can log in once
          it's approved.
        </p>
        <Link to="/login" className="btn btn--primary btn--lg btn--block">
          <span>Back to login</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-card--wide">
      <h1 className="auth-card__title">Join CSC Credits</h1>
      <p className="auth-card__subtitle">Earn credits at club events and spend them in the CSC Store.</p>
      <FormError message={formError} />
      <form onSubmit={onSubmit} className="stack">
        <MemberFields values={values} errors={errors} onChange={setValues} />
        <TextInput
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" block size="lg" loading={submitting} icon={<UserPlus size={18} />}>
          Submit registration
        </Button>
      </form>
      <p className="auth-card__footer">
        Already a member? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
