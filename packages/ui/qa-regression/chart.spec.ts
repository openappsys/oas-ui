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

// RTL 不破：SVG 几何与书写方向正交，dir=rtl 下节点产出不变；
// 且 svg 内文字 direction 钉死 ltr——图表文字 anchor 全按几何方位给出，
// 若跟随宿主 direction:rtl，text-anchor start/end 视觉语义翻转（刻度压进绘图区、轴名裁出 viewBox）
test('chart 新图型 RTL：dir=rtl 下 radar/polar-area/combo 渲染产出与 LTR 一致，且文字方向保持 ltr', async ({
  page,
}) => {
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
  const direction = await page.evaluate(() => {
    const svg = document.querySelector('oas-chart[type="line"]')!.shadowRoot!.querySelector('svg')!
    const text = svg.querySelector('text')
    return {
      svg: getComputedStyle(svg).direction,
      text: text ? getComputedStyle(text).direction : null,
    }
  })
  expect(direction.svg, 'chart svg direction 钉死 ltr（不随宿主翻转）').toBe('ltr')
  expect(direction.text, 'svg 内文字继承 ltr（text-anchor 几何语义不翻转）').toBe('ltr')
  await page.evaluate(() => {
    document.documentElement.removeAttribute('dir')
  })
})

// 缺陷回归（review 定向）：仅声明 options.yAxis 双项但无任何系列 yAxisIndex:1 绑定时，
// 不渲染未绑定右轴（无右刻度、无轴名、网格右缘单轴）——此前渲染 5 个 0 刻度的假轴。
test('chart 双轴：声明 yAxis 但无系列绑定时按单轴渲染（不渲染假右轴）', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-chart')
    el.setAttribute('type', 'bar')
    el.setAttribute('options', '{"yAxis":[{"name":"销量"},{"name":"增长率"}]}')
    el.setAttribute(
      'data',
      JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'A', data: [50, 100] },
          { name: 'B', data: [20, 30] }, // 无 yAxisIndex 绑定
        ],
      }),
    )
    document.body.appendChild(el)
    const svg = el.shadowRoot!.querySelector('svg')!
    const res = {
      rightTicks: [...svg.querySelectorAll('text.axis-text')].filter((t) => t.getAttribute('text-anchor') === 'start')
        .length,
      axisNames: svg.querySelectorAll('text.axis-name').length,
      gridEdge: [...svg.querySelectorAll('line.axis-line')].map((l) => l.getAttribute('x2')),
    }
    el.remove()
    return res
  })
  expect(r.rightTicks, '无绑定系列：无右轴刻度').toBe(0)
  expect(r.axisNames, '无绑定系列：不渲染轴名（含声明的 name）').toBe(0)
  expect(
    r.gridEdge.every((x) => x === '508'),
    '网格右缘走单轴 padR（508），非双轴 478',
  ).toBe(true)
})

// 缺陷回归（happy-dom 测不了文字布局，用真实 getBBox）：
// ① radar 顶轴维度名与最大刻度值同处顶点，此前两者文字框相交（重叠区约 7×6px）；
// ② combo 文档承诺层序固定 bar→area→line，但 overlay 曾按声明顺序渲染——线先声明会被面积层盖住。
test('chart radar 顶点标签不压刻度值；combo 层序恒为 bar→area→line（与声明顺序无关）', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const radar = document.querySelector('oas-chart[type="radar"]')!
    const svg = radar.shadowRoot!.querySelector('svg')!
    const bb = (t: Element) => {
      const b = (t as SVGGraphicsElement).getBBox()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    const ticks = [...svg.querySelectorAll('text.axis-text')].map(bb)
    const dims = [...svg.querySelectorAll('text.axis-label')].map(bb)
    let collide = false
    for (const d of dims) {
      for (const t of ticks) {
        const ox = Math.min(d.x + d.w, t.x + t.w) - Math.max(d.x, t.x)
        const oy = Math.min(d.y + d.h, t.y + t.h) - Math.max(d.y, t.y)
        if (ox > 0 && oy > 0) collide = true
      }
    }

    // combo：line 先声明、area 后声明，DOM 层序仍须 area 在 line 之前
    const el = document.createElement('oas-chart')
    el.setAttribute('type', 'bar')
    el.setAttribute(
      'data',
      JSON.stringify({
        labels: ['a', 'b'],
        series: [
          { name: 'L', data: [5, 10], type: 'line' },
          { name: 'A', data: [20, 30], type: 'area' },
          { name: 'B', data: [50, 100] },
        ],
      }),
    )
    document.body.appendChild(el)
    const esvg = el.shadowRoot!.querySelector('svg')!
    const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const order = {
      barBeforeArea: before(esvg.querySelector('rect.bar')!, esvg.querySelector('.area-path')!),
      areaBeforeLine: before(esvg.querySelector('.area-path')!, esvg.querySelector('.line-path')!),
    }
    el.remove()
    return { radarCollide: collide, ...order }
  })
  expect(r.radarCollide, 'radar 维度名与刻度值文字框无重叠').toBe(false)
  expect(r.barBeforeArea, 'combo bar 层在 area 层之前').toBe(true)
  expect(r.areaBeforeLine, 'combo area 层在 line 层之前（线盖面）').toBe(true)
})

