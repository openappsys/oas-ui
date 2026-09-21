// 复核回归：app-bar——汉堡钮事件反馈、overflow 溢出收纳、hide-on-scroll 滚动折叠固化断言。
// 收纳/折叠断言轮询属性与显隐（aria-expanded / data-collapsed / data-hidden），不测 transform 过渡帧。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('app-bar 汉堡钮：点击派发 oas-menu-toggle、demo 输出可见反馈、menu-open 回写 aria-expanded 同步', async ({
  page,
}) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-menu')
  const clickMenu = () =>
    page.evaluate(() =>
      (document.querySelector('#ab-menu')!.shadowRoot!.querySelector('[part="menu-button"]') as HTMLElement).click(),
    )
  await clickMenu()
  await page.waitForFunction(
    () => (document.querySelector('#ab-menu-out')?.textContent ?? '').includes('oas-menu-toggle'),
    null,
    { timeout: 5000 },
  )
  const first = await page.evaluate(() => ({
    out: document.querySelector('#ab-menu-out')!.textContent ?? '',
    menuOpen: document.querySelector('#ab-menu')!.hasAttribute('menu-open'),
    expanded: document
      .querySelector('#ab-menu')!
      .shadowRoot!.querySelector('[part="menu-button"]')!
      .getAttribute('aria-expanded'),
  }))
  expect(first.out, '事件反馈文案可见（demo 输出行更新）').toContain('menu-open=true')
  expect(first.menuOpen, '宿主监听 oas-menu-toggle 回写 menu-open').toBe(true)
  expect(first.expanded, 'aria-expanded 跟随 menu-open').toBe('true')

  // 再点一次：宿主移除 menu-open → aria-expanded 复位
  await clickMenu()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-menu')!.hasAttribute('menu-open')))
    .toBe(false)
  expect(
    await page.evaluate(() =>
      document
        .querySelector('#ab-menu')!
        .shadowRoot!.querySelector('[part="menu-button"]')!
        .getAttribute('aria-expanded'),
    ),
  ).toBe('false')
})

test('app-bar overflow：窄视口超宽操作项收进「···」（data-collapsed）、镜像项点击回派原按钮有消息反馈', async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 800 })
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-overflow')
  await page.waitForFunction(
    () =>
      [...document.querySelector('#ab-overflow')!.querySelectorAll('[slot="actions"]')].some((b) =>
        b.hasAttribute('data-collapsed'),
      ),
    null,
    { timeout: 5000 },
  )
  // 点「···」→ 弹层展开（镜像收纳项）
  await page.evaluate(() =>
    (document.querySelector('#ab-overflow')!.shadowRoot!.querySelector('[part="more"]') as HTMLElement).click(),
  )
  await page.waitForFunction(
    () =>
      !document.querySelector('#ab-overflow')!.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!.hidden,
    null,
    { timeout: 5000 },
  )
  const panel = await page.evaluate(() => {
    const bar = document.querySelector('#ab-overflow')!
    const morePanel = bar.shadowRoot!.querySelector('[part="more-panel"]')!
    return {
      mirrors: morePanel.querySelectorAll('.mirror').length,
      collapsed: [...bar.querySelectorAll('[slot="actions"]')].filter((b) => b.hasAttribute('data-collapsed')).length,
      expanded: bar.shadowRoot!.querySelector('[part="more"]')!.getAttribute('aria-expanded'),
    }
  })
  expect(panel.collapsed, '窄容器下有操作项被收纳隐藏').toBeGreaterThan(0)
  expect(panel.mirrors, '收纳项镜像进「···」弹层').toBe(panel.collapsed)
  expect(panel.expanded, '「···」aria-expanded 同步').toBe('true')

  // 点镜像项 → 回派原按钮 → demo onclick 弹 message（可见反馈），弹层关闭
  await page.evaluate(() =>
    document.querySelector('#ab-overflow')!.shadowRoot!.querySelectorAll<HTMLElement>('.mirror')[0]!.click(),
  )
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#ab-overflow')!.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!.hidden,
      ),
    )
    .toBe(true)
})

test('app-bar hide-on-scroll：fixed 形态下滚 data-hidden 滑出、上滚恢复', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-hide')
  expect(
    await page.evaluate(() => document.querySelector('#ab-hide')!.getAttribute('data-position')),
    'hide-on-scroll 生效于悬浮形态（fixed）',
  ).toBe('fixed')
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-hide')!.hasAttribute('data-hidden')))
    .toBe(true)
  await page.evaluate(() => window.scrollTo({ top: 80, behavior: 'instant' }))
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-hide')!.hasAttribute('data-hidden')))
    .toBe(false)
})

