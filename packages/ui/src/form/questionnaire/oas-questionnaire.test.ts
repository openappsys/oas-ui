import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASQuestionnaire } from './index.js'
import type { QuestionnaireStep } from './oas-questionnaire.js'
import '../form/index.js'
import '../input/index.js'

const STEPS: QuestionnaireStep[] = [{ key: 'basic', title: '基本信息' }, { title: '联系方式' }, { title: '确认提交' }]

/**
 * 步面板：带 required 校验的 oas-form（slot 名按 key/index）。
 * initial 走 oas-form 的 initial-values 通道（未交互字段的值基线）。
 */
function formPanel(slot: string, name: string, opts: { rules?: boolean; initial?: string } = {}): string {
  const rules =
    opts.rules === false ? '' : ` rules='${JSON.stringify({ [name]: [{ required: true, message: `${name} 必填` }] })}'`
  const initial = opts.initial !== undefined ? ` initial-values='${JSON.stringify({ [name]: opts.initial })}'` : ''
  return `<oas-form slot="${slot}"${rules}${initial}><oas-input name="${name}" value=""></oas-input></oas-form>`
}

interface MountOptions {
  steps?: QuestionnaireStep[]
  attrs?: Record<string, string>
  panels?: string[]
}

function mount(opts: MountOptions = {}): OASQuestionnaire {
  const el = new OASQuestionnaire()
  el.setAttribute('steps', JSON.stringify(opts.steps ?? STEPS))
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v)
  el.innerHTML = (opts.panels ?? []).join('')
  document.body.appendChild(el)
  return el
}

/** 默认三步挂载：步 0 预填（initial 基线）/ 步 1 空 required / 步 2 无 form（默认放行） */
function mountDefault(attrs: Record<string, string> = {}): OASQuestionnaire {
  return mount({
    attrs,
    panels: [formPanel('step-basic', 'name', { initial: '张三' }), formPanel('step-1', 'phone')],
  })
}

/** 模拟用户编辑：向字段派发 oas-input（oas-form 会写回 value 并派发 oas-values-change） */
function fill(field: Element, value: string): void {
  field.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
}

function items(el: OASQuestionnaire): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.steps .item'))
}

function panels(el: OASQuestionnaire): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.panel'))
}

function btn(el: OASQuestionnaire, part: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${part}"]`)!
}

function progressEl(el: OASQuestionnaire): Element {
  return el.shadowRoot!.querySelector('.progress')!
}

/** 收集事件 detail 序列 */
function track(el: OASQuestionnaire, type: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  el.addEventListener(type, (e) => out.push((e as CustomEvent).detail as Record<string, unknown>))
  return out
}

