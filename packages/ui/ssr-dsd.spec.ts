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

/** 测量组件闪动治理专用 DSD 页面：affix/ellipsis/scroll-area 快照由渲染器产出（SSR 未校正态）。 */
const FLICKER_PAGE = join(ARTIFACT_DIR, 'measure-dsd.html')
const FLICKER_PAGE_URL = pathToFileURL(FLICKER_PAGE).href

/** 闪动页 ellipsis 用文本：300px 容器 + 2 行内必然溢出（触发校正） */
const LONG_TEXT = '这是一段特别长的文本用于验证省略组件在真实浏览器中的溢出测量与校正行为，它跨越了不止两行的高度以便触发省略形态的布局写入，内容本身并无实际业务含义。'.repeat(2)

/**
 * 测量组件闪动治理 e2e 依赖：affix/ellipsis/scroll-area 在真实浏览器里按布局校正，需 ui bundle 已构建。
 * 快照由 renderToString 产出（不再手工拼 DSD template），语义：
 *   affix：SSR 端 getBoundingClientRect 恒 0 → rect.top=0 <= offset=100 → 吸顶（.fixed + top:100px）；
 *     真实浏览器里 affix 位于 body padding-top 之下（rect.top≈200 > offset）→ 不吸顶，rAF 后移除 fixed。
 *   ellipsis：SSR 端无溢出判定 → toggle 隐藏、不挂 tooltip；真实浏览器里长文本溢出 2 行 →
 *     rAF 后显示展开按钮并挂 tooltip（快照首帧与 hydrate 后一致，第二帧校正）。
 *   scroll-area：SSR 端溢出测量全 0 → 轨道隐藏；真实浏览器里内容超高视口 → rAF 后垂直轨道可见。
 */
