// 复核回归：workbench 族（titlebar/statusbar/inspector/action-bar）。
// 固化点：titlebar 拖动区契约（标记 + 样式表规则 + 拖动区内按钮真实可点）、文档井提交反射、
// titlebar/action-bar 容器语义（role=group + aria-label——无 role 的 aria-label 会被 AT 忽略；
// action-bar 因 center 槽常规承载读数井不作 toolbar roving 承诺）、
// inspector 分节折叠（open 反射 + aria-expanded + 可见反馈）、statusbar 项点击事件反馈、
// statusbar-item / statistic-well / transport-well / music-well 全空态宿主级隐藏
// （data-empty + 零布局足迹，相邻项 x 不变）、transport-well 键盘 seek 受控回写闭环、
// action-bar 事件反馈（oas-action 回写 / oas-cancel）、charcoal 恒深表面跨主题不变、
// 四页 console 零告警 + 暗色冒烟。
// 断言轮询属性/显隐/输出行文案，不断言过渡动画帧。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

// console 告警收集容器（Page 内建 consoleMessages() 是方法，用独立属性名防撞）
type ConsolePage = import('@playwright/test').Page & { __oasConsole: string[] }

test.beforeEach(async ({ page }) => {
  // 零告警门禁：error/warning 都算。
  // 白名单：preview 为 production build，GA4 注入的 cookie 过期属性覆盖告警属 benign
  // （与 smoke/console-sweep 白名单同源口径，firefox 下以 JS Warning 形态出现）
  const p = page as ConsolePage
  p.__oasConsole = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    if (/_ga_RXS142HBXF|Google Analytics|gtag/.test(msg.text())) return
    p.__oasConsole.push(`${msg.type()}: ${msg.text()}`)
  })
})

test('titlebar 拖动区契约：drag 标记 + 样式表规则 + 拖动区内按钮真实可点（no-drag 自动生效）', async ({ page }) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-basic')
  // 拖动区契约：drag demo 块内第二块（drag 属性）
  const contract = await page.evaluate(() => {
    const host = [...document.querySelectorAll('oas-titlebar')].find((el) => el.hasAttribute('drag'))!
    const styleText = host.shadowRoot!.querySelector('style')!.textContent ?? ''
    return {
      dragRegion: host.hasAttribute('data-drag-region'),
      tauriRegion: host.hasAttribute('data-tauri-drag-region'),
      hostRule: /:host\(\[data-drag-region\]\)[^}]*-webkit-app-region:\s*drag/.test(styleText),
      noDragRules: styleText.includes('no-drag'),
    }
  })
  expect(contract.dragRegion, 'drag 属性在场打 data-drag-region 标记').toBe(true)
  expect(contract.tauriRegion, 'drag 属性在场打 data-tauri-drag-region 标记（Tauri 拖动识别）').toBe(true)
  expect(contract.hostRule, '样式表含 :host([data-drag-region]) -webkit-app-region: drag 规则').toBe(true)
  expect(contract.noDragRules, '样式表含交互子件 no-drag 规则').toBe(true)

  // 关键回归：拖动区内按钮真实点击不被吞（no-drag 生效的最终判定——用户视角）。
  // leading 按钮是 light DOM（slot 内容），centerOf/realClick 的 shadow 查询够不到——
  // 直接对 light DOM 元素 locator 真实点击（demo 位于页首，无焦点滚动干扰）
  const leadingBtn = page.locator('oas-titlebar[drag] oas-button[slot="leading"]')
  await leadingBtn.scrollIntoViewIfNeeded()
  await leadingBtn.click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })

  // 移除 drag 后标记完全撤除
  await page.evaluate(() => {
    const host = [...document.querySelectorAll('oas-titlebar')].find((el) => el.hasAttribute('drag'))!
    host.removeAttribute('drag')
    host.setAttribute('data-probe', '')
  })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const host = document.querySelector('oas-titlebar[data-probe]')!
        return host.hasAttribute('data-drag-region') || host.hasAttribute('data-tauri-drag-region')
      }),
    )
    .toBe(false)
})

