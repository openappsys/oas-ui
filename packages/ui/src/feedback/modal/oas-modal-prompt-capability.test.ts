import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { modal, destroyAll } from './index.js'
import { OASModal } from './oas-modal.js'

// 本文件验证 modal「prompt 能力包未 import（core-only）」的边界行为：
// modal.prompt 返回 null + dev 告警（同值去重）；import 能力包后 prompt 全链路可用。
//
// 注意：
// 1) 不得在文件顶部静态 import './prompt/index.js'——否则能力注册表被填充，core-only 语义失效。
//    全链路 describe 用动态 import 在「core-only describe」之后才注册（vitest 按文件隔离模块图，
//    本文件与 modal.test.ts 的注册表互不影响）。
// 2) 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个 prompt 调用
//    必须发生在「dev 告警」用例内；后续用例再调 prompt 不会再触发 console.warn。

function okButton(el: Element): HTMLButtonElement {
  return el.shadowRoot!.querySelector('[part="ok"]') as HTMLButtonElement
}

function cancelButton(el: Element): HTMLElement {
  return el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement
}

function esc(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

/** 触发指定对话框的关闭动画结束（happy-dom 无真实过渡；P3 销毁时序依赖 oas-closed） */
function endAnim(el: Element): void {
  const dialog = el.shadowRoot?.querySelector('.dialog')
  if (dialog) dialog.dispatchEvent(new Event('transitionend'))
}

/** 完成当前全部命令式对话框的关闭动画（驱动销毁收尾） */
function flushAnims(): void {
  for (const el of document.body.querySelectorAll('oas-modal')) endAnim(el)
}

const PROMPT_HINT = '@oas-ui/ui/feedback/modal/prompt'
const isPromptHint = (call: unknown[]) => String(call[0]).includes(PROMPT_HINT)

describe('modal prompt 能力边界（core-only：未 import prompt 能力包）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    destroyAll()
    flushAnims()
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('dev 告警：modal.prompt 未 import 能力包 → 返回 null + 提示按需 import（同值去重：多调只告警一次）', () => {
    const r1 = modal.prompt({ title: '输入' })
    expect(r1).toBeNull()
    expect(modal.prompt({ title: '再调' })).toBeNull()
    const first = warnSpy.mock.calls.filter(isPromptHint)
    expect(first.length, '首次 prompt 调用应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain(PROMPT_HINT)
    // 同值去重：后续同样调用不再重复告警
    warnSpy.mockClear()
    expect(modal.prompt({ title: '第三次' })).toBeNull()
    expect(warnSpy.mock.calls.filter(isPromptHint).length).toBe(0)
    // prompt 不产生任何对话框（返回 null 即不创建）
    expect(document.body.querySelectorAll('oas-modal').length).toBe(0)
  })

  it('core-only 时宿主元素无 prompt controller（getModalCapability 返回 null），声明式对话框不受影响', () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.innerHTML = '<p>声明式内容</p>'
    document.body.appendChild(el)
    expect(el.getModalCapability('prompt')).toBeNull()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')).not.toBeNull()
    expect(el.textContent).toContain('声明式内容')
    // 命令式 confirm 照常可用且无 prompt 告警噪音
    warnSpy.mockClear()
    modal.confirm({ title: '确认' })
    expect(document.body.querySelectorAll('oas-modal').length).toBe(2)
    expect(warnSpy.mock.calls.filter(isPromptHint).length).toBe(0)
  })
})

