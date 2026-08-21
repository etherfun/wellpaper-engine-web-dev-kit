import { defineConfig } from 'tsup';

export default defineConfig([
  // — 主入口（浏览器）：IIFE / ESM / CJS —
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    treeshake: true,
    silent: true,
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
    splitting: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    silent: true,
    platform: 'node',
    outDir: 'dist',
  },
]);