test('titlebar 文档井：Enter 提交派发 oas-title-change、title 属性反射回写、demo 输出可见', async ({ page }) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-doc')
  await page.evaluate(() => {
    const input = document.querySelector('#tb-doc')!.shadowRoot!.querySelector<HTMLInputElement>('[part="doc-title"]')!
    input.value = '春季发布会主视觉 v3'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => (document.querySelector('#tb-doc-out')?.textContent ?? '').includes('oas-title-change'),
    null,
    { timeout: 5000 },
  )
  const state = await page.evaluate(() => ({
    hostTitleAttr: document.querySelector('#tb-doc')!.hasAttribute('title'),
    rendered: document.querySelector('#tb-doc')!.shadowRoot!.querySelector<HTMLInputElement>('[part="doc-title"]')!
      .value,
    out: document.querySelector('#tb-doc-out')!.textContent ?? '',
  }))
  expect(state.rendered, '文档井输入值更新（吸收缓存驱动渲染）').toBe('春季发布会主视觉 v3')
  expect(state.hostTitleAttr, 'title 不常驻宿主属性（吸收语义，防原生 tooltip）').toBe(false)
  expect(state.out, 'demo 输出行含提交值（可见反馈）').toContain('春季发布会主视觉 v3')
})

test('inspector 分节折叠：点击切换 open 反射 + aria-expanded 同步 + oas-toggle 输出可见', async ({ page }) => {
  await page.goto('/components/inspector.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#insp-fold')
  const sections = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#insp-fold oas-inspector-section')].map((s) => ({
        open: s.hasAttribute('open'),
        expanded: s.shadowRoot!.querySelector('[part="section-toggle"]')!.getAttribute('aria-expanded'),
      })),
    )
  const before = await sections()
  expect(before.length, 'demo 有两个可折叠分节').toBe(2)
  expect(
    before.every((s) => !s.open),
    '初始均收起',
  ).toBe(true)
  // 点第一个分节头
  await page.evaluate(() =>
    (
      document
        .querySelector('#insp-fold oas-inspector-section')!
        .shadowRoot!.querySelector('[part="section-toggle"]') as HTMLElement
    ).click(),
  )
  await page.waitForFunction(
    () => (document.querySelector('#insp-fold-out')?.textContent ?? '').includes('oas-toggle'),
    null,
    { timeout: 5000 },
  )
  const after = await sections()
  expect(after[0]!.open, '点击后 open 属性反射为展开').toBe(true)
  expect(after[0]!.expanded, 'aria-expanded 同步').toBe('true')
  const out = await page.evaluate(() => document.querySelector('#insp-fold-out')!.textContent ?? '')
  expect(out, '输出行含 name 与 open（可见反馈）').toContain('typography')
  expect(out).toContain('true')
})

test('statusbar 可点项：点击派发 oas-item-click、demo 输出可见反馈', async ({ page }) => {
  await page.goto('/components/statusbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-click')
  await page.evaluate(() =>
    (
      document
        .querySelector('#sb-click oas-statusbar-item[button]')!
        .shadowRoot!.querySelector('[part="item"]') as HTMLElement
    ).click(),
  )
  await page.waitForFunction(
    () => (document.querySelector('#sb-click-out')?.textContent ?? '').includes('oas-item-click'),
    null,
    { timeout: 5000 },
  )
  const out = await page.evaluate(() => document.querySelector('#sb-click-out')!.textContent ?? '')
  expect(out, '输出行含 label 与 value（可见反馈）').toContain('问题')
  expect(out).toContain('3')
})

test('action-bar 命令按钮：点击派发 oas-action、宿主回写 active、data-active 钩子切换', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  const record = page.locator('#ab-record')
  expect(await record.getAttribute('data-active'), '初始未选中').toBeNull()
  await record.click()
  await page.waitForFunction(
    () => (document.querySelector('#ab-btn-out')?.textContent ?? '').includes('oas-action'),
    null,
    { timeout: 5000 },
  )
  expect(await record.getAttribute('data-active'), '宿主回写后 data-active 在场（选中态钩子）').toBe('')
  const out = await page.evaluate(() => document.querySelector('#ab-btn-out')!.textContent ?? '')
  expect(out, '输出行含 value 与点击时刻 active=false（可见反馈）').toContain('value=record')
  expect(out).toContain('active（点击时刻）=false')
  await record.click()
  await expect.poll(() => record.getAttribute('data-active')).toBeNull()
})

