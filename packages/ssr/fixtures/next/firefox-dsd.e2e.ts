import { test, expect, type Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * Next.js fixture · Firefox DSD 验收（`next-firefox` project；Next 的其余用例仍在 Chromium 跑）。
 *
 * 与 Nuxt 的 Firefox 用例同构，但多一条 Next 特有的**严格顺序**验收：App Router 会把 layout
 * 渲染的 head 内容排在框架 chunk（Turbopack 一律 `async`）之后，因此在 layout 里放脚本无法
 * 保证「polyfill 先于组件注册」。本 fixture 由 `server.mjs` 在文档响应的 `<head>` 里注入经典
 * 同步脚本 `/oas-dsd-polyfill`，它是文档里第一个 `<script>`：
 * 1. 响应 HTML + 浏览器 DOM 双层断言该脚本身份与位置（经典、无 async/defer/module、先于任何
 *    `/_next/` chunk 脚本）；
 * 2. 原生 DSD：Firefox 在文档解析期即附加声明式 shadow root，head polyfill 因片段级能力探测
 *    命中而零执行；组件注册后按 SSR 指纹真水合（同一 shadow root、style 引用不变、指纹被消费）；
 * 3. 运行期注入 DSD：`innerHTML` 注入的快照不会被任何引擎自动挂载，polyfill 求值即挂载；
 *    二次求值幂等（shadow root 引用不变），随后注册组件并真水合。
 *
 * 「无 polyfill 降级」由 `../nuxt/firefox-dsd.e2e.ts` 覆盖（同一组件注册路径），Next 侧不重复。
 */

const FIXTURE_DIR = import.meta.dirname
const REPO_ROOT = resolve(FIXTURE_DIR, '..', '..', '..', '..')
const ARTIFACT_DIR = join(tmpdir(), 'opencode', 'oas-ssr-next-firefox-dsd')
const UI_BUNDLE = join(ARTIFACT_DIR, 'ui-csr-only.js')

/** head 注入的经典脚本（server.mjs 注入；route handler 提供内容） */
const POLYFILL_URL = '/oas-dsd-polyfill'
const URL_ZH = '/zh-CN'

/** 运行期注入容器（与页面自带快照分开，避免干扰既有宿主） */
const INJECTED = '#runtime-injected'

const HOSTS = {
  empty: 'oas-empty',
  table: 'oas-table',
  select: 'oas-select',
  tool: 'oas-tool-call',
} as const

type HostId = keyof typeof HOSTS
const IDS = Object.keys(HOSTS) as HostId[]

/** Next chunk 请求（延迟/阻断用；head 里的 polyfill 不在此列） */
const CHUNK_GLOB = '**/_next/static/**/*.js'

interface HostState {
  /** shadow root 是否已存在（不返回 DOM 句柄，避免跨进程序列化） */
  hasRoot: boolean
  sameRoot: boolean
  mark: string | null
  /** `data-oas-ssr-v` 指纹值（null = shadow 内无指纹） */
  meta: string | null
  styles: number
  hosts: number
}

/** 页面控制台/异常收集（zero-tolerance：用例结束断言为空数组） */
function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`[console.${message.type()}] ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`))
  return problems
}

/**
 * CSR-only bundle：只注册 @oas-ui/ui（不含 @oas-ui/ssr/polyfill），用于运行期注入用例在
 * polyfill 挂载之后补上「组件注册 → 真水合」这一段。与 Nuxt fixture 同法：vite lib 模式内联全部
 * workspace 依赖（Next 的 chunk 图无法单独重放，阻断后只能靠独立 bundle 注册组件）。
 */
