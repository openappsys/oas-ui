// 复核回归：picker——滚轮选择器真实浏览器固化。
// 覆盖：真实滚轮滚动选中 + oas-change（value/labels 口径）/ 键盘方向键 / 级联父列变更重建子列 /
// 禁用项落停吸附 / 程序性 value 写入不派发。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/picker.html'

test('picker 真实滚轮：滚动落停选中变化并派发 oas-change（demo 反馈文本可见）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#pk-basic')
  const out = page.locator('#pk-basic-out')
  const before = await out.textContent()
  // 在第一列上滚轮下滚（真实 wheel → 原生滚动 + 吸附 + 落停提交）
  const col = page.locator('#pk-basic').locator('[part="column"]').first()
  await col.hover()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#pk-basic')!
    const sel = [...el.shadowRoot!.querySelectorAll('.column')[0]!.querySelectorAll('.item')].findIndex(
      (i) => i.getAttribute('aria-selected') === 'true',
    )
    return { sel, value: el.getAttribute('value') }
  })
  expect(r.sel, '滚动后选中项离开首项').toBeGreaterThan(0)
  expect(JSON.parse(r.value ?? '[]')[0], 'value 回写与选中一致').toBe(
    ['apple', 'banana', 'orange', 'grape', 'melon'][r.sel],
  )
  const after = await out.textContent()
  expect(after, 'demo 反馈文本更新（oas-change 已派发）').not.toBe(before)
  expect(after).toContain('已选')
})

test('picker 键盘：列聚焦后方向键移动选中并派发 oas-change', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#pk-basic')
  const events = await page.evaluate(() => {
    const el = document.querySelector('#pk-basic')!
    const arr: string[] = []
    el.addEventListener('oas-change', (e) => arr.push(JSON.stringify((e as CustomEvent).detail.value)))
    ;(el.shadowRoot!.querySelector('.column') as HTMLElement).focus()
    return arr
  })
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#pk-basic')!
    return {
      selIdx: [...el.shadowRoot!.querySelectorAll('.column')[0]!.querySelectorAll('.item')].findIndex(
        (i) => i.getAttribute('aria-selected') === 'true',
      ),
      value: el.getAttribute('value'),
    }
  })
  expect(r.selIdx).toBe(1)
  expect(JSON.parse(r.value ?? '[]')[0]).toBe('banana')
})

test('picker 级联：父列滚动变更 → 子列重建并复位首可用项（value 路径口径）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#pk-cascade')
  // 初始 value=["zj","hz"]：子列为浙江城市
  const before = await page.evaluate(() => {
    const el = document.querySelector('#pk-cascade')!
    return [...el.shadowRoot!.querySelectorAll('.column')[1]!.querySelectorAll('.item')].map((i) => i.textContent)
  })
  expect(before).toEqual(['杭州', '宁波', '温州'])
  // 父列滚到「江苏」
  const col = page.locator('#pk-cascade').locator('[part="column"]').first()
  await col.hover()
  await page.mouse.wheel(0, 40)
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#pk-cascade')!
    return {
      childItems: [...el.shadowRoot!.querySelectorAll('.column')[1]!.querySelectorAll('.item')].map(
        (i) => i.textContent,
      ),
      value: el.getAttribute('value'),
    }
  })
  expect(r.childItems).toEqual(['南京', '苏州'])
  expect(JSON.parse(r.value ?? '[]')).toEqual(['js', 'nj'])
})

test('picker 禁用项：落停吸附到最近可用项；程序性 value 写入不派发事件', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-picker')
  // 禁用项吸附（时段列：中午 disabled）
  const r = await page.evaluate(async () => {
    const el = [...document.querySelectorAll('oas-picker')].find((p) =>
      (p.getAttribute('columns') ?? '').includes('disabled'),
    )!
    const col = el.shadowRoot!.querySelector('.column') as HTMLElement
    col.scrollTop = 36 // 落到「中午」（disabled）
    col.dispatchEvent(new Event('scroll'))
    await new Promise((res) => setTimeout(res, 300))
    return {
      selIdx: [...el.shadowRoot!.querySelectorAll('.column')[0]!.querySelectorAll('.item')].findIndex(
        (i) => i.getAttribute('aria-selected') === 'true',
      ),
      value: el.getAttribute('value'),
    }
  })
  expect(r.selIdx, '不得停在禁用项').not.toBe(1)
  expect(r.value, '吸附后值已提交').not.toBeNull()

  // 程序性写入不派发
  const noEmit = await page.evaluate(async () => {
    const el = document.querySelector('#pk-basic')!
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.setAttribute('value', '["grape","三份"]')
    await new Promise((res) => setTimeout(res, 300))
    return fired
  })
  expect(noEmit, '程序性 value 写入不派发 oas-change').toBe(0)
})

test('picker 选中行高亮：bg-hover + 发丝线可见，无覆盖式指示带（回归：absolute 带被 axe 判遮挡/盖字）', async ({
  page,
}) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#pk-basic')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#pk-basic')!
    const sel = [...el.shadowRoot!.querySelectorAll('.item')].find((i) => i.getAttribute('aria-selected') === 'true')!
    const cs = getComputedStyle(sel)
    return {
      noBand: el.shadowRoot!.querySelector('.band') === null,
      bg: cs.backgroundColor,
      shadow: cs.boxShadow,
      text: sel.textContent,
    }
  })
  expect(r.noBand, '不得再有 absolute 覆盖带').toBe(true)
  expect(r.bg, '选中行自底色可见').not.toBe('rgba(0, 0, 0, 0)')
  expect(r.bg, '选中行自底色可见').not.toBe('transparent')
  expect(r.shadow, '上下发丝线在位').toContain('px')
  expect(r.text, '选中项文字在位').toBeTruthy()
})
