import { test, expect, type Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * Firefox DSD 验收（`nuxt-firefox` project；其余 fixture 用例仍在 Chromium 跑）。
 *
 * 验收三件事：
 * 1. 原生 DSD：Firefox 在**文档解析期**即附加声明式 shadow root（响应 HTML 里的 template 被解析器消费，
 *    页面零残留），入口里的 DSD polyfill 因此是零命中 no-op；客户端注册后按 SSR 指纹真水合
 *    （复用同一 shadow root、style 节点引用不变、`data-oas-ssr-v` 指纹被消费、无重复样式表）；
 * 2. 运行期注入 DSD：`innerHTML` 注入的 SSR 快照在**任何**引擎都不会自动挂载（原生 DSD 只作用于
 *    文档解析），此时 polyfill 求值即挂载；组件随后注册并真水合。再加载一次含 polyfill 的真实
 *    客户端 bundle，验证幂等（shadow root 引用不变）；
 * 3. 无 polyfill 降级：同样的运行期注入，只注册组件不挂 polyfill → 组件按 CSR 自建 shadow 兜底，
 *    页面不炸、可交互，但 SSR 快照模板不被消费（如实断言降级，不假装水合）。
 */

const FIXTURE_DIR = import.meta.dirname
const REPO_ROOT = resolve(FIXTURE_DIR, '..', '..', '..', '..')
const ARTIFACT_DIR = join(tmpdir(), 'opencode', 'oas-ssr-nuxt-firefox-dsd')
const UI_BUNDLE = join(ARTIFACT_DIR, 'ui-csr-only.js')
const POLYFILL = join(REPO_ROOT, 'packages', 'ssr', 'dist', 'polyfill.js')

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

const URL_ZH = '/?locale=zh-CN'

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
 * CSR-only bundle：只注册 @oas-ui/ui（不含 @oas-ui/ssr/polyfill），用于「无 polyfill 降级」用例。
 * 与 ssr-dsd-cross-engine.spec.ts 同法：vite lib 模式内联全部 workspace 依赖。
 */
function buildCsrOnlyBundle(): void {
  const uiEntry = join(REPO_ROOT, 'packages', 'ui', 'dist', 'index.js')
  if (!existsSync(uiEntry)) {
    throw new Error(`[nuxt-firefox] 缺少 ${uiEntry}：请先执行 pnpm --filter @oas-ui/ui build 再跑 e2e`)
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
      `[nuxt-firefox] CSR-only bundle 构建失败（status=${result.status}）：\n${result.stdout}\n${result.stderr}`,
    )
  }
}

test.beforeAll(() => {
  buildCsrOnlyBundle()
})

