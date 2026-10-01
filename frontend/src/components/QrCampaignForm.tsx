import { TextArea, TextInput, Toggle } from './ui/Form';

export interface QrFormValues {
  title: string;
  description: string;
  credits: string;
  expiresAt: string; // datetime-local value
  isActive: boolean;
}

export const emptyQrForm: QrFormValues = { title: '', description: '', credits: '', expiresAt: '', isActive: true };

/** One-click presets for the standard CSC credit rules. */
const PRESETS = [
  { label: 'Session attendance', credits: 5, suffix: 'Attendance' },
  { label: 'Session completion', credits: 10, suffix: 'Completion' },
  { label: 'Full workshop bonus', credits: 30, suffix: 'Full Workshop Bonus' },
];

interface Props {
  values: QrFormValues;
  errors: Record<string, string>;
  onChange: (v: QrFormValues) => void;
  showPresets?: boolean;
}

export function QrCampaignForm({ values, errors, onChange, showPresets }: Props) {
  const set = <K extends keyof QrFormValues>(key: K, value: QrFormValues[K]) => onChange({ ...values, [key]: value });

  return (
    <div className="stack">
      {showPresets && (
        <div className="presets">
          <span className="presets__label">Quick presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              onClick={() =>
                onChange({
                  ...values,
                  credits: String(p.credits),
                  title: values.title ? values.title : `Session — ${p.suffix}`,
                })
              }
            >
              {p.label} <strong>+{p.credits}</strong>
            </button>
          ))}
        </div>
      )}
      <TextInput
        label="Title"
        required
        maxLength={150}
        placeholder="Cybersecurity Conference"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        hint="Members see this as the reason for their credits."
      />
      <TextArea
        label="Description"
        rows={3}
        maxLength={2000}
        placeholder="Credits for attending the CSC cybersecurity conference"
        value={values.description}
        onChange={(e) => set('description', e.target.value)}
        error={errors.description}
      />
      <div className="form-grid">
        <TextInput
          label="CSC Credits awarded"
          type="number"
          required
          min={1}
          max={10000}
          step={1}
          inputMode="numeric"
          value={values.credits}
          onChange={(e) => set('credits', e.target.value)}
          error={errors.credits}
        />
        <TextInput
          label="Expires (optional)"
          type="datetime-local"
          value={values.expiresAt}
          onChange={(e) => set('expiresAt', e.target.value)}
          error={errors.expiresAt}
          hint="Leave empty for no expiry."
        />
      </div>
      <Toggle
        label="Active"
        hint="Inactive QR codes cannot be redeemed."
        checked={values.isActive}
        onChange={(v) => set('isActive', v)}
      />
    </div>
  );
}
