import { test, expect, type Locator, type Page } from '@playwright/test'

// 导航形态组合 guide 页回归：双轨侧栏是「两个 oas-sidebar 组合形态」，不是单件组件——
// 这里锁定：① 两轨都真实升级并渲染菜单（不是空壳）；② 宽度契约（左轨 collapsed 68px /
// 右面板 272px，token 真实生效）；③ 受控联动真实可用（点左轨 → 右面板标题 / active / 画布标题
// 同步；点右面板项 → active 迁移）；④ 折叠态页脚透出、header 下拉、铃铛已读这类「看得见的反馈」。
// 二批 5 个形态（浮岛顶栏 / 经典顶栏 / 展开侧栏 / 图标轨 / 暗色企业版）各锁形态契约 + 真实交互。
// zh 页与 en 页文案各自原创（zh 中文命名 / en 英文命名），文本断言分页面维护。
// 这些是页面级脚本 + 组件受控语义的组合结果，任一环失效都会让 demo 变成静态截图，单测抓不到。

/** 读取宿主盒宽（getBoundingClientRect，token 生效后的实际宽度） */
async function widthOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => document.querySelector(sel)?.getBoundingClientRect().width ?? 0, selector)
}

/** 当前高亮项的 data-value（组件按 active 渲染 .item.active） */
function activeItemValue(scope: Locator): Promise<string | null> {
  return scope.locator('[part="item"].active').first().getAttribute('data-value')
}

