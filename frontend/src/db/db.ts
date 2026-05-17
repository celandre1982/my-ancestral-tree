import Dexie, { type Table } from 'dexie';
import type { LifeEvent, Person, Relationship } from '../types';

export class AncestralTreeDB extends Dexie {
  people!: Table<Person, number>;
  relationships!: Table<Relationship, number>;
  events!: Table<LifeEvent, number>;

  constructor() {
    super('ancestral-tree');
    this.version(1).stores({
      people: '++id, surname, givenName',
      relationships: '++id, type, personA, personB',
    });
    this.version(2).stores({
      people: '++id, surname, givenName',
      relationships: '++id, type, personA, personB',
      events: '++id, personId, date',
    });
  }
}

export const db = new AncestralTreeDB();
