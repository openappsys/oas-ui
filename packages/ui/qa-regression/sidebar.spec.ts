// 复核回归：sidebar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

// —— 缺陷回归：openDrawer/closeDrawer 曾为 private，外部无法以 OASSidebar 类型调用 ——
// 现为公开方法：外部调用等价于点击内置触发按钮 / 遮罩，必须产生真实可见反馈（面板滑入滑出，
// 非只改属性）。此处量 computed visibility 与面板实际 x 坐标（真实视觉），不是只查 drawer-open 属性。
test('sidebar 公开方法：外部调用 openDrawer/closeDrawer 开合移动抽屉（真实视觉反馈）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#sidebar-drawer')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
  const r = await page.evaluate(async () => {
    // 外部视角：不触碰 shadow 内部按钮，直接调公开方法（private 时类型层不可达）
    const el = document.getElementById('sidebar-drawer') as HTMLElement & {
      openDrawer: () => void
      closeDrawer: () => void
    }
    const panel = () => el.shadowRoot!.querySelector('.panel') as HTMLElement
    const mask = () => el.shadowRoot!.querySelector('.mask') as HTMLElement
    const settle = async (pred: () => boolean, timeout = 5000) => {
      const t0 = performance.now()
      while (performance.now() - t0 < timeout) {
        if (pred()) return
        await new Promise((res) => requestAnimationFrame(res))
      }
    }
    const snapshot = () => ({
      attr: el.hasAttribute('drawer-open'),
      panelVisibility: getComputedStyle(panel()).visibility,
      panelLeft: Math.round(panel().getBoundingClientRect().left),
      panelWidth: Math.round(panel().getBoundingClientRect().width),
      maskVisibility: getComputedStyle(mask()).visibility,
    })
    await settle(() => getComputedStyle(panel()).visibility === 'hidden')
    const before = snapshot()
    el.openDrawer()
    await settle(() => getComputedStyle(panel()).visibility === 'visible')
    await settle(() => Math.round(panel().getBoundingClientRect().left) === 0)
    const opened = snapshot()
    el.closeDrawer()
    await settle(() => getComputedStyle(panel()).visibility === 'hidden')
    const closed = snapshot()
    return { before, opened, closed }
  })
  // 关闭态：面板真实滑出视口左外（visibility:hidden，x 为负）
  expect(r.before.attr, '初始不应带 drawer-open').toBe(false)
  expect(r.before.panelVisibility, '初始面板应隐藏').toBe('hidden')
  expect(r.before.panelLeft, '初始面板应滑出视口左外').toBeLessThan(0)
  // openDrawer 后：属性置位 + 面板真实可见并停在 x=0（滑入）
  expect(r.opened.attr, 'openDrawer 应置位 drawer-open').toBe(true)
  expect(r.opened.panelVisibility, 'openDrawer 后面板应可见').toBe('visible')
  expect(r.opened.panelWidth, '面板应有真实宽度').toBeGreaterThan(0)
  // 面板左缘贴 0（-0/亚像素引擎差异容差：Firefox 可算出 -0 或 -0.4px）
  expect(Math.abs(r.opened.panelLeft), 'openDrawer 后面板应滑入到 x=0').toBeLessThan(1)
  expect(r.opened.maskVisibility, 'openDrawer 后遮罩应可见').toBe('visible')
  // closeDrawer 后：属性移除 + 面板真实滑出（可见反馈可逆）
  expect(r.closed.attr, 'closeDrawer 应移除 drawer-open').toBe(false)
  expect(r.closed.panelVisibility, 'closeDrawer 后面板应隐藏').toBe('hidden')
  expect(r.closed.panelLeft, 'closeDrawer 后面板应滑出视口左外').toBeLessThan(0)
})

