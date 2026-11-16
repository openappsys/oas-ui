import { defineConfig } from 'vite'
import { readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'
import { stripStyleComments, foldStyleComments } from './scripts/strip-css-comments'

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

// collectEntries 只收集 index.ts；Node-safe 的 ssr.ts 是 src 根级入口，单独补上
const entries = collectEntries(srcRoot, srcRoot)
entries['ssr'] = resolve(srcRoot, 'ssr.ts')

export default defineConfig({
  plugins: [
    {
      // 组件样式写在 *_STYLE / *_CSS 字符串里，JS 压缩不会动字符串内容；
      // 构建期先剥 CSS 注释（等长空白、保行号），再安全折叠空白（空行去重 +
      // 连续空格归一），减体积且零视觉变化。
      name: 'oas-strip-style-comments',
      enforce: 'pre',
      transform(code, id) {
        if (!/[\\/]packages[\\/]ui[\\/]src[\\/].*\.ts$/.test(id)) return null
        const out = foldStyleComments(stripStyleComments(code))
        return out === code ? null : { code: out, map: null }
      },
    },
  ],
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rolldownOptions: {
      external: [/^@oas-ui\//],
      treeshake: {
        // 含注册副作用的 side-effect import 必须保留：i18n（注入 translator）、
        // icons/register（注册内置图标集，全量入口开箱即用所依赖）
        moduleSideEffects: (id: string) =>
          id.endsWith('.css') || id === '@oas-ui/i18n' || id === '@oas-ui/icons/register' || /[/\\]index\.ts$/.test(id),
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
