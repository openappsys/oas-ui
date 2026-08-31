// 复核回归：tour——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('tour-basic 2 步流程：点下一步高亮移到区域二 + 按钮变完成 + 不消失，点完成才关闭', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-basic', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-basic')?.shadowRoot != null, {
    timeout: 15000,
  })
  const step = async () =>
    page.evaluate(() => {
      const host = document.querySelector('#tour-basic')!
      const sr = host.shadowRoot!
      const hl = sr.querySelector('.highlight, [part=highlight]') as HTMLElement | null
      const popup = sr.querySelector('.popup, [part=popup]')
      const hlR = hl?.getBoundingClientRect()
      const b1 = document.querySelector('#tour-b1')?.getBoundingClientRect()
      const b2 = document.querySelector('#tour-b2')?.getBoundingClientRect()
      const near = (a: any, b: any) =>
        a && b && Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 10
      return {
        open: host.hasAttribute('open'),
        current: host.getAttribute('current'),
        onB1: near(hlR, b1),
        onB2: near(hlR, b2),
        popupText: popup ? popup.textContent!.replace(/\s+/g, ' ').slice(0, 30) : null,
        btnText: (sr.querySelector('[part=next]') as HTMLElement)?.textContent?.trim(),
      }
    })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('oas-button')].find((x) =>
      /开始引导/.test(x.textContent),
    )!
    ;(btn as HTMLElement).click()
  })
  await page.waitForTimeout(500)
  const s1 = await step()
  expect(s1.open, '打开后 open').toBe(true)
  expect(s1.onB1, 'step1 高亮在区域一').toBe(true)
  // 点下一步
  await page.evaluate(() =>
    (
      document.querySelector('#tour-basic')!.shadowRoot!.querySelector('[part=next]') as HTMLElement
    ).click(),
  )
  await page.waitForTimeout(500)
  const s2 = await step()
  expect(s2.open, '点下一步后不应消失').toBe(true)
  expect(s2.current, '应推进到第 2 步').toBe('1')
  expect(s2.onB2, '点下一步后高亮应移到区域二').toBe(true)
  expect(s2.onB1, '不应还停留在区域一').toBe(false)
  expect(s2.btnText, '最后一步按钮应变「完成」').toBe('完成')
  // 点完成才关闭
  await page.evaluate(() =>
    (
      document.querySelector('#tour-basic')!.shadowRoot!.querySelector('[part=next]') as HTMLElement
    ).click(),
  )
  await page.waitForTimeout(400)
  const s3 = await step()
  expect(s3.open, '点完成后才关闭').toBe(false)
})

// —— 缺陷回归：tour 弹窗 pointer-events:none 致点击穿透遮罩误关（实测：点弹窗任意位置消失） ——
// 曾现缺陷：.overlay 是 pointer-events:none，.popup 未补 auto 继承 none → 整个弹窗点击透明，
// 真实鼠标点击穿透到下层遮罩（pointer-events:auto）触发 onMaskClick 关闭。
// 元素级 .click() 跳过命中测试会造成假通过——必须用真实鼠标点击（page.mouse，带命中测试）验证。
test('tour 弹窗可交互：真实鼠标点击弹窗内部不关闭（pointer-events 修复回归）', async ({ page }) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  // tour 宿主关闭态零尺寸（overlay/popup display:none），up() 的 visible 判定不适用——用 attached + shadowRoot
  await page.waitForSelector('#tour-basic', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-basic')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    ;[...document.querySelectorAll<HTMLElement>('oas-button')]
      .find((x) => /开始引导/.test(x.textContent))!
      .click()
  })
  await page.waitForTimeout(500)
  const center = await page.evaluate(() => {
    const r = document
      .querySelector('#tour-basic')!
      .shadowRoot!.querySelector('.popup')!
      .getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  // 真实鼠标点击弹窗中心（带 pointerdown + 命中测试）
  await page.mouse.click(center.x, center.y)
  await page.waitForTimeout(400)
  const open = await page.evaluate(() =>
    document.querySelector('#tour-basic')!.hasAttribute('open'),
  )
  expect(open, '真实点击弹窗内部不应关闭（pointer-events 须为 auto）').toBe(true)
})

// —— 缺陷回归：tour append-to portal host display:none 致浮层 0×0 不可见（实测：点了没反应） ——
// 曾现缺陷：ensurePortal 镜像 data-open 属性，但共享 STYLE 的 :host([open]) 显示门控只认 open
// 属性——portal host（普通 div，只有 data-open）不命中 → display:none，浮层全 0×0 不可见。
// 修复：host 显示规则同时认 [open] 与 [data-open]。
test('tour append-to=body：portal host 显示 + 弹窗非零尺寸 + 高亮框住挂载目标', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-portal', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-portal')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find((x) =>
      /append-to body/.test(x.textContent),
    )!
    btn.scrollIntoView({ block: 'center' })
    btn.click()
  })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const ph = [...document.body.children].find(
      (c) => c.shadowRoot && c.shadowRoot.querySelector('.popup'),
    )
    if (!ph) return { noPortal: true }
    const sr = ph.shadowRoot!
    const popup = sr.querySelector('.popup')!
    const hl = sr.querySelector('.highlight')
    const target = document.querySelector('#tour-pp1')!
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const pr = rect(popup)
    const hr = hl ? rect(hl) : null
    const tr = rect(target)
    return {
      hostDisplay: getComputedStyle(ph).display,
      popupW: pr.w,
      popupH: pr.h,
      hlOnTarget: hr ? Math.abs(hr.x - tr.x) < 12 && Math.abs(hr.y - tr.y) < 12 : false,
    }
  })
  expect(r.hostDisplay, 'portal host 应显示').not.toBe('none')
  expect(r.popupW, '弹窗应有宽度').toBeGreaterThan(50)
  expect(r.popupH, '弹窗应有高度').toBeGreaterThan(20)
  expect(r.hlOnTarget, '高亮应框住挂载目标').toBe(true)
})

