import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderToString, WHITELIST } from '@oas-ui/ssr'

// DSD 静态页 e2e 验收（PRD v1.9，四条）：
//   1. 禁 JS 可视：渲染器产出的 DSD 快照解析即附加 shadow root、结构样式完整可见
//   2. upgrade 无错：注入 ui bundle 后组件升级复用 declarative shadow root，
//      无 NotSupportedError、console 零 error
//   3. 无闪动：upgrade 前后宿主布局（boundingClientRect）一致
//   4. 事件可触发：upgrade 后点击 oas-button 派发 oas-click
// 独立路线：不依赖 docs 站点，用 file:// 加载本 spec 生成的静态页。
//
// 产物（bundle / 静态页 / 截图）放系统临时目录，不入仓库。

// packages/ui -> 仓库根
const REPO_ROOT = resolve(import.meta.dirname, '..', '..')
const ARTIFACT_DIR = join(tmpdir(), 'opencode', 'oas-ssr-dsd-e2e')
const UI_BUNDLE = join(ARTIFACT_DIR, 'ui.js')
const DSD_PAGE = join(ARTIFACT_DIR, 'index.html')
const DSD_PAGE_URL = pathToFileURL(DSD_PAGE).href
const SCREENSHOT = {
  noJs: join(ARTIFACT_DIR, 'dsd-01-no-js.png'),
  beforeUpgrade: join(ARTIFACT_DIR, 'dsd-02-before-upgrade.png'),
  afterUpgrade: join(ARTIFACT_DIR, 'dsd-03-after-upgrade.png'),
}

let dsdHtml = ''

/** 测量组件闪动治理专用 DSD 页面：oas-affix 手工构造快照（非白名单，渲染器不可产，故手工拼 DSD template）。 */
const AFFIX_DSD_PAGE = join(ARTIFACT_DIR, 'affix-dsd.html')
const AFFIX_DSD_PAGE_URL = pathToFileURL(AFFIX_DSD_PAGE).href