test('app-bar 标题极窄防御：可用宽不足省略号阈值时标题整体隐藏（无半字形残片）', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app-bar')
  const r = await page.evaluate(async () => {
    // 构造确定性极窄场景：host 限宽 + 宽 trailing（flex-shrink:0 不可收缩）把 title-wrap 挤到阈值以下
    const mk = (heading: string, trailingW: string) => {
      const host = document.createElement('oas-app-bar')
      host.setAttribute('heading', heading)
      host.style.cssText = 'width: 360px; position: fixed; top: -200px; left: 0;'
      const t = document.createElement('div')
      t.setAttribute('slot', 'trailing')
      t.style.cssText = `width: ${trailingW}; height: 20px;`
      host.appendChild(t)
      document.body.appendChild(host)
      return host
    }
    const narrow = mk('极窄标题防御回归', '300px')
    const normal = mk('常规标题对照', '40px')
    // 等 update + 防御判定生效（双 rAF 保证一帧布局完成 + RO 回调）
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const read = (host: HTMLElement) => {
      const wrap = host.shadowRoot!.querySelector<HTMLElement>('[part="title-wrap"]')!
      const title = host.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      const fs = parseFloat(getComputedStyle(wrap).fontSize)
      return {
        wrapW: wrap.clientWidth,
        threshold: fs * 2.5,
        titleHidden: getComputedStyle(title).display === 'none',
      }
    }
    const out = { narrow: read(narrow), normal: read(normal) }
    narrow.remove()
    normal.remove()
    return out
  })
  // 回归：title 宽 18px 时 ellipsis 连省略号都放不下 → 渲染半个字形残片；
  // 防御 = 可用宽 < 2.5em 时标题整体隐藏（RO 驱动 data-narrow，原 container query 方案）
  expect(r.narrow.wrapW, '构造场景应把 title-wrap 挤到阈值以下（否则场景失效测不到防御）').toBeLessThan(
    r.narrow.threshold,
  )
  expect(r.narrow.titleHidden, '可用宽不足完整「字形+省略号」时标题应整体隐藏，而非渲染半字形').toBe(true)
  expect(r.normal.wrapW, '对照场景 title-wrap 应在阈值以上').toBeGreaterThan(r.normal.threshold)
  expect(r.normal.titleHidden, '常规宽度下标题不得被防御误隐藏').toBe(false)
})

test('app-bar 标题极窄防御不误伤：窄容器短标题（放得下）必须照常显示（不得 data-narrow）', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app-bar')
  const r = await page.evaluate(async () => {
    // 构造确定性场景：host 360px + 宽 trailing（flex-shrink:0 不可收缩）把 title-wrap
    // 挤到 2.5em 阈值（16px 字号 → 40px）以下（≈30px），同容器分「放得下的短标题」与
    // 「放不下的长标题」两对照组——旧实现「<2.5em 即隐藏」会误杀短标题（32px 空条来源）
    const mk = (heading: string) => {
      const host = document.createElement('oas-app-bar')
      host.setAttribute('heading', heading)
      host.style.cssText = 'width: 360px; position: fixed; top: -200px; left: 0;'
      const t = document.createElement('div')
      t.setAttribute('slot', 'trailing')
      t.style.cssText = 'width: 290px; height: 20px;'
      host.appendChild(t)
      document.body.appendChild(host)
      return host
    }
    const shortFit = mk('概') // 单字 ≈16px < 30px 可用宽 → 完整放得下（无溢出）
    const longOverflow = mk('极窄标题防御回归') // 8 字 ≈128px > 30px → 真实溢出
    // 等 update + 防御判定生效（双 rAF 保证一帧布局完成 + RO 回调）
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const read = (host: HTMLElement) => {
      const wrap = host.shadowRoot!.querySelector<HTMLElement>('[part="title-wrap"]')!
      const title = host.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      const fs = parseFloat(getComputedStyle(title).fontSize)
      return {
        wrapW: wrap.clientWidth,
        threshold: fs * 2.5,
        scrollW: title.scrollWidth,
        clientW: title.clientWidth,
        narrowAttr: title.hasAttribute('data-narrow'),
        titleHidden: getComputedStyle(title).display === 'none',
      }
    }
    const out = { shortFit: read(shortFit), longOverflow: read(longOverflow) }
    shortFit.remove()
    longOverflow.remove()
    return out
  })
  // 场景自检：title-wrap 确实落在 2.5em 阈值以内（旧实现「<2.5em 即隐藏」的误伤区域）
  expect(r.shortFit.wrapW, '构造场景 title-wrap 应窄于 2.5em 阈值（否则测不到误伤回归）').toBeLessThan(
    r.shortFit.threshold,
  )
  expect(r.shortFit.scrollW, '短标题应完整放得下（无截断溢出）').toBeLessThanOrEqual(r.shortFit.clientW)
  expect(r.shortFit.titleHidden, '放得下的短标题不得被防御误隐藏').toBe(false)
  expect(r.shortFit.narrowAttr, 'data-narrow 不得写入放得下的标题').toBe(false)
  // 对照：同容器长标题放不下 → 溢出 + 可用宽不足阈值 → 仍须整体隐藏（无半字形残片）
  expect(r.longOverflow.wrapW, '对照组 title-wrap 同样应在阈值以内').toBeLessThan(r.longOverflow.threshold)
  expect(r.longOverflow.titleHidden, '极窄且放不下时标题应整体隐藏').toBe(true)
})

