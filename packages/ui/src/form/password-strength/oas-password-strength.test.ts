import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASPasswordStrength, scorePassword } from './index.js'
import '../input/index.js'

type OASInput = import('../input/oas-input.js').OASInput

function mount(attrs: Record<string, string> = {}): OASPasswordStrength {
  const el = new OASPasswordStrength()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function bar(el: OASPasswordStrength): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
}

function labelEl(el: OASPasswordStrength): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
}

function segments(el: OASPasswordStrength): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="segment"]')]
}

function styleText(el: OASPasswordStrength): string {
  return el.shadowRoot!.querySelector('style')!.textContent ?? ''
}

/** bar 的 meter aria 通道（role/valuemin/valuemax/valuenow/aria-label 全部承载在 bar 上，host 不挂） */
function barAria(el: OASPasswordStrength): { now: string | null; label: string | null } {
  const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
  return { now: bar.getAttribute('aria-valuenow'), label: bar.getAttribute('aria-label') }
}

/** 强密码：13 位、4 类字符、无弱口令片段、无连续段（内置评分为 4） */
const STRONG_PWD = 'MyStr0ng!Pass'
/** 中等密码：11 位、4 类字符（内置评分为 3） */
const MEDIUM_PWD = 'Tr0ub4dor&3'

/** 挂原生密码输入并关联 */
function addPasswordInput(id = 'pwd', value = ''): HTMLInputElement {
  const input = document.createElement('input')
  input.id = id
  input.type = 'password'
  if (value) input.value = value
  document.body.appendChild(input)
  return input
}

/** 模拟用户输入：写值 + 派发 composed input 事件 */
function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

/** MutationObserver / slotchange 回调在宏任务后，等一个宏任务 */
function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

describe('scorePassword（内置评分纯函数）', () => {
  it('空串 = 0', () => {
    expect(scorePassword('')).toBe(0)
  })

  it('弱口令表精确命中 = 0（小写比对）', () => {
    expect(scorePassword('123456')).toBe(0)
    expect(scorePassword('password')).toBe(0)
    expect(scorePassword('qwerty')).toBe(0)
    expect(scorePassword('letmein')).toBe(0)
    expect(scorePassword('PASSWORD')).toBe(0)
  })

  it('弱口令表只认精确命中：弱口令本体 = 0，强口令含弱词片段不得清零', () => {
    // 精确命中（含大小写归一）→ 0
    expect(scorePassword('password')).toBe(0)
    expect(scorePassword('PASSWORD')).toBe(0)
    // 弱口令加尾巴不再清零：熵由长度/类别分自然刻画
    expect(scorePassword('password1!')).toBe(3)
    expect(scorePassword('letmein123')).toBe(2)
    // 回归：强口令内含弱词片段（passw0rd）不得误判最弱——浏览器实测发现的误杀
    expect(scorePassword('Str0ng!Passw0rd')).toBe(4)
    expect(scorePassword('xwelcome1Y!z')).toBe(4)
  })

  it('短而弱的组合 = 0（无长度基础分）', () => {
    expect(scorePassword('abc')).toBe(0)
    expect(scorePassword('1234')).toBe(0)
  })

  it('全同字符压到 ≤1（aaaaaa / aaaaaaaaaa）', () => {
    expect(scorePassword('aaaaaa')).toBe(0)
    expect(scorePassword('aaaaaaaaaa')).toBe(1)
  })

  it('连续字符段压分（≥5 位升降序，上限 2）', () => {
    expect(scorePassword('Xy123459')).toBe(2)
    expect(scorePassword('Abc!23456')).toBe(2)
  })

  it('中等强度（长度 + 多样性）', () => {
    expect(scorePassword(MEDIUM_PWD)).toBe(3)
  })

  it('强密码（长且多样）= 4', () => {
    expect(scorePassword(STRONG_PWD)).toBe(4)
    expect(scorePassword('Xk9$mQ2#vL8@')).toBe(4)
  })

  it('CJK 字符计独立类别且按 3 计有效长：纯中文长口令不被公式系统性压弱', () => {
    // 回归：CJK 曾全数计入「符号」一类且按 1 计长，14 字纯中文口令恒 1 分
    expect(scorePassword('这是一个非常长的中文密码口令')).toBe(3)
    expect(scorePassword('正确马电池钉2024')).toBe(4)
    expect(scorePassword('パスワード設定')).toBe(3)
  })

  it('重复密码同样弱（abcdef 连续段）', () => {
    expect(scorePassword('abcdefgh')).toBe(1)
  })
})