test('action-bar 选中态可见：active 在场时按钮内层真实着色（active-tint），非仅宿主钩子', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  const record = page.locator('#ab-record')
  const innerColor = () =>
    page.evaluate(() => {
      const btn = document.querySelector('#ab-record')!.shadowRoot!.querySelector('[part="button"]')!
      return getComputedStyle(btn).color
    })
  const inactive = await innerColor()
  await record.click()
  await page.waitForFunction(() => document.querySelector('#ab-record')!.hasAttribute('data-active'), null, {
    timeout: 5000,
  })
  const active = await innerColor()
  // plain + active-tint=#e11d48：选中态文字应变成 tint 色（rgb(225, 29, 72)），与未选中不同。
  // 回归：选择器曾写在内层 .btn 上（宿主属性不命中）→ 选中无任何视觉。
  expect(active, '选中态按钮内层着色为 active-tint（用户可见）').toBe('rgb(225, 29, 72)')
  expect(active, '选中态与未选中态视觉不同').not.toBe(inactive)
})

test('action-bar light 表体：命令按钮底色异于表体（本色浅底上按钮不消失）', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-action-bar[theme="light"]')
  const probe = await page.evaluate(() => {
    const bar = document.querySelector('oas-action-bar[theme="light"]')!
    const barBg = getComputedStyle(bar.shadowRoot!.querySelector('[part="bar"]')!).backgroundColor
    const btn = bar.querySelector('oas-action-bar-button')!
    const btnBg = getComputedStyle(btn.shadowRoot!.querySelector('[part="button"]')!).backgroundColor
    // 兼容 rgb()/rgba() 与 color(srgb r g b / a) 两种序列化（color-mix 结果在引擎间不同）
    const parse = (c: string) => {
      let m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/)
      if (m) return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] === undefined ? 1 : +m[4]! }
      m = c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/)
      if (m) return { r: +m[1]! * 255, g: +m[2]! * 255, b: +m[3]! * 255, a: m[4] === undefined ? 1 : +m[4]! }
      return null
    }
    const b = parse(barBg)
    const f = parse(btnBg)
    if (!b || !f) return { diff: -1, barBg, btnBg }
    // 把按钮底色按 alpha 合成到表体底色上，与表体底色的通道差应足够大（>20）才算可见
    const comp = [f.r * f.a + b.r * (1 - f.a), f.g * f.a + b.g * (1 - f.a), f.b * f.a + b.b * (1 - f.a)]
    const diff = Math.abs(comp[0]! - b.r) + Math.abs(comp[1]! - b.g) + Math.abs(comp[2]! - b.b)
    return { diff, barBg, btnBg }
  })
  expect(probe.diff, `light 表体按钮底色须可见（合成通道差，实测 ${JSON.stringify(probe)}）`).toBeGreaterThan(20)
})

test('inspector default-open 分节可折叠且折叠后保持收起（不被 update 回弹）', async ({ page }) => {
  await page.goto('/components/inspector.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-inspector-section[default-open]')
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector('oas-inspector-section[default-open]')!.hasAttribute('open')),
    )
    .toBe(true)
  await page.evaluate(() =>
    (
      document
        .querySelector('oas-inspector-section[default-open]')!
        .shadowRoot!.querySelector('[part="section-toggle"]') as HTMLElement
    ).click(),
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = document.querySelector('oas-inspector-section[default-open]')!
        return { open: s.hasAttribute('open'), dataOpen: s.hasAttribute('data-open') }
      }),
    )
    .toEqual({ open: false, dataOpen: false })
})

