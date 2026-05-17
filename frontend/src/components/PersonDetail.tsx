import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  addParentChild,
  addSpouse,
  deletePersonCascading,
  getChildren,
  getParents,
  getSpouses,
  removeRelationshipBetween,
} from '../db/queries';
import type { Person } from '../types';
import { Avatar } from './Avatar';
import { PersonPicker } from './PersonPicker';

interface Props {
  person: Person;
  onEdit: (p: Person) => void;
  onOpen: (p: Person) => void;
  onViewTree: (p: Person) => void;
  onClose: () => void;
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

export function PersonDetail({
  person,
  onEdit,
  onOpen,
  onViewTree,
  onClose,
}: Props) {
  const id = person.id!;

  const parents = useLiveQuery(() => getParents(id), [id]) ?? [];
  const spouses = useLiveQuery(() => getSpouses(id), [id]) ?? [];
  const children = useLiveQuery(() => getChildren(id), [id]) ?? [];

  // Re-fetch the latest version of this person so edits show up live.
  const current = useLiveQuery(() => db.people.get(id), [id]) ?? person;

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete ${displayName(current)}? Their relationships will also be removed.`,
      )
    )
      return;
    await deletePersonCascading(id);
    onClose();
  };

  const excludeForParents = [id, ...parents.map((p) => p.id!)];
  const excludeForSpouses = [id, ...spouses.map((p) => p.id!)];
  const excludeForChildren = [id, ...children.map((p) => p.id!)];

  return (
    <article className="person-detail">
      <div className="header-row">
        <button type="button" onClick={onClose}>
          ← Back
        </button>
        <div className="header-actions">
          <button type="button" onClick={() => onViewTree(current)}>
            View tree
          </button>
          <button type="button" onClick={() => onEdit(current)}>
            Edit
          </button>
          <button type="button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="person-summary">
        <Avatar person={current} size={96} />
        <div>
          <h2>
            {displayName(current)}{' '}
            <span className="lifespan">{lifespan(current)}</span>
          </h2>
          {(current.birthPlace || current.deathPlace) && (
            <p className="places">
              {current.birthPlace && <>Born in {current.birthPlace}. </>}
              {current.deathPlace && <>Died in {current.deathPlace}.</>}
            </p>
          )}
          {current.notes && <p className="notes-body">{current.notes}</p>}
        </div>
      </div>

      <RelationSection
        title="Parents"
        people={parents}
        onOpen={onOpen}
        onRemove={(other) =>
          removeRelationshipBetween('parent-child', other, id)
        }
        picker={
          <PersonPicker
            excludeIds={excludeForParents}
            label="Add parent"
            onPick={(parentId) => addParentChild(parentId, id)}
          />
        }
      />
      <RelationSection
        title="Spouses"
        people={spouses}
        onOpen={onOpen}
        onRemove={(other) => removeRelationshipBetween('spouse', other, id)}
        picker={
          <PersonPicker
            excludeIds={excludeForSpouses}
            label="Add spouse"
            onPick={(spouseId) => addSpouse(id, spouseId)}
          />
        }
      />
      <RelationSection
        title="Children"
        people={children}
        onOpen={onOpen}
        onRemove={(other) =>
          removeRelationshipBetween('parent-child', id, other)
        }
        picker={
          <PersonPicker
            excludeIds={excludeForChildren}
            label="Add child"
            onPick={(childId) => addParentChild(id, childId)}
          />
        }
      />
    </article>
  );
}

interface RelationSectionProps {
  title: string;
  people: Person[];
  onOpen: (p: Person) => void;
  onRemove: (otherId: number) => Promise<void>;
  picker: React.ReactNode;
}

function RelationSection({
  title,
  people,
  onOpen,
  onRemove,
  picker,
}: RelationSectionProps) {
  return (
    <section className="relation-section">
      <h3>{title}</h3>
      {people.length === 0 ? (
        <p className="empty">None recorded.</p>
      ) : (
        <ul className="relation-list">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="link-button row-button"
                onClick={() => onOpen(p)}
              >
                <Avatar person={p} size={28} />
                <span className="row-text">
                  {displayName(p)}
                  <span className="lifespan">{lifespan(p)}</span>
                </span>
              </button>
              <button type="button" onClick={() => onRemove(p.id!)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="picker-row">{picker}</div>
    </section>
  );
}