/** 测量组件闪动治理 e2e 依赖：affix 组件在真实浏览器里按布局校正，需 ui bundle 已构建 */
function buildAffixDsdPage(): void {
  // 快照语义：SSR 端（happy-dom）getBoundingClientRect 恒 0 → rect.top=0 <= offset=100 → 吸顶，
  // 故快照含 .fixed + top:100px。真实浏览器里 affix 位于 body padding-top 之下（rect.top≈200 > offset）
  // → 真实布局不吸顶。治理后 upgrade 首帧保持快照态（fixed、rect.top=100），rAF 后才移除 fixed。
  const affixSnap = `
<oas-affix offset="100">
  <template shadowrootmode="open">
    <meta data-oas-ssr="oas-affix" data-oas-ssr-v="1">
    <style>
      :host { display: block; font-family: inherit; }
      .wrap { display: inline-block; }
      .wrap.fixed { position: fixed; z-index: 1020; }
    </style>
    <div class="wrap fixed" part="wrap" style="top: 100px"><slot></slot></div>
  </template>
  <span>吸顶导航</span>
</oas-affix>`
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>OAS-UI 测量组件闪动治理验收</title>
</head>
<body style="font-family: system-ui, sans-serif; padding: 200px 24px;">
  <div style="height: 1200px;">
    ${affixSnap}
    <p>滚动测试占位内容</p>
  </div>
</body>
</html>`
  writeFileSync(AFFIX_DSD_PAGE, html, 'utf8')
}

/** 用仓库内的 vite 把 @oas-ui/ui 主入口打成单文件 ESM bundle（workspace 依赖全部内联） */
function buildUiBundle(): string {
  const uiEntry = join(REPO_ROOT, 'packages', 'ui', 'dist', 'index.js')
  if (!existsSync(uiEntry)) {
    throw new Error(
      `[ssr-dsd] 缺少 ${uiEntry}：请先执行 pnpm --filter @oas-ui/ui build 再跑 e2e`,
    )
  }
  const viteCli = join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(viteCli)) {
    throw new Error(`[ssr-dsd] 未找到 vite CLI：${viteCli}`)
  }
  const configFile = join(ARTIFACT_DIR, 'vite.config.mjs')
  const cfg = [
    'export default {',
    `  root: ${JSON.stringify(REPO_ROOT.replaceAll('\\', '/'))},`,
    '  configFile: false,',
    "  logLevel: 'silent',",
    '  build: {',
    `    lib: { entry: ${JSON.stringify(uiEntry.replaceAll('\\', '/'))}, formats: ['es'], fileName: () => 'ui.js' },`,
    `    outDir: ${JSON.stringify(ARTIFACT_DIR.replaceAll('\\', '/'))},`,
    '    emptyOutDir: false,',
    '    minify: false,',
    '    sourcemap: false,',
    '  },',
    '}',
  ].join('\n')
  writeFileSync(configFile, cfg, 'utf8')
  const r = spawnSync(process.execPath, [viteCli, 'build', '--config', configFile], {
    encoding: 'utf8',
  })
  if (r.status !== 0 || !existsSync(UI_BUNDLE)) {
    throw new Error(
      `[ssr-dsd] vite 单文件 bundle 构建失败（status=${r.status}）：\n${r.stdout}\n${r.stderr}`,
    )
  }
  return UI_BUNDLE
}

test.beforeAll(async () => {
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  // —— 1) 构建单文件 ESM bundle（浏览器注入用） ——
  buildUiBundle()

  // —— 2) 用渲染器产出白名单组件 DSD 快照，拼成完整静态页 ——
  // theme CSS：快照 shadow 内联样式引用 --oas-* token（定义在 @oas-ui/theme 的 :root），
  // 页面必须内联 theme CSS 否则禁 JS 渲染时组件无色（此前缺陷：按钮灰黑无字色、tag 无胶囊样式）。
  // @oas-ui/theme 无构建产物（main 直指 src），直接读源文件。
  const themeCssPath = join(REPO_ROOT, 'packages', 'theme', 'src', 'index.css')
  const themeCss = readFileSync(themeCssPath, 'utf8')
  const [btn, tag, empty, divider, text, title, para, table] = await Promise.all([
    renderToString('oas-button', { type: 'primary', 'data-esc': 'a"&<>b' }, '确定'),
    renderToString('oas-tag', { type: 'success', size: 'large' }, '进行中'),
    renderToString('oas-empty', { description: '暂无数据' }),
    renderToString('oas-divider', { 'content-position': 'left' }, '分割线'),
    renderToString('oas-text', { type: 'secondary' }, '次要文本'),
    renderToString('oas-title', { level: '2' }, '二级标题'),
    renderToString('oas-paragraph', {}, '段落正文'),
    renderToString(
      'oas-table',
      {
        columns: JSON.stringify([
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'Age' },
        ]),
        data: JSON.stringify([
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ]),
        'row-key': 'name',
      },
      '',
      { locale: 'zh-CN' },
    ),
  ])
  dsdHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>OAS-UI DSD 静态快照验收页</title>
  <style>${themeCss}</style>
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
${[btn, tag, empty, divider, text, title, para, table].join('\n')}
</body>
</html>`
  writeFileSync(DSD_PAGE, dsdHtml, 'utf8')

  // —— 3) 测量组件闪动治理：oas-affix 手工构造 DSD 快照场景 ——
  buildAffixDsdPage()
})

async function openPage(page: Page): Promise<void> {
  await page.goto(DSD_PAGE_URL, { waitUntil: 'load' })
}

/** 注入 ui bundle 并等待白名单组件全部 upgrade */
async function upgradeUi(page: Page): Promise<void> {
  await page.addScriptTag({ path: UI_BUNDLE, type: 'module' })
  await page.evaluate(async (tags) => {
    const w = window as Window & { customElements: CustomElementRegistry }
    await Promise.all(tags.map((t) => w.customElements.whenDefined(t)))
  }, [...WHITELIST])
  await page.waitForTimeout(300)
}

/** 各白名单宿主元素的 boundingClientRect 快照（2 位小数，排除浮点噪声） */
function layoutOf(page: Page): Promise<Record<string, { x: number; y: number; w: number; h: number }>> {
  return page.evaluate((tags) => {
    const round2 = (n: number): number => Math.round(n * 100) / 100
    const out: Record<string, { x: number; y: number; w: number; h: number }> = {}
    for (const t of tags) {
      const el = document.querySelector(t)
      if (!el) continue
      const r = el.getBoundingClientRect()
      out[t] = { x: round2(r.x), y: round2(r.y), w: round2(r.width), h: round2(r.height) }
    }
    return out
  }, [...WHITELIST])
}

