import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { deletePersonCascading } from '../db/queries';
import type { Person } from '../types';
import { Avatar } from './Avatar';

interface Props {
  onEdit: (p: Person) => void;
  onOpen: (p: Person) => void;
}

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

export function PersonList({ onEdit, onOpen }: Props) {
  const people = useLiveQuery(() => db.people.orderBy('surname').toArray());

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
  if (people.length === 0) {
    return <p className="empty">No people yet. Add one above.</p>;
  }

  return (
    <ul className="person-list">
      {people.map((p) => (
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
  );
}
