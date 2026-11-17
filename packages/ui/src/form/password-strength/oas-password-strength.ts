import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * 自定义评分函数（JS property `scoreFn`）：入参密码串，返回 0–4 五档分数。
 * 设置后完全接管内置评分（受控 `level` 属性在场时仍以宿主给值为准）。
 */
export type PasswordScoreFn = (password: string) => number

/**
 * 内置常见弱口令表（原创整理的高频弱口令小写集合，约 50 条，不抄第三方字典）：
 * 密码串小写归一后**精确命中**时分数压到 0。不认子串——强口令内含弱词片段
 * （`Str0ng!Passw0rd` 含 `passw0rd`）不应被清零。弱口令加尾巴/分隔符可能逃出
 * 本表（如 `q w e r t y 1`）——已知边界，强约束场景请用 `score-fn` 整体接管。
 */
const WEAK_PASSWORDS: readonly string[] = [
  // 纯数字序列
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '123123',
  '112233',
  '111111',
  '000000',
  '121212',
  '654321',
  // password 词族
  'password',
  'password1',
  'password123',
  'passw0rd',
  'passwd',
  // 键盘走位
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'qazwsx',
  'asdfgh',
  'zxcvbn',
  '1q2w3e4r',
  '1qaz2wsx',
  'zaq12wsx',
  // 组合常见
  'abc123',
  'abcd1234',
  '123qwe',
  '1234qwer',
  'a123456',
  'hello123',
  'test123',
  'test1234',
  // 习语与站点词
  'letmein',
  'welcome',
  'welcome1',
  'iloveyou',
  'sunshine',
  'princess',
  'dragon',
  'monkey',
  'football',
  'baseball',
  'superman',
  'batman',
  'trustno1',
  'shadow',
  // 账号系统词
  'admin',
  'admin123',
  'administrator',
  'login',
  'guest',
  'root',
  'master',
]

/** 视觉分段数：五档（0–4）映射 4 段（空档 0 段点亮） */
const SEGMENT_COUNT = 4
/** 连续字符段惩罚的最小段长（如 12345 / abcde） */
const SEQUENTIAL_RUN_MIN = 5
/** 全同字符惩罚的最小长度（如 aaaaaa） */
const REPETITIVE_MIN = 5

/** 非法枚举/配置值告警去重（同文案只 warn 一次） */
const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    devWarn(msg)
  }
}

/**
 * 内置评分（原创实现，0–4 五档）：
 * - 长度三档：有效长度 ≥8 / ≥12 / ≥20 各 +1（CJK 每字按 3 计有效长——表意文字信息熵高）
 * - 类别多样性：小写/大写/数字/符号/CJK 五类，≥2 类 +1、≥3 类再 +1
 * 惩罚：弱口令**精确命中**（小写归一）→ 0；全同字符 → 上限 1；连续升降序段 → 上限 2
 * 弱口令只认精确命中不认子串：强口令内含弱词片段（如 `Str0ng!Passw0rd` 含 `passw0rd`）
 * 不应被清零——熵由长度/类别分自然刻画，子串清零会误杀好口令
 */
export function scorePassword(password: string): number {
  const raw = String(password ?? '')
  if (raw === '') return 0
  if (isWeakPassword(raw)) return 0
  const chars = Array.from(raw)
  const classes = countCharClasses(raw)
  const effLength = chars.reduce((n, ch) => n + (isCjk(ch) ? 3 : 1), 0)
  let points = 0
  if (effLength >= 8) points += 1
  if (effLength >= 12) points += 1
  if (effLength >= 20) points += 1
  if (classes >= 2) points += 1
  if (classes >= 3) points += 1
  let score = Math.max(0, Math.min(4, points))
  if (isRepetitive(chars)) score = Math.min(score, 1)
  if (hasSequentialRun(chars, SEQUENTIAL_RUN_MIN)) score = Math.min(score, 2)
  return score
}

/** 弱口令命中：小写归一后的精确命中（不查子串——子串清零会误杀强口令，见文件头口径） */
function isWeakPassword(password: string): boolean {
  return WEAK_PASSWORDS.includes(password.toLowerCase())
}

/** 字符类别计数：小写 / 大写 / 数字 / 符号 / CJK（CJK 文字计独立类别，纯中日韩口令不被公式系统性压弱） */
function countCharClasses(password: string): number {
  let lower = false
  let upper = false
  let digit = false
  let symbol = false
  let cjk = false
  for (const ch of password) {
    if (ch >= 'a' && ch <= 'z') lower = true
    else if (ch >= 'A' && ch <= 'Z') upper = true
    else if (ch >= '0' && ch <= '9') digit = true
    else if (isCjk(ch)) cjk = true
    else symbol = true
  }
  return Number(lower) + Number(upper) + Number(digit) + Number(symbol) + Number(cjk)
}