/** #0b6cff -> rgb(11, 108, 255)（比较 getComputedStyle 的色值用；不支持 8 位 hex 的 alpha） */
function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`非法 hex 色值：${hex}`)
  const n = parseInt(m[1]!, 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

test('禁 JS 可视：DSD 快照解析即附加 shadow root 并渲染关键结构', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await openPage(page)

  // 无 JS、无 bundle：shadow root 已由 declarative shadow DOM 解析附加
  const shadowReady = await page.evaluate((tags) => {
    const out: Record<string, boolean> = {}
    for (const t of tags) {
      const el = document.querySelector(t)
      out[t] = el !== null && el.shadowRoot !== null
    }
    return out
  }, [...WHITELIST])
  for (const t of WHITELIST) {
    expect(shadowReady[t], `${t} 的 shadow root 应已附加`).toBe(true)
  }

  // 关键结构：oas-button 的 button[part=button]、oas-empty 的 description 文案、oas-title 的 h2
  const structure = await page.evaluate(() => {
    const btnHost = document.querySelector('oas-button')
    const emptyHost = document.querySelector('oas-empty')
    const titleHost = document.querySelector('oas-title')
    const btn = btnHost?.shadowRoot?.querySelector('button[part="button"]')
    const desc = emptyHost?.shadowRoot?.querySelector('[part="description"]')
    const h2 = titleHost?.shadowRoot?.querySelector('h2[part="title"]')
    return {
      hasButton: btn !== null && btn !== undefined,
      emptyDesc: desc?.textContent ?? '',
      titleTag: h2?.tagName ?? '',
    }
  })
  expect(structure.hasButton).toBe(true)
  expect(structure.emptyDesc).toBe('暂无数据')
  expect(structure.titleTag).toBe('H2')

  // 快照属性无逃逸：含引号/尖括号/& 的属性值在页面解析后原样还原
  expect(await page.locator('oas-button').first().getAttribute('data-esc')).toBe('a"&<>b')

  // 禁 JS 下 token 颜色可见：theme CSS 已内联，shadow 内 var(--oas-*) 应解析到同页 :root 的 token 值。
  // （此前 fixture 缺 theme CSS，按钮灰黑无字色、tag 无胶囊样式——token 解析失败回落到透明。）
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const btn = document.querySelector('oas-button')?.shadowRoot?.querySelector('button[part="button"]')
    const tag = document.querySelector('oas-tag')?.shadowRoot?.querySelector('.tag')
    const btnBg = btn ? getComputedStyle(btn).backgroundColor : ''
    const tagColor = tag ? getComputedStyle(tag).color : ''
    // alpha 通道：rgb(...) 视为 1，rgba(...,a) 取 a；rgba(0,0,0,0)=透明
    const alpha = (c: string): number => {
      const m = /rgba?\(([^)]+)\)/.exec(c)
      if (!m) return 0
      const parts = m[1]!.split(',').map((s) => s.trim())
      return parts.length === 4 ? Number(parts[3]) : 1
    }
    return {
      primary: root.getPropertyValue('--oas-color-primary').trim(),
      success: root.getPropertyValue('--oas-color-success').trim(),
      btnBg,
      tagColor,
      btnAlpha: btn ? alpha(btnBg) : 0,
      tagAlpha: tag ? alpha(tagColor) : 0,
    }
  })
  // theme CSS 已内联：:root 上 token 有解析值
  expect(colors.primary).not.toBe('')
  expect(colors.success).not.toBe('')
  // oas-button(type=primary) 底色 = --oas-color-primary 同页解析值，且非透明
  expect(colors.btnBg).toBe(hexToRgb(colors.primary))
  expect(colors.btnAlpha).toBeGreaterThan(0)
  // oas-tag(type=success) 文字色 = --oas-color-success 同页解析值，且非透明
  expect(colors.tagColor).toBe(hexToRgb(colors.success))
  expect(colors.tagAlpha).toBeGreaterThan(0)

  // 禁 JS 下无未捕获异常
  expect(pageErrors).toEqual([])
  await page.screenshot({ path: SCREENSHOT.noJs, fullPage: true })
})

