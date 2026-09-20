// 复核回归：chart——渲染产出与 aria、空态、数据通道重绘固化断言。
// SVG 图表只断言「渲染产出与数据通道」可控的部分（节点结构/数量/显隐），不做像素级视觉断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('chart 渲染产出与 aria：图形节点随类型渲染、role=img 可命名；空数据空态占位可见', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const svgOf = (el: Element) => el.shadowRoot!.querySelector('svg')!
    const line = document.querySelector('oas-chart[type="line"]')!
    const bar = document.querySelector('oas-chart[type="bar"]')!
    const empty = document.querySelector('oas-chart[data="[]"]')!
    return {
      wrapperRole: line.shadowRoot!.querySelector('[part="wrapper"]')!.getAttribute('role'),
      lineAria: line.shadowRoot!.querySelector('[part="wrapper"]')!.getAttribute('aria-label') ?? '',
      linePaths: svgOf(line).querySelectorAll('.line-path').length,
      lineDots: svgOf(line).querySelectorAll('circle.dot').length,
      barCount: svgOf(bar).querySelectorAll('rect.bar').length,
      emptyVisible: !empty.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden,
      emptyText: empty.shadowRoot!.querySelector('[part="empty"]')!.textContent ?? '',
      emptySvgHidden: svgOf(empty).hasAttribute('hidden'),
    }
  })
  expect(r.wrapperRole, '图表整体 role=img（可命名区域）').toBe('img')
  expect(r.lineAria.length, '缺省 aria-label 按 locale 生成（非空）').toBeGreaterThan(0)
  expect(r.linePaths, '折线图渲染系列 path').toBeGreaterThan(0)
  expect(r.lineDots, '单系列 5 个数据点渲染 5 个 dot').toBe(5)
  expect(r.barCount, '柱状图柱数 = 分类数（4）').toBe(4)
  expect(r.emptyVisible, '空数据空态占位可见（不报错）').toBe(true)
  expect(r.emptyText.length, '空态文案非空').toBeGreaterThan(0)
  expect(r.emptySvgHidden, '空态下图形 svg 隐藏').toBe(true)
})

test('chart 数据通道：attribute 改数据重绘（点数变化）；property 赋多系列 → 图例出现（getter 契约）', async ({
  page,
}) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const lineSel = 'oas-chart[type="line"]'
  const dots = () =>
    page.evaluate(
      () => document.querySelector('oas-chart[type="line"]')!.shadowRoot!.querySelectorAll('circle.dot').length,
    )
  expect(await dots(), '初始 5 个数据点').toBe(5)

  // attribute 通道：改 JSON 数据 → 重绘（5 点 → 3 点）
  await page.evaluate(() => {
    document
      .querySelector('oas-chart[type="line"]')!
      .setAttribute('data', '[{"label":"a","value":1},{"label":"b","value":2},{"label":"c","value":3}]')
  })
  await expect.poll(dots, '数据变更后重绘为 3 个数据点').toBe(3)

  // property 通道：对象多系列 → 图例渲染；chart setter 只写内部状态（不反射 attribute）
  const seriesLen = await page.evaluate(() => {
    const el = document.querySelector('oas-chart[type="line"]')! as HTMLElement & {
      data: { labels: string[]; series: Array<{ name: string; data: number[] }> }
    }
    el.data = {
      labels: ['x', 'y'],
      series: [
        { name: 'S1', data: [1, 2] },
        { name: 'S2', data: [2, 4] },
      ],
    }
    return el.data.series.length
  })
  expect(seriesLen, 'getter 返回最近一次赋值的解析结果').toBe(2)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const legend = document
          .querySelector('oas-chart[type="line"]')!
          .shadowRoot!.querySelector<HTMLElement>('[part="legend"]')!
        return { hidden: legend.hidden, items: legend.querySelectorAll('.legend-item').length }
      }),
    )
    .toEqual({ hidden: false, items: 2 })
})