/** CJK 文字：中日韩统一表意文字 / 日文假名 / 韩文音节（独立计类，不再混入符号） */
function isCjk(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xac00 && cp <= 0xd7af)
}

/** 全同字符判定：长度 ≥5 且只含一种字符（如 aaaaaa） */
function isRepetitive(chars: string[]): boolean {
  return chars.length >= REPETITIVE_MIN && new Set(chars).size === 1
}

/** 是否含 ≥minRun 位连续升/降序字符段（如 12345 / fedcba） */
function hasSequentialRun(chars: string[], minRun: number): boolean {
  if (chars.length < minRun) return false
  let run = 1
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1]?.codePointAt(0) ?? 0
    const curr = chars[i]?.codePointAt(0) ?? 0
    const delta = curr - prev
    if (delta === 1 || delta === -1) {
      run += 1
      if (run >= minRun) return true
    } else {
      run = 1
    }
  }
  return false
}

/** 分数钳制：非有限数按 0，越界钳 0–4，小数就近取整 */
function clampScore(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(4, Math.round(n)))
}

/** 分档 → 视觉档位名（bar/label data-level）：空档 neutral、1 danger、2 warning、3/4 success */
function levelName(score: number): string {
  if (score <= 0) return 'neutral'
  if (score === 1) return 'danger'
  if (score === 2) return 'warning'
  return 'success'
}

/**
 * 视觉样式：4 段分段条 + 档位文案。
 * 颜色全部走 `--oas-color-*` token（暗色/高对比主题自动正确）；间距全走 `--oas-space-*`。
 * 分段填充用状态实色 token（非文字图形，≥3:1 达 WCAG 1.4.11）；档位文案用 `-text`
 * 文字安全 token（13px 小字对白底 ≥4.5:1 达 WCAG 1.4.3，实色 success/warning 在浅底不达标）。
 */
