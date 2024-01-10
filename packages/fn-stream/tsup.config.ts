import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/adapters/openai/index.ts'],
    format: ['cjs', 'esm'],
    target: ['node16', 'chrome88', 'safari14.5', 'firefox85'],
    dts: true,
    banner: {},
    sourcemap: true,
  },
]);