test('sidebar resizable：拖拽 rail 边缘宽度实时跟随并写回 width 属性（内置 rail）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#sidebar-resizable')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
  const r = await page.evaluate(async () => {
    const sb = document.querySelector('#sidebar-resizable') as HTMLElement
    sb.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const rail = sb.shadowRoot!.querySelector('[part="rail"]') as HTMLElement
    const rect = rail.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    rail.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    const widths: number[] = []
    for (let i = 1; i <= 3; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }))
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 90, clientY: cy }))
    await new Promise((res) => setTimeout(res, 200))
    return {
      w0,
      widths,
      widthAttr: sb.getAttribute('width'),
      logText: document.getElementById('sidebar-resize-log')?.textContent ?? '',
      railHidden: rail.hidden,
    }
  })
  expect(r.railHidden, 'resizable 态 rail 应显示').toBe(false)
  expect(r.w0, '初始宽度应为 220（width 属性值）').toBe(220)
  expect(r.widths.length, '拖拽采样应有宽度读数').toBe(3)
  const mono = r.widths.every((w, i) => i === 0 || w > r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调递增').toBe(true)
  expect(r.widths[2], '拖拽后宽度应增大').toBeGreaterThan(r.w0)
  expect(r.widthAttr, '拖拽应写回 width 属性').toBe(`${r.widths[2]}px`)
  expect(r.logText, 'oas-resize 事件应更新 demo 日志').toContain(`${r.widths[2]}px`)
})
// —— 缺陷回归：sidebar 嵌套子菜单 label 缩进对齐（不得与父项齐平/更靠左） ——
// 曾现缺陷：嵌套无图标项 icon 占位被 hidden 折叠，子项 label 与父项 label 齐平甚至偏左
//（实测子 label 比父 label 左 3px），层级错乱。修复：嵌套无图标项保留图标占位（24px），
// 子项 label 缩进父项 label 右侧。本断言真布局测量 label x 坐标。
test('sidebar 嵌套子菜单：无图标子项 label 缩进父项 label 右侧（层级不错乱）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('oas-sidebar[active="users"]')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const sb = document.querySelector('oas-sidebar[active="users"]')!
    const items = [...sb.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const parent = items.find((i) => i.dataset.value === 'biz')!
    const child = items.find((i) => i.dataset.value === 'orders')!
    const parentLabelX = parent.querySelector('.label')!.getBoundingClientRect().left
    const childLabelX = child.querySelector('.label')!.getBoundingClientRect().left
    const childIcon = child.querySelector('.icon') as HTMLElement
    return {
      parentLabelX: Math.round(parentLabelX),
      childLabelX: Math.round(childLabelX),
      indent: Math.round(childLabelX - parentLabelX),
      childIconHidden: childIcon.hidden,
      childIconWidth: Math.round(childIcon.getBoundingClientRect().width),
    }
  })
  expect(r.childIconHidden, '嵌套无图标项图标占位不应隐藏').toBe(false)
  expect(r.childIconWidth, '嵌套图标占位应保留宽度').toBeGreaterThan(0)
  expect(r.indent, '子项 label 应缩进父项 label 右侧（不得齐平/更靠左）').toBeGreaterThan(0)
})
test('sidebar 嵌套父项点击折叠子菜单：hidden 真实隐藏（grid 0fr + visibility 动画机制，真实视觉断言）', async ({
  page,
}) => {
  // 历史根因：.submenu{display:flex} 作者级规则压过 UA [hidden]{display:none}（只改属性不改渲染）；
  // 现行机制：grid-template-rows 0fr/1fr 平滑过渡 + visibility 联动（收起时出渲染树防聚焦）。
  // 本断言量 computed visibility 与高度（真实视觉），不是只查 hidden 属性。
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#sidebar-decl')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
  const r = await page.evaluate(async () => {
    const host = document.getElementById('sidebar-decl') as HTMLElement
    const getBiz = () =>
      [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')].find((i) => i.dataset.value === 'biz')!
    const sub = () => host.shadowRoot!.querySelector('[part="submenu"]') as HTMLElement
    const visibility = () => getComputedStyle(sub()).visibility
    const rectH = () => Math.round(sub().getBoundingClientRect().height)
    // 过渡驱动的断言必须轮询到预期态，不能固定 sleep：高并发下 rAF 被拖慢，固定等待内动画未完，
    // 第二次点击会被吞掉（afterReclick 仍 hidden）→ flaky。每步先等 aria-expanded 翻转（同步信号）
    // 再等视觉稳定；点击前重新查询元素，避免组件重渲染后引用失效。
    const settle = async (pred: () => boolean, timeout = 5000) => {
      const t0 = performance.now()
      while (performance.now() - t0 < timeout) {
        if (pred()) return
        await new Promise((res) => requestAnimationFrame(res))
      }
    }
    const before = { aria: getBiz().getAttribute('aria-expanded'), visibility: visibility() }
    getBiz().click()
    await settle(() => getBiz().getAttribute('aria-expanded') === 'false')
    await settle(() => visibility() === 'hidden' && rectH() === 0)
    const afterClick = {
      aria: getBiz().getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: rectH(),
    }
    getBiz().click()
    await settle(() => getBiz().getAttribute('aria-expanded') === 'true')
    await settle(() => visibility() === 'visible' && rectH() > 0)
    const afterReclick = {
      aria: getBiz().getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: rectH(),
    }
    return { before, afterClick, afterReclick }
  })
  expect(r.before.aria).toBe('true') // 激活子项自动展开
  expect(r.before.visibility).toBe('visible')
  expect(r.afterClick.aria, '点击后 aria-expanded 应收起').toBe('false')
  // grid 0fr + visibility 动画机制（平滑过渡）：收起后 visibility:hidden + 高度 0（真实视觉隐藏且防聚焦）
  expect(r.afterClick.visibility, '点击后子菜单应 visibility:hidden（真实视觉隐藏）').toBe('hidden')
  expect(r.afterClick.rectH, '隐藏后子菜单高度应为 0').toBe(0)
  expect(r.afterReclick.aria, '再点应重新展开').toBe('true')
  expect(r.afterReclick.visibility).toBe('visible')
  expect(r.afterReclick.rectH, '再展开后子菜单高度应恢复').toBeGreaterThan(0)
})

// —— 缺陷回归：collapsed × 树形 children 折叠态子菜单完全不可达（下游 templates 被迫扁平化规避）——
// 修复：折叠态父项点击/hover 开 flyout 子菜单（定位引擎锚定 inline-end），叶子项点击派发
// oas-select 并关面板。真实浏览器断言：面板真实几何（rail 右侧 + 视口内）+ 子项标签可见。
test('sidebar 折叠态树形父项点击开 flyout：面板在 rail 右侧视口内 + 子项文字可见 + 子项点击派发 select 关面板', async ({
  page,
}) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  // 找一个含嵌套的 sidebar demo，切到折叠态
  await page.evaluate(async () => {
    const blk = [...document.querySelectorAll('.demo-block')].find((b) => (b.textContent || '').includes('嵌套'))
    blk!.scrollIntoView({ block: 'center' })
    const sb = blk!.querySelector('oas-sidebar')!
    sb.setAttribute('collapsed', '')
    await customElements.whenDefined('oas-sidebar')
  })
  await page.waitForTimeout(300)
  const r1 = await page.evaluate(async () => {
    const sb = [...document.querySelectorAll('oas-sidebar')].find((s) => s.hasAttribute('collapsed'))!
    const btn = sb.shadowRoot!.querySelector<HTMLElement>('[part="item"][aria-haspopup="true"]')!
    const btnR = btn.getBoundingClientRect()
    btn.click()
    await new Promise((res) => setTimeout(res, 250))
    const flyout = sb.shadowRoot!.querySelector<HTMLElement>('[part="flyout"]')!
    const fR = flyout.getBoundingClientRect()
    const firstChild = flyout.querySelector<HTMLElement>('[part="item"]')!
    return {
      open: !flyout.hidden,
      placement: flyout.dataset.placement,
      // 面板应锚定父项右侧（inline-end）且不越视口
      rightOfRail: fR.left >= btnR.right - 2,
      inViewport: fR.right <= innerWidth + 2 && fR.top >= -2,
      // 子项文字标签必须可见（折叠态 label 隐藏规则不得误伤 flyout）
      childTextVisible:
        firstChild.textContent!.trim().length > 0 &&
        getComputedStyle(firstChild.querySelector('.label')!).display !== 'none',
      // flyout 子项布局不被折叠态 .item 规则压过（特异性 0,5,0 回归：
      // justify-content 应为 flex-start、水平内边距不应为 0）
      childJustify: getComputedStyle(firstChild).justifyContent,
      childPaddingInline: getComputedStyle(firstChild).paddingInlineStart,
      childCount: flyout.querySelectorAll('[part="item"]').length,
    }
  })
  expect(r1.open, '点击父项应打开 flyout').toBe(true)
  expect(r1.placement, 'LTR 下 right-start 锚定').toBe('right-start')
  expect(r1.rightOfRail, '面板应在 rail 右侧').toBe(true)
  expect(r1.inViewport, '面板不越视口').toBe(true)
  expect(r1.childTextVisible, '子项文字标签可见（label 不被折叠态误隐藏）').toBe(true)
  expect(r1.childJustify, 'flyout 子项左对齐（不被折叠态居中规则压过）').toBe('flex-start')
  expect(r1.childPaddingInline, 'flyout 子项水平内边距非零（不被折叠态 padding-inline:0 压过）').not.toBe('0px')
  expect(r1.childCount, 'flyout 内渲染全部子项').toBeGreaterThan(0)

  // 叶子子项点击 → oas-select + 关面板
  const r2 = await page.evaluate(async () => {
    const sb = [...document.querySelectorAll('oas-sidebar')].find((s) => s.hasAttribute('collapsed'))!
    const flyout = sb.shadowRoot!.querySelector<HTMLElement>('[part="flyout"]')!
    let detail: unknown = null
    sb.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    const leaf = [...flyout.querySelectorAll<HTMLElement>('[part="item"]')].find((el) => !el.querySelector('.chevron'))!
    const leafValue = leaf.dataset.value
    leaf.click()
    await new Promise((res) => setTimeout(res, 250))
    return { detail: detail as { value?: string } | null, leafValue, closed: flyout.hidden }
  })
  expect(r2.detail?.value, '叶子点击派发 oas-select 且值为叶子 value').toBe(r2.leafValue)
  expect(r2.closed, '选中后面板关闭').toBe(true)
})

