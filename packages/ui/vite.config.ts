import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'

function collectEntries(
  dir: string,
  root: string,
  acc: Record<string, string> = {},
): Record<string, string> {
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

// collectEntries 只收集 index.ts；Node-safe 的 ssr.ts 是 src 根级入口，单独补上
const entries = collectEntries(srcRoot, srcRoot)
entries['ssr'] = resolve(srcRoot, 'ssr.ts')

export default defineConfig({
  build: {
    lib: {
      entry: entries,
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
    // watch 模式下不清空 outDir：① Windows 下 dev server 正持有 dist 文件句柄，
    // emptyDir 会触发 EPERM；② 全量重写会让 vite dev 收到 258 个 change 事件风暴。
    // 同名文件会被覆盖写，残留的"不再产出"文件在 dev 场景无碍。
    emptyOutDir: process.argv.includes('--watch') ? false : true,
  },
})
