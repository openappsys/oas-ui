import { createServer } from 'node:http'
import next from 'next'

/**
 * fixture 的启动入口（替代 `next start`）：在**文档响应**的 `<head>` 里注入 DSD polyfill。
 *
 * 为什么不能用 `next start` + layout 里写 `<script>`：
 * Next App Router 会把自己产出的 chunk 脚本（Turbopack 一律 `<script async>`）放在 head 的
 * 最前面，layout 里渲染的 head 内容一律排在其后。async 脚本下载完成即可执行，因此在 layout
 * 里放的脚本**无法保证**先于 Next 的 chunk 求值——这正是「polyfill 必须先于组件注册」的破口。
 *
 * 这里按自托管部署的通行做法控制 HTML：在 `<head>` 的 `<meta charset>` 之后插入
 * 经典同步脚本 `<script src="/oas-dsd-polyfill"></script>`。它是文档里第一个 `<script>`，
 * 解析到就立即执行，任何后续脚本（含 async chunk）都不可能在它之前运行；
 * 脚本内容由 `app/oas-dsd-polyfill/route.ts` 从 `@oas-ui/ssr/dist/polyfill.js` 转成经典脚本提供。
 *
 * 只改写**文档导航**（`Accept: text/html`）响应：RSC 飞行请求（带 `RSC` 头）、静态资源、
 * 图片等一律原样透传，不缓冲、不改写。
 */

const PORT = Number(process.env.PORT ?? 4301)
const HOST = process.env.HOST ?? '127.0.0.1'

// `next start` 会自己注入 NODE_ENV=production；自托管入口对齐同样的默认值（dev 走 `next dev`）
process.env.NODE_ENV ??= 'production'

/** 注入标记（e2e 按这个 src 找脚本、并按路径重新求值 polyfill） */
const POLYFILL_SRC = '/oas-dsd-polyfill'
const SCRIPT_TAG = `<script src="${POLYFILL_SRC}"></script>`

/** 把脚本插到 `<head>` 内 `<meta charset>` 之后（无 charset 时紧跟 `<head>`） */
function injectPolyfill(html) {
  const headOpen = /<head\b[^>]*>/i.exec(html)
  if (!headOpen) return null
  const afterHead = headOpen.index + headOpen[0].length
  const charset = /<meta[^>]*charset[^>]*>/i.exec(html.slice(afterHead))
  const at = charset ? afterHead + charset.index + charset[0].length : afterHead
  if (html.slice(0, at).includes(SCRIPT_TAG)) return html
  return `${html.slice(0, at)}${SCRIPT_TAG}${html.slice(at)}`
}

const app = next({ dev: false, dir: process.cwd(), hostname: HOST, port: PORT })
await app.prepare()
const handle = app.getRequestHandler()

function isDocumentRequest(req) {
  if (req.method !== 'GET') return false
  const accept = req.headers.accept ?? ''
  // RSC 飞行请求（客户端导航）带 RSC 头，返回的是 Flight 文本，不是 HTML 文档
  return accept.includes('text/html') && !('rsc' in req.headers)
}

function toBuffer(chunk, encoding) {
  if (Buffer.isBuffer(chunk)) return chunk
  if (chunk instanceof Uint8Array) return Buffer.from(chunk)
  return Buffer.from(String(chunk), typeof encoding === 'string' ? encoding : 'utf8')
}

createServer((req, res) => {
  if (!isDocumentRequest(req)) {
    handle(req, res)
    return
  }

  // 缓冲 HTML 直到响应结束：文档响应体量小，注入需要看到完整的 `<head>`；
  // 不改写任何非 HTML 响应（分流见 isDocumentRequest）。
  const chunks = []
  const write = res.write.bind(res)
  const end = res.end.bind(res)

  res.write = (chunk, encoding, callback) => {
    chunks.push(toBuffer(chunk, encoding))
    if (typeof encoding === 'function') encoding()
    else if (typeof callback === 'function') callback()
    return true
  }

  res.end = (chunk, encoding, callback) => {
    res.write = write
    res.end = end
    if (chunk !== undefined && chunk !== null) chunks.push(toBuffer(chunk, encoding))
    const html = Buffer.concat(chunks).toString('utf8')
    const injected = res.statusCode === 200 ? injectPolyfill(html) : null
    if (injected === null) {
      end(html)
      return
    }
    // 体量变化：若响应头尚未发出，去掉可能存在的 content-length 让 Node 重新按 chunked 发送。
    // Next 的 HTML 是流式响应（头已 flush、transfer-encoding: chunked），此时不能也不需要改写。
    if (!res.headersSent && res.getHeader('content-length') !== undefined) res.removeHeader('content-length')
    end(injected)
    if (typeof encoding === 'function') encoding()
    else if (typeof callback === 'function') callback()
  }

  handle(req, res)
}).listen(PORT, HOST)
