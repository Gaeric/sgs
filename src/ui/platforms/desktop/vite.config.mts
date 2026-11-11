import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const clientMode = process.env.REACT_APP_DEV_MODE || 'dev';

  return {
    base: './',
    plugins: [react()],
    resolve: {
      tsconfigPaths: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      'process.env.PUBLIC_URL': JSON.stringify(isProduction ? '.' : ''),
      'process.env.REACT_APP_DEV_MODE': JSON.stringify(clientMode),
      global: 'globalThis',
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      sourcemap: process.env.GENERATE_SOURCEMAP === 'true',
    },
    server: {
      port: 3000,
    },
  };
});
