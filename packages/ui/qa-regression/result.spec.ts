// 复核回归：result——状态通道、title 吸收、插槽双通道与尺寸档位固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('result status 通道：404 专属字形与 aria 同步、动态改 status 即时更新、title 吸收不残留', async ({ page }) => {
  await page.goto('/components/result.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-result')
  const r = await page.evaluate(() => {
    const httpIcon = document.querySelector('oas-result[status="404"]')!.shadowRoot!.querySelector('[part="icon"]')!
    return {
      httpStatus: httpIcon.getAttribute('data-status'),
      httpAria: httpIcon.getAttribute('aria-label'),
      httpGlyph: httpIcon.querySelector('.icon-glyph svg') != null,
      titleResidue: [...document.querySelectorAll('oas-result')].filter((el) => el.hasAttribute('title')).length,
      renderedTitles: [...document.querySelectorAll('oas-result[status]')].filter(
        (el) => (el.shadowRoot!.querySelector('[part="title"]')?.textContent ?? '') !== '',
      ).length,
    }
  })
  expect(r.httpStatus, '404 状态归一化写入 data-status（色板/字形共用钩子）').toBe('404')
  expect(r.httpAria, '图标 role=status + aria-label=归一化状态（读屏可命名）').toBe('404')
  expect(r.httpGlyph, '404 专属 SVG 字形已渲染').toBe(true)
  expect(r.titleResidue, 'title 吸收：宿主不残留原生 title（悬停不弹原生提示）').toBe(0)
  expect(r.renderedTitles, '带标题的 result 均渲染标题区').toBeGreaterThan(0)

  // 消费式属性：连接后改 status → 图标状态即时跟随（非仅首连一次）
  await page.evaluate(() => document.querySelector('oas-result')!.setAttribute('status', 'error'))
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('oas-result')!.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status'),
      ),
    )
    .toBe('error')
})

test('result 插槽与尺寸：自定义图标进中性态、默认插槽内容区显示、slot=description 覆盖属性、size 联动图标直径', async ({
  page,
}) => {
  await page.goto('/components/result.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-result')
  const r = await page.evaluate(() => {
    const iconOf = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
    const custom = [...document.querySelectorAll('oas-result')].find((el) => el.querySelector('[slot="icon"]'))!
    const customIcon = iconOf(custom)
    const contentResult = [...document.querySelectorAll('oas-result')].find((el) => el.querySelector('ul'))!
    const descRich = [...document.querySelectorAll('oas-result')].find((el) =>
      el.querySelector('[slot="description"]'),
    )!
    return {
      customNeutral: customIcon.hasAttribute('data-custom'),
      glyphHidden: customIcon.querySelector<HTMLElement>('.icon-glyph')!.hidden,
      iconRole: customIcon.getAttribute('role'),
      contentHidden: contentResult.shadowRoot!.querySelector<HTMLElement>('.content')!.hidden,
      descFallbackHidden: descRich.shadowRoot!.querySelector<HTMLElement>('.description-text')!.hidden,
      largeIconPx: iconOf(document.querySelector('oas-result[size="large"]')!).style.width,
      smallIconPx: iconOf(document.querySelector('oas-result[size="small"]')!).style.width,
    }
  })
  expect(r.customNeutral, 'slot=icon 有内容进中性态（去语义底色钩子）').toBe(true)
  expect(r.glyphHidden, '内置字形隐藏（不与自定义图标叠加）').toBe(true)
  expect(r.iconRole, '中性态不挂 status 角色（语义交给自定义内容）').toBe(null)
  expect(r.contentHidden, '默认插槽有内容时内容区显示（错误详情清单）').toBe(false)
  expect(r.descFallbackHidden, 'slot=description 富内容覆盖属性文案（兜底 span 隐藏）').toBe(true)
  expect(r.largeIconPx, 'size=large 图标直径 88px').toBe('88px')
  expect(r.smallIconPx, 'size=small 图标直径 56px').toBe('56px')
})
