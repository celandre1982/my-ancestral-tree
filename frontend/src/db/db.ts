import Dexie, { type Table } from 'dexie';
import type { Person, Relationship } from '../types';

export class AncestralTreeDB extends Dexie {
  people!: Table<Person, number>;
  relationships!: Table<Relationship, number>;

  constructor() {
    super('ancestral-tree');
    this.version(1).stores({
      people: '++id, surname, givenName',
      relationships: '++id, type, personA, personB',
    });
  }
}

export const db = new AncestralTreeDB();
