import { defineConfig } from 'tsup';

export default defineConfig([
  // — 主入口（浏览器）：IIFE / ESM / CJS —
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    dts: true,
    minify: false,
    sourcemap: false,
    clean: true,
    globalName: 'WeDevKit',
    outDir: 'dist',
  },
  // — 注入工具（Node.js-only）：ESM / CJS —
  {
    entry: {
      inject: 'src/inject.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    minify: false,
    sourcemap: false,
    clean: false,
    platform: 'node',
    outDir: 'dist',
  },
]);
