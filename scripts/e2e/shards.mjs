#!/usr/bin/env node
/**
 * 本地 e2e 分片并行编排：把单 preview server 的并发天花板（workers≈6，再高偶发崩）
 * 横向扩成 N 个独立 preview server × 各自 workers，绕开单进程静态服务的连接瓶颈。
 *
 * 用法：
 *   pnpm test:e2e:shards                          # 默认 1 片 × 4 worker（CPU 安全并发）
 *   E2E_CONCURRENCY=8 pnpm test:e2e:shards        # 总并发预算 8，自动切片
 *   E2E_SHARDS=3 E2E_WORKERS=4 pnpm test:e2e:shards  # 手动指定片数/每片 worker
 *   pnpm test:e2e:shards -- --project=chromium    # 透传 playwright 参数
 *
 * 注：改用 serve-dist（无 brotli）后单 server 不再是瓶颈，并发上限变成机器 CPU；
 *     总并发超过 ~6 全量会抖动，按机器余量调 E2E_CONCURRENCY。
 *
 * 解决的两个坑：
 *   1. 非 CI 分支每个分片都会 build docs → N 个进程并发写同一 dist 互相踩：
 *      本脚本先 build 一次，再让各分片以 E2E_SKIP_BUILD=1 只 preview。
 *   2. 为跳过 build 而借用 CI=1 会连带把 reuseExistingServer 翻成 false 且改变 CI 语义：
 *      改为显式 E2E_REUSE=0 + 动态空闲端口，每片自起全新 preview（也顺带防陈旧 dist）。
 *
 * 流程：build 一次 → 取 N 个空闲端口 → 并发 N 个 `playwright test --shard=i/N` → 汇总退出码。
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IS_WIN = process.platform === 'win32'
// 直接调 playwright CLI，绕开 `pnpm exec`（后者在依赖状态校验时会触发 pnpm install，
// 依赖未就绪/网络不可达时会平白失败，与 e2e 本身无关）。
const PLAYWRIGHT_CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js')

// 每个 server 的 worker 上限（切片基准；与 playwright.config 默认一致）
const PER_SERVER_MAX = Math.max(1, Number(process.env.E2E_WORKERS_PER_SERVER || 4))
const budget = Number(process.env.E2E_CONCURRENCY || 0)

// 并发模型：优先用总预算 E2E_CONCURRENCY 自动切片（每片 ≤ PER_SERVER_MAX）；
// 否则用 E2E_SHARDS（片数）× E2E_WORKERS（每片 worker，默认 PER_SERVER_MAX）。
let shardCount
let workers
if (budget > 0) {
  shardCount = Math.max(1, Math.ceil(budget / PER_SERVER_MAX))
  workers = Math.max(1, Math.ceil(budget / shardCount))
} else {
  shardCount = Math.max(1, Number(process.env.E2E_SHARDS || 1))
  workers = Math.max(1, Number(process.env.E2E_WORKERS || PER_SERVER_MAX))
}

const passthrough = process.argv.slice(2)
const skipBuild = process.env.E2E_SKIP_BUILD === '1' || !!process.env.CI

function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => res(port))
    })
  })
}

function pipeWithPrefix(stream, prefix) {
  let buf = ''
  stream.on('data', (chunk) => {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) process.stdout.write(`${prefix}${line}\n`)
  })
  stream.on('end', () => {
    if (buf) process.stdout.write(`${prefix}${buf}\n`)
  })
}

async function main() {
  if (!skipBuild) {
    console.log('▶ 构建 docs dist（一次）...')
    const b = spawnSync('pnpm', ['--filter', '@oas-ui/docs', 'run', 'build'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: IS_WIN,
    })
    if (b.status !== 0) {
      console.error('✖ docs build 失败，终止')
      process.exit(b.status ?? 1)
    }
  } else {
    console.log('▶ 跳过 docs build（E2E_SKIP_BUILD=1）')
  }

  const ports = []
  for (let i = 0; i < shardCount; i++) ports.push(await freePort())

  console.log(
    `▶ ${shardCount} 片 × ${workers} workers = 最多 ${shardCount * workers} 并发；端口 ${ports.join(
      ', ',
    )}${passthrough.length ? `；透传参数 ${passthrough.join(' ')}` : ''}\n`,
  )

  const runs = ports.map((port, i) => {
    const shard = `${i + 1}/${shardCount}`
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, 'test', `--shard=${shard}`, ...passthrough], {
      cwd: ROOT,
      env: {
        ...process.env,
        E2E_PORT: String(port),
        E2E_SKIP_BUILD: '1',
        E2E_REUSE: '0',
        E2E_WORKERS: String(workers),
      },
    })
    pipeWithPrefix(child.stdout, `[${shard}] `)
    pipeWithPrefix(child.stderr, `[${shard}] `)
    return { shard, child }
  })

  const results = await Promise.all(
    runs.map(
      ({ shard, child }) => new Promise((res) => child.on('exit', (code, signal) => res({ shard, code, signal }))),
    ),
  )

  console.log('\n──────── 分片汇总 ────────')
  for (const r of results) {
    console.log(`  shard ${r.shard}: ${r.code === 0 ? 'PASS' : `FAIL (${r.code ?? r.signal})`}`)
  }
  process.exit(results.some((r) => r.code !== 0) ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
