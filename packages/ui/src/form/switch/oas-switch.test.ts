import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSwitch } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSwitch {
  const el = new OASSwitch()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function sw(el: OASSwitch): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

function extLabel(el: OASSwitch): HTMLLabelElement {
  return el.shadowRoot!.querySelector('label.ext-label')!
}

function flushSlot(): Promise<void> {
  // MutationObserver 回调是微任务后的任务，等一个宏任务
  return new Promise((r) => setTimeout(r, 0))
}

describe('OASSwitch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 button 且 role=switch，aria-checked 随 checked 同步', async () => {
    const el = mount({ checked: '' })
    const btn = sw(el)
    await Promise.resolve()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('role')).toBe('switch')
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('点击切换状态并派发 oas-change（detail 含 checked 与映射 value）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    sw(el).click()
    expect(detail).toEqual({ checked: true, value: true })
    expect(el.hasAttribute('checked')).toBe(true)
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('disabled 不可点击', () => {
    const el = mount({ disabled: '', checked: '' })
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('loading 显示 spinner 且禁止切换', () => {
    const el = mount({ loading: '', checked: '' })
    expect(sw(el).querySelector('.spinner')).not.toBeNull()
    sw(el).click()
    expect(sw(el).getAttribute('aria-checked')).toBe('true')
  })

  it('属性变化增量更新：改 checked 同步 aria-checked 且不重建引用', () => {
    const el = mount()
    const btn = sw(el)
    el.setAttribute('checked', '')
    expect(sw(el)).toBe(btn)
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('checked-text/unchecked-text：初始关闭显示 unchecked-text，点击切换为 checked-text', () => {
    const el = mount({ 'checked-text': '开', 'unchecked-text': '关' })
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(false)
    expect(label.textContent).toBe('关')
    sw(el).click()
    expect(label.textContent).toBe('开')
  })

  it('改 checked-text 增量更新文案且不重建引用', () => {
    const el = mount({ checked: '', 'checked-text': '开', 'unchecked-text': '关' })
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.textContent).toBe('开')
    el.setAttribute('checked-text', 'YES')
    expect(label.textContent).toBe('YES')
    expect(sw(el).querySelector('.label')).toBe(label)
  })

  it('未设置文案时轨道内 label 隐藏', () => {
    const el = mount()
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(true)
  })

  it('size 类名：small / 默认 medium / large', () => {
    const small = mount({ size: 'small' })
    expect(sw(small).className).toBe('small')
    const medium = mount()
    expect(sw(medium).className).toBe('medium')
    const large = mount({ size: 'large' })
    expect(sw(large).className).toBe('large')
  })

  it('size 五档：xs/small/medium/large/xl 均反映到 class', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = mount({ size: s })
      expect(sw(el).className).toBe(s)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次（白名单修复）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(sw(el).className).toBe('medium')
    expect(sw(el).classList.contains('huge')).toBe(false)
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('size=xs 且设置文案时文案放轨道外侧（outside-label），同 small 行为', () => {
    const el = mount({ size: 'xs', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    expect(outside.hidden).toBe(false)
    expect(outside.textContent).toBe('关')
    expect(sw(el).querySelector<HTMLElement>('.label')!.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(true)
    sw(el).click()
    expect(outside.textContent).toBe('开')
  })

  it('size=small 且设置文案时文案放轨道外侧（outside-label）', () => {
    const el = mount({ size: 'small', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    expect(outside.hidden).toBe(false)
    expect(outside.textContent).toBe('关')
    expect(sw(el).querySelector<HTMLElement>('.label')!.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(true)
    sw(el).click()
    expect(outside.textContent).toBe('开')
  })

  it('size=medium 时文案显示在轨道内而非外侧', () => {
    const el = mount({ size: 'medium', 'checked-text': '开', 'unchecked-text': '关' })
    const outside = el.shadowRoot!.querySelector<HTMLElement>('.outside-label')!
    const label = sw(el).querySelector<HTMLElement>('.label')!
    expect(label.hidden).toBe(false)
    expect(outside.hidden).toBe(true)
    expect(el.classList.contains('has-outside-label')).toBe(false)
  })

  it('color 内联样式：--oas-color-primary 覆盖，移除属性后清除', () => {
    const el = mount({ color: '#16a34a', checked: '' })
    expect(sw(el).style.getPropertyValue('--oas-color-primary')).toBe('#16a34a')
    el.removeAttribute('color')
    expect(sw(el).style.getPropertyValue('--oas-color-primary')).toBe('')
  })

  // ===== label 外部标签（本批新增） =====

  it('label 属性渲染外部标签，label for 与 button id 配对（可访问名称 + 点击切换）', () => {
    const el = mount({ label: '消息通知' })
    const lab = extLabel(el)
    const btn = sw(el)
    expect(lab.hidden).toBe(false)
    expect(lab.querySelector('.label-text')!.textContent).toBe('消息通知')
    expect(lab.getAttribute('for')).toBe(btn.id)
    expect(btn.id).not.toBe('')
    lab.click()
    expect(el.hasAttribute('checked')).toBe(true)
  })

  it('label 默认插槽内容优先于 label 属性', async () => {
    const el = mount({ label: '属性文案' })
    el.innerHTML = '<b>插槽文案</b>'
    await flushSlot()
    const lab = extLabel(el)
    expect(lab.hidden).toBe(false)
    expect(lab.querySelector<HTMLElement>('.slot-wrap')!.hidden).toBe(false)
    expect(lab.querySelector<HTMLElement>('.label-text')!.hidden).toBe(true)
  })

  it('label-position 镜像 data-label-position（默认 end，非法回落 end）', () => {
    const el = mount({ label: '标签', 'label-position': 'start' })
    expect(el.getAttribute('data-label-position')).toBe('start')
    el.setAttribute('label-position', 'middle')
    expect(el.getAttribute('data-label-position')).toBe('end')
    const el2 = mount({ label: '标签' })
    expect(el2.getAttribute('data-label-position')).toBe('end')
  })

  it('aria-label 镜像到内部 button（无可访问名称的便捷通道）', () => {
    const el = mount()
    el.setAttribute('aria-label', '夜间模式')
    expect(sw(el).getAttribute('aria-label')).toBe('夜间模式')
    el.removeAttribute('aria-label')
    expect(sw(el).hasAttribute('aria-label')).toBe(false)
  })

  it('disabled 时镜像 data-disabled（label 视觉联动钩子）', () => {
    const el = mount({ disabled: '' })
    expect(el.hasAttribute('data-disabled')).toBe(true)
  })

  // ===== 滑块图标（本批新增） =====

  it('checked-icon/unchecked-icon：滑块渲染 oas-icon 且随状态切换', () => {
    const el = mount({ 'checked-icon': 'star-filled', 'unchecked-icon': 'star' })
    const icon = sw(el).querySelector<HTMLElement>('.thumb-icon')!
    expect(icon.hidden).toBe(false)
    expect(icon.querySelector('oas-icon')!.getAttribute('name')).toBe('star')
    sw(el).click()
    expect(icon.querySelector('oas-icon')!.getAttribute('name')).toBe('star-filled')
    // 增量：改当前态（checked）图标名不重建容器
    el.setAttribute('checked-icon', 'check')
    expect(icon.querySelector('oas-icon')!.getAttribute('name')).toBe('check')
  })

  it('未设置或非法图标名时滑块图标隐藏', () => {
    const el = mount({ 'unchecked-icon': 'not-exist' })
    const icon = sw(el).querySelector<HTMLElement>('.thumb-icon')!
    expect(icon.hidden).toBe(true)
    el.setAttribute('unchecked-icon', 'close')
    expect(icon.hidden).toBe(false)
    expect(icon.querySelector('oas-icon')!.getAttribute('name')).toBe('close')
  })

  // ===== true-value / false-value（本批新增） =====

  it('true-value/false-value：change detail.value 返回映射值', () => {
    const el = mount({ 'true-value': 'YES', 'false-value': 'NO' })
    const details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    sw(el).click()
    sw(el).click()
    expect(details).toEqual([
      { checked: true, value: 'YES' },
      { checked: false, value: 'NO' },
    ])
  })

  it('value getter/setter：读写映射值（未匹配的值忽略）', () => {
    const el = mount({ 'true-value': 'YES', 'false-value': 'NO' })
    expect(el.value).toBe('NO')
    el.value = 'YES'
    expect(el.hasAttribute('checked')).toBe(true)
    expect(el.value).toBe('YES')
    el.value = 'UNMATCHED'
    expect(el.hasAttribute('checked')).toBe(true)
    const plain = mount()
    expect(plain.value).toBe(false)
    plain.value = true
    expect(plain.hasAttribute('checked')).toBe(true)
  })

  // ===== before-change 拦截（本批新增） =====

  it('beforeChange 返回 false：不切换、不派发 change', async () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.beforeChange = () => false
    sw(el).click()
    await vi.waitFor(() => expect(sw(el).disabled).toBe(false))
    expect(el.hasAttribute('checked')).toBe(false)
    expect(fired).toBe(0)
  })

  it('beforeChange 返回 true：放行切换', async () => {
    const el = mount()
    el.beforeChange = () => true
    sw(el).click()
    await vi.waitFor(() => expect(el.hasAttribute('checked')).toBe(true))
  })

  it('beforeChange 异步在途期间按钮禁用 + spinner，resolve(true) 后切换', async () => {
    const el = mount()
    let resolveFn: ((ok: boolean) => void) | null = null
    el.beforeChange = () => new Promise<boolean>((res) => (resolveFn = res))
    const btn = sw(el)
    btn.click()
    expect(btn.disabled).toBe(true)
    expect(btn.querySelector<HTMLElement>('.spinner')!.hidden).toBe(false)
    await vi.waitFor(() => expect(resolveFn).not.toBeNull())
    resolveFn!(true)
    await vi.waitFor(() => expect(el.hasAttribute('checked')).toBe(true))
    expect(btn.disabled).toBe(false)
    expect(btn.querySelector<HTMLElement>('.spinner')!.hidden).toBe(true)
  })

  it('beforeChange reject：不切换且恢复可点（拒绝=否决，不产生未处理 rejection）', async () => {
    const el = mount()
    el.beforeChange = () => Promise.reject(new Error('denied'))
    const btn = sw(el)
    btn.click()
    await vi.waitFor(() => expect(btn.disabled).toBe(false))
    expect(el.hasAttribute('checked')).toBe(false)
  })

  it('beforeChange 在途期间重复点击不重复触发', async () => {
    const el = mount()
    let calls = 0
    let resolveFn: ((ok: boolean) => void) | null = null
    el.beforeChange = () => {
      calls++
      return new Promise<boolean>((res) => (resolveFn = res))
    }
    sw(el).click()
    await Promise.resolve() // 钩子在微任务中调用
    expect(calls).toBe(1)
    sw(el).click()
    expect(calls).toBe(1)
    await vi.waitFor(() => expect(resolveFn).not.toBeNull())
    resolveFn!(true)
    await vi.waitFor(() => expect(el.hasAttribute('checked')).toBe(true))
  })

  // ===== status 校验态（本批新增） =====

  it('status 镜像 data-status；error 联动 aria-invalid，切换/清理时所有权正确', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'warning')
    expect(el.getAttribute('data-status')).toBe('warning')
    expect(el.hasAttribute('aria-invalid')).toBe(false)
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  it('宿主自设 aria-invalid 不被 status 清理吞掉', () => {
    const el = mount()
    el.setAttribute('aria-invalid', 'true')
    el.setAttribute('status', 'error')
    el.removeAttribute('status')
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('status 非法值静默回落（不镜像）', () => {
    const el = mount({ status: 'critical' })
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  // ===== focus / blur（本批新增） =====

  it('oas-focus / oas-blur 事件随内部 button 焦点派发', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    sw(el).dispatchEvent(new FocusEvent('focus'))
    sw(el).dispatchEvent(new FocusEvent('blur'))
    expect(events).toEqual(['focus', 'blur'])
  })

  it('focus()/blur() 委托到内部 button', () => {
    const el = mount()
    const btn = sw(el)
    const focusSpy = vi.spyOn(btn, 'focus')
    const blurSpy = vi.spyOn(btn, 'blur')
    el.focus()
    el.blur()
    expect(focusSpy).toHaveBeenCalled()
    expect(blurSpy).toHaveBeenCalled()
  })

  // ===== 热区修复（机制层断言；视觉以浏览器复核为准） =====

  it('宿主宽度收缩到内容宽（width: fit-content 进样式表，防竖向容器整行拉伸）', () => {
    mount()
    const style = document.querySelector('oas-switch')!.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('width: fit-content')
  })

  it('CSS 变量宽度通道：--oas-switch-width/--oas-switch-height/--oas-switch-thumb-size 进样式表（各尺寸档兜底）', () => {
    mount()
    const style = document.querySelector('oas-switch')!.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('var(--oas-switch-width, 40px)')
    expect(style).toContain('var(--oas-switch-width, 28px)')
    expect(style).toContain('var(--oas-switch-height, 22px)')
    expect(style).toContain('var(--oas-switch-thumb-size, 18px)')
  })
})
