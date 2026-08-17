import { defineConfig } from 'tsdown'

/**
 * Build config for @sidleo/skill-scan.
 *
 * Host entry → lib/index.js + lib/types
 * Client entry → lib/client.js exposed via exports "./client", served by the
 * web GUI at /plugins/<id>/client.js.
 *
 * The browser half uses React.createElement (no JSX) and styles.insert for its
 * stylesheet, so this package has no runtime bundler dependency beyond tsdown
 * at build time.
 */
export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'client': 'src/client/index.ts',
  },
  format: ['esm'],
  target: 'node22',
  dts: { minify: false },
  sourcemap: true,
  clean: true,
})
