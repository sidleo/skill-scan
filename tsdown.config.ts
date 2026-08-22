import { defineConfig } from 'tsdown'

const PLUGIN_ID = '@sidleo3/skill-filesystem-plus'
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
 * Build config for @sidleo3/skill-filesystem-plus.
 *
 * Three outputs:
 *  - host   → lib/index.js  (ESM host entry: settings namespace, GUI RPC, preset manager)
 *  - preset → lib/preset.js (ESM session-plane entry: skill-filesystem-plus provider,
 *             inserted into a copied agent preset by the wizard)
 *  - client → lib/client.js (CJS factory wrapped in window.__ModuleLoader__.load;
 *             platform modules stay external via the loader's require)
 */
export default defineConfig([
  {
    name: 'skill-filesystem-plus/host',
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
    name: 'skill-filesystem-plus/preset',
    entry: { 'preset': 'src/preset.ts' },
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
    name: 'skill-filesystem-plus/client',
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
