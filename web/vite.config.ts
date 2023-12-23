import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: 'REACT_',
  plugins: [react()],
  assetsInclude: ['**/*.md'],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
  define: {
    // For docker extension.
    // Set global in `optimizeDeps.esbuildOptions.define`
    // is not working in docker extension build
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      http: 'stream-http',
      buffer: 'buffer',
      url: 'url',
      events: 'events',
      util: 'util',
    },
  },
})
