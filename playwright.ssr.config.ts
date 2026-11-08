import { defineConfig } from '@playwright/test'

/**
 * SSR fixture 专用 Playwright 配置（独立于根 `playwright.config.ts`）。
 *
 * 根配置 testDir=`./packages` + testMatch=`**` + spec 后缀，fixture 用 `*.e2e.ts` 命名，
 * 因此不会被全量 e2e 收集；本文件只跑 `packages/ssr/fixtures/{next,nuxt}` 的两个生产构建。
 *
 * 端口固定 4301（Next `next start`）/ 4302（Nuxt `.output/server/index.mjs`），
 * 与文档站 4173 preview、dev 5175 完全隔离。
 *
 * 浏览器矩阵：
 * - `next` / `nuxt`：Chromium（既有全量验收）；
 * - `nuxt-firefox`：Firefox 子集（`fixtures/nuxt/firefox-dsd.e2e.ts`）——验收 Firefox 下的
 *   原生 DSD 解析 + 入口 DSD polyfill（运行期注入路径）与「无 polyfill 的 CSR 降级」。
 *   Firefox 不重跑既有用例：禁用 JS 的 DSD 可见性、逐 locale 文案等属引擎无关逻辑，留在 Chromium。
 *
 * 用法：
 *   pnpm test:e2e:ssr                 # 全部（三个 project，两个 webServer 都起）
 *   SSR_FIXTURE=next pnpm test:e2e:ssr --project=next
 *   SSR_FIXTURE=nuxt pnpm test:e2e:ssr --project=nuxt
 *   SSR_FIXTURE=nuxt pnpm test:e2e:ssr --project=nuxt-firefox
 */
const NEXT_PORT = 4301
const NUXT_PORT = 4302
const only = process.env.SSR_FIXTURE
const withNext = only === undefined || only === 'next'
const withNuxt = only === undefined || only === 'nuxt'

const REUSE = !process.env.CI

export default defineConfig({
  testDir: './packages/ssr/fixtures',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  // 固定单 worker：fixture 各自单进程服务端，性能/水合时序断言不做并发竞争
  workers: 1,
  // 验收要求零重试：任何 flake 都按真实问题处理
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    ...(withNext
      ? [
          {
            name: 'next',
            testMatch: /fixtures[\\/]next[\\/].*\.e2e\.ts/,
            use: { baseURL: `http://127.0.0.1:${NEXT_PORT}` },
          },
        ]
      : []),
    ...(withNuxt
      ? [
          {
            name: 'nuxt',
            testMatch: /fixtures[\\/]nuxt[\\/].*\.e2e\.ts/,
            // Firefox 专测在独立 project（nuxt-firefox）跑：这里的用例含能力相关断言
            // （禁 JS 下的 DSD 可见性、逐 locale 文案），跨引擎重跑没有新增信息
            testIgnore: /firefox-dsd\.e2e\.ts/,
            use: { baseURL: `http://127.0.0.1:${NUXT_PORT}` },
          },
          {
            name: 'nuxt-firefox',
            testMatch: /fixtures[\\/]nuxt[\\/].*firefox-dsd\.e2e\.ts/,
            use: {
              browserName: 'firefox',
              baseURL: `http://127.0.0.1:${NUXT_PORT}`,
            },
          },
        ]
      : []),
  ],
  webServer: [
    ...(withNext
      ? [
          {
            command: 'pnpm --dir packages/ssr/fixtures/next run start',
            url: `http://127.0.0.1:${NEXT_PORT}/zh-CN`,
            reuseExistingServer: REUSE,
            timeout: 180_000,
            env: { NODE_ENV: 'production' },
          },
        ]
      : []),
    ...(withNuxt
      ? [
          {
            command: 'pnpm --dir packages/ssr/fixtures/nuxt run start',
            url: `http://127.0.0.1:${NUXT_PORT}/?locale=zh-CN`,
            reuseExistingServer: REUSE,
            timeout: 180_000,
            env: { NODE_ENV: 'production', PORT: String(NUXT_PORT), HOST: '127.0.0.1' },
          },
        ]
      : []),
  ],
})