test('inspector 非折叠分节恒展开（纯标题分节内容不被 0fr 裁没）', async ({ page }) => {
  await page.goto('/components/inspector.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#insp-fold oas-inspector-section')
  const state = await page.evaluate(() => {
    // 取页面上已有的可折叠分节，移除 collapsible → 变纯标题分节：必须恒展开（data-open 在场）
    const s = document.querySelector('#insp-fold oas-inspector-section')!
    s.removeAttribute('collapsible')
    return {
      dataOpen: s.hasAttribute('data-open'),
      toggleHidden: (s.shadowRoot!.querySelector('[part="section-toggle"]') as HTMLElement).hidden,
    }
  })
  expect(state.toggleHidden, '非折叠分节无折叠钮').toBe(true)
  expect(state.dataOpen, '非折叠分节必须展开（data-open 在场）').toBe(true)
})

test('inspector-row striped/align-top：斑马底可见（背景非透明且异于普通行）+ 顶对齐生效', async ({ page }) => {
  await page.goto('/components/inspector.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-inspector-row[striped]')
  const probe = await page.evaluate(() => {
    const striped = document.querySelector('oas-inspector-row[striped]')!
    const plain = [...document.querySelectorAll('oas-inspector-row')].find(
      (r) => !r.hasAttribute('striped') && r.hasAttribute('value'),
    )!
    const align = document.querySelector('oas-inspector-row[align-top]')!
    const bg = (el: Element) => getComputedStyle(el.shadowRoot!.querySelector('[part="row"]')!).backgroundColor
    const ai = (el: Element) => getComputedStyle(el.shadowRoot!.querySelector('[part="row"]')!).alignItems
    return { stripedBg: bg(striped), plainBg: bg(plain), alignTop: ai(align) }
  })
  expect(probe.stripedBg, 'striped 行有背景色（非 transparent）').not.toBe('rgba(0, 0, 0, 0)')
  expect(probe.stripedBg, 'striped 与普通行底色不同（用户可见）').not.toBe(probe.plainBg)
  expect(probe.alignTop, 'align-top 行 align-items 顶对齐').toBe('flex-start')
})

test('action-bar 任务进度井：取消派发 oas-cancel、进度受控推进、100% 保留完成态', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-task')
  // 驱动进度：点「导出」（demo 定时推进 progress）
  await page.evaluate(() =>
    (
      document
        .querySelector('#ab-task oas-action-bar-button[value="export"]')!
        .shadowRoot!.querySelector('[part="button"]') as HTMLElement
    ).click(),
  )
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-task-well')!.getAttribute('progress')))
    .not.toBe('62')
  // 进度条 aria 同步
  const aria = await page.evaluate(() => {
    const well = document.querySelector('#ab-task-well')!
    return well.shadowRoot!.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')
  })
  expect(Number(aria), 'progressbar aria-valuenow 跟随受控 progress').toBeGreaterThan(62)
  // 取消：点井内 × → oas-cancel + 输出行 + 进度停推
  await page.evaluate(() =>
    (document.querySelector('#ab-task-well')!.shadowRoot!.querySelector('[part="well-cancel"]') as HTMLElement).click(),
  )
  await page.waitForFunction(
    () => (document.querySelector('#ab-task-out')?.textContent ?? '').includes('oas-cancel'),
    null,
    { timeout: 5000 },
  )
  const frozen = await page.evaluate(() => document.querySelector('#ab-task-well')!.getAttribute('progress'))
  await page.waitForTimeout(700)
  expect(
    await page.evaluate(() => document.querySelector('#ab-task-well')!.getAttribute('progress')),
    '取消后进度不再推进（demo 定时器停止）',
  ).toBe(frozen)
})

test('action-bar charcoal 恒深表面：light/dark 主题下背景色一致（不随宿主主题翻转）', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  const bgOf = () =>
    page.evaluate(() => {
      const bar = document.querySelector('#ab-btn')!.shadowRoot!.querySelector('[part="bar"]')!
      return getComputedStyle(bar).backgroundColor
    })
  const lightBg = await bgOf()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(120)
  const darkBg = await bgOf()
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  expect(darkBg, 'charcoal 表体在 dark 主题下背景色不变（恒深 token 契约）').toBe(lightBg)
})