// —— 缺陷回归（实抓）：hover 打开的 flyout 在指针进入面板后 300ms 被误关 ——
// 根因：btn↔flyout 的定位 gap 穿越触发 block pointerleave（启动 300ms 关闭计时），flyout 自身
// 无 pointerenter 处理器取消计时。真实鼠标轨迹：hover btn 打开 → 移入面板驻留 >400ms → 面板仍开。
test('sidebar flyout hover 链路：hover 父项打开，移入面板驻留不自动关闭', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  // CI 冷启动/并行下组件包可能晚于 domcontentloaded 注册；先等升级完成再取 shadowRoot
  await page.waitForFunction(
    () => [...document.querySelectorAll('oas-sidebar')].some((s) => !!s.shadowRoot),
    undefined,
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const blk = [...document.querySelectorAll('.demo-block')].find((b) => (b.textContent || '').includes('嵌套'))!
    blk.scrollIntoView({ block: 'center' })
    blk.querySelector('oas-sidebar')!.setAttribute('collapsed', '')
  })
  await page.waitForTimeout(300)
  // 真实鼠标轨迹：移到父项图标中心（hover 开）
  const target = await page.evaluate(() => {
    const sb = [...document.querySelectorAll('oas-sidebar')].find((s) => s.hasAttribute('collapsed'))!
    const btn = sb.shadowRoot!.querySelector<HTMLElement>('[part="item"][aria-haspopup="true"]')!
    const r = btn.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, value: btn.dataset.value }
  })
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(250) // > FLYOUT_OPEN_DELAY(150)，hover 开面板
  const opened = await page.evaluate((v) => {
    const sb = [...document.querySelectorAll('oas-sidebar')].find((s) => s.hasAttribute('collapsed'))!
    const flyout = sb.shadowRoot!.querySelector<HTMLElement>(`[part="flyout"][data-parent="${v}"]`)!
    const fR = flyout.getBoundingClientRect()
    return { open: !flyout.hidden, x: fR.left + 20, y: fR.top + 20 }
  }, target.value)
  expect(opened.open, 'hover 父项应打开 flyout').toBe(true)
  // 移入面板内驻留 400ms（> FLYOUT_CLOSE_DELAY(300)）：面板不应自动关闭
  await page.mouse.move(opened.x, opened.y, { steps: 6 })
  await page.waitForTimeout(420)
  const stillOpen = await page.evaluate((v) => {
    const sb = [...document.querySelectorAll('oas-sidebar')].find((s) => s.hasAttribute('collapsed'))!
    return !sb.shadowRoot!.querySelector<HTMLElement>(`[part="flyout"][data-parent="${v}"]`)!.hidden
  }, target.value)
  expect(stillOpen, '指针已在面板内悬停时面板不应自动关闭（hover 链路不得断裂）').toBe(true)
})

