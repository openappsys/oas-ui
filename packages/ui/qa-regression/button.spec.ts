// 复核回归：button——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('button color 自定义色：无 type 也按 variant 着色，文字色按底色亮度自适应', async ({
  page,
}) => {
  // 曾现 bug：--btn-color 只在 type 类上定义、solid 规则只认 primary——无 type 的 color
  // 按钮全部渲染成灰色（自定义颜色 demo 肉眼可见失效）。修复：base 兜底 --btn-color +
  // has-color 实心规则 + 文字色按底色亮度取黑/白（暗色主题下中间调底色配深字不可读）。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[color]')
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('oas-button[color]')].map((el) => {
        const cs = getComputedStyle(el.shadowRoot!.querySelector('button')!)
        return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }
      }),
    )
  const light = await read()
  expect(light[0]!.bg, '紫色实底').toBe('rgb(124, 58, 237)')
  expect(light[0]!.color, '紫底白字').toBe('rgb(255, 255, 255)')
  expect(light[1]!.border, '绿色描边').toBe('rgb(4, 120, 87)')
  expect(light[2]!.bg, '粉色浅底（12% tint）').toContain('0.12')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const dark = await read()
  expect(dark[0]!.bg).toBe('rgb(124, 58, 237)')
  expect(dark[0]!.color, '暗色下紫底仍是白字（亮度自适应）').toBe('rgb(255, 255, 255)')
})

test('button wrap：默认 nowrap 不换行，显式 wrap 才换行增高，icon-only 保持正方形', async ({
  page,
}) => {
  // 用户定夺：默认不换行（正常使用即正常表现）；只有显式 wrap 属性才让长文本换行、
  // 盒随内容长高（min-height 兜底单行高度）；icon-only/circle 固定尺寸保形。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[wrap]')
  const r = await page.evaluate(() => {
    const wrapBtn = document.querySelector('oas-button[wrap]')!.shadowRoot!.querySelector('button')!
    const plain = [...document.querySelectorAll('oas-button')].find(
      (b) => b.textContent?.trim() === '普通按钮',
    )!
    const plainBtn = plain.shadowRoot!.querySelector('button')!
    const iconOnly = document.querySelector('oas-button[icon]')!
    const iconBtn = iconOnly.shadowRoot!.querySelector('button')!
    const wb = wrapBtn.getBoundingClientRect()
    const pb = plainBtn.getBoundingClientRect()
    const ib = iconBtn.getBoundingClientRect()
    return {
      wrapHeight: wb.height,
      plainHeight: pb.height,
      plainNowrap: getComputedStyle(plainBtn).whiteSpace,
      iconSquare: Math.abs(ib.width - ib.height) <= 1,
    }
  })
  expect(r.plainNowrap, '默认按钮必须 nowrap').toBe('nowrap')
  expect(r.plainHeight, '默认按钮单行 32px').toBe(32)
  expect(r.wrapHeight, 'wrap 按钮受限宽换行增高（>32px）').toBeGreaterThan(32)
  expect(r.iconSquare, 'icon-only 保持正方形').toBe(true)
})

test('button href anchor 变体：静止态不永久显示选中色（a 镜像规则的 :host 前缀回归）', async ({
  page,
}) => {
  // 曾现 bug：选中态的 a[part='button'] 镜像规则丢了 :host([aria-pressed='true']) 前缀，
  // 带 href 的 primary/text 按钮静止时永久渲染选中色（primary-active 深底）。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[href]')
  const r = await page.evaluate(() => {
    const pick = (cls: string) => {
      const el = [...document.querySelectorAll('oas-button[href]')].find((e) =>
        e.shadowRoot!.querySelector(`a[part=button].${cls}`),
      )!
      const a = el.shadowRoot!.querySelector('a[part=button]')!
      const cs = getComputedStyle(a)
      return { pressed: el.getAttribute('aria-pressed'), bg: cs.backgroundColor, filter: cs.filter }
    }
    return { primary: pick('primary'), default: pick('default') }
  })
  expect(r.primary.pressed).toBeNull()
  expect(r.primary.bg, 'href primary 静止应为默认 primary 色，非选中深色').toBe('rgb(11, 108, 255)')
  expect(r.primary.filter).toBe('none')
  expect(r.default.bg, 'href 默认链接静止应为白底').toBe('rgb(255, 255, 255)')
})

test('button 语义色状态方向统一：success hover 变暗（0.94）、选中更深（0.85）', async ({
  page,
}) => {
  // 曾现不一致：primary hover 变暗（color-mix 85% black），success/warning/danger hover
  // 却用 brightness(1.08) 变亮——同库 hover 明暗方向相反。统一为变暗递进：hover 0.94、
  // 选中 0.85（与 primary 的 85%/75% 两档比例对齐）。
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  // 页面无 success 组 demo，注入一个验证语义色规则（type 由组透传子按钮）
  await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    const clone = g.cloneNode(true) as HTMLElement
    clone.setAttribute('type', 'success')
    clone.removeAttribute('value')
    g.parentElement!.appendChild(clone)
  })
  const sg = page.locator('oas-button-group[type="success"]').last()
  const mid = sg.locator('oas-button', { hasText: '中' })
  const readFilter = () =>
    page.evaluate(() => {
      const gs = [...document.querySelectorAll('oas-button-group[type="success"]')]
      const b = [...gs[gs.length - 1]!.querySelectorAll('oas-button')][1]!
      return getComputedStyle(b.shadowRoot!.querySelector('button')!).filter
    })
  expect(await readFilter()).toBe('none')
  await mid.hover()
  await page.waitForTimeout(400)
  const hoverFilter = await readFilter()
  expect(hoverFilter, 'success hover 应变暗（brightness < 1）').toBe('brightness(0.94)')
  // 选中比 hover 更深
  await mid.click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(400)
  expect(await readFilter(), 'success 选中应比 hover 更深').toBe('brightness(0.85)')
})

test('button primary（solid）：hover/选中背景不被自定义底色兜底规则压死', async ({ page }) => {
  // 曾现 bug：--oas-button-bg 覆盖规则的选择器带 :not() 链（权重 (0,6,1)），压死
  // button.primary:hover / :active / :host([aria-pressed]) 的 background (0,2,1)——
  // solid primary 按钮 hover 不加深、按钮组选中态无视觉反馈（只剩 1px 边框变色）。
  // 修复：:not() 链包 :where() 归零权重。此处锁定「hover 与选中背景必须真实变化」。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[type="primary"]')
  const btn = page.locator('oas-button[type="primary"]').first()
  const readBg = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-button[type="primary"]')!
      return getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor
    })
  const normal = await readBg()
  await btn.hover()
  await page.waitForTimeout(400)
  const hover = await readBg()
  expect(hover, 'solid primary hover 背景应变深').not.toBe(normal)

  // 按钮组选中态：点击后 aria-pressed=true 且底色与未选项可区分（primary-active）
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  const group = page.locator('oas-button-group[type="primary"]').first()
  await group.locator('oas-button', { hasText: '中' }).click()
  await page.mouse.move(0, 0) // 移开鼠标，排除 hover 色干扰，看纯选中态
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    const btns = [...g.querySelectorAll('oas-button')]
    const bg = (b: Element) =>
      getComputedStyle(b.shadowRoot!.querySelector('button')!).backgroundColor
    return {
      pressed: btns[1]!.getAttribute('aria-pressed'),
      selected: bg(btns[1]!),
      rest: bg(btns[0]!),
    }
  })
  expect(r.pressed).toBe('true')
  expect(r.selected, '选中项底色应与未选项可区分').not.toBe(r.rest)
})