describe('OASPasswordStrength 默认渲染与 a11y', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('bar 承载 role=meter + aria-valuenow/min/max（host 保持 generic）', () => {
    const el = mount()
    const bar = el.shadowRoot!.querySelector('[part="bar"]')!
    expect(bar.getAttribute('role')).toBe('meter')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('4')
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    expect(bar.getAttribute('aria-label')).toBe('很弱')
    // host 不承载指示角色：slot 内嵌输入与 bar 是 flat tree 兄弟，不会被 meter 子内容展平吞掉
    expect(el.getAttribute('role'), 'host 不挂 role=meter（回归：nested-interactive）').toBeNull()
    expect(el.getAttribute('aria-valuenow'), 'host 不挂 aria-valuenow').toBeNull()
  })

  it('渲染 4 段分段条，part 齐全（bar/segment/label）', () => {
    const el = mount()
    expect(segments(el).length).toBe(4)
    expect(bar(el).getAttribute('part')).toBe('bar')
    expect(labelEl(el).getAttribute('part')).toBe('label')
    expect(labelEl(el).tagName.toLowerCase()).toBe('span')
  })

  it('空值档：全段未点亮 + data-level=neutral', () => {
    const el = mount()
    expect(segments(el).every((s) => !s.classList.contains('filled'))).toBe(true)
    expect(bar(el).getAttribute('data-level')).toBe('neutral')
  })

  it('show-label 缺省时档位文案隐藏', () => {
    const el = mount()
    expect(labelEl(el).hidden).toBe(true)
  })

  it('STYLE 颜色只走 --oas-color-* token（无 hex/rgb 字面量）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).toContain('--oas-color-danger')
    expect(css).toContain('--oas-color-warning')
    expect(css).toContain('--oas-color-success')
  })

  it('档位文案用 -text 文字安全 token（回归：实色 success/warning 浅底 <4.5:1 被 axe 判 serious）', () => {
    const el = mount()
    const css = styleText(el)
    // 文案色必须走文字安全 token；分段填充仍用实色 token
    expect(css).toMatch(/\.label\[data-level='success'\]\s*\{\s*color:\s*var\(--oas-color-success-text\)/)
    expect(css).toMatch(/\.label\[data-level='warning'\]\s*\{\s*color:\s*var\(--oas-color-warning-text\)/)
    expect(css).toMatch(/\.label\[data-level='danger'\]\s*\{\s*color:\s*var\(--oas-color-danger-text\)/)
    expect(css).toMatch(/\.segment\.filled\s*\{\s*background:\s*var\(--oas-color-danger\)/)
  })
})

describe('for 关联', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('for 指向原生 input：输入实时评分（aria-valuenow + 分段点亮）', async () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd', 'show-label': '' })
    typeInto(document.getElementById('pwd') as HTMLInputElement, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
    expect(barAria(el).label).toBe('很强')
    expect(segments(el).filter((s) => s.classList.contains('filled')).length).toBe(4)
    expect(bar(el).getAttribute('data-level')).toBe('success')
  })

  it('目标带初始 value：挂载后即评分', () => {
    addPasswordInput('pwd', MEDIUM_PWD)
    const el = mount({ for: 'pwd' })
    expect(barAria(el).now).toBe('3')
  })

  it('for 指向 oas-input type=password：内部原生输入驱动评分（真实承载联测）', () => {
    const carrier = document.createElement('oas-input') as OASInput
    carrier.setAttribute('type', 'password')
    carrier.setAttribute('id', 'carrier-pwd')
    document.body.appendChild(carrier)
    const el = mount({ for: 'carrier-pwd' })
    const inner = carrier.shadowRoot!.querySelector<HTMLInputElement>('input')!
    typeInto(inner, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
  })

  it('档位分色：1 danger / 2 warning / 3 success', () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    const input = document.getElementById('pwd') as HTMLInputElement
    typeInto(input, 'abcde1')
    expect(barAria(el).now).toBe('1')
    expect(bar(el).getAttribute('data-level')).toBe('danger')
    typeInto(input, 'Xy123459') // 含连续数字段 → 上限 2
    expect(barAria(el).now).toBe('2')
    expect(bar(el).getAttribute('data-level')).toBe('warning')
    typeInto(input, MEDIUM_PWD)
    expect(barAria(el).now).toBe('3')
    expect(bar(el).getAttribute('data-level')).toBe('success')
  })

  it('目标被移除：监听清理不再报错，分数回落 0', async () => {
    const input = addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
    input.remove()
    await flush()
    expect(barAria(el).now).toBe('0')
    // 已移除元素上的后续输入不再影响指示条且不抛错
    expect(() => typeInto(input, 'whatever1!')).not.toThrow()
    expect(barAria(el).now).toBe('0')
  })

  it('目标晚挂载：MutationObserver 重解析后自动关联', async () => {
    const el = mount({ for: 'late-pwd' })
    expect(barAria(el).now).toBe('0')
    const input = addPasswordInput('late-pwd')
    await flush()
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
  })

  it('for 指向非密码输入（type=text）：不建立关联', () => {
    const input = document.createElement('input')
    input.id = 'not-pwd'
    input.type = 'text'
    document.body.appendChild(input)
    const el = mount({ for: 'not-pwd' })
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('0')
  })
})

describe('slot 自动发现', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 slot 内 input[type=password] 自动发现并评分', async () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    await flush()
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
  })

  it('slot 内 type=text 输入不被发现', async () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'text'
    el.appendChild(input)
    await flush()
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('0')
  })

  it('slot 内容后插入（slotchange）：动态发现', async () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    await flush()
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
    // 移除后 slotchange 再同步：监听摘除、分数回落
    input.remove()
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    await flush()
    expect(barAria(el).now).toBe('0')
    expect(() => typeInto(input, STRONG_PWD)).not.toThrow()
    expect(barAria(el).now).toBe('0')
  })

  it('slot 内 oas-input type=password 自动发现（承载组件联测）', async () => {
    const el = mount()
    const carrier = document.createElement('oas-input') as OASInput
    carrier.setAttribute('type', 'password')
    el.appendChild(carrier)
    await flush()
    const inner = carrier.shadowRoot!.querySelector<HTMLInputElement>('input')!
    typeInto(inner, MEDIUM_PWD)
    expect(barAria(el).now).toBe('3')
  })

  it('for 与 slot 同时可用：for 精确关联优先', async () => {
    const outerInput = addPasswordInput('outer-pwd')
    const el = mount({ for: 'outer-pwd' })
    const slotInput = document.createElement('input')
    slotInput.type = 'password'
    el.appendChild(slotInput)
    await flush()
    typeInto(slotInput, STRONG_PWD)
    expect(barAria(el).now).toBe('0')
    typeInto(outerInput, MEDIUM_PWD)
    expect(barAria(el).now).toBe('3')
  })
})

