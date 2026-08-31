// 复核回归：toolbar-toggle——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('toolbar-toggle 选中态主题可见——light/dark 下选中与未选中背景可区分（曾识图验收：dark 选中态不可见）', async ({
  page,
}) => {
  // 缺陷固化：识图验收在 dark 下点击 toggle 后选中与未选中几乎一致（陈旧产物假象）。
  // 回归断言走「点击 → 计算样式」全链路：选中项背景必须等于当前主题的 primary
  // 计算色（token 怎么调都跟随），且与未选中（透明底）可区分；dark 下文字色同步校验。
  await page.goto('/components/toolbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toolbar-toggle')

  /** 读当前主题下某 token 的计算 rgb（临时元素 color 解析，var() 在页面上下文求值） */
  const tokenRgb = (token: string) =>
    page.evaluate((t) => {
      const el = document.createElement('div')
      el.style.color = `var(${t})`
      document.body.appendChild(el)
      const v = getComputedStyle(el).color
      el.remove()
      return v
    }, token)

  /** 读 tb-align 组各按钮的 pressed/背景/文字色计算样式 */
  const readAlign = () =>
    page.evaluate(() => {
      const tg = document.querySelector('oas-toolbar-toggle#tb-align')!
      return [...(tg.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.item') || [])].map(
        (b) => {
          const cs = getComputedStyle(b)
          return {
            text: b.textContent,
            pressed: b.getAttribute('aria-pressed'),
            bg: cs.backgroundColor,
            color: cs.color,
          }
        },
      )
    })

  // ---- light：选中=primary 蓝底，未选中=透明底 ----
  const primaryLight = await tokenRgb('--oas-color-primary')
  let btns = await readAlign()
  const selL = btns.find((b) => b.pressed === 'true')!
  const unselL = btns.find((b) => b.pressed === 'false')!
  expect(selL.bg, `light 选中项背景应为 primary（${primaryLight}）`).toBe(primaryLight)
  expect(unselL.bg, 'light 未选中项背景应为透明').toBe('rgba(0, 0, 0, 0)')
  expect(selL.bg, 'light 选中/未选中背景必须可区分').not.toBe(unselL.bg)

  // ---- dark：token 切换后选中项背景跟随 dark primary（识图缺陷场景） ----
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(400)
  const primaryDark = await tokenRgb('--oas-color-primary')
  expect(primaryDark, 'dark token 应与 light 不同（主题已切换）').not.toBe(primaryLight)

  // 点击未选中项（复现识图操作路径：点击后读计算样式）
  await page.evaluate(() => {
    const tg = document.querySelector('oas-toolbar-toggle#tb-align')!
    const btn = [...(tg.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.item') || [])].find(
      (b) => b.getAttribute('aria-pressed') === 'false',
    )!
    btn.click()
  })
  await page.waitForTimeout(300)

  btns = await readAlign()
  const selD = btns.find((b) => b.pressed === 'true')!
  const unselD = btns.find((b) => b.pressed === 'false')!
  expect(selD.bg, `dark 点击后选中项背景应为 dark primary（${primaryDark}）`).toBe(primaryDark)
  expect(unselD.bg, 'dark 未选中项背景应为透明').toBe('rgba(0, 0, 0, 0)')
  expect(selD.bg, 'dark 选中/未选中背景必须可区分（识图缺陷场景）').not.toBe(unselD.bg)
  // 文字色：选中（on-primary 深字）与未选中（text-primary 亮字）可区分
  expect(selD.color, 'dark 选中/未选中文字色必须可区分').not.toBe(unselD.color)
})

// —— 缺陷回归：popover 实测六条（12 向箭头对准 / portal 样式保真 / closable X / virtual 点标记）——
// 曾现缺陷：① -start/-end 箭头恒 CSS 居中、脱离锚点投影区间（箭头没对准宿主）；
// ② append-to 裸 appendChild 到 body，面板脱离 shadow 树后 scoped CSS 全失效
//   （static 掉文档流末尾、随滚动乱飘）；③ closable 的 X 显示规则钩子（.panel.oas-closable）
//   无人挂类，✕ 永不显示；④ virtual 定点无视觉标记，「对准哪里」不可感知。
