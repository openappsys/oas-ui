import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-number-keyboard —— 数字键盘（form 族，移动端输入辅助件）。
 *
 * 场景：验证码 / 金额 / 车牌号等只需要数字与少量字母的输入。组件自身不承载输入框，
 * 而是把按键事件交给宿主（`oas-input` / `oas-delete` / `oas-done`），宿主把它写进目标控件。
 *
 * 属性（kebab-case）：
 * - `value`：当前值（受控）。组件按键会写回本属性并派发 `oas-input`；宿主改写即时同步
 * - `maxlength`：长度上限（按字符计数，支持中文省份简称）；缺省/0 = 不限
 * - `random`：布尔，数字键随机乱序（安全键盘）；切换时重新排列，随机源可被 `randomize()` 刷新
 * - `layout`：`number`（默认）/ `plate`（车牌号布局：省份简称 + 字母 + 数字）；非法值回落 number
 * - `disabled`：禁用（按键禁用、不派发事件）
 * - `readonly`：只读（按键可聚焦但不改动 value，仍可派发 `oas-done`）
 *
 * 事件（bubbles + composed）：
 * - `oas-input`：追加一个字符，`detail: { value, key }`
 * - `oas-delete`：删除末位（值为空时不派发），`detail: { value }`
 * - `oas-done`：完成键，`detail: { value }`
 *
 * a11y：容器 `role="group"` + 可读名称；按键为原生 `<button>`（Tab / Enter / Space 可达）；
 * 组件内聚焦时支持物理键盘输入（数字 / 字母 / Backspace）。删除与完成键带 i18n aria-label。
 */

type KeyboardLayout = 'number' | 'plate'

const VALID_LAYOUTS: readonly string[] = ['number', 'plate']

/** 数字键（1-9 / 0，与移动端键盘一致的排布顺序） */
const DIGITS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

/** 车牌字母（不含 I / O：与车牌号字符集一致） */
const PLATE_LETTERS: readonly string[] = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')

/** 省份简称（车牌首位） */
const PROVINCES: readonly string[] = [
  '京',
  '津',
  '沪',
  '渝',
  '冀',
  '豫',
  '云',
  '辽',
  '黑',
  '湘',
  '皖',
  '鲁',
  '新',
  '苏',
  '浙',
  '赣',
  '鄂',
  '桂',
  '甘',
  '晋',
  '蒙',
  '陕',
  '吉',
  '闽',
  '贵',
  '粤',
  '青',
  '藏',
  '川',
  '宁',
  '琼',
]

/** 非法枚举值告警去重（同值只 warn 一次） */
const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    devWarn(msg)
  }
}

