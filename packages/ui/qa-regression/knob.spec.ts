// 复核回归：oas-knob 旋钮——真实指针手势 / 键盘 / 复位 / 暗色 token / console 零告警。
// 单测（happy-dom）只验证状态与事件机制；本文件用真实鼠标拖拽验证用户可感知的交互链路。

import { test, expect, type Page } from '@playwright/test'
import { up } from './helpers'

/** 取旋钮 frame 的中心点（宿主盒含值文本，直接用宿主中心会点到 frame 外） */
async function frameCenter(page: Page, sel: string): Promise<{ x: number; y: number }> {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null
    el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    const f = el?.shadowRoot?.querySelector<HTMLElement>('[part="frame"]')
    const r = f!.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
}

async function valueOf(page: Page, sel: string): Promise<number> {
  return page.evaluate((s) => Number(document.querySelector(s)?.getAttribute('value')), sel)
}

test('knob 真指针三手势：cursor 圆周跟随 / axis 线性拖拽 / auto 解析后锁定', async ({ page }) => {
  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-knob[interaction="cursor"]')

  // —— cursor：12 点方位按下 → 3 点方位松开（顺时针 +90° / 270° sweep × 100 = +33.3）
  const cur = await frameCenter(page, 'oas-knob[interaction="cursor"]')
  const r = 20
  await page.mouse.move(cur.x, cur.y - r)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2)
    await page.mouse.move(cur.x + r * Math.sin(a), cur.y - r * Math.cos(a))
    await page.waitForTimeout(10)
  }
  await page.mouse.up()
  const curAfter = await valueOf(page, 'oas-knob[interaction="cursor"]')
  expect(curAfter, 'cursor 顺时针拖拽应增值（40 → ≈73）').toBeGreaterThan(60)

  // —— axis：中心按下 → 上拖 60px（60/150 × 100 = +40 → 80）
  const axisSel = 'oas-knob[interaction="axis"]:not([axis])'
  const ax = await frameCenter(page, axisSel)
  await page.mouse.move(ax.x, ax.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(ax.x, ax.y - i * 7.5)
    await page.waitForTimeout(10)
  }
  await page.mouse.up()
  expect(await valueOf(page, axisSel), 'axis 上拖 60px 应 +40（40 → 80）').toBeCloseTo(80, 0)

  // —— auto：起手竖直 → 解析线性；随后纯水平移动不改值（一次锁定不切换）
  const autoSel = 'oas-knob[interaction="auto"]'
  const au = await frameCenter(page, autoSel)
  await page.mouse.move(au.x, au.y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(au.x, au.y - i * 8)
    await page.waitForTimeout(10)
  }
  const afterVertical = await valueOf(page, autoSel)
  expect(afterVertical, 'auto 竖直主导应走线性（40 → 72）').toBeCloseTo(72, 0)
  // 锁定验证：纯水平移动（距轴心远超阈值）不得改变值
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(au.x + i * 8, au.y - 48)
    await page.waitForTimeout(10)
  }
  expect(await valueOf(page, autoSel), 'auto 解析为线性后纯水平移动不得改值（锁定）').toBe(afterVertical)
  await page.mouse.up()
})

test('knob 真实键盘链路：方向键 / PageUp / End 与值属性、aria-valuenow 同步', async ({ page }) => {
  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-knob[wheel]')
  const sel = 'oas-knob[wheel]'
  await page.locator(sel).evaluate((el) => (el as HTMLElement).focus())
  await page.keyboard.press('ArrowUp')
  expect(await valueOf(page, sel), 'ArrowUp +step').toBe(41)
  await page.keyboard.press('PageUp')
  expect(await valueOf(page, sel), 'PageUp 大步（10×step）').toBe(51)
  await page.keyboard.press('Home')
  expect(await valueOf(page, sel), 'Home 到 min').toBe(0)
  const r = await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    return { now: el.getAttribute('aria-valuenow'), attr: el.getAttribute('value') }
  }, sel)
  expect(r.now, 'aria-valuenow 与 value 属性同步').toBe('1')
  expect(r.attr).toBe('1')
})

test('knob 双击复位到 default-value（真实双击）', async ({ page }) => {
  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-knob[default-value="70"]')
  const sel = 'oas-knob[default-value="70"]'
  const c = await frameCenter(page, sel)
  await page.mouse.dblclick(c.x, c.y)
  expect(await valueOf(page, sel), '双击后复位到 default-value=70').toBe(70)
})

