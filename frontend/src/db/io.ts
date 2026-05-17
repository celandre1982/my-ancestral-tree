import { db } from './db';
import type { LifeEvent, Person, Relationship } from '../types';
import { base64ToBlob, blobToBase64 } from '../utils/image';

const SCHEMA_VERSION = 3;

interface ExportPerson extends Omit<Person, 'photo'> {
  photoBase64?: string;
  photoType?: string;
}

export interface ExportOptions {
  includePhotos: boolean;
  includeEvents: boolean;
  includeDescriptions: boolean;
  includeNotes: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includePhotos: true,
  includeEvents: true,
  includeDescriptions: true,
  includeNotes: true,
};

export interface ExportPayload {
  schema: 'ancestral-tree';
  version: number;
  exportedAt: string;
  people: ExportPerson[];
  relationships: Relationship[];
  events: LifeEvent[];
}

export async function exportAll(
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<ExportPayload> {
  const [people, relationships, events] = await Promise.all([
    db.people.toArray(),
    db.relationships.toArray(),
    db.events.toArray(),
  ]);
  const exportedPeople: ExportPerson[] = await Promise.all(
    people.map(async (p) => {
      const { photo, description, notes, ...rest } = p;
      const exported: ExportPerson = { ...rest };
      if (options.includeDescriptions && description) {
        exported.description = description;
      }
      if (options.includeNotes && notes) {
        exported.notes = notes;
      }
      if (options.includePhotos && photo) {
        exported.photoBase64 = await blobToBase64(photo);
        exported.photoType = photo.type || 'image/jpeg';
      }
      return exported;
    }),
  );
  return {
    schema: 'ancestral-tree',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    people: exportedPeople,
    relationships,
    events: options.includeEvents ? events : [],
  };
}

export function downloadExport(payload: ExportPayload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = payload.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `ancestral-tree-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export class ImportValidationError extends Error {}

export async function importAll(text: string): Promise<{
  people: number;
  relationships: number;
  events: number;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportValidationError('File is not valid JSON.');
  }
  const payload = validate(parsed);

  const people: Person[] = payload.people.map((ep) => {
    const { photoBase64, photoType, ...rest } = ep;
    const person: Person = { ...rest };
    if (photoBase64) {
      person.photo = base64ToBlob(photoBase64, photoType || 'image/jpeg');
    }
    return person;
  });

  await db.transaction(
    'rw',
    db.people,
    db.relationships,
    db.events,
    async () => {
      await db.people.clear();
      await db.relationships.clear();
      await db.events.clear();
      if (people.length > 0) await db.people.bulkPut(people);
      if (payload.relationships.length > 0)
        await db.relationships.bulkPut(payload.relationships);
      if (payload.events.length > 0)
        await db.events.bulkPut(payload.events);
    },
  );

  return {
    people: people.length,
    relationships: payload.relationships.length,
    events: payload.events.length,
  };
}

export async function clearAll() {
  await db.transaction(
    'rw',
    db.people,
    db.relationships,
    db.events,
    async () => {
      await db.people.clear();
      await db.relationships.clear();
      await db.events.clear();
    },
  );
}

function validate(input: unknown): ExportPayload {
  if (typeof input !== 'object' || input === null) {
    throw new ImportValidationError('Top-level value must be an object.');
  }
  const p = input as Record<string, unknown>;
  if (p.schema !== 'ancestral-tree') {
    throw new ImportValidationError(
      'Not an ancestral-tree export (missing "schema" field).',
    );
  }
  if (typeof p.version !== 'number' || p.version > SCHEMA_VERSION) {
    throw new ImportValidationError(
      `Unsupported schema version: ${String(p.version)}.`,
    );
  }
  if (!Array.isArray(p.people)) {
    throw new ImportValidationError('"people" must be an array.');
  }
  if (!Array.isArray(p.relationships)) {
    throw new ImportValidationError('"relationships" must be an array.');
  }
  // events is optional for backward compatibility with v1/v2
  const events = Array.isArray(p.events) ? (p.events as LifeEvent[]) : [];
  return {
    schema: 'ancestral-tree',
    version: p.version,
    exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : '',
    people: p.people as ExportPerson[],
    relationships: p.relationships as Relationship[],
    events,
  };
}
