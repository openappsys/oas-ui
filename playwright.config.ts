import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './packages/ui',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  // 并发收敛：workers=10 全量（805+ 用例）高并发时 vitepress preview（4173，node 静态服务）
  // 偶发进程崩溃 → 后续用例 ERR_CONNECTION_REFUSED 雪崩（间歇性，非必然；疑似 Windows 下
  // 高并发连接时 preview 进程异常退出，非 OOM——日志无内存相关错误）。实测：
  // workers=10 偶发崩、workers=6 连跑两遍全量全绿、workers=2 稳定但耗时 7.6 分钟。
  // 收敛为 6（稳定与耗时的平衡点），如再遇崩溃可降 4。
  workers: 6,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'pnpm --filter @oas-ui/docs run build && pnpm --filter @oas-ui/docs run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: {} }],
})