// 行首头像：真实布局（18px 圆 / 行序 / 图片可见）+ RTL 自动镜像 + 装饰性不进无障碍树。
test('sidebar 行首头像：首字母圆与图片真实渲染，RTL 镜像，装饰性节点不可见', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-sidebar'))
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-sidebar')
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '张伟', value: 'u1', avatarText: '张', avatarColor: '#e11d48' },
        { label: '李娜', value: 'u2', avatarText: '李', avatarColor: '#fef08a' },
        { label: '产品组', value: 'g1', avatar: '/favicon.svg' },
        { label: '收件箱', value: 'inbox', icon: 'star' },
      ]),
    )
    el.style.width = '240px'
    document.body.appendChild(el)
    const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
    await frame()
    const row = (v: string) => el.shadowRoot!.querySelector<HTMLElement>(`[data-value="${v}"]`)!
    const avatar = (v: string) => row(v).querySelector<HTMLElement>('[part="avatar"]')
    const rect = (n: Element) => n.getBoundingClientRect()
    const read = () => {
      const img = avatar('g1')!.querySelector('img') as HTMLImageElement
      return {
        circle: { w: Math.round(rect(avatar('u1')!).width), h: Math.round(rect(avatar('u1')!).height) },
        beforeLabel: rect(avatar('u1')!).left < rect(row('u1').querySelector('.label')!).left,
        hidden: avatar('u1')!.getAttribute('aria-hidden'),
        text: avatar('u1')!.textContent,
        imgOk: img.complete && img.naturalWidth > 0,
        noAvatar: avatar('inbox') === null,
        textColorMatchesLabel:
          getComputedStyle(avatar('u2')!).color === getComputedStyle(row('u2').querySelector('.label')!).color,
      }
    }
    if (!(avatar('g1')!.querySelector('img') as HTMLImageElement).complete) await frame()
    const ltr = read()
    el.setAttribute('dir', 'rtl')
    await frame()
    const rtl = { beforeLabel: rect(avatar('u1')!).left > rect(row('u1').querySelector('.label')!).left }
    el.remove()
    return { ltr, rtl }
  })
  expect(r.ltr.circle, '头像为 18px 圆').toEqual({ w: 18, h: 18 })
  expect(r.ltr.beforeLabel, '头像在 label 之前（行首）').toBe(true)
  expect(r.ltr.hidden, '装饰性头像不进无障碍树').toBe('true')
  expect(r.ltr.text).toBe('张')
  expect(r.ltr.imgOk, '图片头像加载成功').toBe(true)
  expect(r.ltr.noAvatar, '无头像项不渲染节点').toBe(true)
  expect(r.ltr.textColorMatchesLabel, '首字母色与行文字一致（主题 token，不随宿主色翻转）').toBe(true)
  expect(r.rtl.beforeLabel, 'RTL 下头像镜像到行首（右侧）').toBe(true)
})
// 分组独立高亮：各组互不影响；同组多选数组可 toggle；aria 语义（pressed vs current）正确。
test('sidebar 分组独立高亮：active-by-group 单选/多选、aria-pressed 与 aria-current 分离', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-sidebar'))
  const r = await page.evaluate(async () => {
    type Detail = { value: string; label: string; group?: string }
    const el = document.createElement('oas-sidebar')
    el.setAttribute('active', 'inbox')
    el.setAttribute('active-by-group', JSON.stringify({ 项目: 'p1', 视图: ['v1', 'v2'] }))
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: 'P1', value: 'p1', group: '项目', icon: 'star' },
        { label: 'P2', value: 'p2', group: '项目', icon: 'star' },
        { label: 'V1', value: 'v1', group: '视图', icon: 'star' },
        { label: 'V2', value: 'v2', group: '视图', icon: 'star' },
        { label: 'V3', value: 'v3', group: '视图', icon: 'star' },
        { label: '收件箱', value: 'inbox', icon: 'star' },
      ]),
    )
    document.body.appendChild(el)
    await new Promise((res) => requestAnimationFrame(() => res(null)))
    const root = el.shadowRoot!
    const row = (v: string): HTMLElement => root.querySelector<HTMLElement>(`[data-value="${v}"]`)!
    const snap = () => ({
      active: [...root.querySelectorAll<HTMLElement>('.item.active')].map((b) => b.dataset.value).sort(),
      pressed: [...root.querySelectorAll<HTMLElement>('[aria-pressed]')]
        .map((b) => `${b.dataset.value}:${b.getAttribute('aria-pressed')}`)
        .sort(),
      current: [...root.querySelectorAll<HTMLElement>('[aria-current="page"]')].map((b) => b.dataset.value),
      navPressed: row('inbox').hasAttribute('aria-pressed'),
    })
    const before = snap()
    let detail: Detail | null = null
    el.addEventListener('oas-select', (e) => {
      detail = (e as CustomEvent<Detail>).detail
    })
    row('v3').click()
    const state = JSON.parse(el.getAttribute('active-by-group') ?? '{}') as Record<string, string | string[]>
    const views = state['视图'] as string[]
    state['视图'] = [...views, detail!.value]
    el.setAttribute('active-by-group', JSON.stringify(state))
    const afterAdd = snap()
    state['视图'] = views.filter((v) => v !== 'v3')
    el.setAttribute('active-by-group', JSON.stringify(state))
    const afterRemove = snap()
    el.remove()
    return { before, afterAdd, afterRemove, detail }
  })
  expect(r.before.active).toEqual(['inbox', 'p1', 'v1', 'v2'])
  expect(r.before.pressed).toEqual(['p1:true', 'p2:false', 'v1:true', 'v2:true', 'v3:false'])
  expect(r.before.current).toEqual(['inbox'])
  expect(r.before.navPressed, '导航项不参与分组 toggle').toBe(false)
  expect(r.detail).toEqual({ value: 'v3', label: 'V3', group: '视图' })
  expect(r.afterAdd.active).toContain('v3')
  expect(r.afterRemove.active).not.toContain('v3')
})

