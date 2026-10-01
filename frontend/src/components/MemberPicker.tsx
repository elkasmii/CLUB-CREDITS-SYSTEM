import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { User } from '../types';
import { formatCredits, initials } from '../utils/format';

interface Props {
  members: User[];
  value: User | null;
  onChange: (member: User | null) => void;
  error?: string;
}

/** Search-as-you-type member selector (works fine for a few hundred members). */
export function MemberPicker({ members, value, onChange, error }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? members.filter(
          (m) =>
            m.fullName.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            (m.studentId ?? '').toLowerCase().includes(q),
        )
      : members;
    return list.slice(0, 8);
  }, [members, query]);

  if (value) {
    return (
      <div className="field">
        <span className="field__label">Member</span>
        <div className="picker-selected">
          <span className="avatar">{initials(value.fullName)}</span>
          <span className="picker-selected__info">
            <strong>{value.fullName}</strong>
            <small>
              {value.email} · balance {formatCredits(value.creditBalance)}
            </small>
          </span>
          <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Change member">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`field picker ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor="member-picker">
        Member <span className="field__required">*</span>
      </label>
      <div className="search search--input">
        <Search size={16} aria-hidden />
        <input
          id="member-picker"
          className="search__input"
          placeholder="Search by name, email or student ID"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          role="combobox"
          aria-expanded={open}
          aria-controls="member-picker-list"
        />
      </div>
      {open && (
        <ul className="picker__list" id="member-picker-list" role="listbox">
          {matches.length === 0 ? (
            <li className="picker__empty">No active members match.</li>
          ) : (
            matches.map((m) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="picker__option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(m);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <span className="avatar avatar--sm">{initials(m.fullName)}</span>
                  <span>
                    <strong>{m.fullName}</strong>
                    <small>{m.email}</small>
                  </span>
                  <span className="picker__balance">{formatCredits(m.creditBalance)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
