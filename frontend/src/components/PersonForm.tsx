import { useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import type { Person, Sex } from '../types';
import { resizeImage, usePhotoUrl } from '../utils/image';

interface Props {
  editing: Person | null;
  onDone: () => void;
}

const empty: Person = {
  givenName: '',
  surname: '',
  sex: 'U',
  birthDate: '',
  birthPlace: '',
  deathDate: '',
  deathPlace: '',
  description: '',
  notes: '',
  photo: undefined,
};

export function PersonForm({ editing, onDone }: Props) {
  const [form, setForm] = useState<Person>(empty);
  const [photoError, setPhotoError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrl = usePhotoUrl(form.photo);

  useEffect(() => {
    setForm(editing ?? empty);
    setPhotoError('');
  }, [editing]);

  const update = <K extends keyof Person>(key: K, value: Person[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    try {
      const resized = await resizeImage(file);
      update('photo', resized);
    } catch (err) {
      console.error(err);
      setPhotoError('Could not load this image.');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.givenName.trim() && !form.surname.trim()) return;
    const payload: Person = {
      ...form,
      givenName: form.givenName.trim(),
      surname: form.surname.trim(),
    };
    if (editing?.id != null) {
      await db.people.update(editing.id, payload);
    } else {
      await db.people.add(payload);
    }
    setForm(empty);
    onDone();
  };

  return (
    <form className="person-form" onSubmit={submit}>
      <h2>{editing ? 'Edit person' : 'Add person'}</h2>
      <div className="form-body">
        <div className="photo-field">
          <div className="photo-preview">
            {photoUrl ? (
              <img src={photoUrl} alt="" />
            ) : (
              <span className="photo-placeholder">No photo</span>
            )}
          </div>
          <div className="photo-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.photo ? 'Replace photo' : 'Add photo'}
            </button>
            {form.photo && (
              <button
                type="button"
                onClick={() => update('photo', undefined)}
              >
                Remove
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              hidden
            />
            {photoError && <span className="photo-error">{photoError}</span>}
          </div>
        </div>

        <div className="fields">
          <div className="row">
            <label>
              Given name
              <input
                value={form.givenName}
                onChange={(e) => update('givenName', e.target.value)}
                autoFocus
              />
            </label>
            <label>
              Surname
              <input
                value={form.surname}
                onChange={(e) => update('surname', e.target.value)}
              />
            </label>
            <label>
              Sex
              <select
                value={form.sex}
                onChange={(e) => update('sex', e.target.value as Sex)}
              >
                <option value="U">Unknown</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Birth date
              <input
                type="date"
                value={form.birthDate ?? ''}
                onChange={(e) => update('birthDate', e.target.value)}
              />
            </label>
            <label>
              Birth place
              <input
                value={form.birthPlace ?? ''}
                onChange={(e) => update('birthPlace', e.target.value)}
              />
            </label>
          </div>
          <div className="row">
            <label>
              Death date
              <input
                type="date"
                value={form.deathDate ?? ''}
                onChange={(e) => update('deathDate', e.target.value)}
              />
            </label>
            <label>
              Death place
              <input
                value={form.deathPlace ?? ''}
                onChange={(e) => update('deathPlace', e.target.value)}
              />
            </label>
          </div>
          <label className="notes">
            Description
            <textarea
              rows={5}
              placeholder="A short biography — who they were, what they did, where they lived…"
              value={form.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </label>
          <label className="notes">
            Notes
            <textarea
              rows={2}
              placeholder="Personal reminders, research questions, etc."
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="actions">
        <button type="submit">{editing ? 'Save' : 'Add'}</button>
        {editing && (
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