// —— 缺陷回归：tour typewriter 布尔属性误判致打字机不生效（实测：没看到逐字效果） ——
// 曾现缺陷：typewriter 是 opt-in 布尔属性，getAttribute 对无值布尔返回 ''，检查
// getAttr('typewriter')!=='true' 把布尔写法误判为关（''!=='true' → 跳过打字机全量赋值）。
// 修复：改 hasAttr + getAttr(...)!=='false' 判定。
test('tour typewriter：描述逐字增长（非一次性全显示）', async ({ page }) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-tw', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-tw')?.shadowRoot != null, {
    timeout: 15000,
  })
  const samples = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find(
      (x) =>
        /开始引导/.test(x.textContent) &&
        x.closest('.demo-block')?.textContent.includes('打字机动画'),
    )!
    const host = document.querySelector('#tour-tw')!
    btn.scrollIntoView({ block: 'center' })
    btn.click()
    const desc = () => host.shadowRoot!.querySelector('[part="desc"]')!.textContent ?? ''
    const out: number[] = []
    for (let i = 0; i < 5; i++) {
      out.push(desc().length)
      await new Promise((r) => setTimeout(r, 150))
    }
    return out
  })
  // 逐字增长：长度应随时间递增（非一开始就满长）
  expect(samples[0]!, '初始应未显示完整').toBeLessThan(samples[samples.length - 1]!)
  const increasing = samples.every((v, i) => i === 0 || v >= (samples[i - 1] ?? 0))
  expect(increasing, '描述长度应单调递增（逐字出现）').toBe(true)
})

// —— 缺陷回归：tour 首次打开目标在视口外时弹窗闪现错位 ——
// 曾现缺陷：目标初始在视口外，position() 按错位目标位置算「安全兜底位」显示弹窗，
// scrollToTarget 平滑滚动期间弹窗卡在错位处（长滚动时明显），滚动末尾才跳正——「首次点击错位」。
// 修复：目标需滚动进视口时弹窗进入「定位待定」（opacity 0 隐藏），scrollend/定位正确后显示。
test('tour 目标在视口外首次打开：滚动期间弹窗隐藏（不闪现错位），滚动停止后正确显示', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-interact', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-interact')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find(
      (x) => x.textContent.trim() === '高亮区可交互',
    )!
    btn.click()
  })
  // 采样滚动期间弹窗隐藏 + 停止后正确显示
  const samples = await page.evaluate(async () => {
    const host = document.querySelector('#tour-interact')!
    const popup = host.shadowRoot!.querySelector('.popup') as HTMLElement
    const out: Array<{ pending: boolean; opacity: number; placement: string | null }> = []
    for (let k = 0; k < 12; k++) {
      out.push({
        pending: popup.classList.contains('oas-tour-pending'),
        opacity: parseFloat(getComputedStyle(popup).opacity),
        placement: popup.getAttribute('data-placement'),
      })
      await new Promise((r) => setTimeout(r, 150))
    }
    return out
  })
  // 滚动期间弹窗应隐藏（pending 或 opacity 0 / placement null）
  const duringScroll = samples.filter((s) => s.pending)
  expect(duringScroll.length, '滚动期间应有定位待定(隐藏)的帧').toBeGreaterThan(0)
  for (const s of duringScroll) {
    expect(s.opacity, '滚动期间弹窗应近透明(隐藏，不在错位处闪现)').toBeLessThan(0.1)
  }
  // 滚动停止后弹窗应正确显示（placement 已设、opacity 1）
  const settled = samples[samples.length - 1]!
  expect(settled.opacity, '滚动停止后弹窗显示').toBe(1)
  expect(settled.placement, '滚动停止后 placement 已设').not.toBeNull()
  expect(settled.pending, '滚动停止后不再待定').toBe(false)
})

// —— 缺陷回归：oas-splitter + sidebar 拖拽调宽（实测真缺陷） ——
// 曾现缺陷：demo 用内联 style="--oas-sidebar-width: 100%" 想让 sidebar 填满 splitter 左面板，
// 但 sidebar update() 在无 width 属性时会 removeProperty('--oas-sidebar-width')——内联变量被清、
// sidebar 回落 220px 固定宽，被 22% 窄面板遮住（宽度不随拖拽变化）。修复：demo 改用 width="100%"
// 属性（update 保留并写入）。本断言真实拖拽分割条，验证 sidebar 宽度实时跟随面板变化。