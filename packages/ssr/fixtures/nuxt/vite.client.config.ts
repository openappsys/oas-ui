import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * DSD 页面走 Nitro 原样 HTML 输出（不能经 Vue v-html：客户端水合会重设 innerHTML，
 * 把解析期附加的 shadow root 冲掉）。页面唯一的客户端脚本就是这份 bundle：
 * 入口只有 `import '@oas-ui/ui'`（与文档一致的唯一注册方式），构建产物落到 public/vendor，
 * 由 Nitro 作为静态资源原样提供。
 */
export default defineConfig({
  build: {
    outDir: 'public/vendor',
    emptyOutDir: true,
    target: 'es2022',
    minify: 'esbuild',
    lib: {
      entry: fileURLToPath(new URL('./client/oas-client.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'oas-client.js',
    },
  },
})
