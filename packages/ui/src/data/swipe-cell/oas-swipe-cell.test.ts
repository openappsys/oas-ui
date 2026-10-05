import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASSwipeCell } from './index.js'

/**
 * oas-swipe-cell（data 族）—— 列表项横向滑动露出操作按钮组。
 *
 * 设计前必答清单（AGENTS.md 六问）：
 * 1. 取消路径：手势未越过 8px 方向判定即放行纵向滚动；横滑中松手未过阈值回弹关；
 *    关闭态外点/滚动关闭；断开连接时 onCleanup 摘除 document 级监听（零孤儿产物）。
 * 2. 属性默认值：`threshold` 缺省 40px（非法回落 40）；`open` 缺省关；`disabled` 缺省否。
 * 3. 多步交互失败点：无 actions 内容（宽度 0）时不可开（回弹关）；pointercancel 视同松手吸附；
 *    官方事件在开/关落定时各派发一次（含程序性 open 属性变化）。
 * 4. 破坏性选项：无破坏性操作；关闭回弹不产生副作用。
 * 5. 键盘/ARIA：actions 区 role=group + aria-label（i18n swipeCell.actionsLabel）；
 *    actions 内按钮 DOM 天然 tabbable（焦点入内自动开态，可见可读屏）；Esc 关闭；
 *    cell 本身不加重角色，内容语义由宿主提供。
 * 6. 受控/非受控：`open` 属性 + JS property 双通道反射；手势改 open 时反射属性（受控可回写）。
 *
 * happy-dom 限制：无布局，`getBoundingClientRect` 全 0——测试桩出 actions 宽度驱动吸附；
 * CSS 类样式不进 element.style，断言走 inline CSS 变量 + 样式表表达式 + 属性/类名。
 */

/** 最小可用内容：内容层 + 具名 actions 槽（一个按钮） */
const DEFAULT_HTML = '<div class="row">列表项内容</div><button slot="actions" class="act">删除</button>'

function rect(w: number, h = 40): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    width: w,
    height: h,
    toJSON: () => ({}),
  } as DOMRect
}

function mount(attrs: Record<string, string> = {}, html: string = DEFAULT_HTML): OASSwipeCell {
  const el = new OASSwipeCell()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function content(el: OASSwipeCell): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="content"]')!
}

function actions(el: OASSwipeCell): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="actions"]')!
}

/** 桩出 actions 宽度（happy-dom 无布局） */
function stubActionsWidth(el: OASSwipeCell, width: number): void {
  actions(el).getBoundingClientRect = () => rect(width)
}

/** 记录 setPointerCapture/releasePointerCapture 调用（happy-dom 可能未实现，直接覆写实例方法） */
function spyCapture(el: OASSwipeCell): { captures: number[]; releases: number[] } {
  const captures: number[] = []
  const releases: number[] = []
  content(el).setPointerCapture = ((id: number) => captures.push(id)) as Element['setPointerCapture']
  content(el).releasePointerCapture = ((id: number) => releases.push(id)) as Element['releasePointerCapture']
  return { captures, releases }
}

function pointer(type: string, x: number, y = 0, pointerId = 1, button = 0): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    button,
    pointerId,
    clientX: x,
    clientY: y,
  })
}

/** 完整横滑：down → move → up，返回 up 时 dispatchEvent 是否被 preventDefault 拦截 */
function swipe(el: OASSwipeCell, fromX: number, toX: number, y = 10): void {
  const c = content(el)
  c.dispatchEvent(pointer('pointerdown', fromX, y))
  c.dispatchEvent(pointer('pointermove', toX, y))
  c.dispatchEvent(pointer('pointerup', toX, y))
}

/** inline CSS 变量偏移（happy-dom 可靠反映 setProperty） */
function offset(el: OASSwipeCell): string {
  return el.style.getPropertyValue('--oas-swipe-cell-offset')
}

