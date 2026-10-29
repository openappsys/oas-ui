// 复核回归：back-top——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('back-top append-to 不触发 SSR 水合告警（组件 chunk 先于水合 chunk 到达的竞态时序）', async ({ page }) => {
  // 缺陷回归：connectedCallback 即时把宿主 teleport 进 append-to 容器，组件 chunk
  // （customElements.define）先于页面 chunk（Vue mount 水合链）到达时，水合在 SSR
  // 原位置找不到节点 → console error「Hydration completed but contains mismatches.」。
  // 修复：teleport 推迟到文档 load 后（水合必然已完成）。此处反向延迟页面 chunk
  // （2500ms > 组件 chunk ~1MB 的本地传输耗时）强制「先升级后水合」的竞态时序。
  const errs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  await page.route(/components_back-top\.md\..*\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })
  await page.goto('/components/back-top.html', { waitUntil: 'load' })
  // 等竞态时序完整走完：页面 chunk 到达 → mount/水合 → onMounted 注册组件 → 升级 → teleport
  await page.waitForFunction(() => !!document.querySelector('#bt-app-root > oas-back-top'), null, {
    timeout: 15000,
  })

  const hydrationErrs = errs.filter((e) => /[Hh]ydration/.test(e))
  expect(hydrationErrs, '竞态时序下 console 不得出现水合 mismatch error').toEqual([])
})

test('back-top 暗色页面三种 theme 变体真实 computed 外观（light 是浅色表面、不隐式继承）', async ({
  page,
}, testInfo) => {
  // 回归：`[data-theme="light"]` 自本版起是真实生效的全局浅色规则（此前只在 :root/:host 上
  // 无对手，组件默认 data-theme=light 看起来像「跟随页面」）。默认 theme=light 在 html.dark
  // 页面因此渲染为浅色表面——这是文档既有语义（light=浅色表面），必须显式锁住，避免被
  // 误当回归改回隐式继承；同时锁 primary/dark 两变体在暗色下的真实取值与可读性（dark 是
  // 自动反色变体，暗色页呈亮底深字，不能用于取得深色外观）。
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/back-top.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-back-top'), undefined, { timeout: 15000 })
  const raw = await page.evaluate(async () => {
    document.documentElement.classList.add('dark')
    document.documentElement.removeAttribute('data-theme')
    document.getElementById('bt-theme-stage')?.remove()
    const stage = document.createElement('div')
    stage.id = 'bt-theme-stage'
    stage.style.cssText =
      'position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;gap:24px;background:var(--vp-c-bg)'
    for (const [id, theme] of [
      ['bt-dark-light', 'light'],
      ['bt-dark-primary', 'primary'],
      ['bt-dark-dark', 'dark'],
    ] as const) {
      const el = document.createElement('oas-back-top')
      el.id = id
      el.setAttribute('visible', '')
      el.setAttribute('theme', theme)
      el.style.position = 'static'
      stage.appendChild(el)
    }
    document.body.appendChild(stage)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const read = (id: string) => {
      const host = document.getElementById(id) as HTMLElement
      const btn = host.shadowRoot!.querySelector<HTMLElement>('[part="btn"]')!
      const cs = getComputedStyle(btn)
      return {
        hostTheme: host.getAttribute('data-theme'),
        bg: cs.backgroundColor,
        fg: cs.color,
        border: cs.borderTopColor,
        borderRadius: cs.borderTopLeftRadius,
      }
    }
    return {
      rootBg: getComputedStyle(document.documentElement).getPropertyValue('--oas-color-bg').trim(),
      rootIsDark: document.documentElement.classList.contains('dark'),
      pageBg: getComputedStyle(document.getElementById('bt-theme-stage')!).backgroundColor,
      light: read('bt-dark-light'),
      primary: read('bt-dark-primary'),
      dark: read('bt-dark-dark'),
    }
  })

  // 前提：页面确实是暗色（防止测试在浅色页面空跑成假绿）
  expect(raw.rootIsDark).toBe(true)
  expect(raw.rootBg).toBe('#18181b')
  expect(raw.pageBg).toBe('rgb(27, 27, 31)')

  // light（默认）在暗色页 = 浅色表面：白底深字，显式规则生效而非继承暗色
  expect(raw.light).toMatchObject({
    hostTheme: 'light',
    bg: 'rgb(255, 255, 255)',
    fg: 'rgb(24, 24, 27)',
    border: 'rgb(228, 228, 231)',
  })
  // primary 无自身主题块：继承页面暗色 token（暗色 primary 亮蓝 + 深色 on 字）
  expect(raw.primary).toMatchObject({
    hostTheme: 'primary',
    bg: 'rgb(158, 205, 255)',
    fg: 'rgb(24, 24, 27)',
    border: 'rgba(0, 0, 0, 0)',
  })
  // dark 变体 = 暗色页上的「反色表面」：亮底深字
  expect(raw.dark).toMatchObject({
    hostTheme: 'dark',
    bg: 'rgb(250, 250, 250)',
    fg: 'rgb(24, 24, 27)',
    border: 'rgba(0, 0, 0, 0)',
  })
  expect(raw.light.borderRadius, '圆形按钮几何不应受主题影响').toBe('50%')

  await page.locator('#bt-theme-stage').screenshot({ path: testInfo.outputPath('back-top-dark-theme-variants.png') })
  await page.evaluate(() => {
    document.getElementById('bt-theme-stage')?.remove()
    document.documentElement.classList.remove('dark')
  })
  expect(errors).toEqual([])
})
