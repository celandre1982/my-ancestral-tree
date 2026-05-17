export type Sex = 'M' | 'F' | 'U';

export interface Person {
  id?: number;
  givenName: string;
  surname: string;
  sex: Sex;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  description?: string;
  notes?: string;
  photo?: Blob;
}

export type EventKind = 'positive' | 'negative' | 'neutral';

export interface LifeEvent {
  id?: number;
  personId: number;
  date?: string;
  title: string;
  description?: string;
  kind: EventKind;
}

export type RelationshipType = 'parent-child' | 'spouse';

export interface Relationship {
  id?: number;
  type: RelationshipType;
  personA: number;
  personB: number;
  startDate?: string;
  endDate?: string;
}
