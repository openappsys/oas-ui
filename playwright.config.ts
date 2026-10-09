import os from 'node:os'
import { defineConfig } from '@playwright/test'

// e2e 端口可用环境变量 E2E_PORT 覆盖（默认 4173）——多 git worktree / 本地分片并行时
// 每个实例用独立端口跑 e2e，避免互抢 4173 或误连别的实例留下的旧 preview server
const E2E_PORT = process.env.E2E_PORT || '4173'

// 是否跳过 docs build：CI 已全量 build；本地分片由 scripts/e2e/shards.mjs 先 build 一次再并发跑，
// 避免 N 个分片同时写同一 dist 互相踩。
const E2E_SKIP_BUILD = process.env.E2E_SKIP_BUILD === '1' || !!process.env.CI

// 是否复用已存在的 preview：默认本地复用、CI 不复用。分片编排显式置 0 强制每个实例自起，
// 端口由编排脚本动态选空闲端口——不复用可避免误连崩溃残留的陈旧 preview（陈旧 dist 陷阱）。
const E2E_REUSE = process.env.E2E_REUSE != null ? process.env.E2E_REUSE === '1' : !process.env.CI

// 单次调用的并发：E2E_WORKERS 显式覆盖优先；否则 CI 保底 4（2 核 runner，过多 worker 抢 CPU 反慢）、
// 本地按 CPU 自适应（留 2 核给单线程 preview server + 系统，上限 12）——本地机器充裕时显著缩短全量时长。
// 高并发下负载敏感用例（真手势/动画/SPA 导航）偶发时序抖动由 retries:1 吸收；若真翻车可临时调低 E2E_WORKERS。
const E2E_WORKERS =
  Number(process.env.E2E_WORKERS) || (process.env.CI ? 4 : Math.min(Math.max(os.cpus().length - 2, 4), 12))

export default defineConfig({
  // 收集根：组件/文档站 e2e 在 packages/ui，dsd 验收 spec 在 packages/ssr（依赖方向 ssr → ui，
  // 放 ui 会形成构建环）——故收到 packages 一级，`**/*.spec.ts` 两个目录都覆盖。
  testDir: './packages',
  testMatch: '**/*.spec.ts',
  // 60s：CI（2 核 runner + 4 worker 分片）单页 e2e 的 page.evaluate 偶超 30s——a11y 长列表页
  // 曾因此以「超时」形态失败（报 calendar.html 但非 axe 违规，实为 disabledTextColor 的 evaluate 超时，
  // CI 连续多轮 1 failed 实抓）。本地充裕、CI 打满 CPU 时需双倍余量
  timeout: 60_000,
  // 负载敏感型用例（真手势链 / 动画入场 / SPA 导航 / 语言重定向）在满并发下偶发单发时序抖动
  // （2026-10-07 v2.6.0 收口实抓：多轮全量各自翻出不同一例，单跑稳定）。重试 1 次吸收环境抖动，
  // 真失败（断言/行为缺陷）重试仍失败——不改变门禁实质，只消除负载噪声阻断发布。
  retries: 1,
  // 所有 test 独立调度（同一文件内也并行），不再受「一个文件串行占一个 worker」的结构限制——
  // 结构上不设上限，并发只由 workers 控制。少数依赖共享 setup 的文件自行声明 serial
  // （如 ssr 的 dsd 验收 spec 的 beforeAll 只应构建一次）。
  fullyParallel: true,
  // 默认 4：serve-dist 去掉了 vitepress 的 brotli 逐响应压缩，页面加载不再有网络等待，
  // 浏览器瞬时 CPU 占用显著更高——workers=6 全量偶发抖动（smoke/ellipsis/vue-prop 等随机失败，
  // 单跑必过），workers=4 连跑全绿且总时长仍优于旧 vitepress（~8min vs ~10min）。
  // 有 CPU 余量可调高 E2E_WORKERS；多 worktree 并行用 E2E_PORT 隔离端口。
  workers: E2E_WORKERS,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    // 默认锁 zh-CN：绝大多数 spec 断言面向中文页。（历史上 en-US 会被首访语言适配跳去 /en/；
    // 该适配已改为「仅显式 oas-lang 偏好跳转」，不再按浏览器语言跳。语言偏好自身的用例在
    // homepage.spec.ts 里用 browser.newContext({ locale }) 显式覆盖。）
    locale: 'zh-CN',
  },
  webServer: {
    // dist 缺失时先 build（本地默认），否则直接起服务（CI / 分片编排已 build）。
    // 默认用 scripts/e2e/serve-dist.mjs 而非 `vitepress preview`：后者硬编码 brotli(质量 11)
    // 逐响应压缩（实测 100KB 资源 76ms vs 不压缩 0.8ms，~100x），单线程 CPU 打满 → 高并发下
    // 响应排队/超时（历史误判为「preview 崩溃」）。localhost 无需压缩。E2E_SERVE=preview 可切回。
    command: `${E2E_SKIP_BUILD ? '' : 'pnpm --filter @oas-ui/docs run build && '}${
      process.env.E2E_SERVE === 'preview'
        ? `pnpm --filter @oas-ui/docs run preview --port ${E2E_PORT}`
        : `node scripts/e2e/serve-dist.mjs packages/docs/docs/.vitepress/dist ${E2E_PORT}`
    }`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: E2E_REUSE,
    timeout: 120_000,
  },
  projects: [
    // 文档站相关（homepage.spec.ts）——只改 docs/index.md、theme/components/*、样式时跑
    { name: 'docs-site', use: {}, testMatch: /homepage\.spec\.ts/ },
    // 组件全量（默认 project 跑除 homepage 外的所有 spec，含 packages/ssr 的 dsd 验收 spec）
    // ——改 oas-* 组件源码时跑
    { name: 'chromium', use: {}, testIgnore: /homepage\.spec\.ts/ },
    // Firefox 抽样覆盖：全量 e2e 在 Firefox 上跑会翻倍耗时——不值。只挑能暴露
    // 浏览器专有渲染/兼容问题的 spec（视觉截图、全页冒烟、浏览器相关回归），
    // 交互密集或时序敏感的 spec（interaction/a11y/demo/onoas 等）留在 chromium
    // （Firefox headless 时序差异可能引入 flaky，宁少勿滥）。
    {
      name: 'firefox',
      // 必须显式 browserName——缺省 browserType 是 chromium，「firefox 抽样」会拿
      // Chromium 跑两遍（跨浏览器覆盖为零，三轮 review 实证 pw:browser 启动的是 chrome-headless-shell）
      use: {
        browserName: 'firefox',
        // Firefox 不吃 Playwright 的 locale 配置（Juggler 不映射 intl.locale.requested，navigator.language
        // 仍 en-US）。docs 语言跳转已不再按浏览器语言自动跳，此锁对语言适配已非必需；保留以让 Firefox 的
        // navigator.language 与 chromium 一致（intl.accept_languages 是其真实来源，实测生效）。
        firefoxUserPrefs: { 'intl.accept_languages': 'zh-CN' },
      },
      testMatch: [/visual\.spec\.ts/, /smoke\.spec\.ts/, /qa-regression\/.*\.spec\.ts/],
    },
  ],
})
