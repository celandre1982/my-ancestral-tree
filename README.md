# my-ancestral-tree

A local-first web app for building a personal genealogy. People, relationships, photos, and an interactive family tree — all stored in your browser via IndexedDB. No server, no account, no data leaves your machine unless you export it.

## Stack

- Vite + React + TypeScript
- Dexie (IndexedDB wrapper) for persistence
- react-d3-tree for the family tree visualization

Source lives under `frontend/`. `backend/` is unused.

## Develop

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/.

> If you see `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, prefix npm/npx commands with `NODE_OPTIONS=--use-system-ca` (this machine has a custom root CA that Node doesn't trust by default).

## Build

```sh
cd frontend
npm run build
```

Output goes to `frontend/dist/`.

## Deploy to GitHub Pages

The repo includes `.github/workflows/deploy.yml`, which builds `frontend/` and publishes to GitHub Pages on every push to `main`.

**One-time setup in the GitHub repo:**

1. Push the code to GitHub (`git push origin main`).
2. In the GitHub repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The first deploy will start automatically on the next push, or trigger it manually from the **Actions** tab.

Your site will be live at:

```
https://celandre1982.github.io/my-ancestral-tree/
```

The Vite `base` path is set to `/my-ancestral-tree/` in `frontend/vite.config.ts`. If you rename the repo or move to a custom domain, update `base` accordingly (or set `VITE_BASE` as an environment variable).

## Data

Everything is stored in your browser's IndexedDB under the database name `ancestral-tree`. Use the **Export** button in the header to download a JSON backup; **Import** restores from one. Photos are included in the export (base64-encoded).

Since the data lives in the browser, **clearing your browser's site data will delete your tree.** Export regularly.