describe('modal prompt 能力（import 能力包后全链路）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  // 核心（core-only describe 已断言缺省语义）后动态 import 能力包：注册表填充发生在
  // 后续用例的元素构造之前（OASModal 构造时遍历注册表注入 controller）
  beforeAll(async () => {
    await import('./prompt/index.js')
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    destroyAll()
    flushAnims()
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('import 后 modal.prompt 返回句柄、对话框正常创建且无能力告警', () => {
    const p = modal.prompt({ title: '输入' })
    expect(p).not.toBeNull()
    const el = document.body.querySelector('oas-modal') as OASModal
    expect(el).not.toBeNull()
    expect(el.hasAttribute('visible')).toBe(true)
    // 宿主注入 prompt controller：命令式层按名取得到（委托点生效）
    expect(el.getModalCapability('prompt')).not.toBeNull()
    expect(warnSpy.mock.calls.filter(isPromptHint).length).toBe(0)
    p.close()
  })

  it('PG1/PG2/PB3 inputValue/placeholder 回传渲染 + 打开自动聚焦输入框', async () => {
    const p = modal.prompt({ title: '项目名', inputValue: 'oas-ui', placeholder: '请输入' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const input = el.querySelector('input')!
    expect(input).not.toBeNull()
    expect(input.value).toBe('oas-ui')
    expect(input.getAttribute('placeholder')).toBe('请输入')
    expect(document.activeElement).toBe(input)
    p.close()
  })

  it('PG3 inputType 映射：password / number / textarea', async () => {
    modal.prompt({ title: 'a', inputType: 'password' })
    modal.prompt({ title: 'b', inputType: 'number' })
    modal.prompt({ title: 'c', inputType: 'textarea' })
    await Promise.resolve()
    const [pa, pb, pc] = document.body.querySelectorAll('oas-modal')
    expect(pa!.querySelector('input')!.type).toBe('password')
    expect(pb!.querySelector('input')!.type).toBe('number')
    expect(pc!.querySelector('textarea')).not.toBeNull()
  })

  it('PG4/PG5/PB1 validator 返回 false：校验失败保持打开 + 默认错误文案 + danger 边框 + aria-invalid；输入修正自动清除可再提交', async () => {
    const onOk = vi.fn()
    const p = modal.prompt({ title: '测试', validator: (v) => v === 'good', onOk })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const input = el.querySelector('input')!
    input.value = 'bad'
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(onOk).not.toHaveBeenCalled()
    const err = el.querySelector<HTMLElement>('.oas-modal-prompt-error')!
    expect(err.hidden).toBe(false)
    expect(err.textContent).toBe('校验未通过') // 默认文案走 locale form.validationFailed
    expect(err.getAttribute('role')).toBe('alert')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('oas-modal-prompt-error')
    // 错误态视觉：danger 边框写在内联 borderColor（CSS 变量 token）
    expect(input.style.borderColor).toBe('var(--oas-color-danger)')
    // PB1 输入修正后错误自动清除
    input.value = 'good'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(err.hidden).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(input.style.borderColor).toBe('')
    okButton(el).click()
    await Promise.resolve()
    expect(onOk).toHaveBeenCalledWith('good')
    p.close()
  })

  it('PG4 validator 返回 string：该 string 作为自定义错误文案', async () => {
    modal.prompt({ title: '测试', validator: () => '至少 6 位' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = 'x'
    okButton(el).click()
    await Promise.resolve()
    expect(el.querySelector<HTMLElement>('.oas-modal-prompt-error')!.textContent).toBe('至少 6 位')
  })

  it('PG5 inputErrorMessage 配置默认错误文案（validator false 时使用）', async () => {
    modal.prompt({ title: '测试', validator: () => false, inputErrorMessage: '格式不对' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.querySelector<HTMLElement>('.oas-modal-prompt-error')!.textContent).toBe('格式不对')
  })

  it('PG6 inputPattern 正则校验（先 pattern 后 validator）；非法正则跳过不抛错', async () => {
    const validator = vi.fn()
    const p = modal.prompt({ title: '测试', inputPattern: '^\\d+$', validator })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = 'abc'
    okButton(el).click()
    await Promise.resolve()
    // pattern 不匹配：拦截且不进入 validator
    expect(validator).not.toHaveBeenCalled()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(el.querySelector<HTMLElement>('.oas-modal-prompt-error')!.hidden).toBe(false)
    // 修正后 pattern 通过才进入 validator
    el.querySelector('input')!.value = '123'
    el.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }))
    okButton(el).click()
    await Promise.resolve()
    expect(validator).toHaveBeenCalledWith('123')
    p.close()
    // 非法正则：不抛错、跳过 pattern 校验
    const p2 = modal.prompt({ title: '测试2', inputPattern: '([unclosed' })
    await Promise.resolve()
    const el2 = document.body.querySelector('oas-modal')!
    el2.querySelector('input')!.value = 'any'
    expect(() => okButton(el2).click()).not.toThrow()
    p2.close()
  })

  it('PB2 {value, action} 返回：确定 confirm / 取消按钮 cancel / Esc 归一 cancel（不挂起）', async () => {
    const confirmed = modal.prompt({ title: 'a' })
    await Promise.resolve()
    const el1 = document.body.querySelector('oas-modal')!
    el1.querySelector('input')!.value = '提交值'
    okButton(el1).click()
    await expect(confirmed).resolves.toEqual({ value: '提交值', action: 'confirm' })
    endAnim(el1)

    const cancelled = modal.prompt({ title: 'b' })
    await Promise.resolve()
    const el2 = document.body.querySelector('oas-modal')!
    el2.querySelector('input')!.value = '遗留值'
    cancelButton(el2).click()
    await expect(cancelled).resolves.toEqual({ value: '遗留值', action: 'cancel' })
    endAnim(el2)

    const viaEsc = modal.prompt({ title: 'c' })
    await Promise.resolve()
    esc()
    await expect(viaEsc).resolves.toEqual({ value: '', action: 'cancel' })
  })

  it('PB4 异步 onOk：pending 时 loading（确定按钮 disabled 防重复），resolve 后关闭并 resolve 结果；reject 清 loading 保持打开', async () => {
    let release!: () => void
    const p = modal.prompt({
      title: '测试',
      onOk: () => new Promise<void>((r) => (release = r)),
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(el.hasAttribute('loading')).toBe(true)
    expect(okButton(el).disabled).toBe(true)
    okButton(el).click() // loading 中重复点击不触发
    release()
    await expect(p).resolves.toEqual({ value: '', action: 'confirm' })
    endAnim(el) // 关动画结束移除首个对话框，避免后续 querySelector 命中已关闭实例

    const rejected = modal.prompt({ title: '测试2', onOk: () => Promise.reject(new Error('boom')) })
    await Promise.resolve()
    const el2 = document.body.querySelector('oas-modal')!
    okButton(el2).click()
    await Promise.resolve()
    await Promise.resolve()
    expect(el2.hasAttribute('loading')).toBe(false)
    expect(okButton(el2).disabled).toBe(false)
    expect(el2.hasAttribute('visible')).toBe(true)
    rejected.close()
  })

  it('PG4 校验失败后取消路径正常（onCancel 触发 + resolve { value, action:"cancel" }）', async () => {
    const onCancel = vi.fn()
    const p = modal.prompt({ title: '测试', validator: () => '错误', onCancel })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = 'bad'
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(true)
    cancelButton(el).click()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(1)
    await expect(p).resolves.toEqual({ value: 'bad', action: 'cancel' })
  })

  it('P6 prompt update() 运行时更新标题/占位/初始值；close() 编程关闭不挂起', async () => {
    const p = modal.prompt({ title: '旧', placeholder: '旧占位', inputValue: 'v1' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    p.update({ title: '新', placeholder: '新占位', inputValue: 'v2' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新')
    const input = el.querySelector('input')!
    expect(input.getAttribute('placeholder')).toBe('新占位')
    expect(input.value).toBe('v2')
    p.close()
    await expect(p).resolves.toEqual({ value: 'v2', action: 'cancel' })
  })
})
