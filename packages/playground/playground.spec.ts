import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { extname, join, normalize, resolve } from 'node:path'

// 宿主桥接门禁：playground 是唯一的真实 React / Vue 宿主验证，却长期没有自动化——
// 曾经 React 端 <oas-input prefix> 撞只读 Element.prefix 把整棵 React 树崩成白屏而无人发现。
// 这里构建双端产物 → 静态托管 → 断言零 pageerror / console error + 各 demo 块真挂载。
const PLAYGROUND = import.meta.dirname
const REPO_ROOT = resolve(PLAYGROUND, '../..')
const VITE_BIN = join(REPO_ROOT, 'node_modules/vite/bin/vite.js')
const REACT_PORT = 5190
const VUE_PORT = 5191

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function serve(dir: string, port: number): Promise<Server> {
  const root = resolve(dir)
  const server = createServer(async (req, res) => {
    let pathname = decodeURIComponent((req.url || '/').split('?')[0])
    if (pathname.endsWith('/')) pathname += 'index.html'
    const file = normalize(join(root, pathname))
    if (!file.startsWith(root)) {
      res.statusCode = 403
      res.end()
      return
    }
    try {
      const st = await stat(file)
      const target = st.isDirectory() ? join(file, 'index.html') : file
      res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] || 'application/octet-stream')
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      const stream = createReadStream(target)
      stream.on('error', () => res.destroy())
      res.on('close', () => stream.destroy())
      stream.pipe(res)
    } catch {
      res.statusCode = 404
      res.end()
    }
  })
  return new Promise((r) => server.listen(port, () => r(server)))
}

const servers: Server[] = []

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

test.beforeAll(async () => {
  execFileSync(process.execPath, [VITE_BIN, 'build', '--config', 'vite.react.config.ts'], {
    cwd: PLAYGROUND,
    stdio: 'pipe',
  })
  execFileSync(process.execPath, [VITE_BIN, 'build', '--config', 'vite.vue.config.ts'], {
    cwd: PLAYGROUND,
    stdio: 'pipe',
  })
  servers.push(await serve(join(PLAYGROUND, 'dist-react'), REACT_PORT))
  servers.push(await serve(join(PLAYGROUND, 'dist-vue'), VUE_PORT))
})

test.afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise<void>((r) => s.close(() => r()))))
})

for (const [app, port] of [
  ['react', REACT_PORT],
  ['vue', VUE_PORT],
] as const) {
  test(`${app} playground：零 pageerror + demo 块挂载 + kanban 渲染`, async ({ page }) => {
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' })
    await page.waitForFunction(() => customElements.get('oas-button') != null, null, { timeout: 15000 })
    await page.waitForTimeout(300)

    const mounted = await page.evaluate(() => {
      const k = document.querySelector('oas-kanban')
      const prefixInput = [...document.querySelectorAll('oas-input')].find(
        (i) => i.hasAttribute('prefix') || i.hasAttribute('prefix-text'),
      )
      const prefixPart =
        prefixInput && prefixInput.shadowRoot ? prefixInput.shadowRoot.querySelector("[part='prefix']") : null
      return {
        buttons: document.querySelectorAll('oas-button').length,
        form: !!document.querySelector('oas-form'),
        table: !!document.querySelector('oas-table'),
        kanban: !!k,
        kanbanRendered: !!k && !!k.shadowRoot && (k.shadowRoot.textContent || '').includes('待办'),
        prefixRendered: prefixPart ? (prefixPart.textContent || '').trim() : '',
      }
    })
    expect(mounted.buttons, '组件已挂载').toBeGreaterThan(0)
    expect(mounted.form && mounted.table && mounted.kanban, '表单/表格/看板 demo 块均存在').toBe(true)
    expect(mounted.kanbanRendered, 'kanban 真渲染').toBe(true)
    expect(mounted.prefixRendered, 'oas-input prefix-text 真渲染（非仅不崩）').toBe('¥')
    expect(errs, `${app} playground 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
  })
}
