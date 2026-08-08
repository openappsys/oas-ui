import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'

function collectEntries(dir: string, root: string, acc: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      collectEntries(full, root, acc)
    } else if (name === 'index.ts') {
      const key = relative(root, full).replaceAll('\\', '/').replace(/\.ts$/, '')
      acc[key] = full
    }
  }
  return acc
}

const srcRoot = resolve(import.meta.dirname, 'src')

export default defineConfig({
  build: {
    lib: {
      entry: collectEntries(srcRoot, srcRoot),
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@oas-ui\//],
      treeshake: {
        // i18n 主入口含注册副作用（注入 translator），必须保留 side-effect import
        moduleSideEffects: (id: string) =>
          id.endsWith('.css') || id === '@oas-ui/i18n' || /[/\\\\]index\.ts$/.test(id),
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    outDir: 'dist',
    sourcemap: true,
  },
})
