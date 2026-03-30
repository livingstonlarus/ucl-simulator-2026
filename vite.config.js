import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/matches': 'http://127.0.0.1:3000',
      '/parties': 'http://127.0.0.1:3000',
      '/generate-q2': 'http://127.0.0.1:3000',
      '/generate-q3': 'http://127.0.0.1:3000',
      '/generate-q4': 'http://127.0.0.1:3000',
      '/generate-pots': 'http://127.0.0.1:3000',
      '/standings': 'http://127.0.0.1:3000',
      '/coefficients': 'http://127.0.0.1:3000',
      '/coefficients-fantasy': 'http://127.0.0.1:3000'
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/database.sqlite', '**/database.sqlite-journal', '**/node_modules/**']
    }
  }
})
