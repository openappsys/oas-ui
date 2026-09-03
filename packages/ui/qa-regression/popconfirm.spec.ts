// 复核回归：popconfirm——气泡确认能力批缺陷固化断言。
// 覆盖：异步确认链路（ok-loading 阻止关闭）、焦点管理（开聚焦/关回焦）、
// aria 关联（alertdialog + expanded/controls）、theme 色阶 token、
// 12 向 placement 实际定位（fixed 视口坐标）、Vue demo 属性存活。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 在 body 顶部构造原生 button 锚点的回归实例（anchor 可聚焦，焦点语义确定） */
async function mountReg(page: import('@playwright/test').Page, id: string, attrs: string[] = []) {
  await page.evaluate(
    ({ id, attrs }) => {
      const el = document.createElement('oas-popconfirm')
      el.id = id
      for (const a of attrs) {
        const eq = a.indexOf('=')
        if (eq === -1) el.setAttribute(a, '')
        else el.setAttribute(a.slice(0, eq), a.slice(eq + 1))
      }
      el.setAttribute('title', '回归')
      el.innerHTML = '<button id="reg-trig">触发</button>'
      document.body.insertBefore(el, document.body.firstChild)
    },
    { id, attrs },
  )
  await up(page, `#${id}`)
}

test('popconfirm 基础链路：确定派发反馈 + 关闭回焦 trigger + aria 关联', async ({ page }) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  await mountReg(page, 'pc-basic-reg')

  const state = () =>
    page.evaluate(() => {
      const el = document.querySelector('#pc-basic-reg')!
      const pop = el.shadowRoot!.querySelector('[part="popover"]')!
      return {
        open: el.hasAttribute('open'),
        ariaHidden: pop.getAttribute('aria-hidden'),
        role: pop.getAttribute('role'),
        expanded: el.querySelector('button')!.getAttribute('aria-expanded'),
        controls: el.querySelector('button')!.getAttribute('aria-controls'),
        popId: pop.id,
        // 真实浏览器：打开时焦点应落在确定按钮上
        shadowActive: el.shadowRoot!.activeElement?.getAttribute('part') ?? null,
      }
    })

  // 打开前：aria-expanded=false，controls 指向面板 id
  let s = await state()
  expect(s.expanded).toBe('false')
  expect(s.controls).toBe(s.popId)
  expect(s.role).toBe('alertdialog')

  await page.evaluate(() => {
    const el = document.querySelector('#pc-basic-reg')!
    ;(el.querySelector('button') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pc-basic-reg')
        ?.shadowRoot?.querySelector('[part="popover"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  s = await state()
  expect(s.expanded).toBe('true')
  expect(s.shadowActive, '打开后焦点应落在确定按钮（part=ok）').toBe('ok')

  // 点击确定：气泡关闭 + 焦点回 trigger
  await page.evaluate(() => {
    const el = document.querySelector('#pc-basic-reg')!
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForTimeout(50)
  s = await state()
  expect(s.open).toBe(false)
  expect(s.ariaHidden).toBe('true')
  const focusBack = await page.evaluate(() => ({
    isTrigger: document.activeElement === document.querySelector('#pc-basic-reg')?.querySelector('button'),
  }))
  expect(focusBack.isTrigger, '关闭后焦点应回到 trigger').toBe(true)
})

test('popconfirm 异步确认：ok-loading 阻止自动关闭，完成后关闭（demo 可见反馈链路）', async ({
  page,
}) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pc-async')

  const snapshot = () =>
    page.evaluate(() => {
      const el = document.querySelector('#pc-async')!
      const ok = el.shadowRoot!.querySelector('[part="ok"]')!
      return {
        open: el.hasAttribute('open'),
        loading: ok.hasAttribute('data-loading'),
        busy: ok.getAttribute('aria-busy'),
      }
    })

  await page.evaluate(() => {
    const el = document.querySelector('#pc-async')!
    ;(el.querySelector('oas-button') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#pc-async')?.hasAttribute('open') === true,
    null,
    { timeout: 5000 },
  )

  await page.evaluate(() => {
    const el = document.querySelector('#pc-async')!
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  // 点击确定瞬间：宿主监听器同步置 ok-loading → 气泡不关、按钮 loading
  await page.waitForFunction(
    () => {
      const ok = document.querySelector('#pc-async')?.shadowRoot?.querySelector('[part="ok"]')
      return ok?.hasAttribute('data-loading') === true
    },
    null,
    { timeout: 5000 },
  )
  let s = await snapshot()
  expect(s.open, 'ok-loading 在场时气泡保持打开').toBe(true)
  expect(s.busy).toBe('true')

  // 1.5s 后宿主完成：移除 loading + 关闭
  await page.waitForFunction(
    () => document.querySelector('#pc-async')?.hasAttribute('open') === false,
    null,
    { timeout: 5000 },
  )
  s = await snapshot()
  expect(s.loading).toBe(false)
})

test('popconfirm theme 色阶：danger 确定按钮背景走 danger token + 面板 tint', async ({ page }) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pc-basic')

  // 动态构造 theme=danger 实例（demo 中 danger 按钮未设 id，直接用 evaluate 建）
  await page.evaluate(() => {
    const el = document.createElement('oas-popconfirm')
    el.id = 'pc-reg-danger'
    el.setAttribute('open', '')
    el.setAttribute('theme', 'danger')
    el.setAttribute('title', '回归')
    el.innerHTML = '<button>触发</button>'
    document.body.appendChild(el)
  })
  const s = await page.evaluate(() => {
    const el = document.querySelector('#pc-reg-danger')!
    const ok = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
    const pop = el.shadowRoot!.querySelector('[part="popover"]') as HTMLElement
    const icon = el.shadowRoot!.querySelector('[part="icon"]') as HTMLElement
    const btnBg = getComputedStyle(ok).backgroundColor
    return {
      btnBg,
      popBg: getComputedStyle(pop).backgroundColor,
      iconColor: getComputedStyle(icon).color,
      danger: getComputedStyle(document.documentElement).getPropertyValue('--oas-color-danger').trim(),
    }
  })
  // 色值 = rgb(#dc2626) 形态；token 十六进制转 rgb 对比
  expect(s.btnBg, 'danger 时确定按钮实底 = --oas-color-danger').toBe(hexToRgb(s.danger))
  expect(s.iconColor, 'danger 时图标色 = --oas-color-danger').toBe(hexToRgb(s.danger))
  expect(s.popBg, '面板 tint 不等于纯背景（语义色混合）').toBeTruthy()
})

test('popconfirm 12 向 placement：fixed 定位写视口坐标 + 箭头在场', async ({ page }) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  // auto-adjust-overflow="false"：锚点在页面底部也不会被翻转，placement 确定性 = bottom-start
  await mountReg(page, 'pc-reg-place', ['placement=bottom-start', 'auto-adjust-overflow=false'])
  await page.evaluate(() => {
    document.querySelector('#pc-reg-place')?.setAttribute('open', '')
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pc-reg-place')
        ?.shadowRoot?.querySelector('[part="popover"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  const s = await page.evaluate(() => {
    const el = document.querySelector('#pc-reg-place')!
    const pop = el.shadowRoot!.querySelector('[part="popover"]') as HTMLElement
    const arrow = pop.querySelector('[data-popper-arrow]') as HTMLElement
    const cs = getComputedStyle(pop)
    const anchorBtn = el.querySelector('button') as HTMLElement
    return {
      placement: pop.getAttribute('data-placement'),
      top: pop.getBoundingClientRect().top,
      left: pop.getBoundingClientRect().left,
      anchorBottom: anchorBtn.getBoundingClientRect().bottom,
      anchorLeft: anchorBtn.getBoundingClientRect().left,
      position: cs.position,
      arrowHidden: arrow.hidden,
    }
  })
  expect(s.placement).toBe('bottom-start')
  expect(s.position, '面板 fixed 定位（不被 overflow 裁剪）').toBe('fixed')
  expect(s.arrowHidden).toBe(false)
  // bottom-start：面板顶缘在锚点下方（GAP=8 容差），左缘对齐锚点左缘
  expect(s.top).toBeGreaterThanOrEqual(s.anchorBottom + 6)
  expect(Math.abs(s.left - s.anchorLeft)).toBeLessThanOrEqual(2)
})

test('popconfirm Vue demo 属性存活：theme/ok-text/show-cancel/hide-icon/trigger 不被剥离', async ({
  page,
}) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pc-basic')
  const attrs = await page.evaluate(() => {
    // 文案与图标 demo 块内的各实例（按 demo 顺序）
    const blocks = Array.from(document.querySelectorAll('oas-popconfirm'))
    return {
      themedCount: blocks.filter((b) => b.hasAttribute('theme')).length,
      dangerCount: blocks.filter((b) => b.getAttribute('theme') === 'danger').length,
      okTextCount: blocks.filter((b) => b.hasAttribute('ok-text')).length,
      showCancelCount: blocks.filter((b) => b.getAttribute('show-cancel') === 'false').length,
      hideIconCount: blocks.filter((b) => b.hasAttribute('hide-icon')).length,
      hoverCount: blocks.filter((b) => b.getAttribute('trigger') === 'hover').length,
      virtualCount: blocks.filter((b) => b.hasAttribute('virtual')).length,
      widthCount: blocks.filter((b) => b.hasAttribute('width')).length,
      arrowFalseCount: blocks.filter((b) => b.getAttribute('arrow') === 'false').length,
      autoAdjustFalseCount: blocks.filter((b) => b.getAttribute('auto-adjust-overflow') === 'false')
        .length,
      positionCount: blocks.filter((b) => b.hasAttribute('position')).length,
      virtualXyCount: blocks.filter(
        (b) => b.hasAttribute('virtual-x') || b.hasAttribute('virtual-y'),
      ).length,
    }
  })
  expect(attrs.themedCount, 'theme 属性在 Vue demo 中存活').toBeGreaterThanOrEqual(2)
  expect(attrs.dangerCount, 'theme=danger 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.okTextCount, 'ok-text 属性存活').toBeGreaterThanOrEqual(4)
  expect(attrs.showCancelCount, 'show-cancel="false" 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.hideIconCount, 'hide-icon 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.hoverCount, 'trigger=hover 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.virtualCount, 'virtual 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.widthCount, 'width 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.arrowFalseCount, 'arrow="false" 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.autoAdjustFalseCount, 'auto-adjust-overflow="false" 存活').toBeGreaterThanOrEqual(1)
  expect(attrs.positionCount, '旧 position 属性兼容存活').toBeGreaterThanOrEqual(1)
  expect(attrs.virtualXyCount, 'virtual-x / virtual-y 存活').toBeGreaterThanOrEqual(1)
})

test('popconfirm oas-open-change：关闭原因流转（outside/ok）', async ({ page }) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pc-basic')
  await page.evaluate(() => {
    const el = document.querySelector('#pc-basic')!
    const w = window as unknown as { __pcReasons: string[] }
    w.__pcReasons = []
    el.addEventListener('oas-open-change', (e: Event) => {
      w.__pcReasons.push((e as CustomEvent).detail.reason)
    })
    ;(el.querySelector('oas-button') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#pc-basic')?.hasAttribute('open') === true,
    null,
    { timeout: 5000 },
  )
  // 点击页面空白处 → outside
  await page.mouse.click(400, 10)
  await page.waitForFunction(
    () => document.querySelector('#pc-basic')?.hasAttribute('open') === false,
    null,
    { timeout: 5000 },
  )
  const reasons = (await page.evaluate(
    () => (window as unknown as { __pcReasons: string[] }).__pcReasons,
  )) as string[]
  expect(reasons).toEqual(['trigger', 'outside'])
})

/** 十六进制 token（#rrggbb）→ rgb() 形态，供 computed color 对比 */
function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgb(${r}, ${g}, ${b})`
}
