import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  addSpouse,
  deleteRelationship,
  getMarriages,
  updateMarriage,
  type Marriage,
} from '../db/queries';
import type { Person } from '../types';
import { Avatar } from './Avatar';
import { NewRelativeForm } from './NewRelativeForm';
import { PersonPicker } from './PersonPicker';

interface Props {
  personId: number;
  onOpen: (p: Person) => void;
}

function displayName(p: Person) {
  const name = `${p.givenName} ${p.surname}`.trim();
  return name || '(unnamed)';
}

function yearOf(date?: string) {
  return date ? date.slice(0, 4) : '';
}

function marriageSummary(m: Marriage) {
  const s = yearOf(m.startDate);
  const e = yearOf(m.endDate);
  if (s && e) return `m. ${s}–${e}`;
  if (s) return `m. ${s}`;
  if (e) return `ended ${e}`;
  return '';
}

export function SpouseSection({ personId, onOpen }: Props) {
  const marriages =
    useLiveQuery(() => getMarriages(personId), [personId]) ?? [];
  const [editing, setEditing] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <section className="relation-section">
      <h3>Spouses</h3>
      {marriages.length === 0 ? (
        <p className="empty">None recorded.</p>
      ) : (
        <ul className="relation-list">
          {marriages.map((m) => (
            <li key={m.relationshipId} className="marriage-row">
              <button
                type="button"
                className="link-button row-button"
                onClick={() => onOpen(m.person)}
              >
                <Avatar person={m.person} size={28} />
                <span className="row-text">
                  {displayName(m.person)}
                  <span className="lifespan">{marriageSummary(m)}</span>
                </span>
              </button>
              <div className="actions">
                <button
                  type="button"
                  onClick={() =>
                    setEditing((cur) =>
                      cur === m.relationshipId ? null : m.relationshipId,
                    )
                  }
                >
                  {editing === m.relationshipId ? 'Close' : 'Dates'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        `Remove this marriage to ${displayName(m.person)}? The person stays.`,
                      )
                    ) {
                      await deleteRelationship(m.relationshipId);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              {editing === m.relationshipId && (
                <MarriageDatesForm
                  marriage={m}
                  onDone={() => setEditing(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="picker-row">
        <PersonPicker
          excludeIds={[personId]}
          label="Link spouse"
          onPick={(otherId) => addSpouse(personId, otherId)}
        />
        {showNew ? (
          <NewRelativeForm
            addLabel="Add as spouse"
            onCreated={async (newId) => {
              await addSpouse(personId, newId);
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

interface DatesFormProps {
  marriage: Marriage;
  onDone: () => void;
}

function MarriageDatesForm({ marriage, onDone }: DatesFormProps) {
  const [start, setStart] = useState(marriage.startDate ?? '');
  const [end, setEnd] = useState(marriage.endDate ?? '');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMarriage(marriage.relationshipId, {
      startDate: start,
      endDate: end,
    });
    onDone();
  };

  return (
    <form className="marriage-dates" onSubmit={save}>
      <label>
        Married
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        Ended
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <button type="submit">Save</button>
      <button type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}