// 文档 demo 的宿主配方真实可用：点「时间线」加入「视图」多选，日志同步。
test('sidebar 文档 demo：分组独立高亮 + 同组多选可点，宿主写回状态生效', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!document.getElementById('sidebar-by-group')?.shadowRoot)
  const r = await page.evaluate(async () => {
    const el = document.getElementById('sidebar-by-group')
    if (!el || !el.shadowRoot) return null
    const root = el.shadowRoot
    el.scrollIntoView({ block: 'center' })
    const active = (): string[] =>
      [...root.querySelectorAll<HTMLElement>('.item.active')].map((b) => b.dataset.value ?? '').sort()
    const before = active()
    root.querySelector<HTMLElement>('[data-value="v3"]')!.click()
    await new Promise((res) => requestAnimationFrame(() => res(null)))
    return { before, after: active(), log: document.getElementById('sidebar-by-group-log')?.textContent ?? '' }
  })
  expect(r).not.toBeNull()
  expect(r!.before).toEqual(expect.arrayContaining(['p1', 'v1', 'v2', 'doing']))
  expect(r!.after).toContain('v3')
  expect(r!.log).toContain('v3')
})

test('sidebar renderLabel：demo 双行富内容挂载且不反射 attribute', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!document.getElementById('sidebar-render-label')?.shadowRoot, undefined, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const el = document.getElementById('sidebar-render-label')!
    const root = el.shadowRoot!
    const home = root.querySelector<HTMLElement>('[part="item"][data-value="home"]')!
    const custom = home.querySelector<HTMLElement>('.label.label-custom')
    return {
      hasCustom: !!custom,
      lines: custom?.firstElementChild?.children.length ?? 0,
      text: custom?.textContent ?? '',
      ariaLabel: home.getAttribute('aria-label'),
      reflected: el.hasAttribute('render-label'),
      hostItems: el.getAttribute('items') ?? '',
    }
  })
  expect(r.hasCustom, 'renderLabel 返回 Node 应挂到 label-custom 容器').toBe(true)
  expect(r.lines, '双行内容应保留两个子节点').toBe(2)
  expect(r.text).toContain('3 条未读')
  expect(r.ariaLabel).toBe('工作台')
  expect(r.reflected, '函数通道不反射 attribute').toBe(false)
  expect(r.hostItems).not.toContain('renderLabel')
})

