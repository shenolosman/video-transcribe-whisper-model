import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5050,
    open: true,
    // Proxy API requests during development so the frontend can call the
    // backend running on port 8000 without CORS issues.  When deploying
    // these should run behind a single domain or be configured for CORS.
    proxy: {
      '/transcribe': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/exported-files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/export': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