describe('level 受控', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('level 在场：分数由宿主给，输入不改变显示', () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd', level: '2' })
    typeInto(document.getElementById('pwd') as HTMLInputElement, STRONG_PWD)
    expect(barAria(el).now).toBe('2')
    expect(segments(el).filter((s) => s.classList.contains('filled')).length).toBe(2)
    expect(bar(el).getAttribute('data-level')).toBe('warning')
  })

  it('level 在场：不派发 oas-score-change', () => {
    const el = mount({ level: '1' })
    const events: unknown[] = []
    el.addEventListener('oas-score-change', (e) => events.push((e as CustomEvent).detail))
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    typeInto(input, STRONG_PWD)
    expect(events).toEqual([])
  })

  it('level 越界钳制 0–4；非法值按 0 + 一次性告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const high = mount({ level: '9' })
      expect(barAria(high).now).toBe('4')
      const low = mount({ level: '-1' })
      expect(barAria(low).now).toBe('0')
      const bad = mount({ level: 'abc' })
      expect(barAria(bad).now).toBe('0')
      expect(warnSpy.mock.calls.filter((args) => String(args[0]).includes('非法 level')).length).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('移除 level：恢复自动计算并派发当前分数', () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd', level: '0' })
    const events: number[] = []
    el.addEventListener('oas-score-change', (e) => events.push((e as CustomEvent).detail.score))
    typeInto(document.getElementById('pwd') as HTMLInputElement, MEDIUM_PWD)
    expect(events).toEqual([])
    el.removeAttribute('level')
    expect(barAria(el).now).toBe('3')
    expect(events).toEqual([3])
  })
})