test('titlebar editable 文档井 + subtitle 状态行：subtitle 照常可见（回归：曾被 editable 强制隐藏，demo 提示静默失效）', async ({
  page,
}) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-doc')
  const state = await page.evaluate(() => {
    const root = document.querySelector('#tb-doc')!.shadowRoot!
    const subtitle = root.querySelector<HTMLElement>('[part="subtitle"]')!
    const input = root.querySelector<HTMLInputElement>('[part="doc-title"]')!
    return { subtitleHidden: subtitle.hidden, subtitleText: subtitle.textContent ?? '', inputHidden: input.hidden }
  })
  expect(state.inputHidden, 'editable 下文档井输入可见').toBe(false)
  expect(state.subtitleHidden, 'editable 下 subtitle 状态行不被强制隐藏（用户可见）').toBe(false)
  expect(state.subtitleText.length, 'subtitle 状态行渲染提示文本').toBeGreaterThan(0)
})

test('action-bar end 段推远端契约：无 center 时 end 的 margin 接棒 auto（回归：曾固定间距贴命令区）', async ({
  page,
}) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  const contract = await page.evaluate(() => {
    const host = [...document.querySelectorAll('oas-action-bar')].at(-1)!
    const css = host.shadowRoot!.querySelector('style')!.textContent ?? ''
    return {
      endAuto: /\.end\s*\{[^}]*margin-inline-start:\s*auto/.test(css),
      centerAdjacent:
        /\.center:not\(\[hidden\]\)\s*\+\s*\.end\s*\{[^}]*margin-inline-start:\s*var\(--oas-space-2\)/.test(css),
    }
  })
  expect(contract.endAuto, 'end 默认 auto margin 推远端（末端语义不因井缺席失效）').toBe(true)
  expect(contract.centerAdjacent, 'center 在场时 end 回固定间距（紧凑排布保持）').toBe(true)
})

test('statusbar-item 全空态宿主级隐藏：data-empty 反射 + 无布局足迹（相邻真实项 x 坐标不变）——回归：曾只藏内部格子、宿主仍占 4px 幽灵 gap', async ({
  page,
}) => {
  await page.goto('/components/statusbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-click')
  // 基线：真实项的 x 坐标（第一项「问题」与相邻项「同步」）
  const xOf = (label: string) =>
    page.evaluate((l) => {
      const item = [...document.querySelectorAll('#sb-click oas-statusbar-item')].find(
        (el) => el.getAttribute('label') === l,
      )!
      return item.getBoundingClientRect().x
    }, label)
  const beforeFirst = await xOf('问题')
  const beforeSecond = await xOf('同步')
  expect(beforeSecond > beforeFirst, '基线布局正常（两项不重叠）').toBe(true)
  // 注入空探针（无任何内容属性）
  await page.evaluate(() => {
    const bar = document.querySelector('oas-statusbar#sb-click')!
    const empty = document.createElement('oas-statusbar-item')
    empty.setAttribute('data-empty-probe', '')
    bar.prepend(empty)
  })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-statusbar-item[data-empty-probe]')!
        return el.hasAttribute('data-empty')
      }),
    )
    .toBe(true)
  // 用户视角：空探针无布局足迹（display:none → 零宽矩形）+ 相邻真实项 x 坐标不变
  const probe = await page.evaluate(() => {
    const el = document.querySelector('oas-statusbar-item[data-empty-probe]')!
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  expect(probe.width, '空探针零宽（宿主 display:none，不留 gap 位）').toBe(0)
  expect(probe.height, '空探针零高').toBe(0)
  expect(await xOf('问题'), '含空探针时第一真实项 x 不变（无幽灵 gap）').toBe(beforeFirst)
  expect(await xOf('同步'), '含空探针时相邻真实项 x 不变').toBe(beforeSecond)
  // 探针有内容后恢复可见（机制回归：动态内容通道切换）
  await page.evaluate(() =>
    document.querySelector('oas-statusbar-item[data-empty-probe]')!.setAttribute('label', '探针'),
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-statusbar-item[data-empty-probe]')!
        return { empty: el.hasAttribute('data-empty'), width: el.getBoundingClientRect().width }
      }),
    )
    .toEqual({ empty: false, width: expect.any(Number) })
  const filled = await page.evaluate(
    () => document.querySelector('oas-statusbar-item[data-empty-probe]')!.getBoundingClientRect().width,
  )
  expect(filled, '填入内容后探针真实占位').toBeGreaterThan(0)
})

