# Journal

A running record of what's been built, why, and what to know about it. Newest entries at the top.

---

## 2026-05-17 — Initial build (milestones 1–6)

Brought the project from an empty `package.json` to a deployable web app in one session.

### Decisions that shaped everything

- **Local-first, no backend.** Family data stays in the browser (IndexedDB). No auth, no sync, no server. Private by default; portable via JSON export.
- **Single-user scope.** No multi-user / sharing features. If that changes, it's a real architectural rewrite (server, auth, schema with ownership).
- **GEDCOM-compatible shape.** Data model uses `Person` + `Relationship` (parent-child, spouse). Compatible with eventual GEDCOM import/export, but not implemented yet.
- **`frontend/` holds everything.** The pre-existing empty `backend/` dir is unused.

### Milestone 1 — Scaffold + Person CRUD

- Vite + React 19 + TypeScript scaffolded into `frontend/`.
- Dexie + dexie-react-hooks for IndexedDB.
- `src/types.ts` defines `Person`, `Relationship`, `Sex`.
- `src/db/db.ts` is the Dexie schema (v1): `people` (`++id, surname, givenName`), `relationships` (`++id, type, personA, personB`).
- `PersonForm` (add/edit) + `PersonList` (live-querying) + simple `App` layout.

### Milestone 2 — Relationships

- `src/db/queries.ts` — `getParents`, `getChildren`, `getSpouses`, `addParentChild`, `addSpouse`, `removeRelationshipBetween`, `deletePersonCascading`.
- Spouse rows are stored with `personA < personB` to keep them order-independent.
- `PersonPicker` — dropdown that excludes already-linked people and the focus person.
- `PersonDetail` — full detail view with Parents / Spouses / Children sections; click any relative to navigate.
- Deleting a person cascades and removes all their relationship rows.

### Milestone 3 — Tree visualization

- `react-d3-tree` for the chart.
- `src/db/tree.ts` builds either an ancestor or descendant hierarchy from a chosen root with depth cap and cycle protection.
- `TreeView` has direction toggle (Ancestors / Descendants), depth slider (1–10), and zoom/pan. Clicking a node opens that person's detail page (re-roots if you re-enter the tree).
- Tree is **live**: editing relationships while open auto-refreshes via Dexie's `useLiveQuery`.
- **Quirk worth knowing:** react-d3-tree always puts root at top. Genealogy convention is focus-person at *bottom* for ancestor charts. Ours is topologically correct but visually inverted from commercial tools. Acceptable; can swap to Cytoscape.js or a custom renderer later if needed.

### Milestone 4 — JSON export/import

- `src/db/io.ts` — `exportAll`, `downloadExport`, `importAll`, `clearAll`. Schema-tagged (`schema: "ancestral-tree"`, `version`).
- `DataMenu` in the header: **Export**, **Import**, **Clear all**.
- Import is **replace, not merge** — preserves IDs so relationships stay intact. Merging would need ID remapping; not built.
- Tip: drop the export in a cloud-synced folder (OneDrive / Dropbox / iCloud Drive) for cross-machine backup without a server.

### Milestone 5 — Photos

- Optional `photo?: Blob` on `Person`. Images are resized to max 512px / JPEG ~85% before storage (`src/utils/image.ts`).
- `Avatar` component renders the photo or initials on a sex-tinted background. Used in PersonList, PersonDetail (96px portrait), all relation lists, and TreeView nodes (clipped circle).
- Blob URL lifecycle via `usePhotoUrl` (single image) and a `useEffect` cleanup in TreeView (map of URLs).
- Export schema bumped to **v2** with `photoBase64`/`photoType` fields. Import accepts v1 *and* v2 for backward compat.
- Tradeoff: resizing an already-resized image on each edit causes a small extra JPEG generation. Negligible in practice.

### Milestone 6 — Deploy

- `.github/workflows/deploy.yml` builds `frontend/` and publishes to GitHub Pages on every push to `main`.
- `frontend/vite.config.ts` sets `base: '/my-ancestral-tree/'` (overridable via `VITE_BASE`).
- Production build: ~396 KB JS / ~125 KB gzipped.
- **One-time setup the user has to do:** push the code, then in the GitHub repo go to **Settings → Pages → Source: GitHub Actions**.
- Live URL when deployed: `https://celandre1982.github.io/my-ancestral-tree/`.

### Environment quirks worth remembering

- **`NODE_OPTIONS=--use-system-ca` is required** for every local npm/npx command on this machine — there's a corporate/custom root CA in the Windows trust store that Node doesn't pick up by default. Without it, npm fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. CI runners don't need this; it's local-only.

### What's *not* done

- **GEDCOM import/export** — would let the user pull data from Ancestry, FamilySearch, MyHeritage, etc.
- **Search / filter on people list** — fine for now (<50 people); will be needed as the tree grows.
- **Sources / citations** — the standard genealogical practice of attaching sources (records, documents, photos) to facts. Not modeled at all yet.
- **Events beyond birth/death** — marriages, baptisms, immigrations, etc.
- **PWA / offline manifest** — would let the user "install" the site as a desktop app.
- **Conventional ancestor chart** with focus person at bottom — see Milestone 3 quirk note.
- **Merge-on-import** — currently replace-only.