describe('levels 文案覆盖', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('levels JSON 数组覆盖五档文案（show-label 可见）', () => {
    addPasswordInput('pwd')
    const el = mount({
      for: 'pwd',
      'show-label': '',
      levels: JSON.stringify(['太弱', '较弱', '中等', '较强', '很强']),
    })
    const input = document.getElementById('pwd') as HTMLInputElement
    typeInto(input, STRONG_PWD)
    expect(labelEl(el).hidden).toBe(false)
    expect(labelEl(el).textContent).toBe('很强')
    typeInto(input, 'abc')
    expect(labelEl(el).textContent).toBe('太弱')
  })

  it('非法 JSON：回落 i18n 默认 + 一次性告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ 'show-label': '', levels: 'not-json', level: '4' })
      expect(labelEl(el).textContent).toBe('很强')
      expect(warnSpy.mock.calls.filter((args) => String(args[0]).includes('levels')).length).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('长度不足 5：回落 i18n 默认 + 一次性告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ 'show-label': '', levels: JSON.stringify(['a', 'b']), level: '0' })
      expect(labelEl(el).textContent).toBe('很弱')
      expect(warnSpy.mock.calls.filter((args) => String(args[0]).includes('levels')).length).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('缺省文案走 i18n（zh-CN 五档）', () => {
    const el = mount({ 'show-label': '', level: '2' })
    expect(labelEl(el).textContent).toBe('一般')
  })
})

describe('score-fn 自定义评分（JS property）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('设置后完全接管：任意输入按自定义函数映射', () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    el.scoreFn = () => 2
    typeInto(input, 'a')
    expect(barAria(el).now).toBe('2')
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('2')
  })

  it('返回值越界钳制 0–4', () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    el.scoreFn = () => 9
    typeInto(input, 'a')
    expect(barAria(el).now).toBe('4')
    el.scoreFn = () => -3
    typeInto(input, 'ab')
    expect(barAria(el).now).toBe('0')
  })

  it('置 null 恢复内置评分', () => {
    const el = mount()
    const input = document.createElement('input')
    input.type = 'password'
    el.appendChild(input)
    el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
    el.scoreFn = () => 1
    typeInto(input, 'a')
    expect(barAria(el).now).toBe('1')
    el.scoreFn = null
    expect(barAria(el).now).toBe('0')
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
  })

  it('score-fn 抛错：回落内置评分 + 一次性告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const input = document.createElement('input')
      input.type = 'password'
      el.appendChild(input)
      el.shadowRoot!.querySelector('slot')!.dispatchEvent(new Event('slotchange'))
      el.scoreFn = () => {
        throw new Error('boom')
      }
      typeInto(input, STRONG_PWD)
      expect(barAria(el).now).toBe('4')
      expect(warnSpy.mock.calls.filter((args) => String(args[0]).includes('score-fn')).length).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('show-label 与事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('show-label 显示当前档位文案并随档位分色', () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd', 'show-label': '' })
    const input = document.getElementById('pwd') as HTMLInputElement
    typeInto(input, STRONG_PWD)
    expect(labelEl(el).hidden).toBe(false)
    expect(labelEl(el).textContent).toBe('很强')
    expect(labelEl(el).getAttribute('data-level')).toBe('success')
    typeInto(input, 'abcde1') // 含连续段 → 1 分「弱」
    expect(labelEl(el).textContent).toBe('弱')
    expect(labelEl(el).getAttribute('data-level')).toBe('danger')
  })

  it('oas-score-change：detail { score, label }，仅分数变化时派发', () => {
    addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    const events: Array<{ score: number; label: string }> = []
    el.addEventListener('oas-score-change', (e) => events.push((e as CustomEvent).detail))
    const input = document.getElementById('pwd') as HTMLInputElement
    typeInto(input, '123456') // 弱口令 = 0，与初始分相同 → 不派发
    expect(events).toEqual([])
    typeInto(input, MEDIUM_PWD)
    expect(events).toEqual([{ score: 3, label: '强' }])
    typeInto(input, `${MEDIUM_PWD.slice(0, 10)}x`) // 仍 11 位 4 类 = 3，同分不重发
    expect(events).toEqual([{ score: 3, label: '强' }])
    typeInto(input, STRONG_PWD)
    expect(events).toEqual([
      { score: 3, label: '强' },
      { score: 4, label: '很强' },
    ])
  })

  it('事件 bubbles + composed（可穿出 shadow）', () => {
    const input = addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    let composed = false
    let bubbles = false
    document.body.addEventListener(
      'oas-score-change',
      ((e: Event) => {
        composed = e.composed
        bubbles = e.bubbles
      }) as EventListener,
      { once: true },
    )
    typeInto(input, STRONG_PWD) // 非受控：0 → 4 派发
    expect(composed).toBe(true)
    expect(bubbles).toBe(true)
  })
})

describe('取消路径与生命周期', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('组件断开重连：目标关联恢复，输入仍驱动评分', async () => {
    const input = addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    typeInto(input, STRONG_PWD)
    expect(barAria(el).now).toBe('4')
    el.remove()
    await flush()
    document.body.appendChild(el)
    await flush()
    typeInto(input, MEDIUM_PWD)
    expect(barAria(el).now).toBe('3')
  })

  it('断开期间输入不派发事件', () => {
    const input = addPasswordInput('pwd')
    const el = mount({ for: 'pwd' })
    let count = 0
    el.addEventListener('oas-score-change', () => count++)
    el.remove()
    typeInto(input, STRONG_PWD)
    // 元素已断开：监听已随 onCleanup 摘除，宿主再派发也不再有事件出口
    typeInto(input, 'abcde1x')
    expect(count).toBe(0)
  })
})