test('statistic-well 全空态宿主级隐藏：data-empty 反射 + 零尺寸（回归：空井曾留固定高胶囊占位）', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  // 动态注入全空 statistic-well（label/value/detail 全缺）
  await page.evaluate(() => {
    const bar = document.querySelector('#ab-btn')!
    const wrap = document.createElement('oas-action-bar-well')
    wrap.slot = 'center'
    const empty = document.createElement('oas-statistic-well')
    empty.setAttribute('data-empty-probe', '')
    wrap.appendChild(empty)
    bar.appendChild(wrap)
  })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-statistic-well[data-empty-probe]')!
        return el.hasAttribute('data-empty')
      }),
    )
    .toBe(true)
  const probe = await page.evaluate(() => {
    const el = document.querySelector('oas-statistic-well[data-empty-probe]')!
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  expect(probe.width, '空井零宽（不留固定高胶囊占位）').toBe(0)
  expect(probe.height, '空井零高').toBe(0)
  // 对照：有内容时真实占位（同探针填 value）
  await page.evaluate(() => document.querySelector('oas-statistic-well[data-empty-probe]')!.setAttribute('value', '1'))
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-statistic-well[data-empty-probe]')!
        return { empty: el.hasAttribute('data-empty'), width: el.getBoundingClientRect().width }
      }),
    )
    .toEqual({ empty: false, width: expect.any(Number) })
  expect(
    await page.evaluate(
      () => document.querySelector('oas-statistic-well[data-empty-probe]')!.getBoundingClientRect().width,
    ),
    '有内容后井真实占位（胶囊可见）',
  ).toBeGreaterThan(0)
})

test('task-progress-well 全空态宿主级隐藏：data-empty 反射 + 零尺寸（回归：空井曾恒显 0% + 取消钮占胶囊）', async ({
  page,
}) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  // 动态注入全空 task-progress-well（label/detail 全缺且未设 progress）
  await page.evaluate(() => {
    const bar = document.querySelector('#ab-btn')!
    const wrap = document.createElement('oas-action-bar-well')
    wrap.slot = 'center'
    const empty = document.createElement('oas-task-progress-well')
    empty.setAttribute('data-empty-probe', '')
    wrap.appendChild(empty)
    bar.appendChild(wrap)
  })
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-task-progress-well[data-empty-probe]')!
        return el.hasAttribute('data-empty')
      }),
    )
    .toBe(true)
  const probe = await page.evaluate(() => {
    const el = document.querySelector('oas-task-progress-well[data-empty-probe]')!
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  expect(probe.width, '空井零宽（不留固定高胶囊占位）').toBe(0)
  expect(probe.height, '空井零高').toBe(0)
  // 对照：设 label 后真实占位
  await page.evaluate(() =>
    document.querySelector('oas-task-progress-well[data-empty-probe]')!.setAttribute('label', '导出'),
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('oas-task-progress-well[data-empty-probe]')!
        return { empty: el.hasAttribute('data-empty'), width: el.getBoundingClientRect().width }
      }),
    )
    .toEqual({ empty: false, width: expect.any(Number) })
  expect(
    await page.evaluate(
      () => document.querySelector('oas-task-progress-well[data-empty-probe]')!.getBoundingClientRect().width,
    ),
    '有内容后井真实占位（胶囊可见）',
  ).toBeGreaterThan(0)
})

