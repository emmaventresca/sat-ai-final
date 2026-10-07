import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything is bundled and served from our own origin. No CDN, no web font,
// no external request at all - that is what makes the app work on a locked
// down school machine, and it is a property worth keeping deliberately rather
// than by accident.
export default defineConfig({
  plugins: [react()],
  // Relative, not absolute. GitHub Pages serves a project site from
  // /<repo>/, and we also open the built folder directly during development -
  // an absolute /assets/... is correct in neither. './' is correct in both,
  // and HashRouter keeps the document URL at the app root so relative data
  // fetches resolve the same way wherever it is mounted.
  base: './',
  build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
  server: { port: 5173 },
})
