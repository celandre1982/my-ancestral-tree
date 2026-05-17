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
  notes?: string;
  photo?: Blob;
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