// 安全回归：options.colors 来自宿主，注入 SVG 前必须转义（此前直接拼进 style/stop-color，
// 恶意值可引号逃逸注入事件属性——hover 即执行——或额外 SVG 节点）。
test('chart options.colors 恶意值不逃逸属性：不注入事件属性/额外节点', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const make = (type: string, options: string, data: string): Element => {
      const el = document.createElement('oas-chart')
      el.setAttribute('type', type)
      el.setAttribute('options', options)
      el.setAttribute('data', data)
      document.body.appendChild(el)
      return el
    }
    const evt = make(
      'line',
      JSON.stringify({ colors: ['red" onmouseover="globalThis.__pwned=1'] }),
      JSON.stringify([{ label: 'a', value: 1 }]),
    )
    const lineEvt = [...evt.shadowRoot!.querySelectorAll('path')].some((p) => p.hasAttribute('onmouseover'))
    evt.remove()

    const node = make(
      'polar-area',
      JSON.stringify({ colors: ['blue"><circle r="999"'] }),
      JSON.stringify({ labels: ['a'], series: [{ name: 'S', data: [5] }] }),
    )
    const injectedNode = [...node.shadowRoot!.querySelectorAll('circle')].some((c) => c.getAttribute('r') === '999')
    node.remove()

    const stop = make(
      'area',
      JSON.stringify({ gradient: true, colors: ['red"/>"><rect width="999"'] }),
      JSON.stringify({ labels: ['a'], series: [{ name: 'S', data: [1] }] }),
    )
    const injectedRect = [...stop.shadowRoot!.querySelectorAll('rect')].some((x) => x.getAttribute('width') === '999')
    stop.remove()

    return { lineEvt, injectedNode, injectedRect }
  })
  expect(r.lineEvt, 'style 不得被引号逃逸注入事件属性').toBe(false)
  expect(r.injectedNode, '颜色值不得闭合属性注入额外节点').toBe(false)
  expect(r.injectedRect, 'gradient stop-color 不得被逃逸注入节点').toBe(false)
})

// 密集分类：缺省水平抽稀；xLabelRotate 斜排/竖排并用真实布局（getBoundingClientRect）证明不叠字。
test('chart 密集 x 轴标签：缺省抽稀、xLabelRotate 旋转后真实包围盒仍无重叠且不越出绘图卡片', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const labels = Array.from({ length: 36 }, (_, i) => `09-${String(i + 1).padStart(2, '0')}`)
    const data = JSON.stringify({ labels, series: [{ name: 'S', data: labels.map((_, i) => i) }] })
    const measure = (options: string) => {
      const el = document.createElement('oas-chart')
      el.setAttribute('type', 'line')
      el.setAttribute('options', options)
      el.setAttribute('data', data)
      document.body.appendChild(el)
      const svg = el.shadowRoot!.querySelector('svg')!
      const texts = [...svg.querySelectorAll('text.axis-label')] as SVGTextElement[]
      const rects = texts.map((t) => t.getBoundingClientRect())
      // 相邻标签的真实屏幕矩形是否相交（旋转后为斜/竖包围盒）
      let overlaps = 0
      for (let i = 1; i < rects.length; i++) {
        const a = rects[i - 1]!
        const b = rects[i]!
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5)
          overlaps++
      }
      const svgBox = svg.getBoundingClientRect()
      const glyphBox = [
        Math.min(...texts.map((t) => t.getBoundingClientRect().left)),
        Math.max(...texts.map((t) => t.getBoundingClientRect().right)),
      ]
      const rotated = texts.filter((t) => (t.getAttribute('transform') ?? '').startsWith('rotate(')).length
      const info = { rendered: texts.length, overlaps, rotated, firstSlot: texts.length > 0 }
      el.remove()
      return { ...info, svgLeft: svgBox.left, svgRight: svgBox.right, glyphBox }
    }
    return { flat: measure('{}'), rot45: measure('{"xLabelRotate":45}'), rot90: measure('{"xLabelRotate":90}') }
  })

  expect(r.flat.rendered, '缺省抽稀（36 → 少量）').toBeLessThan(36)
  expect(r.flat.overlaps, '缺省水平标签不重叠').toBe(0)
  expect(r.flat.rotated, '缺省不旋转').toBe(0)
  expect(r.rot45.rotated, '45° 全部标签带 rotate 变换').toBe(r.rot45.rendered)
  expect(r.rot90.rotated, '90° 全部标签带 rotate 变换').toBe(r.rot90.rendered)
  expect(r.rot45.overlaps, '45° 斜排不叠字').toBe(0)
  expect(r.rot90.overlaps, '90° 竖排不叠字').toBe(0)
  expect(r.rot90.rendered, '90° 竖排能容纳更多标签（逐日可读优于缺省）').toBeGreaterThan(r.flat.rendered)
  // 旋转后文字不得越出图表卡片（svg 左右界）
  for (const [name, m] of Object.entries(r)) {
    expect(m.glyphBox[0]!, `${name} 左不越界`).toBeGreaterThanOrEqual(m.svgLeft - 2)
    expect(m.glyphBox[1]!, `${name} 右不越界`).toBeLessThanOrEqual(m.svgRight + 2)
  }
})

