#!/usr/bin/env node
/**
 * e2e 专用极简静态服务器，替代 `vitepress preview`。
 *
 * 为什么不用 vitepress preview：它的 serve() 硬编码 `compression({ brotli: true })`，
 * 而 brotli 默认质量 11——实测每个 100KB 资源压缩耗 ~76ms（gzip 2.4ms、不压缩 0.7ms）。
 * 单线程逐响应压缩，几个并发 worker 就把 CPU 打满，响应排队 → 用例变慢/超时，
 * 表现为「单 server 并发上限约 6~10」甚至被误判为进程崩溃。e2e 全在 localhost，
 * 压缩毫无收益。
 *
 * 本服务器只做：静态文件 + 正确 MIME + 404.html 回退 + 可选 cluster 多进程。
 * 对 e2e 而言与 preview 等价（docs 站无 cleanUrls/base，路径都是显式 .html）。
 * 关键：文件系统操作一律走异步（fs.promises.stat），避免同步 stat 在高并发下阻塞
 * 事件循环、把响应拖到超时。
 *
 * 用法：node scripts/e2e/serve-dist.mjs <distDir> <port>
 * 环境变量：
 *   E2E_SERVE_WORKERS   cluster worker 数（默认 1=单进程；>1 时主进程仅分发连接）
 */
import cluster from 'node:cluster'
import http from 'node:http'
import { createReadStream, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const DIST = resolve(process.argv[2] || 'packages/docs/docs/.vitepress/dist')
const PORT = Number(process.argv[3] || process.env.E2E_PORT || 4173)
const WORKERS = Math.max(1, Number(process.env.E2E_SERVE_WORKERS || 1))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}

function createServer() {
  const notFound = readFileSync(join(DIST, '404.html'))
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }
    let pathname = decodeURIComponent((req.url || '/').split('?')[0])
    if (pathname.endsWith('/')) pathname += 'index.html'
    const file = normalize(join(DIST, pathname))
    // 目录逃逸防护
    if (!file.startsWith(DIST)) {
      res.statusCode = 403
      res.end()
      return
    }
    let target = file
    let size = null
    try {
      const st = await stat(file)
      if (st.isDirectory()) {
        target = join(file, 'index.html')
        size = (await stat(target)).size
      } else {
        size = st.size
      }
    } catch {
      size = null
    }
    if (size == null) {
      res.statusCode = 404
      // 与 vitepress 一致：非资源路径回 404 页，资源路径空体
      if (!pathname.startsWith('/assets/')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(notFound)
      } else {
        res.end()
      }
      return
    }
    res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] || 'application/octet-stream')
    res.setHeader('Content-Length', size)
    res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(target)
    // 客户端中途断开（导航取消）会触发 stream error：必须吞掉，否则 unhandled 会崩进程/挂连接
    stream.on('error', () => res.destroy())
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  })
}

if (WORKERS > 1 && cluster.isPrimary) {
  for (let i = 0; i < WORKERS; i++) cluster.fork()
} else {
  createServer().listen(PORT, () => {
    console.log(`e2e dist server on http://localhost:${PORT}/${cluster.isWorker ? ` (worker ${process.pid})` : ''}`)
  })
}