function buildFlickerPage(affixSnap: string, ellipsisSnap: string, scrollAreaSnap: string, themeCss: string): void {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>OAS-UI 测量组件闪动治理验收</title>
  <style>${themeCss}</style>
</head>
<body style="font-family: system-ui, sans-serif; padding: 200px 24px;">
  <div style="height: 1200px;">
    ${affixSnap}
    <div style="width: 300px; margin-top: 24px;">
      ${ellipsisSnap}
    </div>
    <div style="margin-top: 24px;">
      ${scrollAreaSnap}
    </div>
    <p style="margin-top: 24px;">滚动测试占位内容</p>
  </div>
</body>
</html>`
  writeFileSync(FLICKER_PAGE, html, 'utf8')
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

  // 测量组件闪动治理（子活 1）：主页面用「不触发校正」的内容保证布局稳定（真水合断言）——
  // affix 用超大 offset（SSR 端 rect=0 ≤ 9999 恒吸顶，真实浏览器同样恒吸顶 → 无校正、布局稳定）；
  // 闪动页用「触发校正」的内容验证首帧与快照一致 + rAF 校正。
  const affixSnap = await renderToString(
    'oas-affix',
    { offset: '9999' },
    '<span style="display:inline-block;padding:4px 12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-sm)">吸顶导航</span>',
  )
  const ellipsisSnap = await renderToString('oas-ellipsis', { text: '短文本' }, '')
  const scrollAreaSnap = await renderToString(
    'oas-scroll-area',
    { height: '120' },
    '<p>短内容</p>',
  )
  const ellipsisFlickerSnap = await renderToString(
    'oas-ellipsis',
    { text: LONG_TEXT, rows: '2', expandable: 'true' },
    '',
  )
  const scrollAreaFlickerSnap = await renderToString(
    'oas-scroll-area',
    { height: '160' },
    '<div style="height: 500px; background: var(--oas-color-bg-hover)">超高内容</div>',
  )
  const affixFlickerSnap = await renderToString(
    'oas-affix',
    { offset: '100' },
    '<span style="display:inline-block;padding:4px 12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-sm)">吸顶导航</span>',
  )

  const [btn, tag, empty, divider, text, title, para, table, tree, select] = await Promise.all([
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
    renderToString(
      'oas-tree',
      {
        data: JSON.stringify([
          { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
          { key: 'b', label: '节点 B' },
        ]),
        expanded: 'a',
      },
      '',
      { locale: 'zh-CN' },
    ),
    renderToString(
      'oas-select',
      {
        options: JSON.stringify([
          { label: '苹果', value: 'apple' },
          { label: '香蕉', value: 'banana' },
          { label: '橙子', value: 'orange' },
        ]),
        value: 'banana',
        placeholder: '请选择',
      },
      '',
      { locale: 'zh-CN' },
    ),
  ])

  // —— DSD 批次 1：表单组件快照（白名单化后由渲染器产出 DSD） ——
  // 注意：复合组件（checkbox-group/radio-group/form/form-item/dynamic-input）的布局依赖
  // light DOM 子组件升级，fixture 用空内容保证升级前后布局稳定（子组件交互由单测覆盖）。
  const FORM_OPTIONS = JSON.stringify([
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
  ])
  const FORM_TREE_OPTIONS = JSON.stringify([
    { label: '节点 A', value: 'a', children: [{ label: '子节点 1', value: 'a-1' }] },
  ])
  const formSnaps = await Promise.all([
    renderToString('oas-input', { value: '水合输入', placeholder: '请输入' }),
    renderToString('oas-textarea', { value: '多行文本', rows: '3' }),
    renderToString('oas-checkbox', { checked: '' }, '记住我'),
    renderToString('oas-checkbox-group', { value: '["a"]' }),
    renderToString('oas-radio', { checked: '', value: 'a' }, '选项 A'),
    renderToString('oas-radio-group', { value: 'a' }),
    renderToString('oas-switch', { checked: '', size: 'small' }),
    renderToString('oas-slider', { value: '60', min: '0', max: '100' }),
    renderToString('oas-input-number', { value: '12', min: '0', max: '100' }),
    renderToString('oas-rate', { value: '4' }),
    renderToString('oas-auto-complete', { options: FORM_OPTIONS, value: 'apple' }),
    renderToString('oas-combobox', { options: FORM_OPTIONS, value: 'banana' }),
    renderToString('oas-cascader', { options: FORM_TREE_OPTIONS, value: '["a","a-1"]' }),
    renderToString('oas-tree-select', { options: FORM_TREE_OPTIONS, value: 'a' }),
    renderToString('oas-mentions', { options: FORM_OPTIONS, value: '你好 @张' }),
    renderToString('oas-date-picker', { value: '2024-01-15' }, '', { locale: 'zh-CN' }),
    renderToString('oas-time-picker', { value: '12:30:00' }, '', { locale: 'zh-CN' }),
    renderToString('oas-calendar', { value: '2024-02-10' }, '', { locale: 'zh-CN' }),
    renderToString('oas-upload', {}, '', { locale: 'zh-CN' }),
    renderToString(
      'oas-transfer',
      { data: JSON.stringify([{ key: 'a', label: '苹果' }, { key: 'b', label: '香蕉' }]) },
      '',
      { locale: 'zh-CN' },
    ),
    renderToString('oas-color-picker', { value: '#0b6cff' }, '', { locale: 'zh-CN' }),
    renderToString('oas-toggle-button', { pressed: '', value: 'a' }, '白天'),
    renderToString(
      'oas-toggle-group',
      { items: JSON.stringify([{ label: '日', value: 'day' }, { label: '周', value: 'week' }]), value: 'week' },
    ),
    renderToString('oas-pin-input', { value: '123', length: '4' }),
    renderToString('oas-dynamic-input', { 'model-value': '[]' }),
    renderToString('oas-dynamic-tags', { 'model-value': '["标签1"]' }),
    renderToString('oas-editable', { value: '可编辑文本' }),
    renderToString('oas-form-item', { label: '姓名' }),
    renderToString('oas-form', {}),
  ])

  dsdHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>OAS-UI DSD 静态快照验收页</title>
  <style>${themeCss}</style>
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
${[
  btn,
  tag,
  empty,
  divider,
  text,
  title,
  para,
  table,
  affixSnap,
  ellipsisSnap,
  scrollAreaSnap,
  tree,
  select,
  ...formSnaps,
].join('\n')}
</body>
</html>`
  writeFileSync(DSD_PAGE, dsdHtml, 'utf8')

  // —— 3) 测量组件闪动治理：affix/ellipsis/scroll-area 由渲染器产出 DSD 快照场景 ——
  buildFlickerPage(affixFlickerSnap, ellipsisFlickerSnap, scrollAreaFlickerSnap, themeCss)
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
function layoutOf(
  page: Page,
  tags: readonly string[],
): Promise<Record<string, { x: number; y: number; w: number; h: number }>> {
  return page.evaluate((tagList) => {
    const round2 = (n: number): number => Math.round(n * 100) / 100
    const out: Record<string, { x: number; y: number; w: number; h: number }> = {}
    for (const t of tagList) {
      const el = document.querySelector(t)
      if (!el) continue
      const r = el.getBoundingClientRect()
      out[t] = { x: round2(r.x), y: round2(r.y), w: round2(r.width), h: round2(r.height) }
    }
    return out
  }, [...tags])
}

/**
 * 布局稳定性比较集：DSD 批次 1 的复合组件 fixture 用空内容保证升级前后布局稳定，
 * 全部白名单 tag 均参与比较（各组件自身尺寸在升级前后不得变化）。
 */
const LAYOUT_STABLE_TAGS = WHITELIST

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
  const before = await layoutOf(page, LAYOUT_STABLE_TAGS)
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

  const after = await layoutOf(page, LAYOUT_STABLE_TAGS)
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

test('表单组件事件可触发：upgrade 后 oas-input 输入 / oas-switch 切换 / oas-toggle-group 选中 / oas-checkbox 勾选', async ({
  page,
}) => {
  await openPage(page)
  await upgradeUi(page)

  await page.evaluate(() => {
    const w = window as unknown as Window & { __formEvents: Record<string, unknown[]> }
    w.__formEvents = { input: [], switch: [], tg: [], cb: [] }
    document.querySelector('oas-input')?.addEventListener('oas-input', (e: Event) =>
      w.__formEvents.input!.push((e as CustomEvent).detail),
    )
    document.querySelector('oas-switch')?.addEventListener('oas-change', (e: Event) =>
      w.__formEvents.switch!.push((e as CustomEvent).detail),
    )
    document.querySelector('oas-toggle-group')?.addEventListener('oas-change', (e: Event) =>
      w.__formEvents.tg!.push((e as CustomEvent).detail),
    )
    document.querySelector('oas-checkbox')?.addEventListener('oas-change', (e: Event) =>
      w.__formEvents.cb!.push((e as CustomEvent).detail),
    )
  })

  // oas-input：输入框聚焦后敲字 → oas-input 派发（fixture 中 oas-input 多处出现，取首个独立实例）
  const inputEl = page.locator('oas-input').first().locator('input')
  await inputEl.click()
  await inputEl.press('Control+A')
  await inputEl.pressSequentially('abc')
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Window & { __formEvents: Record<string, unknown[]> }).__formEvents.input,
      ),
    )
    .not.toEqual([])

  // oas-switch：点击轨道切换 checked（唯一独立实例）
  await page.locator('oas-switch').first().locator('button').click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Window & { __formEvents: Record<string, unknown[]> }).__formEvents.switch,
      ),
    )
    .toEqual([{ checked: false }])
  await expect(page.locator('oas-switch').first().locator('button')).toHaveAttribute('aria-checked', 'false')

  // oas-toggle-group：点击「周」→ value=week
  await page.locator('oas-toggle-group [part="item"]').nth(1).click()
  await expect(page.locator('oas-toggle-group').first()).toHaveAttribute('value', 'week')

  // oas-checkbox：取消勾选原生 checkbox → oas-change（fixture 初始 checked，uncheck 触发 change）
  await page.locator('oas-checkbox').first().locator('input').uncheck()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Window & { __formEvents: Record<string, unknown[]> }).__formEvents.cb,
      ),
    )
    .not.toEqual([])
})

