import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASEquation } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEquation {
  const el = new OASEquation()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function eqOf(el: OASEquation): HTMLElement {
  return el.shadowRoot!.querySelector('[part="equation"]')!
}

function editorOf(el: OASEquation): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="editor"]')
}

function fieldOf(el: OASEquation): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="field"]')!
}

/** 模拟在编辑框输入（赋值 + input 事件） */
function type(el: OASEquation, text: string): void {
  const f = fieldOf(el)
  f.value = text
  f.dispatchEvent(new Event('input', { bubbles: true }))
}

function pressField(el: OASEquation, keyName: string): void {
  fieldOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }))
}

function blurField(el: OASEquation): void {
  fieldOf(el).dispatchEvent(new FocusEvent('blur', { relatedTarget: document.body }))
}

describe('OASEquation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('普通文本原样渲染', () => {
    const el = mount({ code: 'x + y' })
    expect(eqOf(el).textContent).toBe('x + y')
  })

  it('上标 x^2 渲染 sup', () => {
    const el = mount({ code: 'x^2' })
    const sup = eqOf(el).querySelector('.sup')
    expect(sup!.textContent).toBe('2')
  })

  it('RTL：公式内容锁定 LTR 不镜像，内部间距走逻辑属性', () => {
    const el = mount({ code: 'x^2 + a_i', dir: 'rtl' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // 公式排版不做方向镜像：.equation 显式锁 LTR（覆盖宿主 RTL 继承）
    expect(style).toMatch(/\.equation\s*\{[^}]*direction:\s*ltr/)
    // 上下标/根号间距走逻辑属性（LTR 语境下与原物理值等价，零回归）
    expect(style).toMatch(/\.sup\s*\{[^}]*margin-inline-start:\s*0\.08em/)
    expect(style).toMatch(/\.sub\s*\{[^}]*margin-inline-start:\s*0\.08em/)
    expect(style).toMatch(/\.sqrt::before\s*\{[^}]*margin-inline-end:\s*0\.05em/)
    expect(style).not.toMatch(/\.sup\s*\{[^}]*margin-left/)
    // RTL 下渲染结构正常
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('下标 a_{i} 渲染 sub', () => {
    const el = mount({ code: 'a_{i}' })
    const sub = eqOf(el).querySelector('.sub')
    expect(sub!.textContent).toBe('i')
  })

  it('分数 \\frac{a}{b}', () => {
    const el = mount({ code: '\\frac{a}{b}' })
    const frac = eqOf(el).querySelector('.frac')
    expect(frac!.querySelector('.num')!.textContent).toBe('a')
    expect(frac!.querySelector('.den')!.textContent).toBe('b')
  })

  it('根号 \\sqrt{x}', () => {
    const el = mount({ code: '\\sqrt{x}' })
    const sqrt = eqOf(el).querySelector('.sqrt')
    expect(sqrt!.textContent).toBe('x')
  })

  it('求和带上下限 \\sum_{i=1}^{n}', () => {
    const el = mount({ code: '\\sum_{i=1}^{n}' })
    const op = eqOf(el).querySelector('.op')
    expect(op!.textContent).toContain('i=1')
    expect(op!.textContent).toContain('n')
  })

  it('希腊字母映射 \\alpha → α', () => {
    const el = mount({ code: '\\alpha + \\beta' })
    const text = eqOf(el).textContent!
    expect(text).toContain('α')
    expect(text).toContain('β')
  })

  it('运算符 \\times → ×', () => {
    const el = mount({ code: 'a \\times b' })
    expect(eqOf(el).textContent).toContain('×')
  })

  it('未知命令按字面显示不报错', () => {
    const el = mount({ code: '\\foo{x}' })
    expect(eqOf(el).textContent).toContain('\\foo')
  })

  it('aria-label = 原始 LaTeX', () => {
    const el = mount({ code: '\\frac{1}{2}' })
    expect(eqOf(el).getAttribute('aria-label')).toBe('\\frac{1}{2}')
  })

  it('特殊字符转义防注入', () => {
    const el = mount({ code: '<script>' })
    const eq = eqOf(el)
    expect(eq.querySelector('script')).toBeNull()
    expect(eq.innerHTML).toContain('&lt;')
  })

  it('嵌套：分数内上标/下标', () => {
    const el = mount({ code: '\\frac{x^2}{y_1}' })
    const frac = eqOf(el).querySelector('.frac')!
    expect(frac.querySelectorAll('.sup').length).toBe(1)
    expect(frac.querySelectorAll('.sub').length).toBe(1)
  })

  it('空 code 不报错', () => {
    const el = mount({})
    expect(eqOf(el).textContent).toBe('')
  })

  it('code 更新重新渲染', () => {
    const el = mount({ code: 'x^2' })
    const eq = eqOf(el)
    el.setAttribute('code', '\\alpha')
    expect(eq).toBe(eqOf(el))
    expect(eq.textContent).toContain('α')
  })

  it('display="block" 块级模式：host 属性驱动 scoped CSS（居中独立行）', () => {
    const el = mount({ code: 'x^2', display: 'block' })
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain("[display='block']")
  })

  it('非法 display 值按行内处理（scoped CSS 仅匹配 block）', () => {
    const el = mount({ code: 'x^2', display: 'inline' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain("[display='block']")
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('engine 注入时委托渲染（薄壳模式），code 透传引擎', () => {
    const el = mount({ code: '\\foo{bar}' })
    let received = ''
    el.engine = {
      renderToString: (code: string) => {
        received = code
        return '<span class="engine-mark">ENGINE</span>'
      },
    }
    expect(received).toBe('\\foo{bar}')
    expect(eqOf(el).querySelectorAll('.engine-mark').length).toBe(1)
    expect(eqOf(el).textContent).toBe('ENGINE')
  })

  it('块级模式把 displayMode 透传给引擎', () => {
    const el = mount({ code: 'x', display: 'block' })
    let opts: Record<string, unknown> | undefined
    el.engine = {
      renderToString: (_code: string, options?: Record<string, unknown>) => {
        opts = options
        return 'x'
      },
    }
    expect(opts?.displayMode).toBe(true)
  })

  it('引擎渲染抛错时回退自研子集渲染，不静默空白', () => {
    const el = mount({ code: 'x^2' })
    el.engine = {
      renderToString: () => {
        throw new Error('engine boom')
      },
    }
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('移除/替换 engine 后渲染跟随切换', () => {
    const el = mount({ code: 'x^2' })
    el.engine = { renderToString: () => '<i class="engine-mark">e</i>' }
    expect(eqOf(el).querySelectorAll('.engine-mark').length).toBe(1)
    el.engine = null
    expect(eqOf(el).querySelector('.engine-mark')).toBeNull()
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('非法 engine 对象被忽略（保持自研渲染）', () => {
    const el = mount({ code: 'x^2' })
    // @ts-expect-error 故意注入非法形态
    el.engine = { render: 1 }
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })
})

describe('OASEquation 编辑实时预览（editable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('默认零变化：无 editable 属性时不渲染编辑区，equation 无交互属性', () => {
    const el = mount({ code: 'x^2' })
    expect(editorOf(el)).toBeNull()
    expect(eqOf(el).hasAttribute('tabindex')).toBe(false)
    expect(eqOf(el).hasAttribute('role')).toBe(false)
    // 渲染与现状一致（上标照常渲染）
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('editable 在场：equation 可聚焦（role=button + aria-label），编辑区默认隐藏', () => {
    const el = mount({ code: 'x^2', editable: '' })
    expect(eqOf(el).getAttribute('role')).toBe('button')
    expect(eqOf(el).getAttribute('tabindex')).toBe('0')
    expect(eqOf(el).getAttribute('aria-label')).toBe('编辑公式')
    expect(editorOf(el)?.hidden).toBe(true)
  })

  it('动态移除 editable：编辑区摘除、交互属性清理', () => {
    const el = mount({ code: 'x^2', editable: '' })
    el.removeAttribute('editable')
    expect(editorOf(el)).toBeNull()
    expect(eqOf(el).hasAttribute('tabindex')).toBe(false)
    expect(eqOf(el).hasAttribute('role')).toBe(false)
  })

  it('编辑态中移除 editable：补派 oas-editing(false)（宿主状态机不丢退出通知）', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const events: boolean[] = []
    el.addEventListener('oas-editing', (e) => events.push((e as CustomEvent).detail.editing))
    eqOf(el).click()
    expect(events).toEqual([true])
    el.removeAttribute('editable')
    expect(events).toEqual([true, false])
    expect(editorOf(el)).toBeNull()
  })

  it('点击 / Enter / Space 进入编辑态：编辑区显示、源码回填、聚焦、派发 oas-editing', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const events: boolean[] = []
    el.addEventListener('oas-editing', (e) => events.push((e as CustomEvent).detail.editing))
    eqOf(el).click()
    expect(editorOf(el)!.hidden).toBe(false)
    expect(fieldOf(el).value).toBe('x^2')
    expect(fieldOf(el).getAttribute('aria-label')).toBe('编辑公式源码')
    expect(el.shadowRoot!.activeElement, '编辑框获得焦点').toBe(fieldOf(el))
    expect(events).toEqual([true])
    // 编辑态标注：宿主 data-editing + 预览态标记
    expect(el.hasAttribute('data-editing')).toBe(true)
    expect(eqOf(el).hasAttribute('data-preview')).toBe(true)

    // Enter / Space 同样进入（键盘逃生）
    const el2 = mount({ code: 'y_1', editable: '' })
    eqOf(el2).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(editorOf(el2)!.hidden).toBe(false)
    const el3 = mount({ code: 'y_1', editable: '' })
    eqOf(el3).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(editorOf(el3)!.hidden).toBe(false)
  })

  it('输入实时预览（节流）：预览随输入刷新，code 属性在提交前不变', () => {
    vi.useFakeTimers()
    const el = mount({ code: 'x^2', editable: '' })
    eqOf(el).click()
    type(el, '\\alpha')
    // leading edge：立即渲染一次
    expect(eqOf(el).textContent).toContain('α')
    expect(el.getAttribute('code')).toBe('x^2')
    // 连续输入走 trailing 节流：窗口内不重复渲染，窗口到点带最新值渲染
    type(el, '\\alpha + \\beta')
    type(el, '\\alpha + \\beta + \\gamma')
    vi.advanceTimersByTime(250)
    const text = eqOf(el).textContent!
    expect(text).toContain('α')
    expect(text).toContain('β')
    expect(text).toContain('γ')
    expect(el.getAttribute('code'), '提交前受控值不变').toBe('x^2')
  })

  it('Enter 提交：写回 code 属性 + 派发 oas-change + 退出编辑态 + 焦点归还', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const changes: string[] = []
    const events: boolean[] = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail.value))
    el.addEventListener('oas-editing', (e) => events.push((e as CustomEvent).detail.editing))
    eqOf(el).click()
    type(el, 'a^2 + b^2')
    pressField(el, 'Enter')
    expect(el.getAttribute('code')).toBe('a^2 + b^2')
    expect(changes).toEqual(['a^2 + b^2'])
    expect(editorOf(el)!.hidden).toBe(true)
    expect(el.hasAttribute('data-editing')).toBe(false)
    expect(eqOf(el).hasAttribute('data-preview')).toBe(false)
    expect(events).toEqual([true, false])
    expect(el.shadowRoot!.activeElement, '焦点归还 equation 容器').toBe(eqOf(el))
    // 提交后按新值渲染（a^2 + b^2 两处上标）
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(2)
  })

  it('失焦提交：blur 视同提交（焦点移出组件）', () => {
    const el = mount({ code: 'x^2', editable: '' })
    eqOf(el).click()
    type(el, '\\beta')
    blurField(el)
    expect(el.getAttribute('code')).toBe('\\beta')
    expect(editorOf(el)!.hidden).toBe(true)
  })

  it('Esc 取消：恢复原值显示 + 派发 oas-cancel，code 属性不被写入', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const cancels: string[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-cancel', (e) => cancels.push((e as CustomEvent).detail.value))
    el.addEventListener('oas-change', (e) => changes.push(e))
    eqOf(el).click()
    type(el, '\\gamma')
    pressField(el, 'Escape')
    expect(el.getAttribute('code'), '受控值不被写入').toBe('x^2')
    expect(cancels).toEqual(['x^2'])
    expect(changes).toHaveLength(0)
    expect(editorOf(el)!.hidden).toBe(true)
    // 显示恢复为原值渲染
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('提交值未变化时不派发 oas-change', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const changes: unknown[] = []
    el.addEventListener('oas-change', (e) => changes.push(e))
    eqOf(el).click()
    pressField(el, 'Enter')
    expect(changes).toHaveLength(0)
    expect(editorOf(el)!.hidden).toBe(true)
  })

  it('渲染失败回退显示源码 + 一次性 devWarn（同源码不重复告警）', () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ code: 'x^2', editable: '' })
    el.engine = {
      renderToString: () => {
        throw new Error('engine boom')
      },
    }
    eqOf(el).click()
    type(el, '\\badcmd')
    // 预览回退为源码显示（非引擎产物非自研渲染）
    expect(eqOf(el).textContent).toContain('\\badcmd')
    expect(warn).toHaveBeenCalledTimes(1)
    // 同一失败源码再次渲染不重复告警
    type(el, '\\badcmd')
    vi.advanceTimersByTime(250)
    expect(warn).toHaveBeenCalledTimes(1)
    // 不同失败源码再告警一次
    type(el, '\\othercmd')
    vi.advanceTimersByTime(250)
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('value 双通道：编辑中读实时文本，非编辑态读 code；写入反射 code 属性', () => {
    const el = mount({ code: 'x^2', editable: '' })
    expect(el.value).toBe('x^2')
    eqOf(el).click()
    type(el, 'a^2')
    expect(el.value, '编辑中读内部输入框实时文本').toBe('a^2')
    pressField(el, 'Escape')
    expect(el.value, '取消后回落受控值').toBe('x^2')
    el.value = 'c^3'
    expect(el.getAttribute('code')).toBe('c^3')
    expect(eqOf(el).querySelectorAll('.sup').length).toBe(1)
  })

  it('键盘可达：editable 焦点环样式存在（focus-visible 走 --oas-focus-ring）', () => {
    const el = mount({ code: 'x^2', editable: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/\[editable\][^{]*\.equation:focus-visible\s*\{[^}]*--oas-focus-ring/)
  })
})