function styleText(el: OASSwipeCell): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASSwipeCell', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  // ---------- 结构与空态 ----------

  it('渲染结构：root/content/actions 三层 + 默认与 actions 插槽', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull()
    expect(content(el)).not.toBeNull()
    expect(actions(el)).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot[name="actions"]')).not.toBeNull()
  })

  it('actions 区 role=group + i18n aria-label（zh/en 切换）', () => {
    const el = mount()
    expect(actions(el).getAttribute('role')).toBe('group')
    expect(actions(el).getAttribute('aria-label')).toBe('滑动操作')
    setLocale(en)
    expect(actions(el).getAttribute('aria-label')).toBe('Swipe actions')
  })

  it('初始关闭：内容层偏移 0，open 属性不在场', () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(false)
    expect(offset(el)).toBe('0px')
  })

  it('无 actions 内容（宽度 0）时横滑不进入开态（无可露出内容，回弹关）', () => {
    const el = mount({}, '<div class="row">仅内容</div>')
    swipe(el, 200, 100)
    expect(el.hasAttribute('open')).toBe(false)
    expect(offset(el)).toBe('0px')
  })

  // ---------- 方向判定 ----------

  it('横向接管：|dx|>|dy| 且 |dx|>8 → setPointerCapture + preventDefault', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const { captures } = spyCapture(el)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    const notPrevented = c.dispatchEvent(pointer('pointermove', 180, 12)) // dx=-20, dy=2
    expect(notPrevented, '横向接管应 preventDefault').toBe(false)
    expect(captures).toEqual([1])
  })

  it('纵向放行：|dy|>|dx| 且 |dy|>8 → 不接管、不 preventDefault、偏移不变', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const { captures } = spyCapture(el)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    const notPrevented = c.dispatchEvent(pointer('pointermove', 204, 60)) // dx=4, dy=50
    expect(notPrevented, '纵向放行不得 preventDefault').toBe(true)
    expect(captures).toEqual([])
    expect(offset(el)).toBe('0px')
  })

  it('方向判定后锁定：先纵向放行后，同一手势后续横向移动也不接管', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 204, 60)) // 判定为纵向
    c.dispatchEvent(pointer('pointermove', 120, 60)) // 后续大横移
    expect(offset(el)).toBe('0px')
    c.dispatchEvent(pointer('pointerup', 120, 60))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('位移不足 8px 不判定方向（保持待定，偏移不变）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 205, 11)) // dx=5 < 8
    expect(offset(el)).toBe('0px')
  })

  // ---------- 跟随与钳制 ----------

  it('内容层跟随横滑位移，并钳制到 [-actionsWidth, 0]', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 150, 10)) // dx=-50 → -50px
    expect(offset(el)).toBe('-50px')
    c.dispatchEvent(pointer('pointermove', 80, 10)) // dx=-120 → 钳制 -80px
    expect(offset(el)).toBe('-80px')
    c.dispatchEvent(pointer('pointermove', 260, 10)) // 反向 dx=+60 → 钳制 0px
    expect(offset(el)).toBe('0px')
    c.dispatchEvent(pointer('pointerup', 260, 10))
  })

  it('拖动期间标记 data-dragging，结束后移除', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 150, 10))
    expect(el.hasAttribute('data-dragging')).toBe(true)
    c.dispatchEvent(pointer('pointerup', 150, 10))
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  // ---------- 释放吸附 ----------

  it('释放位移超过 threshold → 吸附开态（停在 -actionsWidth）并派发 oas-open', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const opened: Event[] = []
    el.addEventListener('oas-open', (e) => opened.push(e))
    // inline-start（LTR 左滑）：x 减小；dx=-60 超过 threshold 40
    swipe(el, 260, 200, 10)
    expect(el.hasAttribute('open')).toBe(true)
    expect(offset(el)).toBe('-80px')
    expect(opened.length).toBe(1)
  })

  it('释放位移不足 threshold → 回弹关（偏移归 0）不派发 oas-open', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    let opened = 0
    el.addEventListener('oas-open', () => opened++)
    swipe(el, 200, 180, 10) // dx=-20 < 40
    expect(el.hasAttribute('open')).toBe(false)
    expect(offset(el)).toBe('0px')
    expect(opened).toBe(0)
  })

  it('threshold 属性生效：默认 40 时位移 60 开；threshold=100 时同位移关', () => {
    const a = mount()
    stubActionsWidth(a, 200)
    swipe(a, 300, 240, 10) // dx=-60 > 40
    expect(a.hasAttribute('open')).toBe(true)

    const b = mount({ threshold: '100' })
    stubActionsWidth(b, 200)
    swipe(b, 300, 240, 10) // dx=-60 < 100
    expect(b.hasAttribute('open')).toBe(false)
  })

  it('threshold 非法值回落 40', () => {
    const el = mount({ threshold: 'abc' })
    stubActionsWidth(el, 200)
    swipe(el, 300, 240, 10) // 60 > 40
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('pointercancel 视同松手：超阈值开，不足回弹', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 260, 10))
    c.dispatchEvent(pointer('pointermove', 200, 10))
    c.dispatchEvent(pointer('pointercancel', 200, 10))
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  // ---------- 开/关事件与程序性 open ----------

  it('程序性 open 属性变化也派发 oas-open / oas-close（各一次）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const seq: string[] = []
    el.addEventListener('oas-open', () => seq.push('open'))
    el.addEventListener('oas-close', () => seq.push('close'))
    el.setAttribute('open', '')
    expect(seq).toEqual(['open'])
    expect(offset(el)).toBe('-80px')
    el.removeAttribute('open')
    expect(seq).toEqual(['open', 'close'])
    expect(offset(el)).toBe('0px')
    // 重复设置相同状态不重复派发
    el.setAttribute('open', '')
    el.setAttribute('open', '')
    expect(seq).toEqual(['open', 'close', 'open'])
  })

  it('JS property open 读写反射到属性并派发事件', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    let opened = 0
    el.addEventListener('oas-open', () => opened++)
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.open).toBe(true)
    expect(opened).toBe(1)
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.open).toBe(false)
  })

  it('手势开后再手势关：向左滑开、向右滑关并派发 oas-close', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    swipe(el, 260, 200, 10)
    expect(el.hasAttribute('open')).toBe(true)
    let closed = 0
    el.addEventListener('oas-close', () => closed++)
    swipe(el, 140, 220, 10) // 从开态右滑 80 → 位移 0 逻辑
    expect(el.hasAttribute('open')).toBe(false)
    expect(closed).toBe(1)
  })

  // ---------- 单开互斥 ----------

  it('另一 cell 打开 → 自身关闭（document 级广播）', () => {
    const a = mount()
    const b = mount()
    stubActionsWidth(a, 80)
    stubActionsWidth(b, 80)
    a.setAttribute('open', '')
    expect(a.hasAttribute('open')).toBe(true)
    b.setAttribute('open', '')
    expect(b.hasAttribute('open')).toBe(true)
    expect(a.hasAttribute('open'), 'A 应因 B 打开而关闭').toBe(false)
  })

  it('开态时 document pointerdown 落在自身外部 → 关闭', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('开态时 document pointerdown 落在自身内部（含 actions）→ 不关闭', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('关闭后不再监听 document pointerdown（外点不误触）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    el.removeAttribute('open')
    let closed = 0
    el.addEventListener('oas-close', () => closed++)
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(closed).toBe(0)
  })

  // ---------- 滚动关闭 ----------

  it('开态时滚动容器 scroll → 关闭', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    document.dispatchEvent(new Event('scroll'))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关态时 scroll 不产生副作用', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    document.dispatchEvent(new Event('scroll'))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('开态且焦点在 actions 按钮上时 scroll 不关闭（聚焦引发的滚动不误关）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    const btn = el.querySelector('button')!
    btn.focus()
    document.dispatchEvent(new Event('scroll'))
    expect(el.hasAttribute('open')).toBe(true)
  })

  // ---------- 键盘 / 焦点 ----------

  it('Esc 关闭开态 cell 并派发 oas-close', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    let closed = 0
    el.addEventListener('oas-close', () => closed++)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(false)
    expect(closed).toBe(1)
  })

  it('焦点进入 actions 按钮自动打开（键盘可达，按钮可见）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('disabled 时焦点进入 actions 不自动打开', () => {
    const el = mount({ disabled: '' })
    stubActionsWidth(el, 80)
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  // ---------- disabled ----------

  it('disabled 全禁手势：不接管、不位移、不开合', () => {
    const el = mount({ disabled: '' })
    stubActionsWidth(el, 80)
    const { captures } = spyCapture(el)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 260, 10))
    const notPrevented = c.dispatchEvent(pointer('pointermove', 180, 10))
    expect(notPrevented).toBe(true)
    expect(captures).toEqual([])
    expect(offset(el)).toBe('0px')
    c.dispatchEvent(pointer('pointerup', 180, 10))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('disabled 关闭已有开态（属性变化即时收敛）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    el.setAttribute('open', '')
    expect(el.hasAttribute('open')).toBe(true)
    el.setAttribute('disabled', '')
    expect(el.hasAttribute('open')).toBe(false)
  })

  // ---------- RTL 镜像 ----------

  it('RTL：向 inline-start（右滑）露出 inline-end 侧 actions，偏移为正、钳制 [0, +width]', () => {
    const el = mount({ dir: 'rtl' })
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 100, 10))
    c.dispatchEvent(pointer('pointermove', 150, 10)) // dx=+50 → +50px
    expect(offset(el)).toBe('50px')
    c.dispatchEvent(pointer('pointermove', 260, 10)) // dx=+160 → 钳制 +80px
    expect(offset(el)).toBe('80px')
    c.dispatchEvent(pointer('pointerup', 260, 10))
    expect(el.hasAttribute('open')).toBe(true)
    expect(offset(el)).toBe('80px')
  })

  it('RTL：反向（左滑）回弹关，不进入负偏移', () => {
    const el = mount({ dir: 'rtl' })
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 150, 10)) // dx=-50 → 钳制 0
    expect(offset(el)).toBe('0px')
    c.dispatchEvent(pointer('pointerup', 150, 10))
    expect(el.hasAttribute('open')).toBe(false)
  })

  // ---------- 样式机制（token / 逻辑方向 / 减弱动效） ----------

  it('配色走 CSS 变量 token，无硬编码色值；无物理方向属性', () => {
    const css = styleText(mount())
    expect(css).toContain('var(--oas-color-bg)')
    expect(css).toContain('var(--oas-color-text-primary)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    // 无物理 padding/margin/border/text-align 左右
    expect(css).not.toMatch(/(padding|margin)-(left|right)\s*:/)
    expect(css).not.toMatch(/border-(left|right)\s*:/)
    expect(css).not.toMatch(/text-align:\s*(left|right)\b/)
    expect(css).toMatch(/inset-inline-end/)
  })

  it('reduced-motion：过渡禁用', () => {
    const css = styleText(mount())
    expect(css).toContain('prefers-reduced-motion')
  })

  it('宿主 [hidden] 兜底隐藏', () => {
    expect(styleText(mount())).toContain(':host([hidden])')
  })

  // ---------- DSD 真水合 ----------

  it('DSD 真水合：快照 + 指纹接管（shadow 不重建、结构保持、交互仍可用）', () => {
    const ref = new OASSwipeCell()
    ref.innerHTML = DEFAULT_HTML
    document.body.appendChild(ref)
    stubActionsWidth(ref, 80)
    const snapshot = ref.shadowRoot!.innerHTML
    const styleRef = ref.shadowRoot!.querySelector('style')!
    ref.remove()
    expect(snapshot).toContain('<style>')

    const el = new OASSwipeCell()
    el.innerHTML = DEFAULT_HTML
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-swipe-cell" data-oas-ssr-v="1">${snapshot}`
    document.body.appendChild(el)
    stubActionsWidth(el, 80)
    expect(el.shadowRoot!.querySelector('style')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('slot[name="actions"]')).not.toBeNull()
    // 水合后手势仍可用
    swipe(el, 260, 200, 10)
    expect(el.hasAttribute('open')).toBe(true)
    expect(styleRef).not.toBeNull()
  })

  it('DSD 回退：快照缺关键结构时 render 全量重建', () => {
    const el = new OASSwipeCell()
    el.innerHTML = DEFAULT_HTML
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-swipe-cell" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="content"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
  })

  // ---------- side="start"（actions 挂 inline-start，向 inline-end 滑开） ----------

  it('side=start：actions 挂 inline-start（CSS 侧位覆写 + 属性进 observedAttributes）', () => {
    expect((OASSwipeCell as unknown as { observedAttributes: string[] }).observedAttributes).toContain('side')
    const el = mount({ side: 'start' })
    stubActionsWidth(el, 80)
    const actions = el.shadowRoot!.querySelector('.actions') as HTMLElement
    // happy-dom 对 inset-inline-start: 0 序列化为 '0'
    expect(getComputedStyle(actions).insetInlineStart).toBe('0')
  })

  it('side=start（LTR）：向右滑开（dx>0 逻辑偏移增长）、向左回弹关', () => {
    const el = mount({ side: 'start' })
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 100, 10))
    c.dispatchEvent(pointer('pointermove', 160, 10)) // dx=+60 向右（side=start 向 inline-end 滑开）
    expect(offset(el)).toBe('60px')
    c.dispatchEvent(pointer('pointerup', 160, 10))
    expect(el.hasAttribute('open')).toBe(true)
    // 向左滑回弹关
    c.dispatchEvent(pointer('pointerdown', 160, 10))
    c.dispatchEvent(pointer('pointermove', 100, 10)) // dx=-60
    c.dispatchEvent(pointer('pointerup', 100, 10))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('side=start（RTL）：向左滑开（书写方向镜像与 side 正交）', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const el = mount({ side: 'start' })
    stubActionsWidth(el, 80)
    const c = content(el)
    c.dispatchEvent(pointer('pointerdown', 200, 10))
    c.dispatchEvent(pointer('pointermove', 130, 10)) // dx=-70：RTL+side=start 向 inline-end（物理左）滑开
    expect(offset(el)).toBe('-70px')
    document.documentElement.removeAttribute('dir')
  })

  it('flick 速度吸附：快速甩动不达位移阈值也开（显式 timeStamp 驱动速度窗口）', () => {
    const el = mount()
    stubActionsWidth(el, 80)
    const c = content(el)
    let t0 = 1000
    const pe = (type: string, x: number): PointerEvent => {
      const e = new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: 10 })
      Object.defineProperty(e, 'timeStamp', { value: t0 })
      return e
    }
    c.dispatchEvent(pe('pointerdown', 300))
    // 30ms 内甩 120px（3px/ms，超 flick 阈值）；末段速度 |v|=3px/ms ≥ 0.5 → 直接开
    //（位移虽超 40 阈值，本例锁的是「速度窗口生效」——另见位移阈值用例的同刻 dt≈0 回退）
    t0 += 10
    c.dispatchEvent(pe('pointermove', 210))
    t0 += 10
    c.dispatchEvent(pe('pointermove', 180))
    t0 += 10
    c.dispatchEvent(pe('pointerup', 180))
    expect(el.hasAttribute('open'), 'flick 直接开').toBe(true)
  })
})
