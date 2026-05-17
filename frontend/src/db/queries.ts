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

export async function getAllAncestorIds(personId: number): Promise<number[]> {
  return walkLineage(personId, 'up');
}

export async function getAllDescendantIds(personId: number): Promise<number[]> {
  return walkLineage(personId, 'down');
}

async function walkLineage(
  startId: number,
  direction: 'up' | 'down',
): Promise<number[]> {
  const visited = new Set<number>([startId]);
  const found = new Set<number>();
  let frontier: number[] = [startId];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const id of frontier) {
      const rels =
        direction === 'up'
          ? await db.relationships
              .where({ type: 'parent-child', personB: id })
              .toArray()
          : await db.relationships
              .where({ type: 'parent-child', personA: id })
              .toArray();
      for (const r of rels) {
        const otherId = direction === 'up' ? r.personA : r.personB;
        if (!visited.has(otherId)) {
          visited.add(otherId);
          found.add(otherId);
          next.push(otherId);
        }
      }
    }
    frontier = next;
  }
  return [...found];
}

export interface Marriage {
  relationshipId: number;
  person: Person;
  startDate?: string;
  endDate?: string;
}

export async function getMarriages(personId: number): Promise<Marriage[]> {
  const asA = await db.relationships
    .where({ type: 'spouse', personA: personId })
    .toArray();
  const asB = await db.relationships
    .where({ type: 'spouse', personB: personId })
    .toArray();
  const pairs = [
    ...asA.map((r) => ({ rel: r, otherId: r.personB })),
    ...asB.map((r) => ({ rel: r, otherId: r.personA })),
  ];
  const others = await db.people.bulkGet(pairs.map((p) => p.otherId));
  const marriages: Marriage[] = [];
  pairs.forEach((pair, i) => {
    const person = others[i];
    if (!person || pair.rel.id == null) return;
    marriages.push({
      relationshipId: pair.rel.id,
      person,
      startDate: pair.rel.startDate,
      endDate: pair.rel.endDate,
    });
  });
  // Stable sort: by startDate (unknown first), then by relationshipId
  marriages.sort((a, b) => {
    const sa = a.startDate ?? '';
    const sb = b.startDate ?? '';
    if (sa !== sb) return sa < sb ? -1 : 1;
    return a.relationshipId - b.relationshipId;
  });
  return marriages;
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

export async function addSpouse(
  a: number,
  b: number,
  options: { startDate?: string; endDate?: string } = {},
) {
  if (a === b) return;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  // Multiple marriages between the same pair are allowed (e.g. divorced and
  // remarried). Polygamy is naturally supported by adding more rows with
  // different partners. Callers should set endDate on prior marriages first
  // if they want to record a divorce.
  await db.relationships.add({
    type: 'spouse',
    personA: lo,
    personB: hi,
    startDate: options.startDate,
    endDate: options.endDate,
  });
}

export async function updateMarriage(
  relationshipId: number,
  fields: { startDate?: string; endDate?: string },
) {
  await db.relationships.update(relationshipId, {
    startDate: fields.startDate || undefined,
    endDate: fields.endDate || undefined,
  });
}

export async function deleteRelationship(relationshipId: number) {
  await db.relationships.delete(relationshipId);
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
