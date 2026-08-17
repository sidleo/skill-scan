import { defineConfig } from 'tsdown'

/**
 * Build config for @sidleo/skill-scan (host-only).
 *
 * Currently the package ships the HOST half only (the skill-scan provider +
 * config normalization). A browser client bundle (`lib/client.js` served at
 * /plugins/<id>/client.js) will be added once the client half is rebuilt to the
 * DSH client-plugin contract (ModuleLoader CJS factory + ctx service injection).
 *
 * Host entry → lib/index.js + lib/types.
 */
export default defineConfig({
  entry: {
    'index': 'src/index.ts',
  },
  format: ['esm'],
  outDir: 'lib',
  outExtension() {
    return { js: '.js', dts: '.d.ts' }
  },
  target: 'node22',
  dts: { minify: false },
  sourcemap: true,
  clean: true,
})
