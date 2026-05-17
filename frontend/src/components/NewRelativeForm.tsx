import { useState } from 'react';
import { db } from '../db/db';
import type { Sex } from '../types';

interface Props {
  defaultSex?: Sex;
  addLabel: string;
  onCreated: (id: number) => Promise<void>;
  onCancel?: () => void;
}

export function NewRelativeForm({
  defaultSex = 'U',
  addLabel,
  onCreated,
  onCancel,
}: Props) {
  const [givenName, setGivenName] = useState('');
  const [surname, setSurname] = useState('');
  const [sex, setSex] = useState<Sex>(defaultSex);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const g = givenName.trim();
    const s = surname.trim();
    if (!g && !s) return;
    setBusy(true);
    try {
      const id = (await db.people.add({
        givenName: g,
        surname: s,
        sex,
      })) as number;
      await onCreated(id);
      setGivenName('');
      setSurname('');
      setSex(defaultSex);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="new-relative-form" onSubmit={submit}>
      <input
        placeholder="Given name"
        value={givenName}
        onChange={(e) => setGivenName(e.target.value)}
        autoFocus
      />
      <input
        placeholder="Surname"
        value={surname}
        onChange={(e) => setSurname(e.target.value)}
      />
      <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
        <option value="U">Unknown</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
      </select>
      <button type="submit" disabled={busy || (!givenName.trim() && !surname.trim())}>
        {addLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}
