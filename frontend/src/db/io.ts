import { db } from './db';
import type { Person, Relationship } from '../types';
import { base64ToBlob, blobToBase64 } from '../utils/image';

const SCHEMA_VERSION = 2;

interface ExportPerson extends Omit<Person, 'photo'> {
  photoBase64?: string;
  photoType?: string;
}

export interface ExportPayload {
  schema: 'ancestral-tree';
  version: number;
  exportedAt: string;
  people: ExportPerson[];
  relationships: Relationship[];
}

export async function exportAll(): Promise<ExportPayload> {
  const [people, relationships] = await Promise.all([
    db.people.toArray(),
    db.relationships.toArray(),
  ]);
  const exportedPeople: ExportPerson[] = await Promise.all(
    people.map(async (p) => {
      const { photo, ...rest } = p;
      if (!photo) return rest;
      return {
        ...rest,
        photoBase64: await blobToBase64(photo),
        photoType: photo.type || 'image/jpeg',
      };
    }),
  );
  return {
    schema: 'ancestral-tree',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    people: exportedPeople,
    relationships,
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

  await db.transaction('rw', db.people, db.relationships, async () => {
    await db.people.clear();
    await db.relationships.clear();
    if (people.length > 0) await db.people.bulkPut(people);
    if (payload.relationships.length > 0)
      await db.relationships.bulkPut(payload.relationships);
  });

  return {
    people: people.length,
    relationships: payload.relationships.length,
  };
}

export async function clearAll() {
  await db.transaction('rw', db.people, db.relationships, async () => {
    await db.people.clear();
    await db.relationships.clear();
  });
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
  return {
    schema: 'ancestral-tree',
    version: p.version,
    exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : '',
    people: p.people as ExportPerson[],
    relationships: p.relationships as Relationship[],
  };
}