/**
 * 取出响应 HTML 里 4 个 SSR 宿主（含 `<template shadowrootmode>` 快照）的原始标记。
 * 用 DOMParser 解析响应字符串：它**不会**附加声明式 shadow root（Chromium/Firefox/WebKit 实测均为 null），
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
      throw new Error(`[nuxt-firefox] 响应里未取到 ${HOSTS[id]} 的 DSD 快照（标记缺失或选择器失效）`)
    }
  }
  return out as Record<HostId, string>
}

/** 用 innerHTML 把 SSR 快照注入独立容器（运行期注入：DSD 模板不会被自动挂载） */
async function injectSnapshots(page: Page, snapshots: Record<HostId, string>): Promise<void> {
  await page.evaluate(
    ({ markup, selector }) => {
      const grid = document.querySelector('.grid')
      if (!grid) throw new Error('[nuxt-firefox] 页面缺少 .grid 容器')
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

test.describe('Nuxt fixture · Firefox DSD', () => {
  test('原生 DSD：解析即附加 shadow root、入口 polyfill 零命中，upgrade 真水合（指纹被消费）', async ({ page }) => {
    const problems = collectProblems(page)

    // 延迟客户端 bundle：在组件注册前登记 DSD shadow root 引用、指纹并给 style 打标
    await page.route('**/vendor/oas-client.js', async (route) => {
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

    // 客户端 bundle 求值：入口 polyfill 先跑（探测零命中 → no-op），随后注册组件并水合
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

  test('运行期注入 DSD：polyfill 求值即挂载，组件随后注册并真水合；二次求值幂等', async ({ page, request }) => {
    const problems = collectProblems(page)

    // 先拦掉页面自带客户端 bundle（回空模块，组件在 polyfill 之前不注册；用空文件而非 abort，
    // 避免浏览器把加载失败记为 console 警告污染零告警断言）
    await page.route('**/vendor/oas-client.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    )
    const response = await request.get(URL_ZH)
    expect(response.status()).toBe(200)
    const snapshots = await extractSnapshots(page, await response.text())

    await page.goto(URL_ZH)
    await injectSnapshots(page, snapshots)
    // innerHTML 注入：任何引擎都不会自动附加声明式 shadow root（原生 DSD 只在文档解析期生效）
    expect(await dsdState(page)).toEqual({ hosts: 4, shadows: 0, templates: 4 })

    await page.addScriptTag({ path: POLYFILL, type: 'module' })
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
    expect(await page.evaluate((s) => document.querySelectorAll(`${s} > oas-empty`).length, INJECTED)).toBe(1)
    expect(await page.evaluate((s) => document.querySelectorAll(`${s} > oas-table`).length, INJECTED)).toBe(1)

    // 真实客户端 bundle（入口含 polyfill）：polyfill 二次求值必须幂等，组件随后水合。
    // 用 URL 重新拉真实产物（bundle 内含相对 chunk 引用，内联注入会按页面 URL 解析而 404）；
    // 带 query 规避「空模块已占用同一 URL 的模块记录」。
    await page.unroute('**/vendor/oas-client.js')
    await page.addScriptTag({ url: '/vendor/oas-client.js?runtime-injection=1', type: 'module' })
    await page.waitForFunction(() => (window as unknown as { __oasClientReady?: boolean }).__oasClientReady === true)
    await page.waitForTimeout(500)

    const after = await readHostState(page)
    for (const id of IDS) {
      expect(after[id]?.sameRoot, `${id}：polyfill 二次求值不得替换已挂载 shadow root`).toBe(true)
      expect(after[id]?.mark, `${id}：真水合应复用 polyfill 挂载的 style 节点`).toBe(id)
      expect(after[id]?.meta, `${id}：SSR 指纹应被消费`).toBeNull()
      expect(after[id]?.styles, `${id}：水合后 shadow 内 style 数量`).toBe(1)
      expect(after[id]?.hosts, `${id}：不应重复渲染出多个宿主`).toBe(1)
    }
    expect(await page.evaluate(() => document.querySelectorAll('template[shadowrootmode]').length)).toBe(0)
    expect(problems).toEqual([])
  })

  test('无 polyfill 降级：页面不炸、组件 CSR 兜底，但 DSD 快照不被消费（不假装水合）', async ({ page, request }) => {
    const problems = collectProblems(page)

    await page.route('**/vendor/oas-client.js', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    )
    const response = await request.get(URL_ZH)
    expect(response.status()).toBe(200)
    const snapshots = await extractSnapshots(page, await response.text())

    await page.goto(URL_ZH)
    await injectSnapshots(page, snapshots)
    expect(await dsdState(page)).toEqual({ hosts: 4, shadows: 0, templates: 4 })

    // 只注册组件（不含 polyfill）：组件 upgrade 时自行 attachShadow → CSR 兜底
    await page.addScriptTag({ path: UI_BUNDLE, type: 'module' })
    await page.waitForFunction(() =>
      ['oas-empty', 'oas-table', 'oas-select', 'oas-tool-call'].every((tag) => !!customElements.get(tag)),
    )

    const state = await readHostState(page)
    for (const id of IDS) {
      expect(state[id]?.hasRoot, `${id}：无 polyfill 时组件应 CSR 自建 shadow 兜底`).toBe(true)
      // CSR 渲染路径不产生 SSR 指纹 meta —— 有指纹才叫水合
      expect(state[id]?.meta, `${id}：CSR 兜底不得留下 SSR 指纹（未水合）`).toBeNull()
      expect(state[id]?.hosts, `${id}：不应重复渲染出多个宿主`).toBe(1)
    }
    // 属性驱动文案：不依赖语言包注册状态，直接证明组件真的渲染了
    const tableText = await page.evaluate(
      (s) => (document.querySelector(`${s} > oas-table`)?.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      INJECTED,
    )
    expect(tableText).toContain('Name')
    expect(tableText).toContain('Status')
    const toolText = await page.evaluate(
      (s) =>
        (document.querySelector(`${s} > oas-tool-call`)?.shadowRoot?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      INJECTED,
    )
    expect(toolText).toContain('Search the API reference')
    // 降级如实断言：4 份快照模板原样残留、未被消费
    expect(await page.evaluate(() => document.querySelectorAll('template[shadowrootmode]').length)).toBe(4)

    // 页面不炸：CSR 组件可交互（tool-call 展开）
    const head = page.locator(`${INJECTED} > oas-tool-call [part="head"]`)
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')

    expect(problems).toEqual([])
  })
})
