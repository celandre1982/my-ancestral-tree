import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import type { Person } from '../types';

interface Props {
  excludeIds: number[];
  onPick: (personId: number) => void;
  label?: string;
}

function displayName(p: Person) {
  const name = `${p.givenName} ${p.surname}`.trim();
  return name || '(unnamed)';
}

export function PersonPicker({ excludeIds, onPick, label = 'Add' }: Props) {
  const [selected, setSelected] = useState<string>('');
  const people = useLiveQuery(
    () => db.people.orderBy('surname').toArray(),
    [],
  );

  if (!people) return null;
  const exclude = new Set(excludeIds);
  const candidates = people.filter((p) => p.id != null && !exclude.has(p.id));

  if (candidates.length === 0) {
    return <span className="picker-empty">No people available.</span>;
  }

  const submit = () => {
    const id = Number(selected);
    if (!id) return;
    onPick(id);
    setSelected('');
  };

  return (
    <span className="person-picker">
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">— pick a person —</option>
        {candidates.map((p) => (
          <option key={p.id} value={p.id}>
            {displayName(p)}
          </option>
        ))}
      </select>
      <button type="button" onClick={submit} disabled={!selected}>
        {label}
      </button>
    </span>
  );
}
