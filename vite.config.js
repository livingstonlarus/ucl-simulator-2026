import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/matches': 'http://localhost:3000',
      '/parties': 'http://localhost:3000',
      '/generate-q2': 'http://localhost:3000',
      '/generate-q3': 'http://localhost:3000',
      '/generate-q4': 'http://localhost:3000',
      '/generate-pots': 'http://localhost:3000'
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/database.sqlite', '**/database.sqlite-journal', '**/node_modules/**']
    }
  }
})
