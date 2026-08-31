// 复核回归：跨组件/全局场景——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('demo 事件反馈（点击 button 弹出 message）', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-button').click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const n = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  expect(n).toBeGreaterThan(0)
})

test('size 五档：button/tag/switch 在 demo 中渲染对应 size class（不静默吞值）', async ({
  page,
}) => {
  const SIZES = ['xs', 'small', 'medium', 'large', 'xl']
  // button：shadow button 应带对应 size class
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  const buttonSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-button[size="${s}"]`)
      return el?.shadowRoot?.querySelector('button')?.classList.contains(s) ?? false
    })
  }, SIZES)
  expect(buttonSizes).toEqual([true, true, true, true, true])

  // tag：.tag 应带对应 size class
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag')
  const tagSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-tag[size="${s}"]`)
      return el?.shadowRoot?.querySelector('.tag')?.classList.contains(s) ?? false
    })
  }, SIZES)
  expect(tagSizes).toEqual([true, true, true, true, true])

  // switch：shadow button className 应等于对应 size（白名单修复：不再吞掉 xs/xl）
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-switch')
  const switchSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-switch[size="${s}"]`)
      return el?.shadowRoot?.querySelector('button')?.className ?? null
    })
  }, SIZES)
  expect(switchSizes).toEqual(['xs', 'small', 'medium', 'large', 'xl'])
})

test('DemoBlock 示例代码：连排闭合标签逐行拆分（</svg></oas-icon> 不挤一行）', async ({ page }) => {
  // 曾现 bug：formatHtml 的「闭合标签间换行」正则把下一个闭合标签的 `</` 消费掉，
  // `</path></svg></oas-icon>` 连排时第二次匹配失败 → duotone demo 代码里 </svg></oas-icon>
  // 挤一行且其后缩进全乱（canvas demo 闭合标签前是文本不受影响，所以表现正常）。
  // 修复：正则尾部 `</` 改前瞻不消费。此处锁定「连排闭合标签必须拆行 + 顶层标签不缩进」。
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.demo-block', { state: 'attached' })
  const block = page.locator('.demo-block', { hasText: 'duotone 双色' }).first()
  await block.locator('.demo-block__toggle').click()
  const code = block.locator('.demo-block__code code').first()
  // 点击后异步高亮，自动重试等待非空
  await expect(code).not.toBeEmpty()
  const text = await code.innerText()
  expect(text, '连排闭合标签不允许挤一行').not.toContain('</svg></oas-icon>')
  expect(text).toContain('</svg>\n</oas-icon>')
  // 顶层 oas-icon 之间换行且不缩进（depth 归零）
  expect(text).toMatch(/<\/oas-icon>\n<oas-icon/)
  // 空元素保持一行（canvas demo 的 <oas-icon ...></oas-icon> 不被拆）
  const canvasBlock = page.locator('.demo-block', { hasText: 'canvas 占位框模式' }).first()
  await canvasBlock.locator('.demo-block__toggle').click()
  const canvasCode = canvasBlock.locator('.demo-block__code code').first()
  await expect(canvasCode).not.toBeEmpty()
  const canvasText = await canvasCode.innerText()
  expect(canvasText).toContain(
    '<oas-icon name="check" canvas="fixed" color="var(--oas-color-primary)"></oas-icon>',
  )
})

test('展示型组件字号继承：A 类跟随外层 font-size、B 类大数字默认固定且组件级变量可覆盖', async ({
  page,
}) => {
  // 设计决策（通用做法，详见组件 :host 注释）：
  //   A 类展示文本（gradient-text/comment/equation/log/timeline/breadcrumb/descriptions-item）
  //     :host font-size = var(--组件级变量, inherit) → 跟随外层；code 特例 0.875em 略缩
  //   B 类大数字（statistic/countdown/number-animation）
  //     :host font-size = var(--组件级变量, var(--全局lg)) → 默认固定 16px（语义同 h1），
  //     组件级变量（--oas-statistic-font 等）显式覆盖
  // 曾现 bug：首页统计条外层 font-size:32px 对 oas-statistic 无效（:host 显式全局 token 阻断继承）
  await page.goto('/components/statistic.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-statistic')
  const r = await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.style.fontSize = '32px'
    wrap.innerHTML = `
      <oas-statistic value="42"></oas-statistic>
      <oas-countdown value="60000"></oas-countdown>
      <oas-number-animation value="42"></oas-number-animation>
      <oas-gradient-text>g</oas-gradient-text>
      <oas-comment author="a" content="c"></oas-comment>
      <oas-equation code="x"></oas-equation>
      <oas-log></oas-log>
      <oas-timeline></oas-timeline>
      <oas-breadcrumb items='[{"label":"a"}]'></oas-breadcrumb>
      <oas-descriptions><oas-descriptions-item label="l">v</oas-descriptions-item></oas-descriptions>
      <oas-code code="x"></oas-code>
    `
    document.body.append(wrap)
    const fs = (sel: string, inner?: string) => {
      const el = wrap.querySelector(sel)!
      if (!inner) return getComputedStyle(el).fontSize
      return getComputedStyle(el.shadowRoot!.querySelector(inner)!).fontSize
    }
    const out: Record<string, string> = {
      statistic: fs('oas-statistic'),
      countdown: fs('oas-countdown'),
      numberAnimation: fs('oas-number-animation'),
      gradientText: fs('oas-gradient-text'),
      comment: fs('oas-comment'),
      commentTime: fs('oas-comment', '.time'),
      equation: fs('oas-equation'),
      log: fs('oas-log'),
      timeline: fs('oas-timeline'),
      breadcrumb: fs('oas-breadcrumb'),
      descriptionsItem: fs('oas-descriptions-item'),
      code: fs('oas-code'),
    }
    // B 类开口验证：组件级变量覆盖
    ;(wrap.querySelector('oas-statistic') as HTMLElement).style.setProperty(
      '--oas-statistic-font',
      '40px',
    )
    out.statisticOverride = getComputedStyle(wrap.querySelector('oas-statistic')!).fontSize
    wrap.remove()
    return out
  })
  // B 类：默认固定 lg(16px)，不随外层 32px；组件级变量开口生效
  expect(r.statistic, 'statistic 默认固定 16px').toBe('16px')
  expect(r.countdown, 'countdown 默认固定 16px').toBe('16px')
  expect(r.numberAnimation, 'number-animation 默认固定 16px').toBe('16px')
  expect(r.statisticOverride, '--oas-statistic-font 覆盖开口应生效').toBe('40px')
  // A 类：跟随外层 32px（code 0.875em = 28px）
  expect(r.gradientText).toBe('32px')
  expect(r.comment).toBe('32px')
  expect(r.commentTime, 'comment 次级文本 0.857em 比例跟随').toBe('27.424px')
  expect(r.equation).toBe('32px')
  expect(r.log).toBe('32px')
  expect(r.timeline).toBe('32px')
  expect(r.breadcrumb).toBe('32px')
  expect(r.descriptionsItem).toBe('32px')
  expect(r.code, 'code 0.875em 略缩跟随').toBe('28px')
})

test('slider/input-number 受控写回：交互后宿主 value 属性同步（真实浏览器）', async ({ page }) => {
  // 集成反馈固化：曾单向受控不写回，宿主 getAttribute 永远初始值，集成方被迫缓存事件 detail
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-input]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-input]')!
    const num = el.shadowRoot!.querySelector<HTMLInputElement>(
      '[role="textbox"], input[type="number"]',
    )
    return { before: el.getAttribute('value'), hasNum: !!num }
  })
  expect(r.before).not.toBeNull()
  // 真实交互：改数值输入框并提交（change 事件）
  const written = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-input]')!
    const num = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')
    if (!num) return null
    num.value = '60'
    num.dispatchEvent(new Event('change', { bubbles: true }))
    return el.getAttribute('value')
  })
  expect(written).toBe('60')
})

test('菜单家族 iconColor：menu/menubar/navigation-menu 图标固定颜色，缺省 currentColor 不回归', async ({
  page,
}) => {
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  await page.evaluate(() => {
    const menu = document.createElement('oas-menu')
    menu.setAttribute(
      'items',
      JSON.stringify([
        { label: '着色', value: 'a', icon: 'star', iconColor: '#f50' },
        { label: '缺省', value: 'b', icon: 'gear' },
      ]),
    )
    document.body.appendChild(menu)
  })
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-menu')].some(
        (m) => m.getAttribute('value') === null && m.shadowRoot?.querySelector('.icon svg path'),
      ),
    undefined,
    { timeout: 5000 },
  )
  const menuColored = await page.evaluate(() => {
    const menus = [...document.querySelectorAll('oas-menu')]
    const el = menus[menus.length - 1]!
    const icons = [...el.shadowRoot!.querySelectorAll('.icon svg')]
    const read = (svg: Element) => ({
      outer: svg.getAttribute('stroke'),
      path: svg.querySelector('path')?.getAttribute('stroke') ?? null,
    })
    return { colored: read(icons[0]!), plain: read(icons[1]!) }
  })
  expect(menuColored.colored).toEqual({ outer: '#f50', path: '#f50' })
  expect(menuColored.plain).toEqual({ outer: 'currentColor', path: 'currentColor' })

  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar')
  await page.evaluate(() => {
    const bar = document.createElement('oas-menubar')
    bar.setAttribute(
      'items',
      JSON.stringify([
        {
          label: '文件',
          value: 'file',
          icon: 'gear',
          iconColor: '#f50',
          children: [{ label: '新建', value: 'new', icon: 'plus' }],
        },
      ]),
    )
    document.body.appendChild(bar)
  })
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-menubar')].some(
        (m) => m.shadowRoot?.querySelector('.top-item .icon svg path'),
      ),
    undefined,
    { timeout: 5000 },
  )
  const barResult = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-menubar')][
      [...document.querySelectorAll('oas-menubar')].length - 1
    ]!
    const root = el.shadowRoot!
    const read = (svg: Element) => ({
      outer: svg.getAttribute('stroke'),
      path: svg.querySelector('path')?.getAttribute('stroke') ?? null,
    })
    return {
      top: read(root.querySelector('.top-item .icon svg')!),
      sub: read(root.querySelector('[part="item"] .icon svg')!),
    }
  })
  expect(barResult.top).toEqual({ outer: '#f50', path: '#f50' })
  expect(barResult.sub).toEqual({ outer: 'currentColor', path: 'currentColor' })

  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  await page.evaluate(() => {
    const nav = document.createElement('oas-navigation-menu')
    nav.setAttribute('delay-duration', '0')
    nav.setAttribute('value', 'products')
    nav.setAttribute(
      'items',
      JSON.stringify([
        {
          label: '产品',
          value: 'products',
          children: [
            {
              label: '组件',
              value: 'components',
              href: '/components',
              icon: 'star',
              iconColor: '#f50',
            },
            { label: '文档', value: 'docs', href: '/docs', icon: 'user' },
          ],
        },
      ]),
    )
    document.body.appendChild(nav)
  })
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-navigation-menu')].some(
        (m) => m.shadowRoot?.querySelector('.card .icon svg path'),
      ),
    undefined,
    { timeout: 5000 },
  )
  const navResult = await page.evaluate(() => {
    const all = [...document.querySelectorAll('oas-navigation-menu')]
    const el = all[all.length - 1]!
    const icons = [...el.shadowRoot!.querySelectorAll('.card .icon svg')]
    const read = (svg: Element) => ({
      outer: svg.getAttribute('stroke'),
      path: svg.querySelector('path')?.getAttribute('stroke') ?? null,
    })
    return { colored: read(icons[0]!), plain: read(icons[1]!) }
  })
  expect(navResult.colored).toEqual({ outer: '#f50', path: '#f50' })
  expect(navResult.plain).toEqual({ outer: 'currentColor', path: 'currentColor' })
})

test('menubar/navigation-menu/sidebar 粗指针触控目标 ≥48px xl 档（pointer:coarse 设备模拟）', async ({ browser }) => {
  // 三页连跳 + sidebar 大页加载，总时长易超默认 test timeout——test.slow() 三倍放宽
  test.slow()
  // 模板方反馈：窄屏 ☰ 弹出菜单顶级项 52×32px，粗指针设备不达标（目标 ≥44px）
  // 库侧治本：三组件 STYLE 内 @media (pointer: coarse) 触控基线；模板临时 ::part 补丁可移除
  // 移动设备模拟（isMobile+hasTouch → DevTools 设备仿真把 pointer 翻为 coarse）
  const context = await browser.newContext({ viewport: { width: 760, height: 700 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
  expect(coarse, '设备模拟应使 pointer:coarse 命中').toBe(true)
  const r: Record<string, number> = {}
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar')
  r.menubarTop = await page.evaluate(() => {
    const t = document.querySelector('oas-menubar')!.shadowRoot!.querySelector('[part="top-item"]') as HTMLElement
    return Math.round(t.getBoundingClientRect().height)
  })
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  r.navTop = await page.evaluate(() => {
    const t = document.querySelector('oas-navigation-menu')!.shadowRoot!.querySelector('[part="top-item"]') as HTMLElement
    return Math.round(t.getBoundingClientRect().height)
  })
  // sidebar（.item 桌面 lg 40 → coarse xl 48，.item.sub 子项同类名一并覆盖）
  // 该页用独立 page 直接打开：coarse 模拟下同 page 第三次跨页 goto 偶发不换页（Chromium/vitepress
  // 交互层问题，量测语义与到达方式无关），独立 page 稳定且加载更快
  const sidebarPage = await context.newPage()
  await sidebarPage.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await sidebarPage.waitForSelector('oas-sidebar', { state: 'attached', timeout: 45000 })
  await sidebarPage.waitForFunction(() => {
    const s = document.querySelector('oas-sidebar')
    return s != null && s.shadowRoot != null
  }, { timeout: 15000 })
  await sidebarPage.waitForTimeout(400)
  r.sidebarItem = await sidebarPage.evaluate(() => {
    const items = [...document.querySelectorAll('oas-sidebar')]
      .flatMap((s) => [...(s.shadowRoot?.querySelectorAll('.item') ?? [])])
      .map((i) => Math.round(i.getBoundingClientRect().height))
      .filter((h) => h > 0)
    return items.length ? Math.max(...items) : 0
  })
  expect(r.sidebarItem, 'sidebar 菜单项粗指针高度应 ≥48（有布局实例）').toBeGreaterThanOrEqual(48)
  await context.close()
  expect(r.menubarTop, `menubar 顶级项粗指针高度应 ≥48（实测 ${r.menubarTop}）`).toBeGreaterThanOrEqual(48)
  expect(r.navTop, `navigation-menu 顶级项粗指针高度应 ≥48（实测 ${r.navTop}）`).toBeGreaterThanOrEqual(48)
  expect(r.sidebarItem, `sidebar 菜单项粗指针高度应 ≥48（实测 ${r.sidebarItem}）`).toBeGreaterThanOrEqual(48)
})