function buildCsrOnlyBundle(): void {
  const uiEntry = join(REPO_ROOT, 'packages', 'ui', 'dist', 'index.js')
  if (!existsSync(uiEntry)) {
    throw new Error(`[next-firefox] 缺少 ${uiEntry}：请先执行 pnpm --filter @oas-ui/ui build 再跑 e2e`)
  }
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const viteCli = join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const configFile = join(ARTIFACT_DIR, 'vite.csr-only.config.mjs')
  writeFileSync(
    configFile,
    [
      'export default {',
      `  root: ${JSON.stringify(REPO_ROOT.replaceAll('\\', '/'))},`,
      '  configFile: false,',
      "  logLevel: 'silent',",
      '  build: {',
      `    lib: { entry: ${JSON.stringify(uiEntry.replaceAll('\\', '/'))}, formats: ['es'], fileName: () => 'ui-csr-only.js' },`,
      `    outDir: ${JSON.stringify(ARTIFACT_DIR.replaceAll('\\', '/'))},`,
      '    emptyOutDir: false,',
      '    minify: true,',
      '    sourcemap: false,',
      '  },',
      '}',
    ].join('\n'),
    'utf8',
  )
  const result = spawnSync(process.execPath, [viteCli, 'build', '--config', configFile], { encoding: 'utf8' })
  if (result.status !== 0 || !existsSync(UI_BUNDLE)) {
    throw new Error(
      `[next-firefox] CSR-only bundle 构建失败（status=${result.status}）：\n${result.stdout}\n${result.stderr}`,
    )
  }
}

test.beforeAll(() => {
  buildCsrOnlyBundle()
})

/**
 * 取出响应 HTML 里 4 个 SSR 宿主（含 `<template shadowrootmode>` 快照）的原始标记。
 * 用 DOMParser 解析响应字符串：它**不会**附加声明式 shadow root，
 * 故 `outerHTML` 仍带着模板——正是运行期注入用例需要的输入。
 */
async function extractSnapshots(page: Page, html: string): Promise<Record<HostId, string>> {
  const out = await page.evaluate((raw) => {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    const tags: Record<string, string> = {
      empty: 'oas-empty',
      table: 'oas-table',
      select: 'oas-select',
      tool: 'oas-tool-call',
    }
    const result: Record<string, string> = {}
    for (const [id, tag] of Object.entries(tags)) {
      result[id] = doc.querySelector(`[data-case="${id}"] ${tag}`)?.outerHTML ?? ''
    }
    return result
  }, html)
  for (const id of IDS) {
    if (!out[id]?.includes('shadowrootmode')) {
      throw new Error(`[next-firefox] 响应里未取到 ${HOSTS[id]} 的 DSD 快照（标记缺失或选择器失效）`)
    }
  }
  return out as Record<HostId, string>
}

/** 用 innerHTML 把 SSR 快照注入独立容器（运行期注入：DSD 模板不会被自动挂载） */
async function injectSnapshots(page: Page, snapshots: Record<HostId, string>): Promise<void> {
  await page.evaluate(
    ({ markup, selector }) => {
      const grid = document.querySelector('.grid')
      if (!grid) throw new Error('[next-firefox] 页面缺少 .grid 容器')
      const box = document.createElement('div')
      box.id = selector.slice(1)
      box.innerHTML = Object.values(markup).join('')
      grid.appendChild(box)
    },
    { markup: snapshots, selector: INJECTED },
  )
}

/** 注入容器内的 DSD 状态：宿主数 / 已附加 shadow 数 / 未消费模板数 */
async function dsdState(page: Page): Promise<{ hosts: number; shadows: number; templates: number }> {
  return page.evaluate((selector) => {
    const box = document.querySelector(selector)
    const hosts = box ? Array.from(box.children) : []
    return {
      hosts: hosts.length,
      shadows: hosts.filter((el) => el.shadowRoot !== null).length,
      templates: document.querySelectorAll('template[shadowrootmode]').length,
    }
  }, INJECTED)
}

