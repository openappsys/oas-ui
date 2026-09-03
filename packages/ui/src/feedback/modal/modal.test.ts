import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  modal,
  destroyAll,
  type ModalOptions,
  type OptionsOptions,
} from './index.js'
import { registerAppHost, unregisterAppHost } from '../../floating/app/app-host.js'
import { iconRegistry } from '@oas-ui/icons'

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

describe('modal 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyAll()
    // 关闭动画在 happy-dom 无真实过渡，手动触发 oas-closed 完成销毁收尾
    flushAnims()
    document.body.innerHTML = ''
  })

  it('confirm 创建并挂载到 body（无 oas-app 时）', async () => {
    modal.confirm({ title: '确认删除' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('有 oas-app 容器时挂到最近容器内（与消息族同通道）', async () => {
    const app = document.createElement('div')
    document.body.appendChild(app)
    registerAppHost(app)
    try {
      modal.confirm({ title: '挂载到 app' })
      await Promise.resolve()
      expect(app.querySelector('oas-modal')).not.toBeNull()
      expect(document.body.querySelectorAll('oas-modal').length).toBe(1)
    } finally {
      unregisterAppHost(app)
    }
  })

  it('title/content/okText/cancelText 渲染', async () => {
    modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复',
      okText: '狠心删除',
      cancelText: '再想想',
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    // title 吸收：宿主原生 title 被吸收移除，标题渲染进可见标题区（无残留原生悬浮提示）
    expect(el.getAttribute('title')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('确认删除')
    expect(el.getAttribute('ok-text')).toBe('狠心删除')
    expect(el.getAttribute('cancel-text')).toBe('再想想')
    expect(el.textContent).toContain('删除后不可恢复')
    expect(okButton(el).textContent).toContain('狠心删除')
    expect(cancelButton(el).textContent).toContain('再想想')
  })

  it('点确定：onOk 调用 + 关闭销毁', async () => {
    const onOk = vi.fn()
    modal.confirm({ title: '测试', onOk })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(onOk).toHaveBeenCalledTimes(1)
    // P3 destroy 时序：关闭动画结束（oas-closed）后卸载
    expect(el.isConnected, '动画未结束前不卸载').toBe(true)
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('无 onOk 点确定直接关闭', async () => {
    modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('异步 onOk：pending 时 ok loading（disabled），resolve 后关闭', async () => {
    let release!: () => void
    modal.confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)) })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(el.hasAttribute('loading')).toBe(true)
    expect(okButton(el).disabled).toBe(true)
    // loading 期间重复点确定不重复触发（按钮 disabled + 模块双保险）
    okButton(el).click()
    release()
    await Promise.resolve()
    await Promise.resolve()
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('异步 onOk reject：loading 停止、对话框保持打开可重试', async () => {
    modal.confirm({ title: '测试', onOk: () => Promise.reject(new Error('boom')) })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    await Promise.resolve()
    expect(el.hasAttribute('loading')).toBe(false)
    expect(okButton(el).disabled).toBe(false)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('点取消：onCancel 调用 + 关闭；Esc 同为 cancel 语义', async () => {
    const onCancel = vi.fn()
    modal.confirm({ title: '测试', onCancel })
    await Promise.resolve()
    const el1 = document.body.querySelector('oas-modal')!
    cancelButton(el1).click()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(1)
    endAnim(el1)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
    // Esc 关闭
    modal.confirm({ title: '测试2', onCancel })
    await Promise.resolve()
    const el2 = document.body.querySelector('oas-modal')!
    esc()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(2)
    endAnim(el2)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('loading 中取消：关闭 + onCancel，迟到的 resolve 不再生效', async () => {
    let release!: () => void
    const onCancel = vi.fn()
    modal.confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)), onCancel })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('loading')).toBe(true)
    cancelButton(el).click()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(1)
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('info/success/warning/error 变体：语义图标 + 单确定按钮', async () => {
    modal.info({ title: '信息', content: '提示' })
    modal.success({ title: '成功', content: '完成' })
    modal.warning({ title: '警告', content: '注意' })
    modal.error({ title: '错误', content: '出错' })
    await Promise.resolve()
    const els = document.body.querySelectorAll('oas-modal')
    expect(els.length).toBe(4)
    const expectTypes = ['info', 'success', 'warning', 'error']
    const expectIcons = ['info', 'check-circle', 'warning', 'error']
    els.forEach((el, i) => {
      expect(el.getAttribute('type')).toBe(expectTypes[i])
      const icon = el.shadowRoot!.querySelector('[part="semantic-icon"]')!
      expect(icon.hasAttribute('hidden')).toBe(false)
      // happy-dom 会把自闭合 SVG 标签序列化为显式闭合，用同源解析的参考元素比对
      const ref = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      ref.innerHTML = iconRegistry[expectIcons[i] as keyof typeof iconRegistry]
      expect(icon.querySelector('svg')!.innerHTML).toBe(ref.innerHTML)
      // 单确定按钮：取消按钮隐藏
      expect(cancelButton(el).hidden).toBe(true)
      expect(okButton(el).hidden).toBe(false)
    })
  })

  it('多例并存 + destroyAll 全销毁（无孤儿）', async () => {
    modal.confirm({ title: '1' })
    modal.confirm({ title: '2' })
    modal.info({ title: '3' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(3)
    destroyAll()
    // 关闭动画结束（oas-closed）后逐个卸载
    flushAnims()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(0)
    expect(document.body.innerHTML).toBe('')
  })

  it('close() 句柄编程关闭（不触发 onCancel）', async () => {
    const onCancel = vi.fn()
    const handle = modal.confirm({ title: '测试', onCancel })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    handle.close()
    await Promise.resolve()
    expect(onCancel).not.toHaveBeenCalled()
    // P3：关闭动画结束后才卸载（isConnected 由 oas-closed 驱动）
    expect(el.isConnected).toBe(true)
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
    expect(el.isConnected).toBe(false)
  })

  it('close() 还原来源焦点', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const handle = modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    // 命令式确认框打开聚焦「确定」按钮（focus-ok）
    expect(el.shadowRoot!.activeElement).toBe(okButton(el))
    handle.close()
    await Promise.resolve()
    expect(document.activeElement).toBe(outside)
  })

  it('非法参数容错：非对象 / 空 title+content 不抛错', async () => {
    expect(() => modal.confirm(null as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm(123 as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm('xxx' as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm()).not.toThrow()
    await Promise.resolve()
    // 全部渲染为确认框（空 title+content 容错）
    expect(document.body.querySelectorAll('oas-modal').length).toBe(4)
  })

  // —— 一期增强：alertdialog 语义 / onMaskClick / update() ——

  it('P24 命令式确认框 dialog 语义为 alertdialog（声明式保持 dialog）', async () => {
    modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    expect(el.shadowRoot!.querySelector('[role="alertdialog"]')).not.toBeNull()
    // 声明式（无 role 属性）保持 dialog：由 oas-modal.test.ts 的缺省断言覆盖
  })

  it('P15 遮罩点击触发 onMaskClick（先于 onCancel 调用）', async () => {
    const order: string[] = []
    modal.confirm({
      title: '测试',
      onMaskClick: () => order.push('mask'),
      onCancel: () => order.push('cancel'),
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(order).toEqual(['mask', 'cancel'])
    endAnim(el)
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('P15 非遮罩关闭不触发 onMaskClick', async () => {
    const onMaskClick = vi.fn()
    const onCancel = vi.fn()
    modal.confirm({ title: '测试', onMaskClick, onCancel })
    await Promise.resolve()
    cancelButton(document.body.querySelector('oas-modal')!).click()
    await Promise.resolve()
    expect(onMaskClick).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('P6 update() 运行时更新标题/内容/按钮文案', async () => {
    const handle = modal.confirm({ title: '旧标题', content: '旧内容', okText: '旧确定' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    handle.update({ title: '新标题', content: '新内容', okText: '新确定' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('新标题')
    expect(el.textContent).toContain('新内容')
    expect(okButton(el).textContent).toContain('新确定')
    expect(el.getAttribute('ok-text')).toBe('新确定')
  })

  it('P6 update() 幂等安全：关闭后调用不抛错', async () => {
    const handle = modal.confirm({ title: '测试' })
    await Promise.resolve()
    handle.close()
    await Promise.resolve()
    expect(() => handle.update({ title: '再改' })).not.toThrow()
  })

  // —— prompt 全套（PG1-PG6 / PB1-PB5）——

  it('PG1/PG2 prompt 渲染输入框：inputValue 初始值 + placeholder', async () => {
    const p = modal.prompt({ title: '输入', inputValue: '初始', placeholder: '占位' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const input = el.querySelector('input')!
    expect(input).not.toBeNull()
    expect(input.value).toBe('初始')
    expect(input.getAttribute('placeholder')).toBe('占位')
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

  it('PB3 打开自动聚焦输入框（initial-focus），非聚焦确定按钮', async () => {
    const p = modal.prompt({ title: '输入' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    expect(document.activeElement).toBe(el.querySelector('input'))
    p.close()
  })

  it('PG4/PG5/PB1 validator 返回 false：校验失败保持打开 + 默认错误文案 + 输入框 danger 态', async () => {
    const onOk = vi.fn()
    // validator 基于值：'bad' 失败（false→默认文案），'good' 通过（true）
    const p = modal.prompt({ title: '测试', validator: (v) => v === 'good', onOk })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const input = el.querySelector('input')!
    input.value = 'bad'
    okButton(el).click()
    await Promise.resolve()
    // 保持打开、不触发 onOk
    expect(el.hasAttribute('visible')).toBe(true)
    expect(onOk).not.toHaveBeenCalled()
    // 错误文案显示在输入框下方（role=alert），输入框 aria-invalid
    const err = el.querySelector<HTMLElement>('.oas-modal-prompt-error')!
    expect(err.hidden).toBe(false)
    expect(err.textContent).toBe('校验未通过') // 默认文案走 locale form.validationFailed
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(err.getAttribute('role')).toBe('alert')
    // PB1 输入修正后错误清除，可再提交
    input.value = 'good'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(err.hidden).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('false')
    okButton(el).click()
    await Promise.resolve()
    expect(onOk).toHaveBeenCalledTimes(1)
    p.close()
  })

  it('PG4 validator 返回 string：该 string 作为错误文案（自定义）', async () => {
    modal.prompt({ title: '测试', validator: () => '至少 6 位' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = 'x'
    okButton(el).click()
    await Promise.resolve()
    const err = el.querySelector<HTMLElement>('.oas-modal-prompt-error')!
    expect(err.hidden).toBe(false)
    expect(err.textContent).toBe('至少 6 位')
  })

  it('PG5 inputErrorMessage 配置默认错误文案（validator false 时使用）', async () => {
    modal.prompt({ title: '测试', validator: () => false, inputErrorMessage: '格式不对' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.querySelector<HTMLElement>('.oas-modal-prompt-error')!.textContent).toBe('格式不对')
  })

  it('PG6 inputPattern 正则校验（字符串属性，先 pattern 后 validator）', async () => {
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
  })

  it('PG6 非法正则 pattern 不抛错（跳过 pattern 校验）', async () => {
    const p = modal.prompt({ title: '测试', inputPattern: '([unclosed' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = 'any'
    expect(() => okButton(el).click()).not.toThrow()
    p.close()
  })

  it('PB2 提交成功 resolve { value, action: "confirm" }', async () => {
    const result = modal.prompt({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = '提交值'
    okButton(el).click()
    await expect(result).resolves.toEqual({ value: '提交值', action: 'confirm' })
  })

  it('PB2 取消按钮 resolve { value, action: "cancel" }', async () => {
    const result = modal.prompt({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    el.querySelector('input')!.value = '遗留值'
    cancelButton(el).click()
    await expect(result).resolves.toEqual({ value: '遗留值', action: 'cancel' })
  })

  it('A32 prompt 的 ✕/遮罩/Esc 归一 resolve { value, action: "cancel" }（不挂起）', async () => {
    const viaClose = modal.prompt({ title: 'a' })
    await Promise.resolve()
    const el1 = document.body.querySelectorAll('oas-modal')[0]!
    ;(el1.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    await expect(viaClose).resolves.toEqual({ value: '', action: 'cancel' })
    endAnim(el1)

    const viaMask = modal.prompt({ title: 'b' })
    await Promise.resolve()
    const el2 = document.body.querySelector('oas-modal')!
    el2.shadowRoot!.querySelector('.mask')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    await expect(viaMask).resolves.toEqual({ value: '', action: 'cancel' })
    endAnim(el2)

    const viaEsc = modal.prompt({ title: 'c' })
    await Promise.resolve()
    esc()
    await expect(viaEsc).resolves.toEqual({ value: '', action: 'cancel' })
  })

  it('PB4 异步 onOk：loading 期间禁止重复提交，resolve 后关闭并 resolve 结果', async () => {
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
    // loading 中重复点击不触发（按钮 disabled + 模块双保险）
    okButton(el).click()
    expect(okButton(el).disabled).toBe(true)
    release()
    await expect(p).resolves.toEqual({ value: '', action: 'confirm' })
  })

  it('PB4 异步 onOk reject：清除 loading 保持打开可重试', async () => {
    const p = modal.prompt({ title: '测试', onOk: () => Promise.reject(new Error('boom')) })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    await Promise.resolve()
    expect(el.hasAttribute('loading')).toBe(false)
    expect(okButton(el).disabled).toBe(false)
    expect(el.hasAttribute('visible')).toBe(true)
    p.close()
  })

  it('PG4 校验失败时 onCancel 走 oas-close 不触发确定流程（cancel 回调正常）', async () => {
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

  it('P6 prompt update() 更新标题/占位/初始值/错误文案', async () => {
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
  })

  // —— 二期：P3 命令式销毁时序 / P34 options 选项模式 ——

  it('P3 命令式销毁：确定后对话框保留到关闭动画结束（oas-closed）才卸载', async () => {
    const handle = modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    handle.close()
    // 关闭动画进行中：DOM 仍挂载（宿主可见淡出）
    expect(el.hasAttribute('visible')).toBe(false)
    expect(el.isConnected).toBe(true)
    endAnim(el)
    expect(el.isConnected).toBe(false)
  })

  it('P3 destroyAll 对全部实例逐一等动画结束卸载', async () => {
    modal.confirm({ title: '1' })
    modal.confirm({ title: '2' })
    await Promise.resolve()
    destroyAll()
    expect(document.body.querySelectorAll('oas-modal').length, '动画中仍挂载').toBe(2)
    flushAnims()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(0)
  })

  it('P34 options radio：默认选中首个可选项，确定 resolve 单个值；方向键/点击切换后结果跟随', async () => {
    const result = modal.options({
      title: '选择优先级',
      type: 'radio',
      items: [
        { label: '低', value: 'low' },
        { label: '中', value: 'medium', checked: true },
        { label: '高', value: 'high' },
      ],
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const inputs = [...el.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    expect(inputs.length).toBe(3)
    // radio 原生分组：同 name
    expect(inputs[0]!.type).toBe('radio')
    expect(inputs[0]!.name).toBe(inputs[1]!.name)
    // 显式 checked 优先（中）
    expect(inputs[1]!.checked).toBe(true)
    expect(inputs[0]!.checked).toBe(false)
    // 切到「高」再确定
    inputs[2]!.click()
    okButton(el).click()
    await expect(result).resolves.toEqual({ value: 'high', action: 'confirm' })
    endAnim(el)
  })

  it('P34 options radio 无显式 checked：缺省选中首个可选项', async () => {
    const result = modal.options({
      title: '选择',
      items: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const inputs = [...el.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    expect(inputs[0]!.checked).toBe(true)
    okButton(el).click()
    await expect(result).resolves.toEqual({ value: 'a', action: 'confirm' })
    endAnim(el)
  })

  it('P34 options checkbox：多选数组结果；取消 resolve 当前选中值 + action cancel', async () => {
    const p = modal.options({
      title: '选择标签',
      type: 'checkbox',
      items: [
        { label: '文档', value: 'doc', checked: true },
        { label: '设计', value: 'design' },
        { label: '测试', value: 'qa', checked: true },
      ],
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const inputs = [...el.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    expect(inputs.every((i) => i.type === 'checkbox')).toBe(true)
    expect(inputs.filter((i) => i.checked).length).toBe(2)
    // 取消：返回当前选中集合 + action cancel
    cancelButton(el).click()
    await expect(p).resolves.toEqual({ value: ['doc', 'qa'], action: 'cancel' })
    endAnim(el)
  })

  it('P34 options toggle：开关组渲染（原生 checkbox 隐藏 + 轨道滑块），结果数组 = 开启项', async () => {
    const result = modal.options({
      title: '通知设置',
      type: 'toggle',
      items: [
        { label: '邮件', value: 'mail', checked: true },
        { label: '短信', value: 'sms' },
      ],
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const inputs = [...el.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    expect(inputs.length).toBe(2)
    // toggle 行含轨道元素（视觉开关）
    const rows = [...el.querySelectorAll('.oas-modal-opt-toggle')]
    expect(rows.length).toBe(2)
    expect(rows[0]!.querySelector('.oas-modal-opt-track')).not.toBeNull()
    // 开启第二项 → 确定结果数组
    inputs[1]!.click()
    okButton(el).click()
    await expect(result).resolves.toEqual({ value: ['mail', 'sms'], action: 'confirm' })
    endAnim(el)
  })

  it('P34 disabled 项不可选（input disabled）；onOk 异步 loading 后可重试', async () => {
    const onOk = vi.fn((_v: string | string[]) => Promise.reject(new Error('x')))
    const p = modal.options({
      title: '选择',
      items: [
        { label: 'A', value: 'a' },
        { label: '禁用', value: 'no', disabled: true },
      ],
      onOk,
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    const inputs = [...el.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    expect(inputs[1]!.disabled).toBe(true)
    inputs[1]!.click()
    expect(inputs[1]!.checked).toBe(false)
    okButton(el).click()
    await Promise.resolve()
    await Promise.resolve()
    // reject：清除 loading 保持打开（可重试/取消）
    expect(el.hasAttribute('loading')).toBe(false)
    expect(el.hasAttribute('visible')).toBe(true)
    expect(onOk).toHaveBeenCalledWith('a')
    p.close()
    endAnim(el)
  })

  it('P34 非法入参容错：null / 无 items 渲染空选项组不抛错；非法 type 回退 radio', async () => {
    expect(() => modal.options(null as unknown as OptionsOptions)).not.toThrow()
    expect(() => modal.options({ type: 'bogus' as OptionsOptions['type'] })).not.toThrow()
    await Promise.resolve()
    const els = document.body.querySelectorAll('oas-modal')
    expect(els.length).toBe(2)
    const rows = els[0]!.querySelectorAll('.oas-modal-opt')
    expect(rows.length).toBe(0)
  })
})