/** Fisher-Yates 洗牌（返回新数组） */
function shuffle(list: readonly string[]): string[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

const STYLE = `
:host {
  display: block;
  width: 100%;
  max-width: 360px;
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.kb {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
  max-width: 360px;
  padding: var(--oas-space-2);
  background: var(--oas-color-bg-elevated);
  border-radius: var(--oas-radius-lg);
  box-sizing: border-box;
}
.letters,
.provinces {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: var(--oas-space-1);
}
.letters[hidden],
.provinces[hidden] {
  display: none;
}
.pad {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--oas-space-2);
}
.key {
  appearance: none;
  box-sizing: border-box;
  min-width: var(--oas-touch-target-min);
  min-height: var(--oas-touch-target-min);
  padding: 0 var(--oas-space-1);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-xl);
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.key:hover {
  background: var(--oas-color-bg-hover);
}
.key:active {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border-strong);
}
.key:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.key:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
  border-color: transparent;
}
/* 车牌字母/省份键更紧凑（8 列宫格） */
.letters .key,
.provinces .key {
  min-width: 0;
  min-height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-md);
}
/* 功能键（删除 / 完成）：竖跨两行，视觉上与数字区分 */
.key[data-action='delete'],
.key[data-action='done'] {
  grid-column: 4;
  font-size: var(--oas-font-size-md);
}
.key[data-action='delete'] {
  grid-row: 1 / span 2;
  color: var(--oas-color-text-secondary);
}
.key[data-action='done'] {
  grid-row: 3 / span 2;
  color: var(--oas-color-text-on-primary);
  background: var(--oas-color-primary);
  border-color: transparent;
}
.key[data-action='done']:hover {
  background: var(--oas-color-primary-hover);
}
.key[data-action='done']:active {
  background: var(--oas-color-primary-active);
}
.key[data-action='done']:disabled {
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
}
.key-zero {
  grid-column: 1 / span 3;
  grid-row: 4;
}
.plate-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.province-key {
  min-height: var(--oas-control-height-lg);
  min-width: var(--oas-touch-target-min);
  padding: 0 var(--oas-space-3);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-primary-text);
  border-color: var(--oas-color-primary);
}
.provinces .key[aria-pressed='true'] {
  color: var(--oas-color-text-on-primary);
  background: var(--oas-color-primary);
  border-color: transparent;
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .key:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

export class OASNumberKeyboard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'maxlength', 'random', 'layout', 'disabled', 'readonly']
  }

  private kbEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null
  private provincesEl: HTMLElement | null = null
  private lettersEl: HTMLElement | null = null
  private provinceKeyEl: HTMLButtonElement | null = null

  /** 当前数字键顺序（random 开启时洗牌；缺省为自然顺序） */
  private digitOrder: string[] = [...DIGITS]
  /** 已构建的布局与随机态指纹：指纹变化才重建按键 DOM（避免输入过程中丢焦点） */
  private builtLayout = ''
  private builtRandom = false
  /** 省份面板是否展开 */
  private provincesOpen = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板（按键由 update 按布局生成） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="kb" part="keyboard" role="group" aria-label="">
        <div class="plate-head" part="plate-head" hidden></div>
        <div class="letters" part="letters" hidden></div>
        <div class="provinces" part="provinces" hidden></div>
        <div class="body" part="body"></div>
      </div>
    `
  }

  private bind(): void {
    this.kbEl = this.shadow.querySelector<HTMLElement>('[part="keyboard"]')
    this.bodyEl = this.shadow.querySelector<HTMLElement>('[part="body"]')
    this.lettersEl = this.shadow.querySelector<HTMLElement>('[part="letters"]')
    this.provincesEl = this.shadow.querySelector<HTMLElement>('[part="provinces"]')
    this.kbEl?.addEventListener('click', this.onClick)
    this.kbEl?.addEventListener('keydown', this.onKeydown)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    const kb = this.kbEl
    if (!kb) return

    const layout = this.resolveLayout()
    const random = this.hasAttr('random')
    // 布局/随机态切换才重建按键 DOM；纯粹 value 变化不重建（不抢焦点）
    if (layout !== this.builtLayout || random !== this.builtRandom) {
      this.digitOrder = random ? shuffle(DIGITS) : [...DIGITS]
      this.builtLayout = layout
      this.builtRandom = random
      this.buildKeys(layout)
    }

    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')

    kb.setAttribute('data-layout', layout)
    kb.setAttribute('aria-label', this.t('numberKeyboard.label'))
    if (disabled) kb.setAttribute('aria-disabled', 'true')
    else kb.removeAttribute('aria-disabled')
    if (readonly) kb.setAttribute('aria-readonly', 'true')
    else kb.removeAttribute('aria-readonly')

    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="key"]')) {
      btn.disabled = disabled
    }
    // 删除键的可读名称随 locale 变化刷新
    const del = this.shadow.querySelector<HTMLButtonElement>('[data-action="delete"]')
    if (del) del.setAttribute('aria-label', this.t('numberKeyboard.delete'))
    const done = this.shadow.querySelector<HTMLButtonElement>('[data-action="done"]')
    if (done) done.textContent = this.t('numberKeyboard.done')
    if (this.provinceKeyEl) this.syncProvinceKey()
  }

  /** 键盘布局：非法值回落 number 并单次告警 */
  private resolveLayout(): KeyboardLayout {
    const raw = this.getAttr('layout', 'number') || 'number'
    if (VALID_LAYOUTS.includes(raw)) return raw as KeyboardLayout
    warnOnce(`[oas-number-keyboard] 非法 layout "${raw}"，已回落 number；合法值：number/plate`)
    return 'number'
  }

  /** 构建按键 DOM（布局切换时整体重建；按键顺序取当前 digitOrder） */
  private buildKeys(layout: KeyboardLayout): void {
    const body = this.bodyEl
    if (!body) return
    body.innerHTML = ''
    const plate = layout === 'plate'

    if (this.lettersEl) {
      this.lettersEl.hidden = !plate || this.provincesOpen
      this.lettersEl.innerHTML = ''
      if (plate) for (const letter of PLATE_LETTERS) this.lettersEl.appendChild(this.createKey(letter, letter))
    }

    if (this.provincesEl) {
      this.provincesEl.hidden = !plate || !this.provincesOpen
      this.provincesEl.innerHTML = ''
      if (plate) {
        const current = this.currentProvince()
        for (const name of PROVINCES) {
          const btn = this.createKey(name, name)
          btn.dataset.province = name
          if (name === current) btn.setAttribute('aria-pressed', 'true')
          this.provincesEl.appendChild(btn)
        }
      }
    }

    const head = this.shadow.querySelector<HTMLElement>('[part="plate-head"]')
    if (head) {
      head.hidden = !plate
      head.innerHTML = ''
      if (plate) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'key province-key'
        btn.setAttribute('part', 'key')
        btn.dataset.action = 'province'
        btn.setAttribute('aria-expanded', String(this.provincesOpen))
        head.appendChild(btn)
        this.provinceKeyEl = btn
        this.syncProvinceKey()
      } else {
        this.provinceKeyEl = null
      }
    }

    body.appendChild(this.createPad())
  }

  /** 数字键区：3 列数字 + 右列功能键（删除 / 完成），0 键横跨三列 */
  private createPad(): HTMLElement {
    const pad = document.createElement('div')
    pad.className = 'pad'
    pad.setAttribute('part', 'pad')
    for (const key of this.digitOrder) {
      const btn = this.createKey(key, key)
      if (key === '0') btn.classList.add('key-zero')
      pad.appendChild(btn)
    }
    const del = this.createKey('', this.t('numberKeyboard.delete'))
    del.dataset.action = 'delete'
    del.setAttribute('aria-label', this.t('numberKeyboard.delete'))
    pad.appendChild(del)
    const done = this.createKey('', this.t('numberKeyboard.done'))
    done.dataset.action = 'done'
    pad.appendChild(done)
    return pad
  }

  private createKey(keyValue: string, label: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'key'
    btn.setAttribute('part', 'key')
    if (keyValue !== '') btn.dataset.key = keyValue
    btn.textContent = label
    return btn
  }

  /** 省份键文案：已选省份简称优先，否则 i18n「省份」 */
  private syncProvinceKey(): void {
    const btn = this.provinceKeyEl
    if (!btn) return
    const current = this.currentProvince()
    btn.textContent = current !== '' ? current : this.t('numberKeyboard.province')
    btn.setAttribute('aria-label', current !== '' ? current : this.t('numberKeyboard.province'))
    btn.setAttribute('aria-expanded', String(this.provincesOpen))
  }

  /** 当前值首位命中的省份简称（车牌首位） */
  private currentProvince(): string {
    const value = this.getAttr('value')
    return PROVINCES.find((name) => value.startsWith(name)) ?? ''
  }

  private onClick = (e: Event): void => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('button')
    if (!target || !this.kbEl?.contains(target)) return
    if (this.injectDisabled()) return
    const action = target.dataset.action
    if (action === 'province') {
      this.toggleProvinces()
      return
    }
    if (action === 'delete') {
      this.deleteLast()
      return
    }
    if (action === 'done') {
      this.emit('done', { value: this.getAttr('value') })
      return
    }
    const province = target.dataset.province
    if (province !== undefined) {
      this.appendKey(province)
      this.toggleProvinces(false)
      return
    }
    const key = target.dataset.key
    if (key !== undefined) this.appendKey(key)
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (this.injectDisabled()) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      this.deleteLast()
      return
    }
    const isSingle = [...e.key].length === 1
    if (!isSingle) return
    const plate = this.resolveLayout() === 'plate'
    if (plate && /^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault()
      this.appendKey(e.key.toUpperCase())
      return
    }
    if (!plate && /^[0-9]$/.test(e.key)) {
      e.preventDefault()
      this.appendKey(e.key)
    }
  }

  /** 展开/收起省份面板（同一时刻只显示一种按键区） */
  private toggleProvinces(open?: boolean): void {
    const next = open ?? !this.provincesOpen
    this.provincesOpen = next
    const plate = this.resolveLayout() === 'plate'
    if (this.lettersEl) this.lettersEl.hidden = !plate || next
    if (this.provincesEl) this.provincesEl.hidden = !plate || !next
    this.syncProvinceKey()
  }

  /** 追加一个字符：受 disabled / readonly / maxlength 约束 */
  private appendKey(char: string): void {
    if (this.hasAttr('readonly')) return
    const current = this.getAttr('value')
    const max = this.maxLength()
    if (max > 0 && [...current].length >= max) return
    const next = current + char
    this.setAttribute('value', next)
    this.emit('input', { value: next, key: char })
  }

  /** 删除末位（按码点删除，中文字符不会被截断） */
  private deleteLast(): void {
    if (this.hasAttr('readonly')) return
    const current = this.getAttr('value')
    if (current === '') return
    const next = [...current].slice(0, -1).join('')
    this.setAttribute('value', next)
    this.emit('delete', { value: next })
  }

  /** 长度上限（非法/缺省 = 0，不限） */
  private maxLength(): number {
    const n = Number(this.getAttr('maxlength', '0'))
    return Number.isInteger(n) && n > 0 ? n : 0
  }

  /**
   * 重新洗牌数字键（安全键盘：每次聚焦/提交后可刷新排列）。
   * 仅在已渲染后生效；`random` 属性控制是否在布局切换时自动洗牌。
   */
  randomize(): void {
    if (!this.hasRendered) return
    this.digitOrder = shuffle(DIGITS)
    this.buildKeys(this.resolveLayout())
    this.update()
  }
}
