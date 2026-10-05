import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASNoticeBar } from './index.js'

/**
 * oas-notice-bar（移动原生形态批，feedback 族）—— 通告栏。
 *
 * 设计前必答清单（AGENTS.md 六问）：
 * 1. 取消路径：关闭按钮 → oas-close → 自隐藏（退场过渡）；宿主设 open 属性可恢复显示
 *    （组件关闭时自移除 open，恢复 = 宿主重设）。轮播计时器/退场计时器经 onCleanup 清理，
 *    断开连接零孤儿定时器；重连后轮播自动恢复（连接态指纹变化触发计时器重启）。
 * 2. 属性默认值：type=info（非法回落）；icon 缺省按 type 取默认图标、icon="none" 不显示；
 *    closable/scrollable 缺省关；items 缺省走默认插槽单条内容；interval 缺省 4000（非法回退）；
 *    action-text 缺省无 action；href 缺省 button 形态；open 缺省可见。
 * 3. 多步交互失败点：items JSON 非法/非数组/空 → 回退插槽内容；interval 非法 → 4000；
 *    关闭退场中重复点击不重复派发（closing 防重入）；单条 items 不启动轮播计时器；
 *    prefers-reduced-motion 下不自动轮播、关闭跳过过渡。
 * 4. 破坏性选项：无破坏性操作；关闭是显式动作且可恢复（open）。
 * 5. 键盘/ARIA：容器 role="region" + aria-label（i18n）；关闭按钮 aria-label（i18n）+
 *    focus-visible 焦点环；action 为 button 形态可聚焦、有可见文本；自动轮播 aria-live="off"
 *    （不打扰读屏），静态态 polite；图标 aria-hidden。
 * 6. 受控/非受控：显隐默认非受控（内部 closed 状态），open 属性为受控恢复通道；
 *    属性均为 kebab-case 且不与 HTMLElement 内建 property 冲突，Vue/React 桥接安全。
 *
 * happy-dom 限制：getComputedStyle 不解析 var()/color-mix()——颜色断言锁「样式表含
 * 语义 token 表达式」的机制形态，真实配色由 e2e（qa-regression/notice-bar.spec.ts）复核。
 * 轮播/关闭过渡等计时行为用 fake timers 驱动（真实计时器在 happy-dom 下有交付竞态）；
 * slot 投影内容不进 shadowRoot.textContent（textContent 不跨 shadow 边界）——投影断言走
 * probe 显隐与 slot.assignedNodes()。
 */

/** 轮播演示间隔：须大于淡出时长（200ms），保证每个 tick 的换文本在下一个 tick 前落定 */
const DEMO_INTERVAL = '300'

function mount(attrs: Record<string, string> = {}, inner = ''): OASNoticeBar {
  const el = new OASNoticeBar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (inner) el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

function bar(el: OASNoticeBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
}

function closeBtn(el: OASNoticeBar): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!
}

function itemText(el: OASNoticeBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.item-text')!
}

function carousel(el: OASNoticeBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="carousel"]')!
}

function probe(el: OASNoticeBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.probe')!
}

function marqueeEl(el: OASNoticeBar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('oas-marquee')!
}

function actionLink(el: OASNoticeBar): HTMLAnchorElement {
  return el.shadowRoot!.querySelectorAll<HTMLAnchorElement>('[part="action"]')[0] as HTMLAnchorElement
}

function actionBtn(el: OASNoticeBar): HTMLButtonElement {
  return el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="action"]')[1] as HTMLButtonElement
}

function styleText(el: OASNoticeBar): string {
  return el.shadowRoot!.querySelector('style')!.textContent ?? ''
}