test('upgrade 无错：注入 ui bundle 后升级复用 DSD root，无 NotSupportedError、console 零 error', async ({
  page,
}) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  await openPage(page)
  await upgradeUi(page)

  // 重点：无 NotSupportedError（attachShadow 二次调用），也无任何未捕获异常
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('真水合：upgrade 后 shadow 未被重建（style DOM 引用保持同一对象）、指纹移除、布局无闪动', async ({
  page,
}) => {
  await openPage(page)
  const before = await layoutOf(page)
  await page.screenshot({ path: SCREENSHOT.beforeUpgrade, fullPage: true })

  // upgrade 前：确认指纹 meta 存在，并保存 shadow 内 style 元素的 DOM 引用（跨 evaluate 保留）
  const preMeta = await page.evaluate((tags) => {
    const w = window as unknown as Window & { __ssrStyleRef: Record<string, Element | null> }
    w.__ssrStyleRef = {}
    const out: Record<string, boolean> = {}
    for (const t of tags) {
      const shadow = document.querySelector(t)?.shadowRoot
      if (!shadow) continue
      w.__ssrStyleRef[t] = shadow.querySelector('style')
      out[t] = shadow.querySelector('meta[data-oas-ssr]') !== null
    }
    return out
  }, [...WHITELIST])
  for (const t of WHITELIST) {
    expect(preMeta[t], `${t} 水合前 shadow 应含指纹 meta`).toBe(true)
  }

  await upgradeUi(page)

  // upgrade 后：style 仍是同一对象（真水合决定性证据，此前重建路径会产生新元素）+
  // 指纹 meta 已移除（hydrate 成功后清理，防二次误判）
  const postHydrate = await page.evaluate((tags) => {
    const w = window as unknown as Window & { __ssrStyleRef: Record<string, Element | null> }
    const out: Record<string, { sameStyle: boolean; metaRemoved: boolean }> = {}
    for (const t of tags) {
      const shadow = document.querySelector(t)?.shadowRoot
      out[t] = {
        sameStyle: shadow?.querySelector('style') === w.__ssrStyleRef[t],
        metaRemoved: shadow?.querySelector('meta[data-oas-ssr]') === null,
      }
    }
    return out
  }, [...WHITELIST])
  for (const t of WHITELIST) {
    expect(postHydrate[t]!.sameStyle, `${t} 真水合：style 应保持同一 DOM 对象`).toBe(true)
    expect(postHydrate[t]!.metaRemoved, `${t} 指纹 meta 应被移除`).toBe(true)
  }

  const after = await layoutOf(page)
  expect(after).toEqual(before)
  await page.screenshot({ path: SCREENSHOT.afterUpgrade, fullPage: true })
})

test('事件可触发且无重复绑定：upgrade 后逐次点击 oas-button，oas-click 恰好每次派发一次', async ({
  page,
}) => {
  await openPage(page)
  await upgradeUi(page)

  await page.evaluate(() => {
    const w = window as unknown as Window & { __oasClicks: unknown[] }
    w.__oasClicks = []
    const el = document.querySelector('oas-button')
    el?.addEventListener('oas-click', (e: Event) => w.__oasClicks.push((e as CustomEvent).detail))
  })

  const clickCount = (): Promise<number> =>
    page.evaluate(() => (window as unknown as Window & { __oasClicks: unknown[] }).__oasClicks.length)

  // 真实鼠标点击 shadow 内的 button（Playwright locator 自动穿透 open shadow root）。
  // 双击两次各恰好派发一次：若事件被重复绑定，第一次点击就会累计 >1 而 poll 永不等于目标值。
  await page.locator('oas-button').locator('button').click()
  await expect.poll(clickCount).toBe(1)
  await page.locator('oas-button').locator('button').click()
  await expect.poll(clickCount).toBe(2)
})

test('渲染器边界：非白名单抛错、快照属性完整 HTML 转义、快照含真水合指纹', async () => {
  await expect(renderToString('oas-tree', { columns: '[]' })).rejects.toThrow(/非白名单/)
  const snap = await renderToString('oas-button', { type: 'primary', 'data-esc': 'a"&<>b' }, '确定')
  expect(snap).toContain('data-esc="a&quot;&amp;&lt;&gt;b"')
  expect(snap).toContain('<template shadowrootmode="open">')
  // 真水合指纹：shadow 内容最前面（style 之前）的 data-oas-ssr meta，值为对应 tag
  expect(snap).toContain('<meta data-oas-ssr="oas-button" data-oas-ssr-v="1">')
  expect(snap.indexOf('<meta data-oas-ssr="oas-button" data-oas-ssr-v="1">')).toBeLessThan(
    snap.indexOf('<style>'),
  )
})

/**
 * 测量组件闪动治理（PRD v1.9）：affix 在 DSD 快照场景 upgrade 后首帧无布局跳动。
 *
 * 快照语义：SSR 端（happy-dom）测量全 0 → 快照含 .fixed + top:100px（吸顶态）；
 * 真实浏览器里 affix 位于 body padding-top 之下（rect.top≈200 > offset=100）→ 真实布局不吸顶。
 *
 * 治理断言（两段式，确定性时序）：
 * 1. upgrade 首帧（同一微任务内、rAF 之前）：.wrap 仍是快照态——fixed class 保留、rect.top 仍是 100，
 *    即 hydrate 后首帧与快照一致、无跳动（未经治理的版本此时会立即移除 fixed，rect.top 跳到 200+）；
 * 2. 下一帧（rAF 校正）：按真实布局移除 fixed，rect.top 回到自然文档流位置。
 * 另断言水合接管成功：shadow 未重建（style 引用保持）、指纹 meta 已移除、console 零 error。
 */
test('测量组件闪动治理：affix upgrade 首帧与快照一致、rAF 后按真实布局校正', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  await page.goto(AFFIX_DSD_PAGE_URL, { waitUntil: 'load' })

  // upgrade 前：快照态 rect（.fixed 生效，wrap 位于 fixed top:100px）
  const snapshot = await page.evaluate(() => {
    const wrap = document
      .querySelector('oas-affix')!
      .shadowRoot!.querySelector<HTMLElement>('.wrap')!
    const styleEl = document
      .querySelector('oas-affix')!
      .shadowRoot!.querySelector('style')!
    return {
      fixed: wrap.classList.contains('fixed'),
      top: Math.round(wrap.getBoundingClientRect().top),
      hasMeta: document.querySelector('oas-affix')!.shadowRoot!.querySelector('meta[data-oas-ssr]') !== null,
      styleRefIsSame: false,
    }
  })
  // 保存 style 引用，供水合后比对（shadow 未重建 → 引用保持）
  snapshot.styleRefIsSame = await page.evaluate(() => {
    const w = window as unknown as Window & { __affixStyleRef?: Element }
    w.__affixStyleRef = document
      .querySelector('oas-affix')!
      .shadowRoot!.querySelector('style')
    return true
  })
  expect(snapshot.fixed).toBe(true)
  expect(snapshot.hasMeta).toBe(true)

  // 注入 bundle（Blob URL 动态 import，与 evaluate 同上下文同步触发 upgrade，
  // 可在同一微任务内、rAF 之前读到 upgrade 首帧状态）
  const bundleSrc = readFileSync(UI_BUNDLE, 'utf8')
  const result = await page.evaluate(async (src: string) => {
    const w = window as unknown as Window & { __affixStyleRef?: Element }
    const blob = new Blob([src], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    await import(url)
    await customElements.whenDefined('oas-affix')

    const wrap = document
      .querySelector('oas-affix')!
      .shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // —— upgrade 首帧：rAF 之前同步读 ——
    const firstFrame = {
      fixed: wrap.classList.contains('fixed'),
      top: Math.round(wrap.getBoundingClientRect().top),
      styleRefSame: document
        .querySelector('oas-affix')!
        .shadowRoot!.querySelector('style') === w.__affixStyleRef,
      metaRemoved:
        document.querySelector('oas-affix')!.shadowRoot!.querySelector('meta[data-oas-ssr]') === null,
    }
    // —— 下一帧：rAF 校正 ——
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    const secondFrame = {
      fixed: wrap.classList.contains('fixed'),
      top: Math.round(wrap.getBoundingClientRect().top),
    }
    return { firstFrame, secondFrame }
  }, bundleSrc)

  // upgrade 无错、console 零 error
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])

  // 水合接管成功：shadow 未重建（style 引用保持）、指纹已移除
  expect(result.firstFrame.styleRefSame).toBe(true)
  expect(result.firstFrame.metaRemoved).toBe(true)

  // 首帧与快照一致、无跳动：fixed 保留、rect.top 仍为 100（= 快照值）
  expect(result.firstFrame.fixed).toBe(true)
  expect(result.firstFrame.top).toBe(snapshot.top)
  // rAF 后按真实布局校正：affix 不吸顶 → 移除 fixed，回到文档流（body padding-top 200px）
  expect(result.secondFrame.fixed).toBe(false)
  expect(result.secondFrame.top).not.toBe(snapshot.top)
  expect(result.secondFrame.top).toBeGreaterThanOrEqual(200)
})
