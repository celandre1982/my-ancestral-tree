import { db } from './db';
import type { Person, Relationship, RelationshipType } from '../types';

export async function getParents(personId: number): Promise<Person[]> {
  const rels = await db.relationships
    .where({ type: 'parent-child', personB: personId })
    .toArray();
  return loadPeople(rels.map((r) => r.personA));
}

export async function getChildren(personId: number): Promise<Person[]> {
  const rels = await db.relationships
    .where({ type: 'parent-child', personA: personId })
    .toArray();
  return loadPeople(rels.map((r) => r.personB));
}

export async function getSpouses(personId: number): Promise<Person[]> {
  const asA = await db.relationships
    .where({ type: 'spouse', personA: personId })
    .toArray();
  const asB = await db.relationships
    .where({ type: 'spouse', personB: personId })
    .toArray();
  const ids = [...asA.map((r) => r.personB), ...asB.map((r) => r.personA)];
  return loadPeople(ids);
}

async function loadPeople(ids: number[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  const people = await db.people.bulkGet(ids);
  return people.filter((p): p is Person => p != null);
}

export async function addParentChild(parentId: number, childId: number) {
  if (parentId === childId) return;
  const existing = await db.relationships
    .where({ type: 'parent-child', personA: parentId, personB: childId })
    .first();
  if (existing) return;
  await db.relationships.add({
    type: 'parent-child',
    personA: parentId,
    personB: childId,
  });
}

export async function addSpouse(a: number, b: number) {
  if (a === b) return;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const existing = await db.relationships
    .where({ type: 'spouse', personA: lo, personB: hi })
    .first();
  if (existing) return;
  await db.relationships.add({
    type: 'spouse',
    personA: lo,
    personB: hi,
  });
}

export async function removeRelationshipBetween(
  type: RelationshipType,
  a: number,
  b: number,
) {
  const rels = await db.relationships.where('type').equals(type).toArray();
  const toDelete = rels.filter(
    (r) =>
      (r.personA === a && r.personB === b) ||
      (r.personA === b && r.personB === a),
  );
  await Promise.all(
    toDelete.map((r) => r.id != null && db.relationships.delete(r.id)),
  );
}

export async function deletePersonCascading(personId: number) {
  await db.transaction('rw', db.people, db.relationships, async () => {
    const rels = await db.relationships
      .filter((r) => r.personA === personId || r.personB === personId)
      .toArray();
    await Promise.all(
      rels.map((r) => r.id != null && db.relationships.delete(r.id)),
    );
    await db.people.delete(personId);
  });
}

export type { Relationship };
