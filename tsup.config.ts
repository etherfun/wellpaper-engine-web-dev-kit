import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  dts: true,
  minify: false,
  sourcemap: false,
  clean: true,
  globalName: 'WeDevKit',
  outDir: 'dist',
});