// hide-toggle + 空 header 槽：头部塌陷（不留 24px 死缝）；有 header 内容或移动抽屉打开时保留。
test('sidebar hide-toggle + 空 header：头部塌陷与恢复（真实几何）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-sidebar'))
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-sidebar')
    el.setAttribute('hide-toggle', '')
    el.style.width = '220px'
    el.style.height = '320px'
    document.body.appendChild(el)
    const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
    await frame()
    const head = () => el.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!
    const nav = () => el.shadowRoot!.querySelector<HTMLElement>('[part="nav"]')!
    const snap = () => ({
      hidden: head().hidden,
      display: getComputedStyle(head()).display,
      headH: Math.round(head().getBoundingClientRect().height),
      navTop: Math.round(nav().getBoundingClientRect().top - el.getBoundingClientRect().top),
    })
    const empty = snap()
    const header = document.createElement('div')
    header.setAttribute('slot', 'header')
    header.textContent = '工作区'
    header.style.padding = '4px'
    el.appendChild(header)
    await frame()
    const withHeader = snap()
    header.remove()
    await frame()
    const removed = snap()
    el.remove()
    return { empty, withHeader, removed }
  })
  expect(r.empty.hidden, '空 header + hide-toggle：head 塌陷').toBe(true)
  expect(r.empty.display).toBe('none')
  expect(r.empty.headH).toBe(0)
  expect(r.empty.navTop, '导航紧贴面板顶部（无 24px 死缝）').toBe(0)
  expect(r.withHeader.hidden, '有 header 内容：head 保留').toBe(false)
  expect(r.withHeader.headH).toBeGreaterThan(0)
  expect(r.removed.hidden, '移除 header 内容：重新塌陷').toBe(true)
})

// 移动抽屉打开时关闭按钮需要头部容器：hide-toggle + 空 header 也不能塌陷。
test('sidebar hide-toggle + 空 header：移动抽屉打开时头部保留、关闭后收起', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-sidebar'))
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-sidebar') as HTMLElement & {
      openDrawer: () => void
      closeDrawer: () => void
    }
    el.setAttribute('hide-toggle', '')
    el.setAttribute('mobile-breakpoint', '2000')
    document.body.appendChild(el)
    const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
    await frame()
    const head = () => el.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!
    const close = () => el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    const before = { headHidden: head().hidden, closeHidden: close().hidden }
    el.openDrawer()
    await frame()
    const opened = { headHidden: head().hidden, closeHidden: close().hidden }
    el.closeDrawer()
    await frame()
    const closed = { headHidden: head().hidden, closeHidden: close().hidden }
    el.remove()
    return { before, opened, closed }
  })
  expect(r.before.headHidden, '抽屉关闭：head 塌陷').toBe(true)
  expect(r.opened.closeHidden).toBe(false)
  expect(r.opened.headHidden, '抽屉打开：head 保留以承载关闭按钮').toBe(false)
  expect(r.closed.headHidden).toBe(true)
})