/** 读完注入容器内每类宿主的 shadow 状态（`mark` = 顺带给快照 style 打水合标记） */
async function readHostState(page: Page, mark = false): Promise<Record<HostId, HostState>> {
  const state = await page.evaluate(
    ({ selector, tags, shouldMark }) => {
      const w = window as unknown as { __dsdRoots?: Record<string, ShadowRoot | null> }
      if (shouldMark) w.__dsdRoots = {}
      const out: Record<string, HostState> = {}
      for (const [id, tag] of Object.entries(tags)) {
        const hosts = document.querySelectorAll(`${selector} > ${tag}`)
        const root = hosts[0]?.shadowRoot ?? null
        if (shouldMark) {
          w.__dsdRoots![id] = root
          root?.querySelector('style')?.setAttribute('data-hydration-mark', id)
        }
        out[id] = {
          hasRoot: root !== null,
          sameRoot: !!w.__dsdRoots && root === w.__dsdRoots[id],
          mark: root?.querySelector('style')?.getAttribute('data-hydration-mark') ?? null,
          meta: root?.querySelector('meta[data-oas-ssr]')?.getAttribute('data-oas-ssr-v') ?? null,
          styles: root?.querySelectorAll('style').length ?? 0,
          hosts: hosts.length,
        }
      }
      return out
    },
    { selector: INJECTED, tags: HOSTS, shouldMark: mark },
  )
  return state as Record<HostId, HostState>
}