test('transport-well 键盘 seek：←/→ 真实键盘路径派发 oas-seek、宿主回写后时间码推进 + 输出行可见', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-tc-well')
  const tc = () =>
    page.evaluate(() => {
      const well = document.querySelector('#ab-tc-well')!
      const slider = well.shadowRoot!.querySelector('[part="well-value"]')!
      return {
        text: slider.textContent ?? '',
        now: slider.getAttribute('aria-valuenow'),
        frames: well.getAttribute('frames'),
      }
    })
  const before = await tc()
  expect(before.frames, 'demo 初始 frames=1079').toBe('1079')
  // 真实键盘路径：聚焦 shadow 内滑轨 → page.keyboard 发键
  await page.evaluate(() =>
    (document.querySelector('#ab-tc-well')!.shadowRoot!.querySelector('[part="well-value"]') as HTMLElement).focus(),
  )
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(
    () => (document.querySelector('#ab-tc-out')?.textContent ?? '').includes('oas-seek'),
    null,
    { timeout: 5000 },
  )
  const after = await tc()
  expect(after.frames, '宿主回写 frames=1080（受控 seek 闭环）').toBe('1080')
  expect(after.text, '时间码读数真实推进（用户可见）').toBe('00:00:43:05')
  expect(after.now, 'aria-valuenow 同步').toBe('1080')
  // End 键：跳尾帧（duration=2500）
  await page.keyboard.press('End')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-tc-well')!.getAttribute('frames')))
    .toBe('2500')
  const out = await page.evaluate(() => document.querySelector('#ab-tc-out')!.textContent ?? '')
  expect(out, '输出行含 seek 反馈（可见反馈块）').toContain('oas-seek 已派发')
})

test('music-well 渲染：位置段 5.3 + detail 拼接 120 BPM · 4/4（用户可见读数）', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-tc-well')
  const state = await page.evaluate(() => {
    const well = [...document.querySelectorAll('oas-music-well')][0]!
    const root = well.shadowRoot!
    return {
      value: root.querySelector<HTMLElement>('[part="well-value"]')!.textContent,
      valueHidden: root.querySelector<HTMLElement>('[part="well-value"]')!.hidden,
      detail: root.querySelector<HTMLElement>('[part="well-detail"]')!.textContent,
      empty: well.hasAttribute('data-empty'),
    }
  })
  expect(state.empty, 'demo 井有内容（不退场）').toBe(false)
  expect(state.value, '位置段显示 小节.节拍').toBe('5.3')
  expect(state.detail, 'detail 段自动拼 BPM 与拍号').toBe('120 BPM · 4/4')
})

test('transport/music 井全空态宿主级隐藏：data-empty 反射 + 零尺寸（同 statistic-well 契约）', async ({ page }) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  // 动态注入两个全空探针井
  await page.evaluate(() => {
    const bar = document.querySelector('#ab-btn')!
    for (const tag of ['oas-transport-well', 'oas-music-well']) {
      const wrap = document.createElement('oas-action-bar-well')
      wrap.slot = 'center'
      const empty = document.createElement(tag)
      empty.setAttribute('data-empty-probe', '')
      wrap.appendChild(empty)
      bar.appendChild(wrap)
    }
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-empty-probe]')].every((el) => el.hasAttribute('data-empty')),
      ),
    )
    .toBe(true)
  const rects = await page.evaluate(() =>
    [...document.querySelectorAll('[data-empty-probe]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { tag: el.tagName.toLowerCase(), w: r.width, h: r.height }
    }),
  )
  expect(rects, '两个空探针均零宽零高（不留固定高胶囊占位）').toEqual([
    { tag: 'oas-transport-well', w: 0, h: 0 },
    { tag: 'oas-music-well', w: 0, h: 0 },
  ])
  // 填内容后恢复占位
  await page.evaluate(() => {
    ;(document.querySelector('oas-transport-well[data-empty-probe]') as HTMLElement).setAttribute('frames', '0')
    ;(document.querySelector('oas-music-well[data-empty-probe]') as HTMLElement).setAttribute('bars', '1')
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-empty-probe]')].every(
          (el) => !el.hasAttribute('data-empty') && el.getBoundingClientRect().width > 0,
        ),
      ),
    )
    .toBe(true)
})

test('action-bar 语义降级为 role=group + aria-label（取舍：center 槽读数井非命令控件，不满足 toolbar roving 契约）', async ({
  page,
}) => {
  await page.goto('/components/action-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-btn')
  const semantics = await page.evaluate(() => {
    const bar = document.querySelector('#ab-btn')!.shadowRoot!.querySelector('[part="bar"]')!
    return { role: bar.getAttribute('role'), label: bar.getAttribute('aria-label') }
  })
  expect(semantics.role, '容器 role=group（非 toolbar——读数井在场不作纯命令集合承诺）').toBe('group')
  expect(semantics.label?.length, 'aria-label 在场（AT 可播报组名）').toBeGreaterThan(0)
})

