import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const clientDir = fileURLToPath(new URL('.', import.meta.url));

// Two separate entries so the public site never bundles dashboard code:
//   client/index.html        -> public customer website at "/"
//   client/admin/index.html  -> owners' dashboard at "/admin"
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:4000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        site: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      }
    }
  }
});