test.describe('Next.js fixture · Firefox DSD', () => {
  test('严格顺序：head 里第一个脚本就是经典同步 polyfill，先于任何 Next chunk', async ({ page, request }) => {
    const problems = collectProblems(page)

    // ① 响应 HTML 层面：head 内第一个 <script> 是 polyfill，其余全是 Next chunk 脚本
    const response = await request.get(URL_ZH, { headers: { accept: 'text/html' } })
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/html')
    const html = await response.text()
    const headStart = html.indexOf('<head')
    const headEnd = html.indexOf('</head>')
    expect(headStart, '响应应含 <head>').toBeGreaterThanOrEqual(0)
    expect(headEnd, '响应应含 </head>').toBeGreaterThan(headStart)
    const head = html.slice(headStart, headEnd)
    const scriptTags = Array.from(head.matchAll(/<script\b[^>]*>/gi), (match) => match[0])
    expect(scriptTags.length, 'head 里应同时有 polyfill 与 Next chunk 脚本').toBeGreaterThan(1)
    expect(scriptTags[0], 'head 第一个脚本必须是 polyfill').toContain(`src="${POLYFILL_URL}"`)
    // 经典同步脚本：带 async / defer / type=module 都会让执行顺序脱离文档序，强制顺序不再成立
    expect(scriptTags[0]).not.toMatch(/\basync\b/)
    expect(scriptTags[0]).not.toMatch(/\bdefer\b/)
    expect(scriptTags[0]).not.toMatch(/type\s*=\s*["']?module/i)
    // 其后所有脚本都是 Next 自己的 chunk（证明 polyfill 确实排在框架脚本之前）
    for (const tag of scriptTags.slice(1)) {
      expect(tag, '除 polyfill 外 head 里的脚本都应来自 /_next/').toContain('/_next/')
    }

    // polyfill 端点必须是**经典脚本**（ESM 的 export 会让浏览器整段拒绝执行）
    const polyfill = await request.get(POLYFILL_URL)
    expect(polyfill.status()).toBe(200)
    expect(polyfill.headers()['content-type']).toContain('javascript')
    const code = await polyfill.text()
    expect(code).toContain('function hydrateDeclarativeShadowRoots')
    expect(code).not.toMatch(/^\s*export\s/m)
    expect(code).not.toMatch(/^\s*import\s/m)

    // ② 浏览器 DOM 层面：解析后该节点仍是 head 的首个脚本，且被真实取回执行
    await page.goto(URL_ZH)
    const dom = await page.evaluate(() => {
      const scripts = Array.from(document.head.querySelectorAll('script'))
      const first = scripts[0]
      const entry = performance.getEntriesByType('resource').find((item) => item.name.endsWith('/oas-dsd-polyfill'))
      return {
        firstSrc: first?.getAttribute('src') ?? null,
        async: first?.getAttribute('async') ?? null,
        defer: first?.getAttribute('defer') ?? null,
        type: first?.getAttribute('type') ?? null,
        others: scripts.slice(1).map((script) => script.getAttribute('src') ?? ''),
        fetched: entry !== undefined,
      }
    })
    expect(dom.firstSrc).toBe(POLYFILL_URL)
    expect(dom.async).toBeNull()
    expect(dom.defer).toBeNull()
    expect(dom.type).toBeNull()
    // 其余脚本全部是 Next 的 chunk（polyfill 排在它们之前，与 ① 的源码顺序一致）
    expect(dom.others.length).toBeGreaterThan(0)
    for (const src of dom.others) {
      expect(src, 'head 里除 polyfill 外的脚本都应来自 /_next/').toMatch(/^\/_next\//)
    }
    expect(dom.fetched, 'polyfill 应被浏览器真实取回（同源经典脚本按文档序同步执行）').toBe(true)
    expect(problems).toEqual([])
  })

  test('原生 DSD：解析即附加 shadow root、head polyfill 零命中，upgrade 真水合（指纹被消费）', async ({ page }) => {
    const problems = collectProblems(page)

    // 延迟客户端 chunk：在组件注册前登记 DSD shadow root 引用、指纹并给 style 打标
    await page.route(CHUNK_GLOB, async (route) => {
      await new Promise((done) => setTimeout(done, 1200))
      await route.continue()
    })
    await page.goto(URL_ZH, { waitUntil: 'commit' })
    await page.locator('[data-case="empty"] oas-empty').waitFor({ state: 'attached' })

    const before = await page.evaluate((tags) => {
      const w = window as unknown as { __dsdRoots: Record<string, ShadowRoot | null> }
      w.__dsdRoots = {}
      const out: Record<string, { shadow: boolean; fingerprint: string | null; templates: number }> = {}
      for (const [id, tag] of Object.entries(tags)) {
        const el = document.querySelector(`[data-case="${id}"] ${tag}`)
        const root = el?.shadowRoot ?? null
        w.__dsdRoots[id] = root
        root?.querySelector('style')?.setAttribute('data-hydration-mark', id)
        out[id] = {
          shadow: root !== null,
          fingerprint: root?.querySelector('meta[data-oas-ssr]')?.getAttribute('data-oas-ssr-v') ?? null,
          templates: document.querySelectorAll('template[shadowrootmode]').length,
        }
      }
      return out
    }, HOSTS)

    for (const id of IDS) {
      expect(before[id]?.shadow, `${id}：解析期应已附加 shadow root（Firefox 原生 DSD）`).toBe(true)
      expect(before[id]?.fingerprint, `${id}：水合前应含 SSR 快照指纹`).toBe('1')
      expect(before[id]?.templates, '原生解析后不应残留 DSD 模板').toBe(0)
    }

    // 组件注册并水合（polyfill 在 head 里已同步求值：片段级探测命中 → 零命中 no-op）
    await page.waitForFunction(() => (window as unknown as { __oasClientReady?: boolean }).__oasClientReady === true)
    await page.waitForTimeout(500)

    const after = await page.evaluate((tags) => {
      const w = window as unknown as { __dsdRoots: Record<string, ShadowRoot | null> }
      const out: Record<
        string,
        { sameRoot: boolean; mark: string | null; meta: boolean; styleCount: number; templates: number }
      > = {}
      for (const [id, tag] of Object.entries(tags)) {
        const root = document.querySelector(`[data-case="${id}"] ${tag}`)?.shadowRoot ?? null
        out[id] = {
          // polyfill 是 no-op：upgrade 前后必须是同一个 ShadowRoot 对象
          sameRoot: root === w.__dsdRoots[id],
          mark: root?.querySelector('style')?.getAttribute('data-hydration-mark') ?? null,
          meta: !!root?.querySelector('meta[data-oas-ssr]'),
          styleCount: root?.querySelectorAll('style').length ?? 0,
          templates: document.querySelectorAll('template[shadowrootmode]').length,
        }
      }
      return out
    }, HOSTS)

    for (const id of IDS) {
      expect(after[id]?.sameRoot, `${id}：polyfill 不得重建/替换解析期 shadow root`).toBe(true)
      expect(after[id]?.mark, `${id}：真水合应复用快照 style 节点`).toBe(id)
      expect(after[id]?.meta, `${id}：SSR 指纹应被消费（水合接管，未走 render 重建）`).toBe(false)
      expect(after[id]?.styleCount, `${id}：水合后 shadow 内 style 数量`).toBe(1)
      expect(after[id]?.templates, `${id}：水合后不应残留 DSD 模板`).toBe(0)
    }
    expect(problems).toEqual([])
  })

  test('运行期注入 DSD：polyfill 求值即挂载、二次求值幂等，组件随后注册并真水合', async ({ page, request }) => {
    const problems = collectProblems(page)

    // 阻断页面自带的客户端 chunk（回空模块，组件在 polyfill 之前不注册；空文件而非 abort，
    // 避免浏览器把加载失败记为 console 警告污染零告警断言）
    await page.route(CHUNK_GLOB, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    )
    const response = await request.get(URL_ZH, { headers: { accept: 'text/html' } })
    expect(response.status()).toBe(200)
    const snapshots = await extractSnapshots(page, await response.text())

    await page.goto(URL_ZH)
    await injectSnapshots(page, snapshots)
    // innerHTML 注入：任何引擎都不会自动附加声明式 shadow root（原生 DSD 只在文档解析期生效）
    expect(await dsdState(page)).toEqual({ hosts: 4, shadows: 0, templates: 4 })

    // head 里那份 polyfill 已在解析期执行过（当时无模板 → 零命中），这里重新求值触发挂载
    await page.addScriptTag({ url: POLYFILL_URL })
    await page.waitForFunction(
      ({ selector }) =>
        document.querySelectorAll('template[shadowrootmode]').length === 0 &&
        Array.from(document.querySelectorAll(selector)).every((box) =>
          Array.from(box.children).every((el) => el.shadowRoot !== null),
        ),
      { selector: INJECTED },
    )

    const attached = await readHostState(page, true)
    for (const id of IDS) {
      expect(attached[id]?.hasRoot, `${id}：polyfill 应已挂载 shadow root`).toBe(true)
      expect(attached[id]?.meta, `${id}：polyfill 挂载后应保有 SSR 指纹`).toBe('1')
      expect(attached[id]?.styles, `${id}：快照内样式表数量`).toBe(1)
    }

    // 二次求值：幂等（已挂载的 shadow root 引用不变、无模板可清）
    await page.addScriptTag({ url: `${POLYFILL_URL}?second-run=1` })
    const repeated = await readHostState(page)
    for (const id of IDS) {
      expect(repeated[id]?.sameRoot, `${id}：polyfill 二次求值不得替换已挂载 shadow root`).toBe(true)
      expect(repeated[id]?.meta, `${id}：二次求值后指纹仍在`).toBe('1')
      expect(repeated[id]?.styles, `${id}：二次求值不得重复注入样式`).toBe(1)
    }
    expect(await page.evaluate(() => document.querySelectorAll('template[shadowrootmode]').length)).toBe(0)

    // 组件随后注册：按 polyfill 挂载出的快照指纹真水合（复用同一 shadow root、指纹被消费）
    await page.unroute(CHUNK_GLOB)
    await page.addScriptTag({ path: UI_BUNDLE, type: 'module' })
    await page.waitForFunction(() =>
      ['oas-empty', 'oas-table', 'oas-select', 'oas-tool-call'].every((tag) => !!customElements.get(tag)),
    )
    await page.waitForTimeout(500)

    const after = await readHostState(page)
    for (const id of IDS) {
      expect(after[id]?.sameRoot, `${id}：组件水合不得替换 polyfill 挂载的 shadow root`).toBe(true)
      expect(after[id]?.mark, `${id}：真水合应复用 polyfill 挂载的 style 节点`).toBe(id)
      expect(after[id]?.meta, `${id}：SSR 指纹应被消费`).toBeNull()
      expect(after[id]?.styles, `${id}：水合后 shadow 内 style 数量`).toBe(1)
      expect(after[id]?.hosts, `${id}：不应重复渲染出多个宿主`).toBe(1)
    }
    expect(await page.evaluate(() => document.querySelectorAll('template[shadowrootmode]').length)).toBe(0)
    expect(problems).toEqual([])
  })
})