// RTL 回归：抽稀（步长/落点）、柱组居中、xLabelRotate 旋转三处都必须是纯几何，不随宿主书写方向变化；
// svg direction 钉死 ltr 后 text-anchor start/end 语义不翻转（旋转标签的 start 锚点在 RTL 下不得变成 end）。
test('chart 密集标签/旋转/柱组居中：dir=rtl 与 ltr 逐项几何相同，锚点与文字方向不翻转', async ({ page }) => {
  await page.goto('/components/chart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-chart')
  const r = await page.evaluate(() => {
    const labels = Array.from({ length: 36 }, (_, i) => `09-${String(i + 1).padStart(2, '0')}`)
    const data = JSON.stringify({ labels, series: [{ name: 'S', data: labels.map((_, i) => i) }] })
    const snap = (rtl: boolean, options: string, type = 'line') => {
      const el = document.createElement('oas-chart')
      if (rtl) el.setAttribute('dir', 'rtl')
      el.setAttribute('type', type)
      el.setAttribute('options', options)
      el.setAttribute('data', data)
      document.body.appendChild(el)
      const svg = el.shadowRoot!.querySelector('svg')!
      const texts = [...svg.querySelectorAll('text.axis-label')] as SVGTextElement[]
      const out = {
        labels: texts.map((t) => `${t.getAttribute('x')}|${t.getAttribute('y')}|${t.getAttribute('transform') ?? ''}`),
        anchors: texts.map((t) => getComputedStyle(t).textAnchor),
        dirs: texts.map((t) => getComputedStyle(t).direction),
        bars: [...svg.querySelectorAll('rect.bar')].map((b) => `${b.getAttribute('x')}|${b.getAttribute('width')}`),
        grid: [...svg.querySelectorAll('line.axis-line')].map(
          (l) => `${l.getAttribute('x1')},${l.getAttribute('y1')},${l.getAttribute('x2')},${l.getAttribute('y2')}`,
        ),
      }
      el.remove()
      return out
    }
    return {
      thinLtr: snap(false, '{}'),
      thinRtl: snap(true, '{}'),
      rotLtr: snap(false, '{"xLabelRotate":90}'),
      rotRtl: snap(true, '{"xLabelRotate":90}'),
      barLtr: snap(false, '{}', 'bar'),
      barRtl: snap(true, '{}', 'bar'),
    }
  })

  expect(r.thinRtl.labels, 'RTL 抽稀标签落点与 LTR 相同').toEqual(r.thinLtr.labels)
  expect(r.thinRtl.grid, 'RTL 网格与 LTR 相同').toEqual(r.thinLtr.grid)
  expect(r.rotRtl.labels, 'RTL 竖排标签几何（含 rotate 变换）与 LTR 相同').toEqual(r.rotLtr.labels)
  expect(r.barRtl.bars, 'RTL 柱组居中与 LTR 相同').toEqual(r.barLtr.bars)
  expect(r.rotRtl.labels.length, 'RTL 下旋转标签数量与 LTR 相同（抽稀步长不受书写方向影响）').toBe(
    r.rotLtr.labels.length,
  )
  expect(new Set(r.rotRtl.dirs), 'svg 内文字方向恒 ltr').toEqual(new Set(['ltr']))
  expect(new Set(r.rotRtl.anchors), '旋转标签锚点恒 start（RTL 下不翻成 end）').toEqual(new Set(['start']))
  expect(new Set(r.thinLtr.anchors), '缺省（水平）标签锚点仍由 CSS 给 middle').toEqual(new Set(['middle']))
})
