// CDN IIFE × 外部 ESM 语言包的真实链路回归锁：
// - dist/cdn.js（IIFE）与各族包只新增 `OASUI.setLocale` 导出（不导出 loadLocale/t/全部语言包，导出面不扩大）
// - 英文 = 动态 import 与 IIFE 同版本的**纯数据** `@oas-ui/i18n/dist/en.js`（内部相对引用 locales/en.js），
//   再 `setLocale(module.default)`；中文 = `setLocale('zh-CN')`（IIFE 内联 registry 已默认注册）
// - 已挂载组件（popconfirm / empty）随切换即时刷新：中文 → 英文 → 中文，全程无 raw key / pageerror / console error
// 背景：CDN IIFE 内联了 i18n registry 但此前无切换入口（宿主只能消费恒为 zh-CN 的内置文案）；
// 本锁钉住「IIFE 导出面 = 仅新增 setLocale」与「外部纯数据 ESM 包联动」两条契约，防后续语言包/导出漂移。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const UI_ROOT = join(process.cwd(), 'packages/ui')
const I18N_DIST = join(process.cwd(), 'packages/i18n/dist')

/** 外部 ESM 语言包回填：按真实文件路径映射 packages/i18n/dist/**（en.js 内部相对引用 ./locales/en.js 须可解析） */
async function mockI18nEsm(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/__oas-i18n-esm__/**', (route) => {
    const rel = route.request().url().split('/__oas-i18n-esm__/')[1]?.split('?')[0] ?? ''
    return route.fulfill({ path: join(I18N_DIST, rel) })
  })
}

/** ui ESM 与 workspace 依赖回填：dist 产物的裸导入在路由层重写为映射 URL（import map 在
 *  Firefox 的 setContent 文档不生效，路由重写双引擎行为一致）。只改写真实 import/from
 *  语句——字符串字面量（Symbol.for 键、devWarn 提示、报错文案）保持原样。 */
function rewriteBareSpecifiers(js: string): string {
  return js.replace(
    /(from\s*|import\s*\(\s*|import\s*)(['"])(@oas-ui\/[a-z0-9/@._-]+)\2/g,
    (whole, head: string, quote: string, spec: string) => {
      let mapped: string
      if (spec === '@oas-ui/core') mapped = '/__oas-pkg__/core/index.js'
      else if (spec.startsWith('@oas-ui/core/')) mapped = '/__oas-pkg__/core/' + spec.slice('@oas-ui/core/'.length)
      else if (spec === '@oas-ui/i18n') mapped = '/__oas-pkg__/i18n/index.js'
      // i18n 子路径（语言包/registry）：注释示例与真实导入一并正确解析
      else if (spec.startsWith('@oas-ui/i18n/')) mapped = '/__oas-pkg__/i18n/' + spec.slice('@oas-ui/i18n/'.length)
      else if (spec === '@oas-ui/icons/register') mapped = '/__oas-pkg__/icons/register.js'
      else if (spec === '@oas-ui/icons/runtime') mapped = '/__oas-pkg__/icons/runtime.js'
      else if (spec.startsWith('@oas-ui/icons/icons/'))
        mapped = '/__oas-icons-icons__/' + spec.slice('@oas-ui/icons/icons/'.length)
      else if (spec.startsWith('@oas-ui/ui/')) mapped = '/__oas-ui-esm__/' + spec.slice('@oas-ui/ui/'.length)
      else throw new Error(`ESM 测试未映射的裸导入：${spec}`)
      return `${head}${quote}${mapped}${quote}`
    },
  )
}

async function mockUiEsm(page: import('@playwright/test').Page): Promise<void> {
  const packagesDist = process.cwd() + '/packages'
  const readJs = (filePath: string): string => rewriteBareSpecifiers(readFileSync(filePath, 'utf8'))
  await page.route('**/__oas-ui-esm__/**', (route) => {
    const rel = route.request().url().split('/__oas-ui-esm__/')[1]?.split('?')[0] ?? ''
    const file = /\.[a-z]+$/.test(rel) ? rel : `${rel}.js`
    return route.fulfill({
      body: readJs(join(packagesDist, 'ui/dist', file)),
      contentType: 'text/javascript; charset=utf-8',
    })
  })
  await page.route('**/__oas-pkg__/**', (route) => {
    const raw = route.request().url().split('/__oas-pkg__/')[1] ?? ''
    const segments = (raw.split('?')[0] ?? '').split('/')
    const pkg = segments[0] ?? ''
    const rest = segments.slice(1).join('/')
    const file = /\.[a-z]+$/.test(rest) ? rest : `${rest}.js`
    return route.fulfill({
      body: readJs(join(packagesDist, pkg, 'dist', file)),
      contentType: 'text/javascript; charset=utf-8',
    })
  })
  await page.route('**/__oas-icons-icons__/**', (route) => {
    const rel = route.request().url().split('/__oas-icons-icons__/')[1]?.split('?')[0] ?? ''
    const file = /\.[a-z]+$/.test(rel) ? rel : `${rel}.js`
    return route.fulfill({
      body: readJs(join(packagesDist, 'icons/dist/icons', file)),
      contentType: 'text/javascript; charset=utf-8',
    })
  })
}

/** 收集 console error 与页面异常 */
function collectErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

/** IIFE 页面骨架：popconfirm（默认触发钮）+ empty，加载指定 dist bundle（classic script：顶层 var OASUI 挂全局，与真实 <script src> 语义一致）。
 *  先 goto 一次真实页面锚定 origin——setContent 后根相对模块说明符（/__oas-i18n-esm__/…）才能解析（about:blank 下抛 Failed to resolve）。 */
async function openIifePage(page: import('@playwright/test').Page, bundle: string): Promise<void> {
  await page.goto('/404.html')
  await page.setContent(`<!doctype html><html lang="zh-CN"><body style="margin:0">
    <oas-popconfirm id="pc" title="删除该部门？"><oas-button data-testid="trigger">删除</oas-button></oas-popconfirm>
    <oas-empty id="empty"></oas-empty>
  </body></html>`)
  await page.addScriptTag({ path: join(UI_ROOT, bundle) })
  await page.waitForFunction(() => !!customElements.get('oas-popconfirm'))
}

/** 读 popconfirm 面板按钮文案（按钮常驻 shadow，打开后真实可见）+ empty 兜底文案（.title-text） */
function readTexts(page: import('@playwright/test').Page): Promise<{ ok: string; cancel: string; empty: string }> {
  return page.evaluate(() => {
    const pc = document.querySelector('#pc') as HTMLElement & { shadowRoot: ShadowRoot }
    const empty = document.querySelector('#empty') as HTMLElement & { shadowRoot: ShadowRoot }
    const ok = pc.shadowRoot.querySelector<HTMLElement>('[part="ok"] .ok-label')
    const cancel = pc.shadowRoot.querySelector<HTMLElement>('[part="cancel"]')
    const emptyText = empty.shadowRoot.querySelector<HTMLElement>('[part="description"]')?.textContent ?? ''
    return { ok: ok?.textContent ?? '', cancel: cancel?.textContent ?? '', empty: emptyText }
  })
}

test('cdn.js IIFE：setLocale 存在且导出面不扩大；popconfirm/empty 中文→英文→中文即时刷新', async ({ page }) => {
  const errors = collectErrors(page)
  await mockI18nEsm(page)
  await openIifePage(page, 'dist/cdn.js')

  // 导出面：只新增 setLocale，不导出 loadLocale / t / onLocaleChange / registerLocale 等其余 registry API
  const surface = await page.evaluate(() => ({
    setLocale:
      typeof (globalThis as Record<string, unknown>).OASUI === 'object'
        ? typeof ((globalThis as Record<string, unknown>).OASUI as Record<string, unknown>).setLocale
        : 'no-oasui',
    loadLocale: ((globalThis as Record<string, unknown>).OASUI as Record<string, unknown> | undefined)?.loadLocale,
    t: ((globalThis as Record<string, unknown>).OASUI as Record<string, unknown> | undefined)?.t,
    onLocaleChange: ((globalThis as Record<string, unknown>).OASUI as Record<string, unknown> | undefined)
      ?.onLocaleChange,
    registerLocale: ((globalThis as Record<string, unknown>).OASUI as Record<string, unknown> | undefined)
      ?.registerLocale,
  }))
  expect(surface.setLocale, 'IIFE 应暴露 OASUI.setLocale').toBe('function')
  expect(surface.loadLocale, 'loadLocale 不得进入 IIFE 导出面').toBeUndefined()
  expect(surface.t, 't 不得进入 IIFE 导出面').toBeUndefined()
  expect(surface.onLocaleChange, 'onLocaleChange 不得进入 IIFE 导出面').toBeUndefined()
  expect(surface.registerLocale, 'registerLocale 不得进入 IIFE 导出面').toBeUndefined()

  // 打开 popconfirm（真实可见），默认中文
  await page.locator('[data-testid="trigger"]').click()
  await expect(page.locator('#pc .popover')).toBeVisible()
  expect(await readTexts(page)).toEqual({ ok: '确定', cancel: '取消', empty: '暂无数据' })

  // 英文：动态 import 同版本纯数据 en.js（真实 dist 文件，含相对 locales/en.js）→ setLocale(module.default)
  await page.evaluate(async () => {
    const specifier = '/__oas-i18n-esm__/en.js'
    const mod = (await import(specifier)) as { default: { name: string } }
    ;((globalThis as Record<string, unknown>).OASUI as { setLocale: (l: unknown) => unknown }).setLocale(mod.default)
  })
  expect(await readTexts(page)).toEqual({ ok: 'OK', cancel: 'Cancel', empty: 'No data' })

  // 无 raw key：面板与 empty 均不出现未翻译 key
  const raw = await page.evaluate(() => {
    const pc = document.querySelector('#pc') as HTMLElement & { shadowRoot: ShadowRoot }
    const empty = document.querySelector('#empty') as HTMLElement & { shadowRoot: ShadowRoot }
    const all = `${pc.shadowRoot.textContent}${empty.shadowRoot.textContent}`
    return ['popconfirm.ok', 'popconfirm.cancel', 'empty.noData'].filter((k) => all.includes(k))
  })
  expect(raw, '不应出现未翻译 raw key').toEqual([])

  // 切回中文（按名）：已注册默认包，同步生效且面板仍开着
  await page.evaluate(() => {
    ;((globalThis as Record<string, unknown>).OASUI as { setLocale: (l: string) => unknown }).setLocale('zh-CN')
  })
  expect(await readTexts(page)).toEqual({ ok: '确定', cancel: '取消', empty: '暂无数据' })
  await expect(page.locator('#pc .popover')).toBeVisible()

  expect(errors, '全程无 console error / pageerror').toEqual([])
})

test('ESM 主入口（dist/index.js）真实导入：namespace 只含 setLocale，注册组件并可切换文案', async ({ page }) => {
  const errors = collectErrors(page)
  await mockI18nEsm(page)
  await mockUiEsm(page)
  await page.goto('/404.html')
  // 正文预置组件——import dist/index.js 即注册并升级（中文默认）；裸导入由路由层重写解析
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <oas-popconfirm id="pc" title="删除该部门？"><oas-button>删除</oas-button></oas-popconfirm>
    <oas-empty id="empty"></oas-empty>
  </body></html>`)

  // 真实动态 import 实际构建产物 dist/index.js（浏览器解析全部裸导入与相对导入）
  const surface = await page.evaluate(async () => {
    const specifier = '/__oas-ui-esm__/index.js'
    const mod = (await import(specifier)) as unknown as Record<string, unknown>
    ;(globalThis as Record<string, unknown>).__esmIndex = mod
    return { names: Object.keys(mod).sort(), setLocaleType: typeof mod.setLocale }
  })
  expect(surface.setLocaleType, 'ESM 主入口应导出 setLocale').toBe('function')
  const banned = [
    'loadLocale',
    't',
    'onLocaleChange',
    'registerLocale',
    'getLocale',
    'getLocaleName',
    'getDirection',
    // 已知语言包/内部导出不得泄漏进主入口
    'en',
    'zhCN',
  ]
  for (const name of banned) {
    expect(surface.names, `ESM 主入口不得导出 ${name}`).not.toContain(name)
  }
  expect(await readTexts(page)).toEqual({ ok: '确定', cancel: '取消', empty: '暂无数据' })

  // ESM setLocale × 同一条真实 en.js 纯数据链路：组件内置文案跟切
  await page.evaluate(async () => {
    const enSpecifier = '/__oas-i18n-esm__/en.js'
    const en = (await import(enSpecifier)) as { default: unknown }
    ;((globalThis as Record<string, unknown>).__esmIndex as { setLocale: (l: unknown) => unknown }).setLocale(
      en.default,
    )
  })
  expect(await readTexts(page)).toEqual({ ok: 'OK', cancel: 'Cancel', empty: 'No data' })

  // 按名切回中文（同步）
  await page.evaluate(() => {
    ;((globalThis as Record<string, unknown>).__esmIndex as { setLocale: (l: string) => unknown }).setLocale('zh-CN')
  })
  expect(await readTexts(page)).toEqual({ ok: '确定', cancel: '取消', empty: '暂无数据' })
  expect(errors, '全程无 console error / pageerror').toEqual([])
})

test('（补充）ESM 主入口静态文本：setLocale 透传存在、其余 registry API 零出现', async () => {
  const src = readFileSync(join(UI_ROOT, 'dist/index.js'), 'utf8')
  expect(src).toMatch(/export\s*\{[^}]*\bsetLocale\b[^}]*\}/)
  for (const banned of [
    'loadLocale',
    'onLocaleChange',
    'registerLocale',
    'getLocale',
    'getLocaleName',
    'getDirection',
  ]) {
    expect(src.includes(banned), `主入口不得导出 ${banned}`).toBe(false)
  }
})

test('CDN 族包（feedback.js）同样暴露 OASUI.setLocale（导出抽验）', async ({ page }) => {
  await openIifePage(page, 'dist/cdn/feedback.js')
  const has = await page.evaluate(() => {
    const oasui = (globalThis as Record<string, unknown>).OASUI as Record<string, unknown> | undefined
    return { setLocale: typeof oasui?.setLocale, loadLocale: oasui?.loadLocale }
  })
  expect(has.setLocale, '族包应暴露 OASUI.setLocale').toBe('function')
  expect(has.loadLocale, '族包导出面同样不得扩大').toBeUndefined()
})
