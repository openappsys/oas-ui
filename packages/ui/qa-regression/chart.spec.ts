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

// 四类新图型（radar / polar-area / combo / 双轴）渲染产出固化：
// 页面 bar 型 demo 顺序 [柱状图, 组合图, 双轴组合图]，按索引取后两个
test('chart 四类新图型：radar 径向网格与顶点 / polar-area 等角扇区 / combo 柱线混排 / 双轴右轴与轴名', async ({
  page,
}) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const svgOf = (el: Element) => el.shadowRoot!.querySelector('svg')!
    const radar = document.querySelector('oas-chart[type="radar"]')!
    const polar = document.querySelector('oas-chart[type="polar-area"]')!
    const bars = document.querySelectorAll('oas-chart[type="bar"]')
    const combo = bars[1]!
    const dual = bars[2]!
    return {
      radarRings: svgOf(radar).querySelectorAll('polygon.grid-ring').length,
      radarAxes: svgOf(radar).querySelectorAll('line.radar-axis').length,
      radarDots: svgOf(radar).querySelectorAll('circle.dot').length,
      radarLegendVisible: !radar.shadowRoot!.querySelector<HTMLElement>('[part="legend"]')!.hidden,
      polarSlices: svgOf(polar).querySelectorAll('.slice').length,
      polarRings: svgOf(polar).querySelectorAll('circle.grid-ring').length,
      comboBars: svgOf(combo).querySelectorAll('rect.bar').length,
      comboLines: svgOf(combo).querySelectorAll('.line-path').length,
      dualRightTicks: [...svgOf(dual).querySelectorAll('text.axis-text')].filter(
        (t) => t.getAttribute('text-anchor') === 'start',
      ).length,
      dualNames: [...svgOf(dual).querySelectorAll('text.axis-name')].map((t) => t.textContent),
    }
  })
  expect(r.radarRings, 'radar 4 层同心多边形网格').toBe(4)
  expect(r.radarAxes, 'radar 维度轴线 = 维度数（5）').toBe(5)
  expect(r.radarDots, 'radar 顶点 = 5 维 × 2 系列').toBe(10)
  expect(r.radarLegendVisible, 'radar 多系列图例复用').toBe(true)
  expect(r.polarSlices, 'polar-area 扇区 = 分类数（4）').toBe(4)
  expect(r.polarRings, 'polar-area 3 层同心参考圈').toBe(3)
  expect(r.comboBars, 'combo 柱系列 4 柱').toBe(4)
  expect(r.comboLines, 'combo 线系列 1 条折线').toBe(1)
  expect(r.dualRightTicks, '双轴右轴 5 个刻度（anchor=start 贴右缘）').toBe(5)
  expect(r.dualNames, '双轴轴名按 yAxis.name 渲染').toEqual(['销量', '增速'])
})

// RTL 不破：SVG 几何与书写方向正交，dir=rtl 下节点产出不变
test('chart 新图型 RTL：dir=rtl 下 radar/polar-area/combo 渲染产出与 LTR 一致', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const count = () =>
    page.evaluate(() => {
      const svgOf = (el: Element) => el.shadowRoot!.querySelector('svg')!
      return {
        radar: svgOf(document.querySelector('oas-chart[type="radar"]')!).children.length,
        polar: svgOf(document.querySelector('oas-chart[type="polar-area"]')!).children.length,
        combo: svgOf(document.querySelectorAll('oas-chart[type="bar"]')[1]!).children.length,
      }
    })
  const before = await count()
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
  })
  expect(await count(), 'RTL 下三类图型 svg 子节点数不变').toEqual(before)
})
