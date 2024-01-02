import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '.': 'src/index.ts'
  },
  format: ['cjs', 'esm'],
  target: ['node16', 'chrome88', 'safari14.5', 'firefox85'],
  dts: true,
  sourcemap: true,
});
