#!/usr/bin/env node
/**
 * RTL 审计门禁自举封装：自动起静态服务（serve-dist）→ 跑 rtl-audit → 杀服务 → 透传退出码。
 *
 * 用法：pnpm rtl:audit [-- --no-shots] [-- <输出目录>]
 * 前置：docs dist 已构建（pnpm build）；dist 缺失直接报错退出 2。
 * 端口：RTL_AUDIT_PORT 环境变量覆盖（默认 4201）；进程退出即杀，不留残留。
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'packages/docs/docs/.vitepress/dist')
if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('[rtl:audit] docs dist 缺失（' + dist + '）——先跑 pnpm build')
  process.exit(2)
}

const port = Number(process.env.RTL_AUDIT_PORT) || 4201
const base = `http://localhost:${port}`

const server = spawn(process.execPath, ['scripts/e2e/serve-dist.mjs', dist, String(port)], {
  stdio: 'ignore',
  detached: false,
})

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/index.html`)
      if (res.ok) return
    } catch {
      /* 未就绪 */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`静态服务 ${base} 60 次探测未就绪`)
}

let code = 1
try {
  await waitReady()
  const audit = spawn(process.execPath, ['scripts/e2e/rtl-audit.mjs', base, ...process.argv.slice(2)], {
    stdio: 'inherit',
  })
  code = await new Promise((res) => audit.on('exit', (c) => res(c ?? 1)))
} catch (e) {
  console.error('[rtl:audit]', String(e))
} finally {
  server.kill()
}
process.exit(code)
