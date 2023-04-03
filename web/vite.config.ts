import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    envPrefix: 'REACT_',
    plugins: [react()],
    assetsInclude: ['**/*.md'],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'build',
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
