import { defineConfig } from 'tsdown'

const PLUGIN_ID = '@sidleo3/skill-scan'
/** Platform modules resolved from the DSH loader module table (external). */
const EXTERNALS = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

/**
 * Build config for @sidleo3/skill-scan.
 *
 * Two outputs:
 *  - host   → lib/index.js  (ESM, runs in the DSH host process)
 *  - client → lib/client.js (CJS factory wrapped in window.__ModuleLoader__.load;
 *             platform modules stay external via the loader's require)
 */
export default defineConfig([
  {
    name: 'skill-scan/host',
    entry: { 'index': 'src/index.ts' },
    format: ['esm'],
    outDir: 'lib',
    outExtension() {
      return { js: '.js', dts: '.d.ts' }
    },
    target: 'node22',
    dts: { minify: false },
    sourcemap: true,
    clean: false,
  },
  {
    name: 'skill-scan/client',
    entry: { 'client': 'src/client/index.ts' },
    format: 'cjs',
    platform: 'browser',
    outDir: 'lib',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...EXTERNALS],
    noExternal: (id) => (EXTERNALS.includes(id) ? undefined : true),
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