test('app-bar 富标题插槽：slot 内容不被压缩竖排、leading/trailing 不重叠（container-type 回归）', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app-bar')
  const r = await page.evaluate(async () => {
    // 复刻 demo 缺陷结构：app-bar 直接放进 flex 容器（DemoBlock demo 区即此形态）→
    // host shrink-to-fit，宽度由内容贡献决定。container-type: inline-size 的 size
    // containment 曾把 title-wrap 的贡献切成 0 → host 缩到 104px、富标题被压逐字竖排。
    const body = document.createElement('div')
    body.style.cssText = 'position: fixed; top: -300px; left: 0; width: 620px; display: flex;'
    const host = document.createElement('oas-app-bar')
    host.setAttribute('heading', '占位标题')
    const leading = document.createElement('div')
    leading.setAttribute('slot', 'leading')
    leading.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: var(--oas-color-primary, #333);'
    const rich = document.createElement('span')
    rich.setAttribute('slot', 'title')
    rich.style.cssText = 'display: inline-flex; align-items: center; gap: 8px;'
    rich.textContent = '发布中心'
    const tag = document.createElement('span')
    tag.textContent = 'Beta'
    tag.style.cssText =
      'padding: 1px 8px; border-radius: 999px; background: var(--oas-color-primary, #333); color: #fff; font-size: 12px;'
    rich.appendChild(tag)
    const trailing = document.createElement('div')
    trailing.setAttribute('slot', 'trailing')
    trailing.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background: var(--oas-color-border, #888);'
    host.append(leading, rich, trailing)
    body.appendChild(host)
    document.body.appendChild(body)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const rect = (el: Element | null) => {
      const b = (el as HTMLElement).getBoundingClientRect()
      return { x: b.x, w: b.width, h: b.height }
    }
    const sr = host.shadowRoot!
    const out = {
      host: rect(host),
      leading: rect(leading),
      rich: rect(rich),
      trailing: rect(trailing),
      containerType: getComputedStyle(sr.querySelector<HTMLElement>('[part="title-wrap"]')!).containerType,
      lineHeight: parseFloat(getComputedStyle(rich).lineHeight) || 22,
    }
    body.remove()
    return out
  })
  // 回归 1：title-wrap 曾因 container-type: inline-size 的 size containment 在 shrink-to-fit
  // 上下文里宽度贡献归 0 → 富标题 slot 文字被压成逐字竖排（实测 h=96 / 单行 26）。
  // 断言 slot 内容盒保持单行：高度不超过约 1.6 倍行高，且宽度显著大于单字宽（不竖排）
  expect(r.rich.h, `富标题应为单行（h=${r.rich.h}，行高=${r.lineHeight}）`).toBeLessThan(r.lineHeight * 1.6)
  expect(r.rich.w, '富标题内容宽度应远大于单字宽（文字横排）').toBeGreaterThan(60)
  // 断言 2：leading 与富标题、富标题与 trailing 之间无重叠（曾挤在一起）
  expect(r.leading.x + r.leading.w, 'leading 右缘不得越过富标题左缘').toBeLessThanOrEqual(r.rich.x + 1)
  expect(r.rich.x + r.rich.w, '富标题右缘不得越过 trailing 左缘').toBeLessThanOrEqual(r.trailing.x + 1)
  // 断言 3：container-type 不得回归（它切断 title-wrap 对宿主 shrink-to-fit 的宽度贡献）
  expect(r.containerType, 'title-wrap 不得使用 container-type（containment 切断内容宽度贡献）').toBe('normal')
})