const PASSWORD_STRENGTH_STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  /* 默认宽 12rem；宿主/配方可用 --oas-password-strength-width 覆盖（不改写宿主行内样式） */
  width: var(--oas-password-strength-width, 12rem);
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: var(--oas-space-1);
}
.segment {
  flex: 1;
  height: var(--oas-space-1_5);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  transition: background-color var(--oas-transition-fast) var(--oas-ease-out);
}
.segment.filled {
  background: var(--oas-color-danger);
}
.bar[data-level='warning'] .segment.filled {
  background: var(--oas-color-warning);
}
.bar[data-level='success'] .segment.filled {
  background: var(--oas-color-success);
}
.label {
  flex: none;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
}
.label[data-level='danger'] {
  color: var(--oas-color-danger-text);
}
.label[data-level='warning'] {
  color: var(--oas-color-warning-text);
}
.label[data-level='success'] {
  color: var(--oas-color-success-text);
}
.label[hidden] {
  display: none;
}
@media (forced-colors: active) {
  /* 强制色下作者背景色被系统替换：点亮段回退系统高亮色保持可辨 */
  .segment.filled {
    background-color: Highlight;
  }
}
`

/**
 * oas-password-strength —— 密码强度独立指示条（不包裹输入框）。
 *
 * 关联方式二选一：
 * - `for="<id>"` 精确关联（同根节点内 getElementById；目标可以是原生 input[type=password]
 *   或 oas-input 等承载 password 输入的组件）；
 * - 缺省在 default slot 内自动发现 `[type=password]` 输入（含承载组件）。
 * 目标解析有变化时自动换绑 input 监听（根节点 childList MutationObserver 兜底）。
 *
 * 分数优先级：`level` 受控（宿主给值，不派发事件）> `scoreFn` property（完全接管）> 内置评分。
 */
export class OASPasswordStrength extends OASElement {
  static override get observedAttributes(): string[] {
    return ['for', 'level', 'levels', 'show-label']
  }

  private barEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null
  private segments: HTMLElement[] = []
  /** 当前绑定的密码输入承载（原生 input 或暴露 value 的组件宿主） */
  private boundTarget: (HTMLElement & { value?: unknown }) | null = null
  private boundHandler: ((e: Event) => void) | null = null
  private rootObserver: MutationObserver | null = null
  /** 当前生效分数（事件「变化才派发」的对比基准） */
  private currentScore = 0
  private customScoreFn: PasswordScoreFn | null = null

  /**
   * @apiProperty 自定义评分函数（入参密码串，返回 0–4）：设置后完全接管内置评分；
   * 置 null/undefined 恢复内置。受控 `level` 属性在场时不参与（宿主给值优先）。
   */
  get scoreFn(): PasswordScoreFn | null {
    return this.customScoreFn
  }

  set scoreFn(fn: PasswordScoreFn | null) {
    this.customScoreFn = typeof fn === 'function' ? fn : null
    if (this.hasRendered) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${PASSWORD_STRENGTH_STYLE}</style>
      <div class="bar" part="bar" role="meter" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" aria-label="" data-level="neutral">
        ${Array.from({ length: SEGMENT_COUNT }, () => '<span class="segment" part="segment"></span>').join('')}
      </div>
      <span class="label" part="label" hidden></span>
      <slot></slot>
    `
  }

  private bind(): void {
    this.barEl = this.shadow.querySelector<HTMLElement>('.bar')
    this.labelEl = this.shadow.querySelector<HTMLElement>('.label')
    this.segments = [...this.shadow.querySelectorAll<HTMLElement>('.segment')]
    this.shadow.querySelector<HTMLSlotElement>('slot')?.addEventListener('slotchange', this.onSlotChange)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
    this.observeRoot()
    // 断开连接统一清理：根监听停表 + 目标 input 监听摘除（重连由 onReconnect 恢复）
    this.onCleanup(() => {
      this.rootObserver?.disconnect()
      this.rootObserver = null
      this.detachTarget()
    })
  }

  /** 断开重连：render 不重建，恢复根监听（目标绑定随后由 update() 的 syncTarget 幂等恢复） */
  protected override onReconnect(): void {
    this.observeRoot()
  }

  protected override update(): void {
    this.syncTarget()
    const controlled = this.parseControlledLevel()
    this.applyScore(controlled ?? this.computeScore(this.readTargetPassword()))
  }

  /** 应用分数并同步视觉/ARIA；仅非受控且分数变化时派发 oas-score-change */
  private applyScore(score: number): void {
    const label = this.labelFor(score)
    const level = levelName(score)
    // meter 语义承载在 bar 指示条上（host 保持 generic）：slot 内嵌的密码输入与 bar 是
    // flat tree 兄弟节点，不会被 meter 角色的「子内容展平」吞掉（host 挂 role=meter 会让
    // axe 判 nested-interactive 且读屏吞掉内嵌输入——回归见 qa-regression/password-strength.spec）
    if (this.barEl) {
      this.barEl.setAttribute('aria-valuenow', String(score))
      this.barEl.setAttribute('aria-label', label)
      this.barEl.setAttribute('data-level', level)
    }
    if (this.labelEl) {
      const showLabel = this.hasAttr('show-label')
      this.labelEl.hidden = !showLabel
      this.labelEl.textContent = label
      if (showLabel) this.labelEl.setAttribute('data-level', level)
      else this.labelEl.removeAttribute('data-level')
    }
    this.segments.forEach((segment, i) => segment.classList.toggle('filled', i < score))
    if (score !== this.currentScore) {
      this.currentScore = score
      // 受控模式不派发（值由宿主给，防双向绑定回环）
      if (!this.hasAttr('level')) this.emit('score-change', { score, label })
    }
  }

  /** 解析并绑定当前目标输入（for 优先，slot 自动发现兜底）；绑定变化返回 true */
  private syncTarget(): boolean {
    const next = this.resolveTarget()
    if (next === this.boundTarget) return false
    this.detachTarget()
    if (next) {
      next.addEventListener('input', this.onTargetInput)
      this.boundTarget = next
      this.boundHandler = this.onTargetInput
    }
    return true
  }

  private detachTarget(): void {
    if (this.boundTarget && this.boundHandler) {
      this.boundTarget.removeEventListener('input', this.boundHandler)
    }
    this.boundTarget = null
    this.boundHandler = null
  }

  private resolveTarget(): (HTMLElement & { value?: unknown }) | null {
    const forId = this.getAttr('for', '').trim()
    if (forId !== '') {
      // 精确关联：同根节点（document 或 shadow root）内按 id 查找
      const root = this.getRootNode() as Document
      const found = typeof root.getElementById === 'function' ? root.getElementById(forId) : null
      return this.asPasswordCarrier(found)
    }
    // slot 自动发现：light DOM 里第一个 [type=password]（原生 input 或承载组件）
    return this.asPasswordCarrier(this.querySelector<HTMLElement>('input[type="password"], [type="password"]'))
  }

  /** 目标有效性：原生 input[type=password]，或以 type 属性声明 password 的承载组件（oas-input 等） */
  private asPasswordCarrier(el: HTMLElement | null): (HTMLElement & { value?: unknown }) | null {
    if (!el) return null
    const isPassword = el instanceof HTMLInputElement ? el.type === 'password' : el.getAttribute('type') === 'password'
    return isPassword ? (el as HTMLElement & { value?: unknown }) : null
  }

  /** 从 input 事件读密码值：composedPath 首个原生 input 优先（穿透承载组件 shadow），回退绑定目标 value */
  private readEventPassword(e: Event): string {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    for (const node of path) {
      if (node instanceof HTMLInputElement) return node.value
    }
    return this.readCarrierPassword(this.boundTarget)
  }

  /** 读绑定目标当前密码值（初始评分与 update 重算路径） */
  private readTargetPassword(): string {
    return this.readCarrierPassword(this.boundTarget)
  }

  /** 读承载的密码值：原生 input 直读 value；组件宿主读公开 value property，回退内部原生输入 */
  private readCarrierPassword(target: (HTMLElement & { value?: unknown }) | null): string {
    if (!target) return ''
    if (target instanceof HTMLInputElement) return target.value
    if (typeof target.value === 'string') return target.value
    return target.shadowRoot?.querySelector<HTMLInputElement>('input')?.value ?? ''
  }

  /** 生效分数：score-fn 接管 > 内置评分（受控 level 在 update 上游已短路） */
  private computeScore(password: string): number {
    const fn = this.customScoreFn
    if (!fn) return scorePassword(password)
    try {
      return clampScore(fn(password))
    } catch (error) {
      warnOnce(
        `[oas-password-strength] score-fn 抛错，已回落内置评分：${error instanceof Error ? error.message : String(error)}`,
      )
      return scorePassword(password)
    }
  }

  /** level 受控解析：数值越界钳制 0–4；非法值按 0 并一次性告警 */
  private parseControlledLevel(): number | null {
    if (!this.hasAttr('level')) return null
    const raw = this.getAttr('level', '').trim()
    const parsed = Number(raw)
    if (raw === '' || !Number.isFinite(parsed)) {
      warnOnce(`[oas-password-strength] 非法 level "${raw}"，按 0 处理；合法值 0–4`)
      return 0
    }
    return Math.max(0, Math.min(4, Math.round(parsed)))
  }

  /** 档位文案：levels JSON 覆盖优先，缺省走 i18n passwordStrength.0–4 */
  private labelFor(score: number): string {
    const custom = this.parseLevels()
    if (custom) return custom[score] ?? ''
    const fallbacks = [
      this.t('passwordStrength.0'),
      this.t('passwordStrength.1'),
      this.t('passwordStrength.2'),
      this.t('passwordStrength.3'),
      this.t('passwordStrength.4'),
    ]
    return fallbacks[score] ?? ''
  }

  /** levels JSON 解析：需为 5 个非空字符串的数组，非法回落 i18n 默认 + 一次性告警 */
  private parseLevels(): string[] | null {
    const raw = this.getAttr('levels', '').trim()
    if (raw === '') return null
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      warnOnce('[oas-password-strength] 非法 levels（JSON 解析失败），已回落 i18n 默认档位文案')
      return null
    }
    const isFiveStrings =
      Array.isArray(parsed) &&
      parsed.length === SEGMENT_COUNT + 1 &&
      parsed.every((item) => typeof item === 'string' && item.trim() !== '')
    if (isFiveStrings) return parsed as string[]
    warnOnce('[oas-password-strength] 非法 levels（需为 5 个非空字符串的 JSON 数组），已回落 i18n 默认档位文案')
    return null
  }

  /** 根节点 childList 监听：for 目标晚挂载/被移除时重新解析绑定（回调内幂等） */
  private observeRoot(): void {
    if (this.rootObserver) {
      this.rootObserver.disconnect()
    } else {
      this.rootObserver = new MutationObserver(() => this.onRootMutated())
    }
    this.rootObserver.observe(this.getRootNode(), { childList: true, subtree: true })
  }

  private readonly onRootMutated = (): void => {
    if (this.syncTarget()) this.update()
  }

  /** slot 内容变化：重新发现目标（绑定变化由 syncTarget 换接），分数随之重算 */
  private readonly onSlotChange = (): void => {
    this.update()
  }

  /** 目标输入实时评分；受控 level 在场时显示值由宿主给，输入不改变 */
  private readonly onTargetInput = (e: Event): void => {
    if (this.hasAttr('level')) return
    this.applyScore(this.computeScore(this.readEventPassword(e)))
  }
}
