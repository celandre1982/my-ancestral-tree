import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db/db';
import { deletePersonCascading } from '../db/queries';
import type { Person } from '../types';
import { Avatar } from './Avatar';

interface Props {
  onEdit: (p: Person) => void;
  onOpen: (p: Person) => void;
}

type SortKey = 'surname' | 'givenName' | 'birthDate' | 'deathDate';

const SORT_LABELS: Record<SortKey, string> = {
  surname: 'Surname',
  givenName: 'Given name',
  birthDate: 'Birth date',
  deathDate: 'Death date',
};

function displayName(p: Person) {
  const name = `${p.givenName} ${p.surname}`.trim();
  return name || '(unnamed)';
}

function lifespan(p: Person) {
  const b = p.birthDate ? p.birthDate.slice(0, 4) : '';
  const d = p.deathDate ? p.deathDate.slice(0, 4) : '';
  if (!b && !d) return '';
  return `${b}–${d}`;
}

function sortKeyFor(p: Person, by: SortKey): string {
  switch (by) {
    case 'surname':
      // Fall back to given name when surname is missing so people without
      // a surname still slot into the alphabet instead of all bunching at
      // the end.
      return `${(p.surname ?? '').trim()} ${(p.givenName ?? '').trim()}`
        .trim()
        .toLowerCase();
    case 'givenName':
      return `${(p.givenName ?? '').trim()} ${(p.surname ?? '').trim()}`
        .trim()
        .toLowerCase();
    case 'birthDate':
    case 'deathDate':
      return p[by] ?? '';
  }
}

export function PersonList({ onEdit, onOpen }: Props) {
  const people = useLiveQuery(() => db.people.toArray());
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('surname');
  const [sortAsc, setSortAsc] = useState(true);

  const visible = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? people.filter((p) =>
          `${p.givenName} ${p.surname}`.toLowerCase().includes(q),
        )
      : people;
    const sorted = [...filtered].sort((a, b) => {
      const av = sortKeyFor(a, sortBy);
      const bv = sortKeyFor(b, sortBy);
      // Push empty values to the end regardless of direction.
      if (av === '' && bv !== '') return 1;
      if (bv === '' && av !== '') return -1;
      if (av === bv) return 0;
      return av < bv ? -1 : 1;
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [people, query, sortBy, sortAsc]);

  const remove = async (p: Person) => {
    if (p.id == null) return;
    if (
      !confirm(
        `Delete ${displayName(p)}? Their relationships will also be removed.`,
      )
    )
      return;
    await deletePersonCascading(p.id);
  };

  if (!people) return <p>Loading…</p>;

  return (
    <div className="people-panel">
      <div className="people-toolbar">
        <input
          type="search"
          className="people-search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="sort-control">
          Sort
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="sort-direction"
          onClick={() => setSortAsc((v) => !v)}
          aria-label={sortAsc ? 'Sort ascending' : 'Sort descending'}
          title={sortAsc ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
        >
          {sortAsc ? '↑' : '↓'}
        </button>
        <span className="result-count">
          {visible.length === people.length
            ? `${people.length} ${people.length === 1 ? 'person' : 'people'}`
            : `${visible.length} of ${people.length}`}
        </span>
      </div>

      {people.length === 0 ? (
        <p className="empty">No people yet. Add one above.</p>
      ) : visible.length === 0 ? (
        <p className="empty">No matches for "{query}".</p>
      ) : (
        <ul className="person-list">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="link-button row-button"
                onClick={() => onOpen(p)}
              >
                <Avatar person={p} size={36} />
                <span className="row-text">
                  <strong>{displayName(p)}</strong>
                  <span className="lifespan">{lifespan(p)}</span>
                </span>
              </button>
              <div className="actions">
                <button onClick={() => onEdit(p)}>Edit</button>
                <button onClick={() => remove(p)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