describe('OASNoticeBar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  // ---------- 基础渲染与 a11y ----------

  it('基础渲染：role=region + aria-label（i18n），默认插槽内容投影（probe 可见）', () => {
    const el = mount({}, '系统维护通知')
    expect(bar(el).getAttribute('role')).toBe('region')
    expect(bar(el).getAttribute('aria-label')).toBe('通告')
    // 默认插槽内容经 probe 里的 <slot> 投影（textContent 不跨 shadow 边界，断言 probe 显隐）
    expect(probe(el).hidden).toBe(false)
    expect(
      Array.from(probe(el).querySelector<HTMLSlotElement>('slot')!.assignedNodes())
        .map((n) => n.textContent ?? '')
        .join(''),
    ).toContain('系统维护通知')
  })

  // ---------- type ----------

  it('type 四态：data-type 同步，非法值回落 info', () => {
    const el = mount()
    expect(bar(el).getAttribute('data-type')).toBe('info')
    for (const t of ['success', 'warning', 'error']) {
      el.setAttribute('type', t)
      expect(bar(el).getAttribute('data-type')).toBe(t)
    }
    el.setAttribute('type', 'bogus')
    expect(bar(el).getAttribute('data-type')).toBe('info')
  })

  it('type 配色走语义 token（样式表含 success/danger token 与 color-mix），零硬编码色值', () => {
    const el = mount({ type: 'success' })
    const css = styleText(el)
    expect(css).toContain('var(--oas-color-success)')
    expect(css).toContain('var(--oas-color-danger)')
    expect(css).toContain('color-mix')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
  })

  // ---------- icon ----------

  it('icon：缺省按 type 渲染默认图标（SVG）；icon="none" 整体隐藏', () => {
    const el = mount()
    const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
    expect(icon.hidden).toBe(false)
    expect(icon.querySelector('svg')).not.toBeNull()
    expect(icon.querySelector<HTMLElement>('.icon-default')!.hidden).toBe(false)

    el.setAttribute('icon', 'none')
    expect(icon.hidden).toBe(true)
  })

  it('icon：自定义图标名渲染对应 SVG；非法名回落 type 默认', () => {
    const el = mount({ icon: 'star' })
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('.icon-default')!
    expect(fallback.querySelector('svg')).not.toBeNull()
    // star 与默认 info 的 path 不同
    expect(fallback.innerHTML).not.toBe(mount().shadowRoot!.querySelector('.icon-default')!.innerHTML)
    const el2 = mount({ icon: 'not-exist-icon' })
    const fallback2 = el2.shadowRoot!.querySelector<HTMLElement>('.icon-default')!
    expect(fallback2.querySelector('svg')).not.toBeNull()
  })

  it('icon 插槽覆盖默认图标', () => {
    const el = mount({}, '<span slot="icon">ICON</span>')
    const icon = el.shadowRoot!.querySelector<HTMLElement>('[part="icon"]')!
    const iconSlot = icon.querySelector<HTMLSlotElement>('slot[name="icon"]')!
    const fallback = icon.querySelector<HTMLElement>('.icon-default')!
    expect(icon.hidden).toBe(false)
    expect(fallback.hidden).toBe(true)
    expect(
      Array.from(iconSlot.assignedNodes())
        .map((n) => n.textContent ?? '')
        .join(''),
    ).toContain('ICON')
  })

  // ---------- closable 与关闭流程 ----------

  it('closable：默认隐藏关闭按钮；closable 在场显示且 aria-label 走 i18n；运行时可增删', () => {
    const el = mount()
    expect(closeBtn(el).hidden).toBe(true)
    el.setAttribute('closable', '')
    expect(closeBtn(el).hidden).toBe(false)
    expect(closeBtn(el).getAttribute('aria-label')).toBe('关闭')
    el.removeAttribute('closable')
    expect(closeBtn(el).hidden).toBe(true)
  })

  it('点击关闭：派发 oas-close → 同步 hidden + data-closing → 过渡后落定；重复点击不重复派发', () => {
    const el = mount({ closable: '' })
    let close = 0
    el.addEventListener('oas-close', () => close++)
    closeBtn(el).click()
    expect(close).toBe(1)
    expect(el.hidden).toBe(true)
    expect(el.hasAttribute('data-closing')).toBe(true)
    closeBtn(el).click()
    expect(close).toBe(1)
    vi.advanceTimersByTime(300)
    expect(el.hasAttribute('data-closing')).toBe(false)
    expect(el.hidden).toBe(true)
  })

  it('关闭后可恢复：宿主设 open 属性恢复显示；组件关闭时自移除 open；恢复后可再关闭', () => {
    const el = mount({ closable: '' })
    closeBtn(el).click()
    vi.advanceTimersByTime(300)
    expect(el.hidden).toBe(true)
    // 恢复
    el.setAttribute('open', '')
    expect(el.hidden).toBe(false)
    // 再关闭仍有效
    closeBtn(el).click()
    expect(el.hidden).toBe(true)
    vi.advanceTimersByTime(300)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('退场中宿主设 open：打断过渡恢复可见', () => {
    const el = mount({ closable: '' })
    closeBtn(el).click()
    expect(el.hasAttribute('data-closing')).toBe(true)
    el.setAttribute('open', '')
    expect(el.hasAttribute('data-closing')).toBe(false)
    expect(el.hidden).toBe(false)
    // 打断后计时器已清：推进时间不落关闭态
    vi.advanceTimersByTime(300)
    expect(el.hidden).toBe(false)
  })

  it('prefers-reduced-motion：关闭跳过过渡直接落定；items 多条不自动轮播', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const el = mount({ closable: '', items: '["第一条","第二条"]', interval: DEMO_INTERVAL })
    closeBtn(el).click()
    expect(el.hidden).toBe(true)
    expect(el.hasAttribute('data-closing')).toBe(false)
    vi.advanceTimersByTime(10_000)
    // 不自动轮播：文本停留在第一条
    expect(itemText(el).textContent).toBe('第一条')
    // 静态态对读屏友好
    expect(carousel(el).getAttribute('aria-live')).toBe('polite')
  })

  // ---------- items 轮播 ----------

  it('items：合法 JSON 显示第一条；多条自动轮播推进文本且 aria-live=off', () => {
    const el = mount({ items: '["第一条公告","第二条公告"]', interval: DEMO_INTERVAL })
    expect(itemText(el).textContent).toBe('第一条公告')
    expect(carousel(el).hidden).toBe(false)
    expect(carousel(el).getAttribute('aria-live')).toBe('off')
    // 一个 interval tick（推进 idx）+ 淡出换文本（200ms）落定
    vi.advanceTimersByTime(500)
    expect(itemText(el).textContent).toBe('第二条公告')
    vi.advanceTimersByTime(300)
    expect(itemText(el).textContent).toBe('第一条公告')
  })

  it('items 单条：静态显示不轮播（aria-live=polite）', () => {
    const el = mount({ items: '["唯一一条"]', interval: DEMO_INTERVAL })
    expect(itemText(el).textContent).toBe('唯一一条')
    expect(carousel(el).getAttribute('aria-live')).toBe('polite')
    vi.advanceTimersByTime(10_000)
    expect(itemText(el).textContent).toBe('唯一一条')
  })

  it('items 非法 JSON / 空数组 / 非数组 → 回退默认插槽内容（probe 显示）', () => {
    const el = mount({ items: 'not-json' }, '插槽内容')
    expect(carousel(el).hidden).toBe(true)
    expect(probe(el).hidden).toBe(false)
    const el2 = mount({ items: '[]' }, '插槽内容2')
    expect(carousel(el2).hidden).toBe(true)
    expect(probe(el2).hidden).toBe(false)
    const el3 = mount({ items: '{"a":1}' }, '插槽内容3')
    expect(carousel(el3).hidden).toBe(true)
    expect(probe(el3).hidden).toBe(false)
  })

  it('items 优先于默认插槽内容', () => {
    const el = mount({ items: '["属性条目"]' }, '插槽内容')
    expect(itemText(el).textContent).toBe('属性条目')
    expect(probe(el).hidden).toBe(true)
  })

  it('items 渲染走纯文本通道（HTML 字符串不解析）', () => {
    const el = mount({ items: '["<img src=x onerror=alert(1)>"]' })
    expect(el.shadowRoot!.querySelector('img')).toBeNull()
    expect(itemText(el).textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('运行时更新 items：复位到第一条并按新列表轮播', () => {
    const el = mount({ items: '["a1","a2"]', interval: DEMO_INTERVAL })
    vi.advanceTimersByTime(500)
    expect(itemText(el).textContent).toBe('a2')
    el.setAttribute('items', '["b1","b2","b3"]')
    expect(itemText(el).textContent).toBe('b1')
    vi.advanceTimersByTime(500)
    expect(itemText(el).textContent).toBe('b2')
  })

  // ---------- action ----------

  it('action：href 在场渲染 <a href>，button 隐藏；缺 action-text 双双隐藏', () => {
    const el = mount({ 'action-text': '查看详情', href: 'https://example.com' })
    expect(actionLink(el).hidden).toBe(false)
    expect(actionLink(el).getAttribute('href')).toBe('https://example.com')
    expect(actionLink(el).textContent).toBe('查看详情')
    expect(actionBtn(el).hidden).toBe(true)

    const el2 = mount()
    expect(actionLink(el2).hidden).toBe(true)
    expect(actionBtn(el2).hidden).toBe(true)
  })

  it('action：无 href 渲染 <button>，点击派发 oas-action-click；href 形态点击不派发', () => {
    const el = mount({ 'action-text': '知道了' })
    expect(actionBtn(el).hidden).toBe(false)
    expect(actionLink(el).hidden).toBe(true)
    let n = 0
    el.addEventListener('oas-action-click', () => n++)
    actionBtn(el).click()
    expect(n).toBe(1)

    const el2 = mount({ 'action-text': '详情', href: '#top' })
    let n2 = 0
    el2.addEventListener('oas-action-click', () => n2++)
    actionLink(el2).click()
    expect(n2).toBe(0)
  })

  it('action：运行时增删 href 切换 a/button 形态', () => {
    const el = mount({ 'action-text': '操作' })
    expect(actionBtn(el).hidden).toBe(false)
    el.setAttribute('href', '/next')
    expect(actionLink(el).hidden).toBe(false)
    expect(actionBtn(el).hidden).toBe(true)
    el.removeAttribute('href')
    expect(actionBtn(el).hidden).toBe(false)
    expect(actionLink(el).hidden).toBe(true)
  })

  // ---------- scrollable（内嵌 marquee） ----------

  it('scrollable：默认 marquee 隐藏；开启后 marquee 显示、probe 隐藏、宿主内容克隆进 marquee', () => {
    const el = mount({}, '超长通告文本内容')
    expect(marqueeEl(el).hidden).toBe(true)
    el.setAttribute('scrollable', '')
    const mq = marqueeEl(el)
    expect(mq.hidden).toBe(false)
    expect(probe(el).hidden).toBe(true)
    // 宿主内容已物化为 marquee 的 light DOM 源份（marquee 自身克隆引擎可用）
    expect(mq.textContent).toContain('超长通告文本内容')
  })

  it('scrollable：宿主内容变化经 slotchange 同步到 marquee', async () => {
    vi.useRealTimers()
    const el = mount({ scrollable: '' }, '旧内容')
    const mq = marqueeEl(el)
    expect(mq.textContent).toContain('旧内容')
    el.textContent = '全新通告内容'
    // slotchange 异步派发
    await new Promise((r) => setTimeout(r, 0))
    expect(mq.textContent).toContain('全新通告内容')
    expect(mq.textContent).not.toContain('旧内容')
  })

  it('scrollable 与 items 并存：items 轮播优先，marquee 保持隐藏', () => {
    const el = mount({ scrollable: '', items: '["a","b"]' }, '插槽内容')
    expect(marqueeEl(el).hidden).toBe(true)
    expect(carousel(el).hidden).toBe(false)
  })

  // ---------- 清理与重连 ----------

  it('断开重连：轮播计时器经 onCleanup 清理，重连后自动恢复轮播', () => {
    const el = mount({ items: '["r1","r2"]', interval: DEMO_INTERVAL })
    el.remove()
    // 重连（render 不重建，交互恢复）：连接态指纹变化 → 计时器重启
    document.body.appendChild(el)
    expect(itemText(el).textContent).toBe('r1')
    vi.advanceTimersByTime(500)
    expect(itemText(el).textContent).toBe('r2')
  })

  // ---------- DSD 真水合 ----------

  it('DSD 真水合：快照接管（shadow 不重建、指纹移除、交互可用）', () => {
    const ref = mount({ closable: '', type: 'warning' }, '水合通告')
    const snapshot = ref.shadowRoot!.innerHTML
    expect(snapshot).toContain('<style>')
    ref.remove()

    const el = new OASNoticeBar()
    el.setAttribute('closable', '')
    el.setAttribute('type', 'warning')
    el.innerHTML = '水合通告'
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-notice-bar" data-oas-ssr-v="1">${snapshot}`
    const styleRef = el.shadowRoot!.querySelector('style')
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="bar"]')).not.toBeNull()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    closeBtn(el).click()
    expect(close).toBe(1)
    expect(el.hidden).toBe(true)
  })

  it('DSD 回退：快照缺关键结构时 render 全量重建', () => {
    const el = new OASNoticeBar()
    el.setAttribute('closable', '')
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-notice-bar" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="bar"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(closeBtn(el).hidden).toBe(false)
  })
})
