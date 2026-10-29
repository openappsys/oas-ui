/**
 * 常驻 DSD 渲染 worker（独立 globalThis）。
 * 父进程按请求发送 { id, requestLocale, theme }；渲染串行执行，保证多请求 locale 不串。
 */
import { parentPort } from 'node:worker_threads'
import { buildDsdDocument } from './dsd-page.mjs'

let chain = Promise.resolve()

parentPort.on('message', (message) => {
  chain = chain.then(async () => {
    try {
      const html = await buildDsdDocument(message)
      parentPort.postMessage({ id: message.id, html })
    } catch (error) {
      parentPort.postMessage({ id: message.id, error: String(error?.stack ?? error) })
    }
  })
})