test('knob 暗色 token 跟随 + console 零告警（加载 + 拖拽 + 键盘 + 复位全程）', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  // 口径对齐 gantt/scheduler.spec：只收 error（firefox 引擎噪音如 scroll-linked 定位警告/GA cookie
  // 不属组件缺陷；warning 级由 console-sweep 全站白名单统一管理）
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })

  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-knob')

  // 暗色：值弧/轨道 stroke 随 token 切换（两主题必须不同，且都不是透明）
  const strokeOf = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement
      const fill = el.shadowRoot!.querySelector<SVGPathElement>('[part="fill"]')!
      return getComputedStyle(fill).stroke
    }, 'oas-knob[include-arc]')
  const lightStroke = await strokeOf('oas-knob[include-arc]')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const darkStroke = await strokeOf('oas-knob[include-arc]')
  expect(lightStroke, '亮色值弧应为实色（token 渲染）').not.toMatch(/transparent|rgba\(0, 0, 0, 0\)/)
  expect(darkStroke, '暗色值弧应为实色（token 渲染）').not.toMatch(/transparent|rgba\(0, 0, 0, 0\)/)
  expect(darkStroke, '暗色 token 应切换值弧颜色').not.toBe(lightStroke)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))

  // 全交互链路跑一遍（拖拽 + 键盘 + 复位），console 不得有任何 error/warning
  const c = await frameCenter(page, 'oas-knob[interaction="cursor"]')
  await page.mouse.move(c.x, c.y - 20)
  await page.mouse.down()
  await page.mouse.move(c.x + 20, c.y - 20, { steps: 6 })
  await page.mouse.up()
  await page.locator('oas-knob[wheel]').evaluate((el) => (el as HTMLElement).focus())
  await page.keyboard.press('ArrowUp')
  const rc = await frameCenter(page, 'oas-knob[default-value="70"]')
  await page.mouse.dblclick(rc.x, rc.y)
  expect(errors, `console 零告警（实抓 ${errors.length} 条）:\n${[...new Set(errors)].slice(0, 5).join('\n')}`).toEqual(
    [],
  )
})

test('knob 拖拽中置 disabled：终止手势立即回滚起点值（零提交）', async ({ page }) => {
  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  const sel = 'oas-knob[interaction="cursor"]'
  await up(page, sel)
  const c = await frameCenter(page, sel)
  const before = await valueOf(page, sel)
  await page.mouse.move(c.x, c.y - 20)
  await page.mouse.down()
  await page.mouse.move(c.x + 20, c.y - 20, { steps: 5 })
  const during = await valueOf(page, sel)
  // 拖拽中途禁用：update() 检测到禁用即终止手势并回滚起点值
  await page.evaluate((s) => document.querySelector(s)?.setAttribute('disabled', ''), sel)
  const afterDisable = await valueOf(page, sel)
  await page.mouse.move(c.x + 40, c.y - 20, { steps: 5 })
  await page.mouse.up()
  const afterUp = await valueOf(page, sel)
  expect(during, '拖拽应已改值').not.toBe(before)
  expect(afterDisable, '禁用后应立即回滚起点值').toBe(before)
  expect(afterUp, '继续移动/松手不再改值').toBe(before)
})

test('knob readonly 拦截与 disabled 不可聚焦（demo 实例）', async ({ page }) => {
  await page.goto('/components/knob.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-knob[readonly]')
  const r = await page.evaluate(() => {
    const ro = document.querySelector('oas-knob[readonly]') as HTMLElement
    const dis = document.querySelector('oas-knob[disabled]') as HTMLElement
    const before = ro.getAttribute('value')
    ro.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    const frame = ro.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const pd = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, button: 0 })
    frame.dispatchEvent(pd)
    return {
      readonlyValue: ro.getAttribute('value'),
      unchanged: ro.getAttribute('value') === before,
      prevented: pd.defaultPrevented,
      ariaReadonly: ro.getAttribute('aria-readonly'),
      disabledTabindex: dis.getAttribute('tabindex'),
      disabledAria: dis.getAttribute('aria-disabled'),
    }
  })
  expect(r.unchanged, 'readonly 键盘改值被拦截').toBe(true)
  expect(r.prevented, 'readonly pointerdown 被拦截（preventDefault）').toBe(true)
  expect(r.ariaReadonly).toBe('true')
  expect(r.disabledTabindex, 'disabled 移除 tabindex（不可聚焦）').toBeNull()
  expect(r.disabledAria).toBe('true')
})