test('titlebar 容器语义：role=group + aria-label（回归：aria-label 曾挂无 role div，AT 忽略）', async ({ page }) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-basic')
  const semantics = await page.evaluate(() => {
    const bar = document.querySelector('#tb-basic')!.shadowRoot!.querySelector('[part="bar"]')!
    return { role: bar.getAttribute('role'), label: bar.getAttribute('aria-label') }
  })
  expect(semantics.role, '容器 role=group（aria-label 有挂载目标，AT 可播报）').toBe('group')
  expect(semantics.label?.length, 'aria-label 在场').toBeGreaterThan(0)
})

for (const page_ of ['titlebar', 'statusbar', 'inspector', 'action-bar']) {
  test(`workbench ${page_} 页 console 零告警 + 暗色冒烟`, async ({ page }) => {
    await page.goto(`/components/${page_}.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    // 暗色切换后组件 shadow 正常渲染（任取一个组件探活）
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(200)
    const probe = await page.evaluate(
      (tag) => {
        const el = document.querySelector(tag)
        return el != null && el.shadowRoot != null && el.shadowRoot.innerHTML.length > 0
      },
      `oas-${page_ === 'action-bar' ? 'action-bar' : page_}`,
    )
    expect(probe, '暗色下组件 shadow 保持渲染').toBe(true)
    expect(
      (page as ConsolePage).__oasConsole,
      `${page_}.html console 零告警（${JSON.stringify((page as ConsolePage).__oasConsole)}）`,
    ).toEqual([])
  })
}

test('titlebar macOS 交通灯：三点 macOS 固定色 + 点击派发 oas-window-action + 悬停显符号', async ({ page }) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-macos')
  // C1 回归：titlebar 的 no-drag 白名单必须含交通灯（否则 Electron/Tauri 下点击被拖动区吞）
  const noDragListed = await page.evaluate(() => {
    const css = document.querySelector('#tb-macos')!.shadowRoot!.querySelector('style')!.textContent ?? ''
    return css.includes('::slotted(oas-traffic-lights)')
  })
  expect(noDragListed, 'titlebar no-drag 白名单含 oas-traffic-lights').toBe(true)
  const colors = await page.evaluate(() => {
    const tl = document.querySelector('#tb-macos oas-traffic-lights')!.shadowRoot!
    const cs = (a: string) => getComputedStyle(tl.querySelector(`.dot[data-action="${a}"]`)!).backgroundColor
    return { close: cs('close'), min: cs('minimize'), max: cs('maximize'), count: tl.querySelectorAll('.dot').length }
  })
  expect(colors.count, '三点').toBe(3)
  expect(colors.close, '关闭点为 macOS 红').toBe('rgb(255, 95, 87)')
  expect(colors.min, '最小化为黄').toBe('rgb(254, 188, 46)')
  expect(colors.max, '最大化为绿').toBe('rgb(40, 200, 64)')

  // 悬停显符号（.dot color 由 transparent → 有色）
  await page.hover('#tb-macos oas-traffic-lights')
  await page.waitForTimeout(150)
  const glyph = await page.evaluate(() => {
    const tl = document.querySelector('#tb-macos oas-traffic-lights')!.shadowRoot!
    return getComputedStyle(tl.querySelector('.dot[data-action="close"]')!).color
  })
  expect(glyph, '悬停符号固定深色（非近白，暗色亦可读）').toBe('rgba(0, 0, 0, 0.55)')

  // 点击关闭 → oas-window-action 反馈可见
  await page.evaluate(() =>
    (
      document
        .querySelector('#tb-macos oas-traffic-lights')!
        .shadowRoot!.querySelector('.dot[data-action="close"]') as HTMLElement
    ).click(),
  )
  await expect(page.locator('#tb-macos-out')).toContainText('action=close', { timeout: 5000 })
})