test('guide/navigation-patterns 双轨侧栏：两轨升级 + 68px 轨道 + 受控联动', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      customElements.get('oas-sidebar') != null &&
      [...document.querySelectorAll('oas-sidebar')].every(
        (el) => (el.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0,
      ),
    null,
    { timeout: 15000 },
  )

  const rail = page.locator('#np-rail')
  const panel = page.locator('#np-workspace-panel')
  const wsName = page.locator('#np-ws-name')
  const wsTier = page.locator('#np-ws-tier')
  const mainTitle = page.locator('#np-main-title')
  const status = page.locator('#np-status')

  // 双轨 scope 内两实例都真实渲染（左轨 3 项 / 右面板 6 项 + 两个组标题）。
  // 页面在二批新增了 3 个 sidebar demo（展开/图标轨/暗色），全局计数不再成立，按双轨外壳 scope 断言。
  await expect(page.locator('.np-shell > oas-sidebar')).toHaveCount(2)
  await expect(rail.locator('[part="item"]')).toHaveCount(3)
  await expect(panel.locator('[part="item"]')).toHaveCount(6)
  await expect(panel.locator('[part="group"]')).toHaveCount(2)

  // 左轨 collapsed 宽度契约：--oas-sidebar-collapsed-width: 68px 真实生效
  await expect(rail).toHaveAttribute('collapsed', '')
  expect(await widthOf(page, '#np-rail'), '左轨宽度应为 68px').toBeCloseTo(68, 0)
  expect(await widthOf(page, '#np-workspace-panel'), '右面板宽度应为 272px').toBeCloseTo(272, 0)

  // 折叠态 footer 默认被组件隐藏，配方用 ::part(foot) 显式透出——账户头像必须真的可见
  const railAvatar = rail.locator('oas-avatar')
  await expect(railAvatar, '左轨底部账户头像应可见（::part(foot) 覆写生效）').toBeVisible()
  expect((await railAvatar.boundingBox())?.height ?? 0, '头像应有实际尺寸（≥24px）').toBeGreaterThanOrEqual(24)

  // 初始态：左轨 am 高亮、右面板 live 高亮、header 为 OAS 控制台
  expect(await activeItemValue(rail), '左轨初始高亮OAS 工作室').toBe('am')
  expect(await activeItemValue(panel), '右面板初始高亮今日看板').toBe('live')
  await expect(wsName).toHaveText('OAS 控制台')
  await expect(wsTier).toHaveText('企业版')
  await expect(mainTitle).toHaveText('今日看板')

  // 点左轨OAS 团队 → 右面板标题 / 副标题 / active / 画布标题同步切换
  await rail.locator('[part="item"][data-value="eu"]').click()
  await expect(wsName, '切工作区后 header 工作区名应切换').toHaveText('OAS 控制台 Lite')
  await expect(wsTier, '切工作区后副标题应切换').toHaveText('团队版')
  await expect(panel, '右面板 active 受控属性应写回').toHaveAttribute('active', 'pulse')
  expect(await activeItemValue(panel), '右面板高亮项应迁移到增长雷达').toBe('pulse')
  expect(await activeItemValue(rail), '左轨高亮应迁移到OAS 团队').toBe('eu')
  await expect(mainTitle, '画布标题应同步').toHaveText('增长雷达')
  await expect(status).toContainText('OAS 团队')

  // 点右面板菜单项 → 宿主写回 active（组件自身不持有选中态）
  await panel.locator('[part="item"][data-value="teams"]').click()
  await expect(panel, '点菜单项后 active 应写回').toHaveAttribute('active', 'teams')
  expect(await activeItemValue(panel), '高亮项应为销售概况').toBe('teams')
  await expect(mainTitle).toHaveText('销售概况')
  await expect(status).toContainText('销售概况')

  // header 工作区切换是原生 button（键盘可达），下拉浮层不被容器 overflow: hidden 裁切
  const workspaceTrigger = page.locator('#np-workspace-switch button.np-workspace')
  await expect(workspaceTrigger).toHaveCount(1)
  await workspaceTrigger.click()
  await expect(
    page.locator('#np-workspace-switch .menu-anchor'),
    '下拉菜单应打开（fixed 定位于宿主之外，不被容器 overflow 裁切）',
  ).toBeVisible()
  await page.keyboard.press('Escape')

  // 铃铛：点一下把未读圆点标记为已读（oas-badge 的 dot 属性通道，有可见反馈）
  const bellBadge = page.locator('#np-bell-badge')
  await expect(bellBadge, '初始应有未读圆点').toHaveAttribute('dot', '')
  await page.locator('#np-bell').click()
  await expect(bellBadge, '点击后应清除未读圆点').not.toHaveAttribute('dot', '')
  await expect(status).toContainText('已全部标记为已读')

  // 切回左轨OAS 工作室也应恢复对应默认页（受控双向，不是单向一次性）
  await rail.locator('[part="item"][data-value="am"]').click()
  await expect(wsName).toHaveText('OAS 控制台')
  await expect(panel).toHaveAttribute('active', 'live')

  expect(errs, `guide/navigation-patterns console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns 浮岛顶栏：floating 圆角投影留边 + 受控菜单 + 铃铛已读 + 账户下拉', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      customElements.get('oas-app-bar') != null &&
      customElements.get('oas-dropdown') != null &&
      (document.querySelector('#npf-bar')?.shadowRoot?.querySelector('[part="bar"]') ?? null) != null,
    null,
    { timeout: 15000 },
  )

  const bar = page.locator('#npf-bar')
  const status = page.locator('#npf-status')

  // 形态契约：data-position=floating + 圆角 + 常显投影（elevated）真实生效
  await expect(bar, 'floating 形态标记').toHaveAttribute('data-position', 'floating')
  await expect(bar).toHaveAttribute('elevated', '')
  const radius = await bar.evaluate((el) => getComputedStyle(el).borderRadius)
  const radiusLg = await bar.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--oas-radius-lg')))
  expect(parseFloat(radius), `浮岛圆角应等于 radius-lg（实际 ${radius}）`).toBeCloseTo(radiusLg, 0)
  const shadow = await bar.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow, 'elevated 常显投影应生效').not.toBe('none')

  // 留边契约：浮岛占满容器内容宽、左右各 16px 页边距（--oas-app-bar-inset 真实生效）
  const barWidth = await widthOf(page, '#npf-bar')
  const shellWidth = await widthOf(page, '.npf-shell')
  expect(shellWidth - barWidth, '浮岛左右页边距应约 48px（inset 24×2 + 边框）').toBeGreaterThan(24)
  expect(barWidth, '浮岛应通栏伸展（占容器内容宽 90% 以上，不是中间一截）').toBeGreaterThan(shellWidth * 0.9)

  // 紧凑化契约：顶栏全要素在文档站 ~574px 内容区放得下，「···」不出现、铃铛直接可见，
  // 且标题菜单不得溢出 title-wrap 与搜索框重叠绘制（flex 挤压下的第二种窄容器失真）
  await expect(bar.locator('[part="more"]'), 'actions 区不应触发溢出收纳').toBeHidden()
  await expect(page.locator('#npf-bell'), '铃铛应直接可见可点（未被收纳）').toBeVisible()
  // 逐菜单项断言：每个 .np-menu__item 的右缘都不得越过搜索框左缘。
  // 注意不能断 #npf-menu 容器右缘——容器被 flex 压缩、子项按钮溢出容器外，
  // 容器断言会在「订单/发票被搜索框压住」时假绿（本页实发过的失真）。
  const overlap = await page.evaluate(() => {
    const check = (menuSel: string, barSel: string, searchSel: string) => {
      const bar = document.querySelector(barSel)!.getBoundingClientRect()
      const search = document.querySelector(searchSel)!.getBoundingClientRect()
      const limit = search.left - bar.left
      const offenders = [...document.querySelectorAll(menuSel + ' .np-menu__item')]
        .filter((el) => el.getBoundingClientRect().right - bar.left > limit + 1)
        .map((el) => el.getAttribute('data-value'))
      return { searchLeft: Math.round(limit), offenders }
    }
    return {
      floating: check('#npf-menu', '#npf-bar', '#npf-bar > .npf-search'),
      classic: check('#npc-menu', '#npc-bar', '#npc-bar > .npf-search'),
    }
  })
  expect(
    overlap.floating.offenders,
    `浮岛菜单项右缘不得越过搜索框左缘（searchLeft=${overlap.floating.searchLeft}）`,
  ).toEqual([])
  expect(
    overlap.classic.offenders,
    `经典顶栏菜单项右缘不得越过搜索框左缘（searchLeft=${overlap.classic.searchLeft}）`,
  ).toEqual([])

  // 菜单受控切换：点击分析 → active 迁移 + 画布标题 + 状态行
  const stats = page.locator('#npf-menu .np-menu__item[data-value="analytics"]')
  await stats.click()
  await expect(stats, '点击项应获得 active class').toHaveClass(/active/)
  await expect(stats, 'aria-current 应迁移').toHaveAttribute('aria-current', 'page')
  await expect(page.locator('#npf-canvas-title')).toHaveText('分析')
  await expect(status).toContainText('分析')

  // 铃铛已读切换（oas-badge dot 通道）
  const bellBadge = page.locator('#npf-bell-badge')
  await expect(bellBadge, '初始应有未读圆点').toHaveAttribute('dot', '')
  await page.locator('#npf-bell').click()
  await expect(bellBadge, '点击后圆点应消失').not.toHaveAttribute('dot', '')
  await expect(status).toContainText('已全部标记为已读')

  // 账户下拉：浮层打开可见（fixed 定位不被舞台 overflow 裁切）+ Esc 关闭
  await page.locator('#npf-user-menu button.npf-user__btn').click()
  await expect(page.locator('#npf-user-menu .menu-anchor'), '账户菜单浮层应可见').toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#npf-user-menu .menu-anchor')).toBeHidden()

  expect(errs, `浮岛顶栏 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns 经典顶栏：static 全宽贴边 + 底部分隔线 + 无圆角投影 + 受控菜单', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.querySelector('#npc-bar')?.shadowRoot?.querySelector('[part="bar"]') ?? null) != null,
    null,
    { timeout: 15000 },
  )

  const bar = page.locator('#npc-bar')
  const status = page.locator('#npc-status')

  // 经典契约：static 形态 + 全宽贴边 + 无圆角 + 无投影 + 宿主补的底部分隔线
  await expect(bar, '经典形态标记（归一化写入 static）').toHaveAttribute('data-position', 'static')
  const radius = await bar.evaluate((el) => getComputedStyle(el).borderRadius)
  expect(parseFloat(radius), '经典版不应有圆角').toBe(0)
  const shadow = await bar.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow, '经典版不应有投影').toBe('none')
  const borderBottom = await bar.evaluate((el) => getComputedStyle(el).borderBottomWidth)
  expect(borderBottom, '宿主补的底部分隔线应生效').toBe('1px')
  // 全宽贴边：app-bar 宽度 = 舞台 content 宽（舞台自身 border 1px×2，故比 borderBox 窄 2px）
  const barWidth = await widthOf(page, '#npc-bar')
  const shellWidth = await widthOf(page, '.npc-shell')
  expect(barWidth, '全宽贴边应等于舞台内容宽').toBeCloseTo(shellWidth - 2, 0)

  // 菜单受控切换：点击订单 → active 迁移 + 画布标题 + 状态行
  const orders = page.locator('#npc-menu .np-menu__item[data-value="orders"]')
  await orders.click()
  await expect(orders, '点击项应获得 active class').toHaveClass(/active/)
  await expect(page.locator('#npc-canvas-title')).toHaveText('订单')
  await expect(status).toContainText('订单')
  await expect(page.locator('#npc-menu .np-menu__item[data-value="dashboard"]'), '原 active 应移除').not.toHaveClass(
    /active/,
  )

  expect(errs, `经典顶栏 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns 展开侧栏：272px + 折叠/展开往返 + Dark mode 容器作用域切换', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.querySelector('#npe-sidebar')?.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0,
    null,
    { timeout: 15000 },
  )

  const sidebar = page.locator('#npe-sidebar')
  const shell = page.locator('#npe-shell')
  const status = page.locator('#npe-status')

  // 升级与渲染：9 项（2 顶层 + 7 组内）+ 1 个组标题 + 消息徽标
  await expect(sidebar.locator('[part="item"]')).toHaveCount(9)
  await expect(sidebar.locator('[part="group"]')).toHaveCount(1)
  await expect(sidebar.locator('[part="item"][data-value="inbox"] [part="badge"]')).toHaveText('7')

  // 宽度契约：--oas-sidebar-width: 272px 真实生效
  expect(await widthOf(page, '#npe-sidebar'), '展开宽度应为 272px').toBeCloseTo(272, 0)

  // 菜单受控切换：点击报表中心 → active 写回 + 画布标题 + 状态行
  await sidebar.locator('[part="item"][data-value="reporting"]').click()
  await expect(sidebar, 'active 应写回').toHaveAttribute('active', 'reporting')
  await expect(page.locator('#npe-canvas-title')).toHaveText('报表中心')
  await expect(status).toContainText('报表中心')

  // 深色模式开关：切 demo 容器 data-theme 作用域（token 换值真实生效）。
  // 浅色值可能是 #ffffff 或压缩后的 #fff（构建产物色值压缩），两者都算白底。
  const bgBefore = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-bg').trim())
  await page.locator('#npe-dark-switch').click()
  await expect(shell, '开关应把容器切到暗色作用域').toHaveAttribute('data-theme', 'dark')
  const bgAfter = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-bg').trim())
  expect(bgAfter, '暗色作用域下 --oas-color-bg 应切换为暗色值').toBe('#18181b')
  expect(['#ffffff', '#fff'], `浅色初始应为白底（实际 ${bgBefore}）`).toContain(bgBefore)
  await expect(status).toContainText('暗色')
  // 切回浅色（开关可逆）
  await page.locator('#npe-dark-switch').click()
  await expect(shell, '再点应切回浅色').toHaveAttribute('data-theme', 'light')

  // 折叠：受控属性写回 + 宽度变默认 64px + 展开按钮出现在折叠后图标轨底部（footer 槽透出）。
  // 组件 :host 有 width 过渡（~180ms），属性已写但宽度在动画中——用 poll 等宽度到位。
  // 展开态该按钮必须隐藏（纯 CSS [collapsed] 驱动），先锁这个再折叠：
  const expandBtn = page.locator('#npe-expand-btn')
  await expect(expandBtn, '展开态展开按钮应隐藏（显隐纯 CSS 驱动）').toBeHidden()
  await page.locator('#npe-collapse-btn').click()
  await expect(sidebar, '折叠按钮应写回 collapsed').toHaveAttribute('collapsed', '')
  await expect
    .poll(() => widthOf(page, '#npe-sidebar'), { timeout: 3000, message: '折叠宽度应为组件默认 64px' })
    .toBeCloseTo(64, 0)
  await expect(expandBtn, '折叠后展开按钮应收在图标轨底部可见').toBeVisible()
  await expect(status).toContainText('图标轨')

  // 展开：回到 272px，折叠按钮恢复
  await expandBtn.click()
  await expect(sidebar, '展开应移除 collapsed').not.toHaveAttribute('collapsed', '')
  await expect.poll(() => widthOf(page, '#npe-sidebar'), { timeout: 3000, message: '展开回 272px' }).toBeCloseTo(272, 0)
  await expect(expandBtn).toBeHidden()

  expect(errs, `展开侧栏 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns 图标轨：collapsed 68px + 页脚头像透出 + 受控 active + 悬停临时展开', async ({
  page,
}) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.querySelector('#npr-rail')?.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0,
    null,
    { timeout: 15000 },
  )

  const rail = page.locator('#npr-rail')
  const status = page.locator('#npr-status')

  // 轨道契约：collapsed + 68px（--oas-sidebar-collapsed-width 真实生效）
  await expect(rail).toHaveAttribute('collapsed', '')
  await expect(rail).toHaveAttribute('expand-on-hover', '')
  expect(await widthOf(page, '#npr-rail'), '轨道宽度应为 68px').toBeCloseTo(68, 0)

  // 折叠态页脚透出：::part(foot) 覆写生效，头像可见
  const railAvatar = rail.locator('oas-avatar')
  await expect(railAvatar, '轨道底部头像应可见').toBeVisible()

  // 点击图标切 active（受控写回）+ 画布标题 + 状态行
  await rail.locator('[part="item"][data-value="analytics"]').click()
  await expect(rail, 'active 应写回').toHaveAttribute('active', 'analytics')
  expect(await activeItemValue(rail), '高亮项应迁移到数据分析').toBe('analytics')
  await expect(page.locator('#npr-canvas-title')).toHaveText('数据分析')
  await expect(status).toContainText('数据分析')

  // expand-on-hover：悬停临时展开到 --oas-sidebar-width（240px），纯视觉不改受控值
  await rail.hover()
  await expect
    .poll(() => widthOf(page, '#npr-rail'), { timeout: 3000, message: '悬停后应临时展开' })
    .toBeGreaterThan(200)
  await expect(rail, '悬停展开是视觉态，collapsed 受控值不应被改写').toHaveAttribute('collapsed', '')
  await page.mouse.move(0, 0)
  await expect.poll(() => widthOf(page, '#npr-rail'), { timeout: 3000, message: '移开后应回轨' }).toBeLessThan(100)

  expect(errs, `图标轨 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns 暗色企业版：容器 data-theme=dark 真实生效 + 主色徽标 + 受控菜单', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.querySelector('#npd-sidebar')?.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0,
    null,
    { timeout: 15000 },
  )

  const sidebar = page.locator('#npd-sidebar')
  const shell = page.locator('.npd-shell')
  const status = page.locator('#npd-status')

  // 暗色契约：容器 data-theme=dark + token 作用域真实换值（#18181b 为主题 dark 的 --oas-color-bg）
  await expect(shell).toHaveAttribute('data-theme', 'dark')
  const bg = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-bg').trim())
  expect(bg, '容器作用域内 --oas-color-bg 应为暗色值').toBe('#18181b')
  // 侧栏实际渲染底色为暗色（--oas-sidebar-bg 缺省 --oas-color-bg-hover 的暗色档）
  const sidebarBg = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor)
  const channels = (sidebarBg.match(/\d+/g) ?? []).map(Number).slice(0, 3)
  // 通道数从实际 rgb()/rgba() 串结构推导（逗号数 + 1），不硬编码常数
  expect(channels.length, 'backgroundColor 应可解析').toBe((sidebarBg.match(/,/g) ?? []).length + 1)
  expect(
    channels.every((c) => c < 80),
    `侧栏底色应为暗色（实际 ${sidebarBg}）`,
  ).toBe(true)

  // 渲染与徽标：8 项 + 1 组标题 + 消息徽标 7（主色徽标在暗底上可见）
  await expect(sidebar.locator('[part="item"]')).toHaveCount(8)
  await expect(sidebar.locator('[part="group"]')).toHaveCount(1)
  await expect(sidebar.locator('[part="item"][data-value="inbox"] [part="badge"]')).toHaveText('7')
  await expect(sidebar.locator('[part="item"][data-value="inbox"]')).toBeVisible()

  // 受控菜单切换：点击发票管理 → active 写回 + 画布标题 + 状态行
  await sidebar.locator('[part="item"][data-value="invoices"]').click()
  await expect(sidebar, 'active 应写回').toHaveAttribute('active', 'invoices')
  expect(await activeItemValue(sidebar), '高亮项应迁移到发票管理').toBe('invoices')
  await expect(page.locator('#npd-canvas-title')).toHaveText('发票管理')
  await expect(status).toContainText('发票管理')

  expect(errs, `暗色企业版 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('guide/navigation-patterns (en) 英文页采样：floating 契约 + en 原创文案 + 图标轨 68px + 暗色作用域', async ({
  page,
}) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  // en 页与 zh 页同构但文案独立（en 原创命名，非 zh 的翻译）——本条采样关键契约 + en 文案存活
  await page.goto('/en/guide/navigation-patterns.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      customElements.get('oas-app-bar') != null &&
      (document.querySelector('#npf-bar')?.shadowRoot?.querySelector('[part="bar"]') ?? null) != null &&
      (document.querySelector('#npr-rail')?.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0 &&
      (document.querySelector('#npd-sidebar')?.shadowRoot?.querySelectorAll('[part="item"]').length ?? 0) > 0,
    null,
    { timeout: 15000 },
  )

  // Floating contract mirrors zh: shape marker + radius + shadow + full-width inset
  const bar = page.locator('#npf-bar')
  await expect(bar).toHaveAttribute('data-position', 'floating')
  const radius = await bar.evaluate((el) => getComputedStyle(el).borderRadius)
  const radiusLg = await bar.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--oas-radius-lg')))
  expect(parseFloat(radius), `floating radius should equal radius-lg (got ${radius})`).toBeCloseTo(radiusLg, 0)
  const shadow = await bar.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow, 'elevated 投影应生效').not.toBe('none')
  const barWidth = await widthOf(page, '#npf-bar')
  const shellWidth = await widthOf(page, '.npf-shell')
  expect(shellWidth - barWidth, '浮岛左右页边距').toBeGreaterThan(24)
  expect(barWidth, '浮岛应通栏伸展').toBeGreaterThan(shellWidth * 0.9)
  await expect(bar.locator('[part="more"]'), 'actions 不应触发溢出收纳').toBeHidden()
  await expect(page.locator('#npf-bell')).toBeVisible()
  const overlap = await page.evaluate(() => {
    const bar = document.querySelector('#npf-bar')!.getBoundingClientRect()
    const menu = document.querySelector('#npf-menu')!.getBoundingClientRect()
    const search = document.querySelector('#npf-bar > .npf-search')!.getBoundingClientRect()
    return { menuRight: menu.right - bar.left, searchLeft: search.left - bar.left }
  })
  expect(overlap.menuRight, '标题菜单不得与搜索框重叠').toBeLessThanOrEqual(overlap.searchLeft)

  // en 文案：菜单为 en 原创命名，点击后画布标题与状态行同步（en）
  const stats = page.locator('#npf-menu .np-menu__item[data-value="analytics"]')
  await expect(stats, 'en 菜单应为英文命名').toHaveText('Stats')
  await stats.click()
  await expect(page.locator('#npf-canvas-title')).toHaveText('Stats')
  await expect(page.locator('#npf-status')).toContainText('Stats')

  // 展开侧栏品牌名 en：OAS Console（文案语言区分的关键锚点；页面上该 class 出现两次，scope 到 npe-shell）
  await expect(page.locator('.npe-shell .npe-head__name')).toHaveText('OAS Console')

  // 图标轨契约：collapsed 68px
  const rail = page.locator('#npr-rail')
  await expect(rail).toHaveAttribute('collapsed', '')
  expect(await widthOf(page, '#npr-rail'), '轨道宽度应为 68px').toBeCloseTo(68, 0)

  // 暗色契约：容器 data-theme=dark + token 换值
  const darkShell = page.locator('.npd-shell')
  await expect(darkShell).toHaveAttribute('data-theme', 'dark')
  const bg = await darkShell.evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-bg').trim())
  expect(bg, '暗色作用域 --oas-color-bg').toBe('#18181b')

  expect(errs, `en 页 console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})
