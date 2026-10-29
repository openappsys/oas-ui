/**
 * DSD 渲染 worker 的父进程客户端：按需启动、请求超时、worker 异常时整体拒绝。
 *
 * worker 文件从 fixture 根定位（next start / node .output/server/index.mjs 的 cwd 均为 fixture 根）。
 * 独立线程的意义见 server/dsd-page.mjs 头注释：SSR 引擎安装全局 DOM shim，不能与 Vue SSR 共享进程。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'

export interface DsdRequest {
  requestLocale: string
  theme: 'light' | 'dark'
}

interface Pending {
  resolve: (html: string) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

const TIMEOUT_MS = 30_000
let worker: Worker | null = null
let seq = 0
const pending = new Map<number, Pending>()

function workerPath(): string {
  const candidates = [
    join(process.cwd(), 'server/dsd-worker.mjs'),
    join(process.cwd(), '.output/server/dsd-worker.mjs'),
    join(process.cwd(), 'packages/ssr/fixtures/nuxt/server/dsd-worker.mjs'),
  ]
  const found = candidates.find((path) => existsSync(path))
  if (!found) {
    throw new Error(`[nuxt-fixture] 找不到 DSD worker：${candidates.join(' / ')}（请在 fixture 根启动服务）`)
  }
  return found
}

function rejectAll(error: Error): void {
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer)
    entry.reject(error)
    pending.delete(id)
  }
}

function ensureWorker(): Worker {
  if (worker) return worker
  const instance = new Worker(workerPath())
  instance.on('message', (message: { id: number; html?: string; error?: string }) => {
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    clearTimeout(entry.timer)
    if (message.error) entry.reject(new Error(message.error))
    else entry.resolve(message.html ?? '')
  })
  instance.on('error', (error) => {
    worker = null
    rejectAll(error instanceof Error ? error : new Error(String(error)))
  })
  instance.on('exit', (code) => {
    worker = null
    if (code !== 0) rejectAll(new Error(`[nuxt-fixture] DSD worker 退出（code ${code}）`))
  })
  process.once('exit', () => {
    void instance.terminate()
  })
  worker = instance
  return instance
}

export function renderDsdPage(request: DsdRequest): Promise<string> {
  const instance = ensureWorker()
  const id = ++seq
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`[nuxt-fixture] DSD 渲染超时（${TIMEOUT_MS}ms，locale=${request.requestLocale}）`))
    }, TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    instance.postMessage({ id, ...request })
  })
}
