import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site under /<repo-name>/.
  // Override with VITE_BASE=/ for a custom domain or a different host.
  base: process.env.VITE_BASE ?? '/my-ancestral-tree/',
})