describe('OASQuestionnaire', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  // ---------- steps 数据驱动 ----------

  it('steps 数据驱动：头部项渲染标题，状态按 current 推导（前序 finish / 当前 process / 后续 wait）', () => {
    const el = mountDefault({ current: '1' })
    const list = items(el)
    expect(list.length).toBe(3)
    expect(list[0]!.getAttribute('data-status')).toBe('finish')
    expect(list[1]!.getAttribute('data-status')).toBe('process')
    expect(list[2]!.getAttribute('data-status')).toBe('wait')
    expect(list[1]!.getAttribute('aria-current')).toBe('step')
    expect(list[0]!.textContent).toContain('基本信息')
    expect(list[1]!.textContent).toContain('联系方式')
  })

  it('slot 关联：有 key 用 step-<key>，无 key 用 step-<index>；面板常驻 light DOM（hidden 切换不卸载）', () => {
    const el = mountDefault()
    const slotNames = Array.from(el.shadowRoot!.querySelectorAll('slot')).map((s) => s.getAttribute('name'))
    expect(slotNames).toContain('step-basic')
    expect(slotNames).toContain('step-1')
    expect(slotNames).toContain('step-2')
    expect(panels(el).length).toBe(3)
    expect(panels(el)[0]!.hasAttribute('hidden')).toBe(false)
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(true)
  })

  // ---------- current 受控 ----------

  it('current 外部设置即时同步面板显隐与进度；非法值回落 0；越界夹取末步', () => {
    const el = mountDefault()
    el.setAttribute('current', '2')
    expect(panels(el)[2]!.hasAttribute('hidden')).toBe(false)
    expect(panels(el)[0]!.hasAttribute('hidden')).toBe(true)
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('3')
    el.setAttribute('current', '99')
    expect(panels(el)[2]!.hasAttribute('hidden')).toBe(false)
    el.setAttribute('current', 'abc')
    expect(panels(el)[0]!.hasAttribute('hidden')).toBe(false)
    el.setAttribute('current', '-5')
    expect(panels(el)[0]!.hasAttribute('hidden')).toBe(false)
  })

  // ---------- 单步校验门控 ----------

  it('门控：当前步必填未填时 next() 不前进，派发 oas-step-validate{valid:false,errors}，不派发 oas-change', async () => {
    const el = mount({ panels: [formPanel('step-basic', 'name'), formPanel('step-1', 'phone')] })
    const stepValidate = track(el, 'oas-step-validate')
    const change = track(el, 'oas-change')
    await expect(el.next()).resolves.toBe(false)
    expect(el.getAttribute('current') ?? '0').toBe('0')
    expect(stepValidate).toEqual([{ index: 0, key: 'basic', valid: false, errors: { name: 'name 必填' } }])
    expect(change).toEqual([])
  })

  it('门控：填好后 next() 前进，current 写回 + oas-change{index,key}', async () => {
    const el = mountDefault()
    const change = track(el, 'oas-change')
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('1')
    expect(change).toEqual([{ index: 1 }])
  })

  it('门控：步骤无 oas-form 时默认放行（不阻塞流程）', async () => {
    const el = mount({ panels: [] })
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('validation="false"：纯导航模式，未填也放行', async () => {
    const el = mount({ attrs: { validation: 'false' }, panels: [formPanel('step-basic', 'name')] })
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('点击内置下一步按钮走同一门控链路：未填不放行、错误上屏（aria-invalid）', async () => {
    const el = mount({ panels: [formPanel('step-basic', 'name'), formPanel('step-1', 'phone')] })
    btn(el, 'next').click()
    await el.next() // 与按钮同链路，等在途校验落地
    await Promise.resolve()
    expect(el.getAttribute('current') ?? '0').toBe('0')
    expect(el.querySelector('[slot="step-basic"] oas-input')!.hasAttribute('aria-invalid')).toBe(true)
  })

  // ---------- 导航 ----------

  it('prev() 不校验：当前步可回退；第一步 prev 为无操作返回 false', async () => {
    const el = mountDefault({ current: '1' })
    expect(el.prev()).toBe(true)
    expect(el.getAttribute('current')).toBe('0')
    expect(el.prev()).toBe(false)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('末步 next() 为无操作（完成走 submit()）', async () => {
    const el = mountDefault({ current: '2' })
    await expect(el.next()).resolves.toBe(false)
    expect(el.getAttribute('current')).toBe('2')
  })

  it('goto(index) 直跳：不做门控（可跳过未填步骤）；越界夹取；goto 当前步无操作', () => {
    const el = mountDefault()
    expect(el.goto(2)).toBe(true)
    expect(el.getAttribute('current')).toBe('2')
    // 越界夹取到末步，但末步即当前步 → 无操作
    expect(el.goto(99)).toBe(false)
    expect(el.getAttribute('current')).toBe('2')
    expect(el.goto(2)).toBe(false)
    expect(el.goto(-1)).toBe(true)
    expect(el.getAttribute('current')).toBe('0')
  })

  it('linear 默认：未来步禁点（aria-disabled、无 button）；linear="false" 后可点且派发 oas-change', () => {
    const el = mountDefault()
    const list = items(el)
    expect(list[2]!.getAttribute('aria-disabled')).toBe('true')
    expect(list[2]!.querySelector('button')).toBeNull()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(list[2] as HTMLElement).click()
    expect(fired).toBe(0)
    const el2 = mountDefault({ linear: 'false' })
    const list2 = items(el2)
    let fired2 = 0
    el2.addEventListener('oas-change', () => fired2++)
    expect(list2[2]!.querySelector('button')).not.toBeNull()
    ;(list2[2]!.querySelector('button') as HTMLButtonElement).click()
    expect(el2.getAttribute('current')).toBe('2')
    expect(fired2).toBe(1)
  })

  it('可点头部项为内层原生 <button>（li 保持 listitem 语义，Enter/Space 浏览器原生触发）；点击跳步', () => {
    const el = mountDefault({ linear: 'false' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    // li 直接子元素必须是 li（axe list 规则）——交互语义下沉到内层原生 button
    expect(items(el)[2]!.tagName).toBe('LI')
    expect((items(el)[2]!.querySelector('button') as HTMLButtonElement).tagName).toBe('BUTTON')
    ;(items(el)[2]!.querySelector('button') as HTMLButtonElement).click()
    expect(fired).toBe(1)
    expect(el.getAttribute('current')).toBe('2')
    // 跳步后头部重建，重新取当前 DOM（步 0 已成「已过步」，可点）
    ;(items(el)[0]!.querySelector('button') as HTMLButtonElement).click()
    expect(fired).toBe(2)
    expect(el.getAttribute('current')).toBe('0')
  })

  // ---------- 进度 ----------

  it('进度：role=progressbar + aria-valuemin/max/now + 「n / m」文本（i18n 插值）', () => {
    const el = mountDefault({ current: '1' })
    const p = progressEl(el)
    expect(p.getAttribute('role')).toBe('progressbar')
    expect(p.getAttribute('aria-valuemin')).toBe('1')
    expect(p.getAttribute('aria-valuemax')).toBe('3')
    expect(p.getAttribute('aria-valuenow')).toBe('2')
    expect(p.textContent).toContain('第 2 / 3 步')
  })

  it('progress="false" 隐藏进度区；progress-variant="text" 只留文本 / "bar" 只留进度条', () => {
    const off = mountDefault({ progress: 'false' })
    expect(progressEl(off).hasAttribute('hidden')).toBe(true)
    const text = mountDefault({ 'progress-variant': 'text' })
    expect(text.shadowRoot!.querySelector('.progress-track')).toBeNull()
    expect(text.shadowRoot!.querySelector('.progress-text')).not.toBeNull()
    const bar = mountDefault({ 'progress-variant': 'bar' })
    expect(bar.shadowRoot!.querySelector('.progress-track')).not.toBeNull()
    expect(bar.shadowRoot!.querySelector('.progress-text')).toBeNull()
  })

  // ---------- 跳过 ----------

  it('optional 步显示跳过按钮（i18n 文案）；非 optional 不显示', () => {
    const el = mount({
      steps: [{ key: 'a', title: 'A', optional: true }, { title: 'B' }],
      panels: [formPanel('step-a', 'name', { rules: false })],
    })
    expect(btn(el, 'skip').hasAttribute('hidden')).toBe(false)
    expect(btn(el, 'skip').textContent).toBe('跳过本步')
    const el2 = mountDefault()
    expect(btn(el2, 'skip').hasAttribute('hidden')).toBe(true)
  })

  it('跳过：不校验直接前进，派发 oas-skip{index,key} 与 oas-change', () => {
    const el = mount({
      steps: [{ key: 'a', title: 'A', optional: true }, { title: 'B' }],
      panels: [formPanel('step-a', 'name', { rules: true })],
    })
    const skip = track(el, 'oas-skip')
    const change = track(el, 'oas-change')
    btn(el, 'skip').click()
    expect(skip).toEqual([{ index: 0, key: 'a' }])
    expect(change).toEqual([{ index: 1 }])
    expect(el.getAttribute('current')).toBe('1')
    expect(el.querySelector('[slot="step-a"] oas-input')!.hasAttribute('aria-invalid')).toBe(false)
  })

  // ---------- 回退值保留 ----------

  it('回退值保留：前进再回退，已填值仍在（面板 DOM 不卸载、引用不变）', async () => {
    const el = mountDefault()
    const phone = el.querySelector('[slot="step-1"] oas-input')!
    fill(phone, '13900000000')
    await el.next()
    expect(el.getAttribute('current')).toBe('1')
    el.prev()
    expect(phone.getAttribute('value')).toBe('13900000000')
    expect(el.querySelector('[slot="step-1"] oas-input')).toBe(phone)
  })

  // ---------- 提交汇总 ----------

  it('submit()：全部步校验通过 → oas-submit{values}（跨步合并），返回 true', async () => {
    const el = mountDefault()
    fill(el.querySelector('[slot="step-1"] oas-input')!, '13800138000')
    const submit = track(el, 'oas-submit')
    await expect(el.submit()).resolves.toBe(true)
    expect(submit).toEqual([{ values: { name: '张三', phone: '13800138000' } }])
  })

  it('submit()：早期步未过 → 重校全部步、返回 false、不派发 oas-submit', async () => {
    const el = mount({
      attrs: { current: '2' },
      panels: [formPanel('step-basic', 'name'), formPanel('step-1', 'phone', { initial: '138' })],
    })
    const submit = track(el, 'oas-submit')
    const stepValidate = track(el, 'oas-step-validate')
    await expect(el.submit()).resolves.toBe(false)
    expect(submit).toEqual([])
    expect(stepValidate.some((d) => d.index === 0 && d.valid === false)).toBe(true)
    expect(el.querySelector('[slot="step-basic"] oas-input')!.hasAttribute('aria-invalid')).toBe(true)
  })

  it('getValues()：字段仅以 value 属性预填（零交互）也进汇总（实时读取根治回归）', () => {
    const el = mount({
      panels: ['<oas-form slot="step-basic"><oas-input name="a" value="属性预填"></oas-input></oas-form>'],
    })
    expect(el.getValues()).toEqual({ a: '属性预填' })
  })

  // 新口径：与单表 oas-form submit 的 values 一致——全部注册字段都进汇总（未交互计空串）
  it('getValues()：initial-values 基线 + 编辑值跨步合并', () => {
    const el = mount({
      panels: [formPanel('step-basic', 'name', { initial: '张三' }), formPanel('step-1', 'phone', { initial: '' })],
    })
    expect(el.getValues()).toEqual({ name: '张三', phone: '' })
    fill(el.querySelector('[slot="step-1"] oas-input')!, '137')
    expect(el.getValues()).toEqual({ name: '张三', phone: '137' })
  })

  it('getValues()：initial-values 经 property 通道（Vue/React 绑定）同样进基线（回归）', () => {
    const el = mount({ panels: [formPanel('step-basic', 'name'), formPanel('step-1', 'phone')] })
    const form = el.querySelector('oas-form[slot="step-basic"]') as import('../form/index.js').OASForm
    form.initialValues = { name: 'property 基线' }
    // property 通道不回写 attribute——只读 attribute 的旧实现会丢基线
    expect(form.getAttribute('initial-values')).toBeNull()
    expect(el.getValues()).toEqual({ name: 'property 基线', phone: '' })
  })

  it('断开重连：晚挂面板的内层 form 值仍被跟踪（MutationObserver 重挂，回归）', async () => {
    const el = mount({ panels: [formPanel('step-basic', 'name', { rules: false })] })
    el.remove()
    document.body.appendChild(el)
    const late = document.createElement('oas-form')
    late.setAttribute('slot', 'step-1')
    late.innerHTML = '<oas-input name="phone" value=""></oas-input>'
    el.appendChild(late)
    await new Promise((r) => setTimeout(r, 0))
    fill(late.querySelector('oas-input')!, '139')
    expect(el.getValues()).toEqual({ name: '', phone: '139' })
  })

  it('reset()：回步 0、内层 form 重置回初始值、清错误态、不派发任何事件', async () => {
    const el = mount({
      panels: [formPanel('step-basic', 'name', { initial: '张三' }), formPanel('step-1', 'phone')],
    })
    fill(el.querySelector('[slot="step-basic"] oas-input')!, '改过')
    await el.next()
    const nameInput = el.querySelector('[slot="step-basic"] oas-input')!
    expect(nameInput.getAttribute('value')).toBe('改过')
    let events = 0
    for (const t of ['oas-change', 'oas-submit', 'oas-step-validate', 'oas-skip', 'oas-before-change']) {
      el.addEventListener(t, () => events++)
    }
    el.reset()
    expect(events).toBe(0)
    expect(el.getAttribute('current')).toBe('0')
    expect(nameInput.getAttribute('value')).toBe('张三')
    expect(nameInput.hasAttribute('aria-invalid')).toBe(false)
  })

  // ---------- oas-before-change 拦截 ----------

  it('oas-before-change 可取消：preventDefault 后 next/prev/goto 全部不动，零后续事件', async () => {
    const el = mountDefault()
    const change = track(el, 'oas-change')
    const skip = track(el, 'oas-skip')
    el.addEventListener('oas-before-change', (e) => e.preventDefault())
    await expect(el.next()).resolves.toBe(false)
    expect(el.prev()).toBe(false)
    expect(el.goto(2)).toBe(false)
    expect(change).toEqual([])
    expect(skip).toEqual([])
    expect(el.getAttribute('current') ?? '0').toBe('0')
  })

  it('oas-before-change detail 携带 { index, from, key? } 且 cancelable', () => {
    const el = mountDefault()
    const befores: Array<CustomEvent> = []
    el.addEventListener('oas-before-change', (e) => befores.push(e as CustomEvent))
    el.goto(1)
    expect(befores.length).toBe(1)
    expect(befores[0]!.detail).toEqual({ index: 1, from: 0 })
    expect(befores[0]!.cancelable).toBe(true)
  })

  // ---------- oas-values-change 转发（内层 form 事件自然冒泡穿出） ----------

  it('oas-values-change：内层 form 值变化事件冒泡可在 questionnaire 上收到（detail.values 为该步快照）', () => {
    const el = mountDefault()
    let detail: unknown
    el.addEventListener('oas-values-change', (e) => (detail = (e as CustomEvent).detail))
    fill(el.querySelector('[slot="step-basic"] oas-input')!, '李四')
    const d = detail as { name: string; value: string; values: Record<string, unknown> }
    expect(d.name).toBe('name')
    expect(d.values).toEqual({ name: '李四' })
  })

  // ---------- hidden 步骤 ----------

  it('hidden 步骤：不渲染头部项、进度总数不含、next 跳过 hidden 步', async () => {
    const el = mount({
      steps: [{ title: 'A' }, { title: 'B', hidden: true }, { title: 'C' }],
      panels: [formPanel('step-0', 'a', { rules: false }), formPanel('step-2', 'c', { rules: false })],
    })
    expect(items(el).length).toBe(2)
    expect(progressEl(el).getAttribute('aria-valuemax')).toBe('2')
    expect(items(el).some((i) => i.textContent!.includes('B'))).toBe(false)
    await el.next()
    expect(el.getAttribute('current')).toBe('2')
  })

  // ---------- 参与步口径（取值 = 校验：非 hidden 且未跳过） ----------

  it('参与步口径：hidden 步的值不进 getValues() 与 oas-submit 载荷（与 validateAll 同口径）', async () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B', hidden: true },
      ],
      panels: [
        '<oas-form slot="step-a"><oas-input name="a" value="1"></oas-input></oas-form>',
        '<oas-form slot="step-b"><oas-input name="b" value="2"></oas-input></oas-form>',
      ],
    })
    expect(el.getValues()).toEqual({ a: '1' })
    const submit = track(el, 'oas-submit')
    await expect(el.submit()).resolves.toBe(true)
    expect(submit).toEqual([{ values: { a: '1' } }])
  })

  it('参与步口径：hidden 步 required 未填也不阻塞 submit（校验口径锁）', async () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B', hidden: true },
      ],
      panels: [formPanel('step-a', 'a', { initial: '1' }), formPanel('step-b', 'b')],
    })
    await expect(el.submit()).resolves.toBe(true)
  })

  it('参与步口径：optional 步点「跳过」后值不进 getValues() 与 oas-submit 载荷、不阻塞 submit 校验', async () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A', optional: true },
        { key: 'b', title: 'B' },
      ],
      panels: [
        '<oas-form slot="step-a" rules=\'{"a":[{"required":true,"message":"a 必填"}]}\'><oas-input name="a" value="预填"></oas-input></oas-form>',
        '<oas-form slot="step-b"><oas-input name="b" value="2"></oas-input></oas-form>',
      ],
    })
    expect(btn(el, 'skip').hasAttribute('hidden')).toBe(false)
    btn(el, 'skip').click()
    expect(el.getAttribute('current')).toBe('1')
    expect(el.getValues()).toEqual({ b: '2' })
    const submit = track(el, 'oas-submit')
    await expect(el.submit()).resolves.toBe(true)
    expect(submit).toEqual([{ values: { b: '2' } }])
  })

  it('参与步口径：跳过的步重新进入即恢复参与（值计入）；reset() 清跳过记录', async () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A', optional: true },
        { key: 'b', title: 'B' },
      ],
      panels: [
        '<oas-form slot="step-a"><oas-input name="a" value="预填"></oas-input></oas-form>',
        '<oas-form slot="step-b"><oas-input name="b" value="2"></oas-input></oas-form>',
      ],
    })
    btn(el, 'skip').click()
    expect(el.getValues()).toEqual({ b: '2' })
    // 回到步 a：恢复参与
    el.prev()
    expect(el.getValues()).toEqual({ a: '预填', b: '2' })
    // 再跳过 + reset：记录清空，值恢复计入
    btn(el, 'skip').click()
    expect(el.getValues()).toEqual({ b: '2' })
    el.reset()
    expect(el.getValues()).toEqual({ a: '预填', b: '2' })
  })

  // ---------- 条件分支（宿主组合通道：hidden 数据位运行时翻转，不引入谓词 DSL） ----------

  it('条件分支：宿主按答案改写 steps 翻转 hidden → next() 跳过被隐藏步（按答案跳转地基）', async () => {
    const el = mount({
      steps: [
        { key: 'ship', title: '是否需要配送' },
        { key: 'addr', title: '配送地址' },
        { key: 'done', title: '完成' },
      ],
      panels: [
        '<oas-form slot="step-ship"><oas-input name="need" value="yes"></oas-input></oas-form>',
        '<oas-form slot="step-addr"><oas-input name="addr" value=""></oas-input></oas-form>',
        '<oas-form slot="step-done"><oas-input name="note" value=""></oas-input></oas-form>',
      ],
    })
    // 宿主按答案「不需要配送」翻转未来步 hidden：重写 steps 即生效
    el.setAttribute(
      'steps',
      JSON.stringify([
        { key: 'ship', title: '是否需要配送' },
        { key: 'addr', title: '配送地址', hidden: true },
        { key: 'done', title: '完成' },
      ]),
    )
    await el.next()
    expect(el.getAttribute('current')).toBe('2')
    expect(items(el).length).toBe(2)
  })

  it('条件分支：当前步被运行时隐藏 → current 自动对齐到解析步 + 派发 oas-change（宿主可感知）', () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B' },
        { key: 'c', title: 'C' },
      ],
      panels: [
        '<oas-form slot="step-a"><oas-input name="a" value="1"></oas-input></oas-form>',
        '<oas-form slot="step-b"><oas-input name="b" value="2"></oas-input></oas-form>',
        '<oas-form slot="step-c"><oas-input name="c" value="3"></oas-input></oas-form>',
      ],
    })
    el.setAttribute('current', '1')
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(false)
    const change = track(el, 'oas-change')
    // 宿主隐藏用户当前所在步：current 写回解析步、oas-change 告知宿主（不派发 before-change）
    el.setAttribute(
      'steps',
      JSON.stringify([
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B', hidden: true },
        { key: 'c', title: 'C' },
      ]),
    )
    expect(el.getAttribute('current')).toBe('2')
    expect(change).toEqual([{ index: 2, key: 'c' }])
    // 对齐后的 current 落在可见步：不再重复对齐、不重复派发
    el.setAttribute('validation', 'false')
    expect(change).toEqual([{ index: 2, key: 'c' }])
  })

  it('条件分支：当前步被隐藏 → 值退出 getValues()；恢复显示后回归', async () => {
    const el = mount({
      steps: [
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B' },
        { key: 'c', title: 'C' },
      ],
      panels: [
        '<oas-form slot="step-a"><oas-input name="a" value="1"></oas-input></oas-form>',
        '<oas-form slot="step-b"><oas-input name="b" value="2"></oas-input></oas-form>',
        '<oas-form slot="step-c"><oas-input name="c" value="3"></oas-input></oas-form>',
      ],
    })
    el.setAttribute('current', '1')
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(false)
    // 宿主隐藏用户当前所在步：视图自动落到下一个可见步，值退出参与口径
    el.setAttribute(
      'steps',
      JSON.stringify([
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B', hidden: true },
        { key: 'c', title: 'C' },
      ]),
    )
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(true)
    expect(panels(el)[2]!.hasAttribute('hidden')).toBe(false)
    expect(el.getAttribute('current')).toBe('2')
    expect(el.getValues()).toEqual({ a: '1', c: '3' })
    expect(items(el).length).toBe(2)
    expect(progressEl(el).getAttribute('aria-valuemax')).toBe('2')
    // 恢复显示：一切回归
    el.setAttribute(
      'steps',
      JSON.stringify([
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B' },
        { key: 'c', title: 'C' },
      ]),
    )
    expect(el.getValues()).toEqual({ a: '1', b: '2', c: '3' })
    expect(progressEl(el).getAttribute('aria-valuemax')).toBe('3')
  })

  // ---------- 切换动画（animated） ----------

  it('animated：默认关（切步无动画标记）；开启后切步方向感知（前进/后退），首帧不动画', async () => {
    const off = mountDefault()
    off.setAttribute('current', '2')
    expect(panels(off)[2]!.hasAttribute('data-anim')).toBe(false)
    const on = mountDefault({ animated: '' })
    // 首帧：初始渲染不播动画（避免页面加载闪动）
    expect(panels(on)[0]!.hasAttribute('data-anim')).toBe(false)
    on.setAttribute('current', '2')
    expect(panels(on)[2]!.getAttribute('data-anim')).toBe('forward')
    on.setAttribute('current', '1')
    expect(panels(on)[1]!.getAttribute('data-anim')).toBe('backward')
    // 非切步的重渲染（如属性变化）不重复触发动画
    on.setAttribute('validation', 'false')
    expect(panels(on)[1]!.hasAttribute('data-anim')).toBe(false)
  })

  it('animated="false"：显式关闭不播动画；方法导航（goto/prev）同走方向标记', () => {
    const el = mountDefault({ animated: 'false' })
    el.setAttribute('current', '1')
    expect(panels(el)[1]!.hasAttribute('data-anim')).toBe(false)
    const on = mountDefault({ animated: '' })
    on.goto(2)
    expect(panels(on)[2]!.getAttribute('data-anim')).toBe('forward')
    on.prev()
    expect(panels(on)[1]!.getAttribute('data-anim')).toBe('backward')
  })

  it('animated CSS：keyframes 只动 transform/opacity、prefers-reduced-motion 门控降级、时长走出口变量', () => {
    const el = mountDefault({ animated: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 降级：no-preference 门控（reduce 用户零动画），门控内才有动画规则
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('oas-questionnaire-step-in-fwd')
    expect(css).toContain('oas-questionnaire-step-in-bwd')
    // 只动 transform/opacity（合成器友好），无位移外的布局属性
    expect(css).toMatch(/@keyframes oas-questionnaire-step-in-fwd\s*\{[^@]*transform:\s*translateX/)
    expect(css).toMatch(/@keyframes oas-questionnaire-step-in-fwd\s*\{[^@]*opacity:\s*0/)
    // 时长出口变量（宿主可覆盖）；位移轴由 RTL 方向变量翻转
    expect(css).toContain('var(--oas-questionnaire-anim-duration,')
    expect(css).toContain('var(--q-dir, 1)')
  })

  // ---------- i18n ----------

  it('i18n：setLocale(en) 后按钮/进度文案切英文；末步按钮为完成文案；文案属性覆盖', () => {
    const el = mountDefault()
    expect(btn(el, 'prev').textContent).toBe('上一步')
    expect(btn(el, 'next').textContent).toBe('下一步')
    setLocale(en) // 传入语言包对象自动注册
    expect(btn(el, 'prev').textContent).toBe('Previous')
    expect(btn(el, 'next').textContent).toBe('Next')
    expect(progressEl(el).textContent).toContain('Step 1 of 3')
    setLocale('zh-CN') // 切回中文再验证末步完成文案
    const el2 = mountDefault({ current: '2' })
    expect(btn(el2, 'next').textContent).toBe('完成')
    const el3 = mountDefault({ 'next-text': '继续' })
    expect(btn(el3, 'next').textContent).toBe('继续')
  })

  // ---------- 空态与 size ----------

  it('空 steps：不报错、无头部项、导航隐藏', () => {
    const el = mount({ steps: [], panels: [] })
    expect(items(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="nav"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('size 五档：host class 切换（别名归一），非法值回落 medium（无 class 残留）', () => {
    const el = mountDefault({ size: 'lg' })
    expect(el.classList.contains('oas-questionnaire--large')).toBe(true)
    const bad = mountDefault({ size: 'huge' })
    expect(bad.classList.contains('oas-questionnaire--medium')).toBe(true)
    bad.setAttribute('size', 'xl')
    expect(bad.classList.contains('oas-questionnaire--xl')).toBe(true)
    expect(bad.classList.contains('oas-questionnaire--medium')).toBe(false)
  })

  // ---------- 异步门控防重入 ----------

  it('异步 validator 在途时连点下一步：防重入只前进一次、只派发一次 oas-change', async () => {
    const el = new OASQuestionnaire()
    el.setAttribute('steps', JSON.stringify([{ key: 'a', title: 'A' }, { title: 'B' }]))
    el.innerHTML = '<oas-form slot="step-0"><oas-input name="a" value="x"></oas-input></oas-form>'
    document.body.appendChild(el)
    const form = el.querySelector('oas-form') as import('../form/index.js').OASForm
    form.rules = {
      a: [
        {
          validator: () => new Promise<true | string>((resolve) => setTimeout(() => resolve(true), 20)),
        },
      ],
    }
    const change = track(el, 'oas-change')
    const p1 = el.next()
    const p2 = el.next() // 在途重入：直接拒绝
    expect(await p1).toBe(true)
    expect(await p2).toBe(false)
    expect(change.length).toBe(1)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('异步 validator 在途时 prev()/goto() 离开本步：校验落地后不自动推到旧 target（竞态回归）', async () => {
    const el = new OASQuestionnaire()
    el.setAttribute('steps', JSON.stringify([{ title: 'A' }, { key: 'b', title: 'B' }, { title: 'C' }]))
    el.setAttribute('current', '1')
    el.innerHTML = '<oas-form slot="step-1"><oas-input name="b" value="x"></oas-input></oas-form>'
    document.body.appendChild(el)
    const form = el.querySelector('oas-form') as import('../form/index.js').OASForm
    form.rules = {
      b: [
        {
          validator: () => new Promise<true | string>((resolve) => setTimeout(() => resolve(true), 20)),
        },
      ],
    }
    const change = track(el, 'oas-change')
    const p = el.next() // 从步 1 发起，validator 20ms 在途
    expect(el.prev()).toBe(true) // 在途窗口回退到步 0（prev 不校验、不受 busy 限制）
    expect(el.getAttribute('current')).toBe('0')
    expect(await p).toBe(false) // 落地后发现已离开发起步：放弃推进，不得把用户拉到旧 target
    expect(el.getAttribute('current')).toBe('0')
    // prev() 自身的合法切步事件只有一次（落地后不再派发旧 target 的切步）
    expect(change).toEqual([{ index: 0 }])
  })

  // ---------- 样式机制（token / 逻辑属性 / 焦点环 / hidden 兜底） ----------

  it('样式机制：颜色只走 token、连接线用逻辑属性（RTL 自动镜像）、focus-visible 焦点环、:host([hidden]) 兜底', () => {
    const el = mountDefault()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(':host([hidden])')
    expect(css).toMatch(/\.item:not\(:last-child\)::after\s*\{[^}]*inset-inline-start/)
    expect(css).not.toMatch(/\.item:not\(:last-child\)::after\s*\{[^}]*[^-]left:/)
    expect(css).toContain('var(--oas-color-primary)')
    expect(css).toContain('var(--oas-focus-ring)')
    expect(css).toContain(':focus-visible')
    // --oas-radius-full 全仓未定义（依赖 999px 回退）：无回退会让圆角声明整条失效（进度条变直角）
    expect(css).toContain('var(--oas-radius-full, 999px)')
  })
})
