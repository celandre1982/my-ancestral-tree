import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import {
  addParentChild,
  deletePersonCascading,
  getChildren,
  getParents,
  removeRelationshipBetween,
} from '../db/queries';
import type { Person } from '../types';
import { Avatar } from './Avatar';
import { NewRelativeForm } from './NewRelativeForm';
import { PersonPicker } from './PersonPicker';
import { SpouseSection } from './SpouseSection';

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
  const children = useLiveQuery(() => getChildren(id), [id]) ?? [];

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
        pickerLabel="Link parent"
        newLabel="Add as parent"
        people={parents}
        excludeIds={excludeForParents}
        link={(parentId) => addParentChild(parentId, id)}
        onOpen={onOpen}
        onRemove={(other) =>
          removeRelationshipBetween('parent-child', other, id)
        }
      />
      <SpouseSection personId={id} onOpen={onOpen} />
      <RelationSection
        title="Children"
        pickerLabel="Link child"
        newLabel="Add as child"
        people={children}
        excludeIds={excludeForChildren}
        link={(childId) => addParentChild(id, childId)}
        onOpen={onOpen}
        onRemove={(other) =>
          removeRelationshipBetween('parent-child', id, other)
        }
      />
    </article>
  );
}

interface RelationSectionProps {
  title: string;
  pickerLabel: string;
  newLabel: string;
  people: Person[];
  excludeIds: number[];
  link: (otherId: number) => Promise<void>;
  onOpen: (p: Person) => void;
  onRemove: (otherId: number) => Promise<void>;
}

function RelationSection({
  title,
  pickerLabel,
  newLabel,
  people,
  excludeIds,
  link,
  onOpen,
  onRemove,
}: RelationSectionProps) {
  const [showNew, setShowNew] = useState(false);

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
      <div className="picker-row">
        <PersonPicker
          excludeIds={excludeIds}
          label={pickerLabel}
          onPick={(otherId) => link(otherId)}
        />
        {showNew ? (
          <NewRelativeForm
            addLabel={newLabel}
            onCreated={async (newId) => {
              await link(newId);
              setShowNew(false);
            }}
            onCancel={() => setShowNew(false)}
          />
        ) : (
          <button type="button" onClick={() => setShowNew(true)}>
            + New person
          </button>
        )}
      </div>
    </section>
  );
}
