import { TextInput } from './ui/Form';
import type { MemberInput } from '../types';

export interface MemberFormValues {
  fullName: string;
  email: string;
  password: string;
  studentId: string;
  program: string;
  yearOfStudy: string;
  phone: string;
}

export const emptyMemberForm: MemberFormValues = {
  fullName: '',
  email: '',
  password: '',
  studentId: '',
  program: '',
  yearOfStudy: '',
  phone: '',
};

export const toMemberInput = (v: MemberFormValues): MemberInput => ({
  fullName: v.fullName,
  email: v.email,
  password: v.password,
  studentId: v.studentId || undefined,
  program: v.program || undefined,
  yearOfStudy: v.yearOfStudy ? Number(v.yearOfStudy) : null,
  phone: v.phone || undefined,
});

interface Props {
  values: MemberFormValues;
  errors: Record<string, string>;
  onChange: (values: MemberFormValues) => void;
  passwordLabel?: string;
}

/** Shared by the public registration form and the admin "create member" modal. */
export function MemberFields({ values, errors, onChange, passwordLabel = 'Password' }: Props) {
  const set = (key: keyof MemberFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [key]: e.target.value });

  return (
    <div className="form-grid">
      <TextInput
        label="Full name"
        required
        autoComplete="name"
        value={values.fullName}
        onChange={set('fullName')}
        error={errors.fullName}
        maxLength={120}
      />
      <TextInput
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={values.email}
        onChange={set('email')}
        error={errors.email}
      />
      <TextInput
        label={passwordLabel}
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        hint="At least 8 characters."
      />
      <TextInput
        label="Student ID"
        value={values.studentId}
        onChange={set('studentId')}
        error={errors.studentId}
        maxLength={50}
      />
      <TextInput
        label="Program / major"
        value={values.program}
        onChange={set('program')}
        error={errors.program}
        placeholder="e.g. Computer Science"
        maxLength={120}
      />
      <TextInput
        label="Year of study"
        type="number"
        min={1}
        max={10}
        inputMode="numeric"
        value={values.yearOfStudy}
        onChange={set('yearOfStudy')}
        error={errors.yearOfStudy}
      />
      <TextInput
        label="Phone"
        type="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={set('phone')}
        error={errors.phone}
        maxLength={30}
      />
    </div>
  );
}
