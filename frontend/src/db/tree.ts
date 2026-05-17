import { db } from './db';
import { getChildren, getParents } from './queries';
import type { Person } from '../types';

export interface TreeNode {
  name: string;
  attributes: {
    id: number;
    years: string;
    sex: string;
  };
  children?: TreeNode[];
}

export type Direction = 'ancestors' | 'descendants';

function displayName(p: Person) {
  const name = `${p.givenName} ${p.surname}`.trim();
  return name || '(unnamed)';
}

function lifespan(p: Person) {
  const b = p.birthDate ? p.birthDate.slice(0, 4) : '';
  const d = p.deathDate ? p.deathDate.slice(0, 4) : '';
  if (!b && !d) return '';
  return `${b}–${d}`;
}

function toNode(p: Person, children?: TreeNode[]): TreeNode {
  return {
    name: displayName(p),
    attributes: {
      id: p.id!,
      years: lifespan(p),
      sex: p.sex,
    },
    children,
  };
}

export async function buildTree(
  rootId: number,
  direction: Direction,
  maxDepth = 5,
): Promise<TreeNode | null> {
  const root = await db.people.get(rootId);
  if (!root) return null;
  const visited = new Set<number>([rootId]);
  return expand(root, direction, maxDepth, visited);
}

async function expand(
  person: Person,
  direction: Direction,
  depthRemaining: number,
  visited: Set<number>,
): Promise<TreeNode> {
  if (depthRemaining <= 0) return toNode(person);
  const relatives =
    direction === 'ancestors'
      ? await getParents(person.id!)
      : await getChildren(person.id!);
  const fresh = relatives.filter((p) => p.id != null && !visited.has(p.id));
  if (fresh.length === 0) return toNode(person);

  const childNodes = await Promise.all(
    fresh.map(async (p) => {
      const next = new Set(visited);
      next.add(p.id!);
      return expand(p, direction, depthRemaining - 1, next);
    }),
  );
  return toNode(person, childNodes);
}
