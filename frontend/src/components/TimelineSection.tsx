import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  addEvent,
  deleteEvent,
  getEventsForPerson,
  updateEvent,
} from '../db/queries';
import type { EventKind, LifeEvent } from '../types';

interface Props {
  personId: number;
}

const KIND_LABELS: Record<EventKind, string> = {
  positive: 'Good',
  negative: 'Bad',
  neutral: 'Neutral',
};

export function TimelineSection({ personId }: Props) {
  const events =
    useLiveQuery(() => getEventsForPerson(personId), [personId]) ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <section className="relation-section">
      <h3>Timeline</h3>
      {events.length === 0 ? (
        <p className="empty">No events recorded yet.</p>
      ) : (
        <ul className="event-list">
          {events.map((e) =>
            editingId === e.id ? (
              <li key={e.id}>
                <EventForm
                  initial={e}
                  onSubmit={async (fields) => {
                    if (e.id != null) await updateEvent(e.id, fields);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={e.id} className="event-row">
                <div className={`event-kind kind-${e.kind}`} title={KIND_LABELS[e.kind]} />
                <div className="event-body">
                  <div className="event-head">
                    <span className="event-date">
                      {e.date || 'undated'}
                    </span>
                    <span className="event-title">{e.title}</span>
                  </div>
                  {e.description && (
                    <p className="event-desc">{e.description}</p>
                  )}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => setEditingId(e.id ?? null)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        e.id != null &&
                        confirm(`Delete event "${e.title}"?`)
                      ) {
                        await deleteEvent(e.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {adding ? (
        <EventForm
          onSubmit={async (fields) => {
            await addEvent({ ...fields, personId });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="picker-row">
          <button type="button" onClick={() => setAdding(true)}>
            + Add event
          </button>
        </div>
      )}
    </section>
  );
}

interface FormProps {
  initial?: LifeEvent;
  onSubmit: (
    fields: Pick<LifeEvent, 'date' | 'title' | 'kind' | 'description'>,
  ) => Promise<void>;
  onCancel: () => void;
}

function EventForm({ initial, onSubmit, onCancel }: FormProps) {
  const [date, setDate] = useState(initial?.date ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? 'neutral');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      await onSubmit({
        date: date || undefined,
        title: t,
        kind,
        description: description.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="event-form" onSubmit={submit}>
      <div className="row">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Graduated, Moved to Paris, Lost father…"
            autoFocus
          />
        </label>
        <label>
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
          >
            <option value="positive">Good</option>
            <option value="negative">Bad</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
      </div>
      <label className="notes">
        Details (optional)
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="actions">
        <button type="submit" disabled={busy || !title.trim()}>
          {initial ? 'Save' : 'Add event'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