test('渲染器边界：非白名单抛错、快照属性完整 HTML 转义、快照含真水合指纹', async () => {
  await expect(renderToString('oas-modal', { value: 'x' })).rejects.toThrow(/非白名单/)
  await expect(renderToString('oas-alert')).rejects.toThrow(/非白名单/)
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
 * 测量组件闪动治理（PRD v1.9）：affix/ellipsis/scroll-area 在 DSD 快照场景 upgrade 后首帧无布局跳动。
 *
 * 快照语义（由渲染器产出，SSR 端 happy-dom 布局测量全 0 = 未校正态）：
 * - affix：快照含 .fixed + top:100px（吸顶态）；真实浏览器里 affix 位于 body padding-top 之下
 *   （rect.top≈200 > offset=100）→ 真实布局不吸顶。
 * - ellipsis：快照无溢出态（toggle 隐藏、无 tooltip）；真实浏览器里长文本溢出 2 行 →
 *   校正后显示展开按钮并挂 tooltip。
 * - scroll-area：快照无溢出态（轨道隐藏）；真实浏览器里内容超高视口 → 校正后垂直轨道可见。
 *
 * 治理断言（三段式，确定性时序）：
 * 1. upgrade 首帧（同一微任务内、rAF 之前）保持快照态：
 *    affix 的 .wrap 仍是 .fixed（rect.top=100）、ellipsis 的 toggle 仍隐藏且无 tooltip、
 *    scroll-area 轨道仍不可见——即 hydrate 后首帧与快照一致、无跳动
 *    （未经治理的版本此时会立即写入真实布局态）；
 * 2. 下一帧（rAF 校正）：按真实布局写入——affix 移除 fixed、ellipsis 显示展开按钮 + tooltip、
 *    scroll-area 垂直轨道可见。
 * 另断言水合接管成功：shadow 未重建（style 引用保持）、指纹 meta 已移除、console 零 error。
 */
test('测量组件闪动治理：affix/ellipsis/scroll-area upgrade 首帧与快照一致、rAF 后按真实布局校正', async ({ page }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

  await page.goto(FLICKER_PAGE_URL, { waitUntil: 'load' })

  // upgrade 前：读三个组件的快照态 + 保存 style 引用（供水合后比对）
  const snapshot = await page.evaluate(() => {
    const w = window as unknown as Window & { __flickerStyleRefs: Record<string, Element | null> }
    w.__flickerStyleRefs = {}
    const affixRoot = document.querySelector('oas-affix')!.shadowRoot!
    const ellipsisRoot = document.querySelector('oas-ellipsis')!.shadowRoot!
    const saRoot = document.querySelector('oas-scroll-area')!.shadowRoot!
    w.__flickerStyleRefs['oas-affix'] = affixRoot.querySelector('style')
    w.__flickerStyleRefs['oas-ellipsis'] = ellipsisRoot.querySelector('style')
    w.__flickerStyleRefs['oas-scroll-area'] = saRoot.querySelector('style')
    const affixWrap = affixRoot.querySelector<HTMLElement>('.wrap')!
    const textEl = ellipsisRoot.querySelector<HTMLElement>('.text')!
    const toggleEl = ellipsisRoot.querySelector<HTMLElement>('.toggle')!
    const vTrack = saRoot.querySelector<HTMLElement>('.track-v')!
    const vThumb = saRoot.querySelector<HTMLElement>('[part="thumb-v"]')!
    return {
      affix: {
        fixed: affixWrap.classList.contains('fixed'),
        top: Math.round(affixWrap.getBoundingClientRect().top),
        hasMeta: affixRoot.querySelector('meta[data-oas-ssr]') !== null,
      },
      ellipsis: {
        textClass: textEl.className,
        toggleHidden: toggleEl.hasAttribute('hidden'),
        hasTooltip: ellipsisRoot.querySelector('oas-tooltip') !== null,
        hasMeta: ellipsisRoot.querySelector('meta[data-oas-ssr]') !== null,
      },
      scrollArea: {
        vVisible: vTrack.classList.contains('visible'),
        vPeek: vTrack.classList.contains('peek'),
        thumbHeight: vThumb.style.height,
        hasMeta: saRoot.querySelector('meta[data-oas-ssr]') !== null,
      },
    }
  })
  // 快照 = 未校正态断言
  expect(snapshot.affix.fixed).toBe(true)
  expect(snapshot.affix.hasMeta).toBe(true)
  expect(snapshot.ellipsis.toggleHidden).toBe(true)
  expect(snapshot.ellipsis.hasTooltip).toBe(false)
  expect(snapshot.ellipsis.hasMeta).toBe(true)
  expect(snapshot.scrollArea.vVisible).toBe(false)
  expect(snapshot.scrollArea.vPeek).toBe(false)
  expect(snapshot.scrollArea.thumbHeight).toBe('')
  expect(snapshot.scrollArea.hasMeta).toBe(true)

  // 注入 bundle（Blob URL 动态 import，与 evaluate 同上下文同步触发 upgrade，
  // 可在同一微任务内、rAF 之前读到 upgrade 首帧状态）
  const bundleSrc = readFileSync(UI_BUNDLE, 'utf8')
  const result = await page.evaluate(async (src: string) => {
    const w = window as unknown as Window & { __flickerStyleRefs: Record<string, Element | null> }
    const blob = new Blob([src], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    await import(url)
    await Promise.all([
      customElements.whenDefined('oas-affix'),
      customElements.whenDefined('oas-ellipsis'),
      customElements.whenDefined('oas-scroll-area'),
    ])

    const affixRoot = document.querySelector('oas-affix')!.shadowRoot!
    const ellipsisRoot = document.querySelector('oas-ellipsis')!.shadowRoot!
    const saRoot = document.querySelector('oas-scroll-area')!.shadowRoot!
    const affixWrap = affixRoot.querySelector<HTMLElement>('.wrap')!
    const textEl = ellipsisRoot.querySelector<HTMLElement>('.text')!
    const toggleEl = ellipsisRoot.querySelector<HTMLElement>('.toggle')!
    const vTrack = saRoot.querySelector<HTMLElement>('.track-v')!
    const vThumb = saRoot.querySelector<HTMLElement>('[part="thumb-v"]')!
    const styleSame = (tag: string): boolean =>
      document.querySelector(tag)!.shadowRoot!.querySelector('style') === w.__flickerStyleRefs[tag]
    // —— upgrade 首帧：rAF 之前同步读 ——
    const firstFrame = {
      affix: {
        fixed: affixWrap.classList.contains('fixed'),
        top: Math.round(affixWrap.getBoundingClientRect().top),
        styleRefSame: styleSame('oas-affix'),
        metaRemoved: affixRoot.querySelector('meta[data-oas-ssr]') === null,
      },
      ellipsis: {
        textClass: textEl.className,
        toggleHidden: toggleEl.hasAttribute('hidden'),
        hasTooltip: ellipsisRoot.querySelector('oas-tooltip') !== null,
        styleRefSame: styleSame('oas-ellipsis'),
        metaRemoved: ellipsisRoot.querySelector('meta[data-oas-ssr]') === null,
      },
      scrollArea: {
        vVisible: vTrack.classList.contains('visible'),
        vPeek: vTrack.classList.contains('peek'),
        thumbHeight: vThumb.style.height,
        styleRefSame: styleSame('oas-scroll-area'),
        metaRemoved: saRoot.querySelector('meta[data-oas-ssr]') === null,
      },
    }
    // —— 下一帧：rAF 校正 ——
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    const secondFrame = {
      affix: {
        fixed: affixWrap.classList.contains('fixed'),
        top: Math.round(affixWrap.getBoundingClientRect().top),
      },
      ellipsis: {
        toggleHidden: toggleEl.hasAttribute('hidden'),
        hasTooltip: ellipsisRoot.querySelector('oas-tooltip') !== null,
      },
      scrollArea: {
        vVisible: vTrack.classList.contains('visible'),
        vPeek: vTrack.classList.contains('peek'),
        thumbHeight: vThumb.style.height,
      },
    }
    return { firstFrame, secondFrame }
  }, bundleSrc)

  // upgrade 无错、console 零 error
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])

  // 水合接管成功：shadow 未重建（style 引用保持）、指纹已移除
  expect(result.firstFrame.affix.styleRefSame).toBe(true)
  expect(result.firstFrame.affix.metaRemoved).toBe(true)
  expect(result.firstFrame.ellipsis.styleRefSame).toBe(true)
  expect(result.firstFrame.ellipsis.metaRemoved).toBe(true)
  expect(result.firstFrame.scrollArea.styleRefSame).toBe(true)
  expect(result.firstFrame.scrollArea.metaRemoved).toBe(true)

  // 首帧与快照一致、无跳动：
  expect(result.firstFrame.affix.fixed).toBe(true)
  expect(result.firstFrame.affix.top).toBe(snapshot.affix.top)
  expect(result.firstFrame.ellipsis.textClass).toBe(snapshot.ellipsis.textClass)
  expect(result.firstFrame.ellipsis.toggleHidden).toBe(true)
  expect(result.firstFrame.ellipsis.hasTooltip).toBe(false)
  expect(result.firstFrame.scrollArea.vVisible).toBe(false)
  expect(result.firstFrame.scrollArea.vPeek).toBe(false)

  // rAF 后按真实布局校正：
  // affix 不吸顶 → 移除 fixed，回到文档流（body padding-top 200px）
  expect(result.secondFrame.affix.fixed).toBe(false)
  expect(result.secondFrame.affix.top).not.toBe(snapshot.affix.top)
  expect(result.secondFrame.affix.top).toBeGreaterThanOrEqual(200)
  // ellipsis 溢出 → 展开按钮显示 + tooltip 挂载
  expect(result.secondFrame.ellipsis.toggleHidden).toBe(false)
  expect(result.secondFrame.ellipsis.hasTooltip).toBe(true)
  // scroll-area 溢出 → 垂直轨道可见（thumb 写入尺寸）
  expect(result.secondFrame.scrollArea.vVisible).toBe(true)
  expect(result.secondFrame.scrollArea.vPeek).toBe(true)
  expect(result.secondFrame.scrollArea.thumbHeight).not.toBe('')
})
