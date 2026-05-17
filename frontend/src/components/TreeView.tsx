import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import Tree from 'react-d3-tree';
import { db } from '../db/db';
import { buildTree, type Direction } from '../db/tree';
import type { Person } from '../types';

interface Props {
  root: Person;
  onOpen: (personId: number) => void;
  onBack: () => void;
}

function displayName(p: Person) {
  const name = `${p.givenName} ${p.surname}`.trim();
  return name || '(unnamed)';
}

export function TreeView({ root, onOpen, onBack }: Props) {
  const [direction, setDirection] = useState<Direction>('ancestors');
  const [depth, setDepth] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const data = useLiveQuery(
    () => buildTree(root.id!, direction, depth),
    [root.id, direction, depth],
  );

  // Map of person ID → object URL for photos. Rebuilt when people change.
  const allPeople = useLiveQuery(() => db.people.toArray(), []);
  const photoUrls = useMemo(() => {
    const map = new Map<number, string>();
    if (!allPeople) return map;
    for (const p of allPeople) {
      if (p.id != null && p.photo) {
        map.set(p.id, URL.createObjectURL(p.photo));
      }
    }
    return map;
  }, [allPeople]);

  useEffect(() => {
    return () => {
      for (const url of photoUrls.values()) URL.revokeObjectURL(url);
    };
  }, [photoUrls]);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 60 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <article className="tree-view">
      <div className="tree-controls">
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <span className="root-label">
          Root: <strong>{displayName(root)}</strong>
        </span>
        <label>
          View
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            <option value="ancestors">Ancestors</option>
            <option value="descendants">Descendants</option>
          </select>
        </label>
        <label>
          Depth
          <input
            type="number"
            min={1}
            max={10}
            value={depth}
            onChange={(e) =>
              setDepth(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
            }
          />
        </label>
        <span className="hint">
          Click a node to open. Scroll to zoom, drag to pan.
        </span>
      </div>
      <div ref={containerRef} className="tree-canvas">
        {data ? (
          <Tree
            data={data}
            orientation="vertical"
            translate={translate}
            collapsible={false}
            zoomable
            separation={{ siblings: 1.4, nonSiblings: 2 }}
            pathFunc="step"
            renderCustomNodeElement={(rd3tProps) =>
              renderNode(rd3tProps, onOpen, photoUrls)
            }
          />
        ) : (
          <p className="empty">Loading…</p>
        )}
      </div>
    </article>
  );
}

interface CustomNodeProps {
  nodeDatum: {
    name: string;
    attributes?: Record<string, string | number | boolean>;
  };
}

function renderNode(
  { nodeDatum }: CustomNodeProps,
  onOpen: (id: number) => void,
  photoUrls: Map<number, string>,
) {
  const attrs = nodeDatum.attributes ?? {};
  const id = Number(attrs.id);
  const years = String(attrs.years ?? '');
  const sex = String(attrs.sex ?? 'U');
  const fill =
    sex === 'M' ? '#cfe2ff' : sex === 'F' ? '#ffd3e1' : '#e9e9ed';
  const photoUrl = photoUrls.get(id);
  const clipId = `node-clip-${id}`;
  return (
    <g onClick={() => onOpen(id)} style={{ cursor: 'pointer' }}>
      <rect
        x={-90}
        y={-26}
        width={180}
        height={52}
        rx={8}
        fill={fill}
        stroke="#444"
        strokeWidth={1}
      />
      <defs>
        <clipPath id={clipId}>
          <circle cx={-68} cy={0} r={18} />
        </clipPath>
      </defs>
      {photoUrl ? (
        <image
          href={photoUrl}
          x={-86}
          y={-18}
          width={36}
          height={36}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <circle cx={-68} cy={0} r={18} fill="#fff" stroke="#999" />
      )}
      <text
        x={-42}
        y={-4}
        textAnchor="start"
        style={{ fontSize: 13, fontWeight: 500, fill: '#111', stroke: 'none' }}
      >
        {truncate(nodeDatum.name, 18)}
      </text>
      <text
        x={-42}
        y={12}
        textAnchor="start"
        style={{ fontSize: 11, fill: '#444', stroke: 'none' }}
      >
        {years}
      </text>
    </g>
  );
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
