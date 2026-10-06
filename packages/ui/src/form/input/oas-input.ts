import { OASFormElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import { isRtl } from '../../shared/direction.js'

/** addon 槽内「自包含控件」tag 白名单：自带底色/描边/圆角，不应被放进文本托盘的灰底与内边距里 */
const ADDON_CONTROL_TAGS = new Set(['OAS-BUTTON', 'OAS-BUTTON-GROUP', 'OAS-COMPACT'])

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_VARIANTS = ['outlined', 'filled', 'borderless'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const
const VALID_CLEAR_ON = ['always', 'hover', 'focus'] as const

/** 原生属性透传白名单：镜像到 shadow 内 input（value/type/placeholder/disabled/readonly/maxlength 另有专门通道）。
 *  min/max/step 供 number 类型使用（其余类型浏览器原生忽略，无副作用）。 */
const PASSTHROUGH_ATTRS = [
  'name',
  'autocomplete',
  'autofocus',
  'inputmode',
  'minlength',
  'min',
  'max',
  'step',
  'required',
  'spellcheck',
  'enterkeyhint',
  'pattern',
] as const

/** hint 提示文案元素 id：内层 input 的 aria-describedby 指向它（同一 shadow root 内 IDREF 有效） */
const HINT_ID = 'oas-input-hint'

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(`[oas-input] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
}

/** 枚举归一化：合法值原样返回，空/非法值回落默认并告警（空值静默回落） */
function normalizeChoice(kind: string, raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  if ((valid as readonly string[]).includes(raw)) return raw
  warnOnce(kind, raw, fallback, valid)
  return fallback
}

/** 字素（grapheme）计数：Intl.Segmenter 优先（emoji/ZWJ 组合/变音符正确计数），Array.from 兜底 */
const graphemeSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

function countGraphemes(value: string): number {
  if (graphemeSegmenter) {
    let n = 0
    for (const _ of graphemeSegmenter.segment(value)) n++
    return n
  }
  return Array.from(value).length
}

// —— mask 输入掩码（能力缺口 D7）——

/** 掩码 token：可编辑位（字符校验函数）或字面量（固定字符） */
type MaskToken = { kind: 'editable'; test: (ch: string) => boolean } | { kind: 'literal'; ch: string }

/** mask 模式字符表：`#` 数字 / `A` 字母 / `*` 字母数字；其余字符为字面量（如 `###-####` 的 `-`） */
function parseMaskTokens(mask: string): MaskToken[] {
  const tokens: MaskToken[] = []
  for (const ch of Array.from(mask)) {
    if (ch === '#') tokens.push({ kind: 'editable', test: (c) => c >= '0' && c <= '9' })
    else if (ch === 'A')
      tokens.push({ kind: 'editable', test: (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') })
    else if (ch === '*')
      tokens.push({
        kind: 'editable',
        test: (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'),
      })
    else tokens.push({ kind: 'literal', ch })
  }
  return tokens
}

/** 掩码可编辑位总数（raw 序列长度上限） */
function maskEditableCount(tokens: MaskToken[]): number {
  let n = 0
  for (const t of tokens) if (t.kind === 'editable') n++
  return n
}

/** 掩码渲染（渐进显示，无占位符）：可编辑位按序消费 raw 字符；字面量仅在「后面还有已填字符」时显示，raw 耗尽即停 */
function renderMaskTokens(tokens: MaskToken[], raw: string): string {
  let ri = 0
  let out = ''
  for (const t of tokens) {
    if (ri >= raw.length) break
    if (t.kind === 'literal') out += t.ch
    else {
      out += raw[ri]
      ri++
    }
  }
  return out
}

/**
 * 按模板对齐从文本提取可编辑字符（从第 editPos 个可编辑位开始）：
 * - 字面量位字符恰好匹配则消耗（用户手打格式字符）
 * - 不匹配则跳过该字面量继续对齐（键入自动跳字面量 / 粘贴只收合法位的关键）
 * - 可编辑位非法字符丢弃（token 不推进）
 */
function extractMaskFrom(tokens: MaskToken[], text: string, editPos: number): string {
  let ti = 0
  let seen = 0
  while (ti < tokens.length && seen < editPos) {
    if (tokens[ti]?.kind === 'editable') seen++
    ti++
  }
  let out = ''
  for (const ch of Array.from(text)) {
    if (ti >= tokens.length) break
    let t = tokens[ti]!
    if (t.kind === 'literal') {
      if (t.ch === ch) {
        ti++
        continue
      }
      ti++
      while (ti < tokens.length && tokens[ti]?.kind === 'literal') ti++
      if (ti >= tokens.length) break
      t = tokens[ti]!
    }
    if (t.kind === 'editable' && t.test(ch)) {
      out += ch
      ti++
    }
  }
  return out
}

/** 显示值前 index 个字符中可编辑字符的个数（按模板对齐扫描；渐进显示中缺失的字面量不消耗显示字符） */
function maskEditableCountUpTo(tokens: MaskToken[], display: string, index: number): number {
  let ti = 0
  let di = 0
  let edits = 0
  while (di < index && ti < tokens.length) {
    const t = tokens[ti]!
    if (t.kind === 'literal') {
      ti++
      if (display[di] === t.ch) di++
      continue
    }
    ti++
    di++
    edits++
  }
  return edits
}

/** 显示值中第 editPos 个可编辑字符之前的位置（光标落点映射；停在字面量之前，不越过字面量） */
function maskDisplayIndexForEditPos(tokens: MaskToken[], display: string, editPos: number): number {
  let ti = 0
  let di = 0
  let edits = 0
  while (di < display.length && ti < tokens.length) {
    const t = tokens[ti]!
    if (t.kind === 'literal') {
      // 预看下一个可编辑位：光标恰好在它之前（edits === editPos）时停在字面量前
      let look = ti + 1
      while (look < tokens.length && tokens[look]?.kind === 'literal') look++
      if (look < tokens.length && edits === editPos) break
      ti++
      if (display[di] === t.ch) di++
      continue
    }
    if (edits === editPos) break
    ti++
    di++
    edits++
  }
  return di
}

/** mask 与 formatter/parser 互斥告警去重（模块级，同控件告警惯例） */
const warnedMaskConflict = new Set<string>()

function warnMaskFormatterConflict(): void {
  const key = 'mask-formatter'
  if (warnedMaskConflict.has(key)) return
  warnedMaskConflict.add(key)
  console.warn('[oas-input] mask 与 formatter/parser 互斥，已按 mask 优先处理：formatter/parser 在 mask 移除前不生效')
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.root {
  display: block;
}
.wrapper {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
}
.inner {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
/* input 与测宽 mirror（.measure）共享水平布局规则：字号/内边距/边框一致才能等宽测量 */
:is(input, .measure) {
  box-sizing: border-box;
  min-width: 0;
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  /* compact/button-group 圆角合并协议：--oas-button-group-radius 优先，独立使用回落自身圆角 */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input {
  appearance: none;
  width: 100%;
  height: var(--oas-control-height-md);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}

/* ---- size 尺寸档位（默认 medium 走基础样式；高度对齐 --oas-control-height-* token） ---- */
:host([data-size='small']) :is(input, .measure) {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) :is(input, .measure) {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
:host([data-size='small']) :is(.affix, .affix-icon, .addon) {
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) :is(.affix, .affix-icon, .addon) {
  font-size: var(--oas-font-size-lg);
}

/* ---- variant 形态：filled 填充 / borderless 无框（默认 outlined 走基础样式） ---- */
:host([data-variant='filled']) input {
  border-color: transparent;
  background: var(--oas-color-bg-hover);
}
:host([data-variant='filled']) input:hover {
  border-color: var(--oas-color-border);
}
:host([data-variant='filled']) input:focus {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([data-variant='filled']) input:disabled {
  background: var(--oas-color-bg-disabled);
}
:host([data-variant='borderless']) input {
  border-color: transparent;
  background: transparent;
}
:host([data-variant='borderless']) input:hover {
  border-color: transparent;
}
:host([data-variant='borderless']) input:focus {
  border-color: transparent;
  box-shadow: none;
}
:host([data-variant='borderless']) input:disabled {
  background: transparent;
}

/* ---- status 校验态：success / warning / error（error 兼容宿主 aria-invalid 通道，置于最后优先胜出） ---- */
:host([data-status='success']) input {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) input {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) input:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) input,
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) input:focus,
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}

input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:disabled:hover {
  border-color: var(--oas-color-border);
}

/* ---- addon 区（prepend / append，独立 ::part；attribute 文本为 slot fallback，双通道） ---- */
.addon {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
  user-select: none;
}
:host([disabled]) .addon,
:host([data-disabled]) .addon {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
/* addon 圆角合并走逻辑角属性（border-start-*-radius 随书写方向镜像：RTL 下 prepend 在右侧） */
:host([addon-before]) [part='prepend']  {
  border-start-start-radius: var(--oas-radius-md);
  border-end-start-radius: var(--oas-radius-md);
  border-inline-end: none;
}
:host([data-slot-prepend]) [part='prepend']  {
  border-start-start-radius: var(--oas-radius-md);
  border-end-start-radius: var(--oas-radius-md);
  border-inline-end: none;
}
:host([addon-after]) [part='append']  {
  border-start-end-radius: var(--oas-radius-md);
  border-end-end-radius: var(--oas-radius-md);
  border-inline-start: none;
}
:host([data-slot-append]) [part='append']  {
  border-start-end-radius: var(--oas-radius-md);
  border-end-end-radius: var(--oas-radius-md);
  border-inline-start: none;
}
:host([addon-before]) input  {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
:host([data-slot-prepend]) input  {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
:host([addon-after]) input  {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
:host([data-slot-append]) input  {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
/* addon 槽分发自包含控件（按钮族）时，托盘退化为「贴合容器」：
   去掉为文本 addon 预留的内边距与灰底/描边（消除灰尾巴与双层圆角/双线），
   高度与输入框同档对齐（消除 1px 台阶），相邻边 -1px 重叠把输入框侧线与控件边框合并为单线。
   圆角合并协议（--oas-button-group-radius）由 syncAddons 按 prepend/append + 书写方向注入被分发控件。 */
.addon[data-addon-control] {
  padding: 0;
  background: transparent;
  border: none;
  box-sizing: border-box;
  height: var(--oas-control-height-md);
}
:host([data-size='small']) .addon[data-addon-control] {
  height: var(--oas-control-height-sm);
}
:host([data-size='large']) .addon[data-addon-control] {
  height: var(--oas-control-height-lg);
}
[part='append'][data-addon-control] {
  margin-inline-start: -1px;
}
[part='prepend'][data-addon-control] {
  margin-inline-end: -1px;
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.addon[hidden] {
  display: none;
}

/* ---- 内嵌前后缀（prefix / suffix 文案 + prefix-icon / suffix-icon 图标） ---- */
.affix,
.affix-icon {
  position: absolute;
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
  pointer-events: none;
  z-index: 1;
  max-width: 50%;
  overflow: hidden;
}
:host([disabled]) .affix,
:host([disabled]) .affix-icon,
:host([data-disabled]) .affix,
:host([data-disabled]) .affix-icon {
  color: var(--oas-color-text-disabled);
}
.affix-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}
/* 内嵌前后缀定位走逻辑属性（inset-inline-*：RTL 下 prefix 在右、suffix 在左自动镜像） */
[part='prefix-icon'] {
  inset-inline-start: var(--oas-space-3);
}
[part='prefix'] {
  inset-inline-start: var(--oas-space-8, 40px);
}
:host(:not([prefix-icon])) [part='prefix'] {
  inset-inline-start: var(--oas-space-3);
}
[part='suffix-icon'] {
  inset-inline-end: var(--oas-space-8, 40px);
}
[part='suffix'] {
  inset-inline-end: calc(var(--oas-space-8, 40px) + 16px);
}
:host(:not([suffix-icon])) [part='suffix'] {
  inset-inline-end: var(--oas-space-8, 40px);
}
:host(:not([clearable])) [part='suffix-icon'] {
  inset-inline-end: var(--oas-space-3);
}
:host(:not([clearable])) [part='suffix'] {
  inset-inline-end: var(--oas-space-3);
}
.affix[hidden],
.affix-icon[hidden] {
  display: none;
}

/* 有前缀/图标时 input 起始侧留位，有后缀/图标/可清空时结束侧留位（padding-inline-* 随书写方向镜像）。
    slot 分发（data-slot-*）与 attribute（prefix/suffix）两条通道等价驱动布局；
    测宽 mirror 同享留位（保证 auto-width 测量含让位内边距） */
:host([prefix-text]) :is(input, .measure)  {
  padding-inline-start: var(--oas-space-8, 40px);
}
:host([data-slot-prefix]) :is(input, .measure)  {
  padding-inline-start: var(--oas-space-8, 40px);
}
:host([prefix-icon]) :is(input, .measure)  {
  padding-inline-start: var(--oas-space-8, 40px);
}
:host([prefix-text][prefix-icon]) :is(input, .measure)  {
  padding-inline-start: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([data-slot-prefix][prefix-icon]) :is(input, .measure)  {
  padding-inline-start: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([suffix-text]) :is(input, .measure)  {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([data-slot-suffix]) :is(input, .measure)  {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([suffix-icon]) :is(input, .measure)  {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([clearable]) :is(input, .measure)  {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([clearable][suffix-text]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([clearable][data-slot-suffix]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([clearable][suffix-icon]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}

/* show-password 眼睛按钮让位：输入框/清除按钮/内嵌后缀整体移到结束侧 */
:host([show-password]) :is(input, .measure) {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([show-password][clearable]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-text]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][data-slot-suffix]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-icon]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][suffix-text]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][data-slot-suffix]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][clearable][suffix-icon]) :is(input, .measure)  {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][type='password']) .clear-btn {
  inset-inline-end: var(--oas-space-8, 40px);
}
:host([show-password][clearable][suffix-icon]) .clear-btn {
  inset-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]) [part='suffix-icon'] {
  inset-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]:not([suffix-icon])) [part='suffix'] {
  inset-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
:host([show-password]) [part='suffix'] {
  inset-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px) + 16px);
}

/* ---- 清除按钮 ---- */
.clear-btn {
  position: absolute;
  inset-inline-end: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
  z-index: 2;
  /* 与内置 12px 图标对齐：clear-icon 插槽分发 1em 尺寸图标（如 oas-icon）时同档 */
  font-size: 12px;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 内置清除图标的尺寸（clear-icon 插槽分发自定义图标时由宿主内容自定尺寸，slot fallback 仍走此规则） */
.clear-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
.clear-btn[hidden] {
  display: none;
}
/* 清除按钮显隐策略：focus=仅聚焦时显示，hover=悬浮或聚焦时显示（默认 always 有值常显，不写 data-clear-on） */
:host([data-clear-on='focus']:not(:focus-within)) .clear-btn,
:host([data-clear-on='hover']:not(:hover):not(:focus-within)) .clear-btn {
  display: none;
}

/* ---- loading 加载态：尾部 spinner（不禁用输入；与 clearable 共存时 loading 优先显示） ---- */
.spinner {
  position: absolute;
  inset-inline-end: var(--oas-space-2);
  width: 1em;
  height: 1em;
  border: 2px solid var(--oas-color-text-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-input-spin 0.8s linear infinite;
  pointer-events: none;
  z-index: 2;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-input-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
/* loading 时 spinner 占据行尾槽位（同清除按钮位）：suffix 位置与 input 让位按「有行尾控件」协议对齐 */
:host([data-loading]) :is(input, .measure) {
  padding-inline-end: var(--oas-space-8, 40px);
}
:host([data-loading]) [part='suffix-icon'] {
  inset-inline-end: var(--oas-space-8, 40px);
}
:host([data-loading]) [part='suffix'] {
  inset-inline-end: calc(var(--oas-space-8, 40px) + 16px);
}
:host([data-loading]:not([suffix-icon])) [part='suffix'] {
  inset-inline-end: var(--oas-space-8, 40px);
}
:host([data-loading][suffix-text]) :is(input, .measure),
:host([data-loading][data-slot-suffix]) :is(input, .measure),
:host([data-loading][suffix-icon]) :is(input, .measure) {
  padding-inline-end: calc(var(--oas-space-8, 40px) + var(--oas-space-5, 24px));
}
/* show-password 眼睛在场时 spinner 移到眼睛左侧让位（镜像清除按钮的同款协议） */
:host([show-password][type='password']) .spinner {
  inset-inline-end: var(--oas-space-8, 40px);
}

/* ---- show-password 眼睛切换按钮 ---- */
.eye-btn {
  position: absolute;
  inset-inline-end: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  z-index: 2;
}
.eye-btn:hover {
  color: var(--oas-color-text-primary);
}
.eye-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.eye-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}
:host([disabled]) .eye-btn,
:host([data-disabled]) .eye-btn {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.eye-btn[hidden] {
  display: none;
}

/* ---- show-count 字数统计（outside 输入框 inline-end 侧下方 / inside 输入区内结束侧） ---- */
.count {
  position: absolute;
  top: 100%;
  inset-inline-end: 0;
  margin-top: var(--oas-space-1, 4px);
  display: block;
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
}
.count[data-over='true'] {
  color: var(--oas-color-danger);
}
.count[hidden] {
  display: none;
}
/* inside：回到 .inner 的 flex 流（输入区右侧、垂直居中），input 收缩让位不与文本重叠 */
.count[data-position='inside'] {
  position: static;
  margin-top: 0;
  margin-inline-start: var(--oas-space-2);
}
:host([data-count-inside]) input {
  flex: 1 1 0%;
  width: auto;
}
/* inside 计数与清除/眼睛/后缀并存时让位（绝对定位按钮在右侧占据一档宽度） */
:host([clearable]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([suffix-text]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([data-slot-suffix]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([suffix-icon]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([show-password]) .count[data-position='inside']  {
  margin-inline-end: var(--oas-space-5, 24px);
}
:host([show-password][clearable]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-text]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][data-slot-suffix]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}
:host([show-password][suffix-icon]) .count[data-position='inside']  {
  margin-inline-end: calc(var(--oas-space-5, 24px) + var(--oas-space-5, 24px));
}

/* ---- hint 静态提示文案（输入框下方，独立于校验错误；内层 input 经 aria-describedby 关联） ---- */
.hint {
  display: block;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  margin-top: var(--oas-space-1);
  line-height: 1.5;
}
.hint[hidden] {
  display: none;
}

/* ---- auto-width 宽度自适应（mirror 测宽） ---- */
.measure {
  display: none;
}
:host([data-auto-width]) .measure {
  display: inline-block;
  position: absolute;
  visibility: hidden;
  white-space: pre;
  pointer-events: none;
  border: 1px solid transparent;
}
:host([data-auto-width]) input {
  width: var(--oas-input-measured, 100%);
  min-width: var(--oas-input-auto-min, 72px);
  max-width: var(--oas-input-auto-max, 100%);
}
`

export class OASInput extends OASFormElement {
  /** 原生表单集成（label for / FormData / reset / fieldset disabled）；沿静态原型链已可继承，显式声明便于阅读与检索 */
  static override formAssociated = true

  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'type',
      'disabled',
      'readonly',
      'clearable',
      'label',
      'addon-before',
      'addon-after',
      'prefix-text',
      'suffix-text',
      'prefix-icon',
      'suffix-icon',
      'show-password',
      'maxlength',
      'show-count',
      'loading',
      'disabled-skip',
      'size',
      'variant',
      'status',
      'count-position',
      'allow-over-max',
      'show-clear-on',
      'auto-width',
      'auto-width-min',
      'auto-width-max',
      'hint',
      // mask 输入掩码（能力缺口 D7）：mask 定义掩码模板，mask-raw 让提交值/FormData 走去格式化原始序列
      'mask',
      'mask-raw',
      ...PASSTHROUGH_ATTRS,
    ]
  }

  /** 显示格式化（仅 property 通道：`el.formatter = fn`，WC attribute 无法传函数）。
   *  display = formatter(raw)；设置/移除后立即重刷显示。 */
  private _formatter: ((value: string) => string) | null = null
  get formatter(): ((value: string) => string) | null {
    return this._formatter
  }
  set formatter(fn: ((value: string) => string) | null) {
    this._formatter = typeof fn === 'function' ? fn : null
    this.refreshFormatter()
  }

  /** 显示值反解析（仅 property 通道）：raw = parser(display)；事件 detail 携带解析后的值 */
  private _parser: ((value: string) => string) | null = null
  get parser(): ((value: string) => string) | null {
    return this._parser
  }
  set parser(fn: ((value: string) => string) | null) {
    this._parser = typeof fn === 'function' ? fn : null
    this.refreshFormatter()
  }

  /**
   * @apiProperty 当前值（公开读通道，对齐原生 `input.value`）：parser/mask 感知的原始值语义，与
   * `oas-input` / `oas-change` / FormData 提交口径一致。宿主与 React/Vue 集成可直接
   * `el.value` 读，无需监听事件自存 state 或穿透 shadow 读内层 input。
   */
  get value(): string {
    return this.inputEl ? this.rawValue() : this.getAttr('value', '')
  }

  /**
   * 程序性写值（对齐原生 `input.value = x`）：写受控 `value` 属性并即时回写内部控件，
   * 不派发任何事件。同值 `setAttribute` 不触发 `attributeChangedCallback`，故显式重置
   * 应用基线并强制 update，确保赋值在任何情况下都生效（受控赋值即生效语义）。
   */
  set value(v: string) {
    const next = v == null ? '' : String(v)
    this.setAttribute('value', next)
    this.lastAttrValue = null
    if (this.hasRendered) this.update()
  }

  private inputEl: HTMLInputElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private eyeBtn: HTMLButtonElement | null = null
  private countEl: HTMLElement | null = null
  private measureEl: HTMLElement | null = null
  private spinnerEl: HTMLElement | null = null
  private hintEl: HTMLElement | null = null
  /** show-password 明文/密文状态（仅 type=password 时生效） */
  private revealed = false
  /** 上次提交值（oas-change 的变更基线：受控 value 写入 / blur / Enter 提交时刷新） */
  private committedValue = ''

  /** 上次 update() 见到的 value 属性值（未提交输入保护：属性未变的 update 不回写内层） */
  private lastAttrValue: string | null = null
  /** 最近一次已知的原始（未格式化）值：formatter 移除时恢复显示用；mask 模式下为掩码原始字符序列 */
  private lastRawValue = ''
  /** 超限状态（oas-validate 只在翻转时派发；首帧建立基线不派发） */
  private overLimit = false
  private overLimitInitialized = false
  /** mask 模式镜像：上次应用后的显示值（input 事件 diff 基线）与上次 mask 模板（增/换/移检测） */
  private lastMaskDisplay = ''
  private lastMaskPattern: string | null = null
  /** mask 模板解析缓存（同模板复用，update 高频调用不重复解析） */
  private maskCache: { pattern: string; tokens: MaskToken[] } | null = null

  /** 当前掩码 token（mask 属性缺席/空串 = 无 mask）；同模板走缓存 */
  private maskTokens(): MaskToken[] | null {
    const pattern = this.getAttr('mask', '')
    if (pattern === '') return null
    if (!this.maskCache || this.maskCache.pattern !== pattern) {
      this.maskCache = { pattern, tokens: parseMaskTokens(pattern) }
    }
    return this.maskCache.tokens
  }

  /** 应用掩码原始序列：渲染显示 + 同步镜像（caretEditPos 为 null 时不动光标，受控回写场景） */
  private applyMaskValue(tokens: MaskToken[], raw: string, caretEditPos: number | null): void {
    const i = this.inputEl
    if (!i) return
    const max = maskEditableCount(tokens)
    if (raw.length > max) raw = raw.slice(0, max)
    const display = renderMaskTokens(tokens, raw)
    if (i.value !== display) i.value = display
    this.lastRawValue = raw
    this.lastMaskDisplay = display
    if (caretEditPos !== null) {
      const caret = Math.min(maskDisplayIndexForEditPos(tokens, display, caretEditPos), display.length)
      try {
        i.setSelectionRange(caret, caret)
      } catch {
        /* number/email 等类型不支持选区，忽略光标保持 */
      }
    }
  }

  /**
   * input 事件掩码接管：对上一次镜像显示值与当前值做 diff（公共前缀/后缀），把插入段按模板
   * 对齐提取（键入自动跳字面量、粘贴只收合法位、非法字符过滤），删除段按等效可编辑位数回退
   * 原始序列，再整体重渲染。字面量由渲染逻辑独占管理——用户删除字面量会被渲染还原且光标
   * 跳过（「删到字面量停」），可编辑字符照常增删。
   */
  private applyMaskInput(tokens: MaskToken[]): void {
    const i = this.inputEl!
    const prevDisplay = this.lastMaskDisplay
    const prevRaw = this.lastRawValue
    const newDisplay = i.value
    let start = 0
    const minLen = Math.min(prevDisplay.length, newDisplay.length)
    while (start < minLen && prevDisplay[start] === newDisplay[start]) start++
    let endPrev = prevDisplay.length
    let endNew = newDisplay.length
    while (endPrev > start && endNew > start && prevDisplay[endPrev - 1] === newDisplay[endNew - 1]) {
      endPrev--
      endNew--
    }
    const removed = prevDisplay.slice(start, endPrev)
    const inserted = newDisplay.slice(start, endNew)
    const editBefore = maskEditableCountUpTo(tokens, prevDisplay, start)
    let raw = prevRaw
    let caretEdit = editBefore
    if (removed.length > 0) {
      const removedEdits = extractMaskFrom(tokens, removed, editBefore).length
      raw = raw.slice(0, editBefore) + raw.slice(editBefore + removedEdits)
    }
    if (inserted.length > 0) {
      const clean = extractMaskFrom(tokens, inserted, editBefore)
      raw = raw.slice(0, editBefore) + clean + raw.slice(editBefore)
      caretEdit = editBefore + clean.length
    }
    this.applyMaskValue(tokens, raw, caretEdit)
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <span class="wrapper" part="wrapper">
          <span class="addon" part="prepend" hidden><slot name="prepend"><span class="addon-fallback" data-fallback></span></slot></span>
          <span class="inner" part="inner">
            <span class="affix-icon" part="prefix-icon" hidden></span>
            <span class="affix" part="prefix" hidden><slot name="prefix"><span class="affix-fallback" data-fallback></span></slot></span>
            <input part="input" />
            <span class="measure" aria-hidden="true"></span>
            <span class="affix" part="suffix" hidden><slot name="suffix"><span class="affix-fallback" data-fallback></span></slot></span>
            <span class="affix-icon" part="suffix-icon" hidden></span>
            <button class="clear-btn" part="clear" hidden>
              <slot name="clear-icon">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                  <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </slot>
            </button>
            <button class="eye-btn" part="eye" type="button" hidden aria-pressed="false">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                ${iconRegistry['eye']}
              </svg>
            </button>
            <span class="spinner" part="spinner" aria-hidden="true" hidden></span>
            <span class="count" part="count" hidden></span>
          </span>
          <span class="addon" part="append" hidden><slot name="append"><span class="addon-fallback" data-fallback></span></slot></span>
        </span>
        <span class="hint" part="hint" id="${HINT_ID}" hidden></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/清空/密码眼/焦点事件（render 与水合路径共用） */
  private bind(): void {
    this.inputEl = this.shadow.querySelector('input')
    this.clearBtn = this.shadow.querySelector('.clear-btn')
    this.eyeBtn = this.shadow.querySelector('.eye-btn')
    this.countEl = this.shadow.querySelector('.count')
    this.measureEl = this.shadow.querySelector('.measure')
    this.spinnerEl = this.shadow.querySelector('.spinner')
    this.hintEl = this.shadow.querySelector('.hint')

    this.inputEl?.addEventListener('input', () => {
      // mask 在场：整段接管（diff 重渲染 + 光标管理），formatter 通道让位（mask 与 formatter 互斥）
      const maskTokens = this.maskTokens()
      if (maskTokens) {
        this.applyMaskInput(maskTokens)
      } else {
        const pos = this.inputEl!.selectionStart
        const oldDisplay = this.inputEl!.value
        // formatter 在场：先把用户敲入的显示值反解析为原始值，再重新格式化显示；
        // 光标近似保持（按格式化前后长度差平移）
        if (this._formatter) {
          const typed = this._parser ? this._parser(oldDisplay) : oldDisplay
          this.lastRawValue = typed
          const display = this._formatter(typed)
          if (display !== oldDisplay) {
            this.inputEl!.value = display
            if (pos !== null) {
              const next = Math.max(0, Math.min(display.length, pos + (display.length - oldDisplay.length)))
              try {
                this.inputEl!.setSelectionRange(next, next)
              } catch {
                /* number/email 等类型不支持选区，忽略光标保持 */
              }
            }
          }
        } else {
          this.lastRawValue = oldDisplay
        }
      }
      this.emit('input', { value: this.rawValue() })
      this.syncFormValue()
      this.syncValidity()
      this.syncClearVisibility()
      this.syncCount()
      this.measureAutoWidth()
    })
    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      // 非输入法组合（IME 上屏）时按 Enter 才派发 oas-enter；Enter 同时作为值提交点
      if (e.key === 'Enter' && !e.isComposing) {
        this.emit('enter', { value: this.rawValue() })
        this.commitChange()
      }
    })
    this.inputEl?.addEventListener('focus', () => {
      this.emit('focus', { value: this.rawValue() })
    })
    this.inputEl?.addEventListener('blur', () => {
      this.emit('blur', { value: this.rawValue() })
      this.commitChange()
    })
    this.clearBtn?.addEventListener('click', () => {
      if (!this.inputEl) return
      this.inputEl.value = ''
      this.lastRawValue = ''
      this.emit('clear', { originalEvent: new MouseEvent('click') })
      // 值已变，实时通道同步派发（只听 oas-input 的宿主不能漏掉清除）
      this.emit('input', { value: this.rawValue() })
      this.syncFormValue()
      this.syncValidity()
      this.inputEl.focus()
      this.syncClearVisibility()
      this.syncCount()
      this.measureAutoWidth()
    })
    this.eyeBtn?.addEventListener('click', () => {
      if (!this.inputEl || this.injectDisabled()) return
      this.revealed = !this.revealed
      this.syncPasswordReveal()
      this.inputEl.focus()
    })

    // 内嵌前后缀 / addon slot：light DOM 分发内容增减时同步显隐与 host 布局标记。
    // bind() 在 render/hydrate 二选一路径中各只执行一次，不存在重复注册；
    // 初始分发状态由 connectedCallback 调用的 update() → syncAffixes()/syncAddons() 读取。
    const observeSlot = (name: string, sync: () => void): void => {
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      slot?.addEventListener('slotchange', () => {
        sync()
        this.measureAutoWidth()
      })
    }
    observeSlot('prefix', () => this.syncAffixes())
    observeSlot('suffix', () => this.syncAffixes())
    observeSlot('prepend', () => this.syncAddons())
    observeSlot('append', () => this.syncAddons())

    // autofocus：转发到内部 input（原生 autofocus 不穿透 shadow，挂载后手动聚焦一次）
    if (this.hasAttr('autofocus')) {
      queueMicrotask(() => this.inputEl?.focus())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（主输入 input 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    this.bind()
    return true
  }

  /** 宿主（React 19 / Vue 绑定）按 `key in el` 对 `prefix`/`suffix` 走 property 写入；`Element.prefix` 是只读 getter，
   *  不遮蔽会崩掉宿主（React 下整棵树白屏）；`suffix` 无 DOM 对应，仅为对称与 property 通道一并遮蔽。用 defineProperty
   *  在原型上遮蔽并反射到规范属性 `prefix-text`/`suffix-text`，使 `prefix`/`suffix` 在 attribute 与 property 两条通道都可用。
   *  （不用 TS 访问器 override：遮蔽 getter-only 基类成员会触发 TS4113/4114 死锁。） */
  static {
    for (const [name, attr] of [
      ['prefix', 'prefix-text'],
      ['suffix', 'suffix-text'],
    ] as const) {
      Object.defineProperty(this.prototype, name, {
        configurable: true,
        get(this: OASInput): string {
          return this.getAttribute(attr) ?? ''
        },
        set(this: OASInput, value: string | null): void {
          if (value == null) this.removeAttribute(attr)
          else this.setAttribute(attr, value)
        },
      })
    }
  }

  protected override update(): void {
    const i = this.inputEl
    if (!i) return
    // 遗留属性名规范：旧 prefix（与 DOM 内建只读冲突）/suffix（无 DOM 对应），Vue 走 property 会吞值
    // 迁移到 prefix-text/suffix-text（纯 HTML 老用法自动升级，CSS 只认新名）
    this.normalizeLegacyAlias('prefix-text', 'prefix')
    this.normalizeLegacyAlias('suffix-text', 'suffix')
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const type = this.getAttr('type', 'text')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')

    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)

    // 尺寸/形态/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice('size', this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const variant = normalizeChoice('variant', this.getAttr('variant', ''), 'outlined', VALID_VARIANTS)
    this.setAttribute('data-variant', variant)
    const status = normalizeChoice('status', this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    // error 态同步内层 input 的 aria-invalid（warning/success 不是「无效」语义，不标）
    if (status === 'error') i.setAttribute('aria-invalid', 'true')
    else i.removeAttribute('aria-invalid')

    // 受控值 + formatter/mask 显示通道：display = formatter(raw) / renderMask(extract(value))，
    // 事件/提交基线走 rawValue()。mask 与 formatter 互斥（mask 优先，见互斥告警）。
    // 未提交输入保护：value 属性未变时（typing 中的无关 update，如 loading/status 切换）不从属性
    // 回写内层——否则用户正在输入的未提交文本被旧属性值抹掉（loading 远程校验主场景实抓）
    const attrValueChanged = this.lastAttrValue !== value
    this.lastAttrValue = value
    if (attrValueChanged) {
      // 回声判定必须先读当前显示值（写入前）：属性新值等于用户正在输入的未提交文本
      // （宿主/表单监听 oas-input 的逐键写回）→ 同步显示但不推进提交基线，
      // 否则 blur/Enter 的 commitChange 比对 raw === committedValue 会吞掉 oas-change
      // （oas-form 的 oas-input 值同步链路实抓：form 内文本框 change 触发整体哑火）
      const isEcho = value === this.rawValue()
      const ctrlMask = this.maskTokens()
      if (ctrlMask) {
        // mask 模式：value 属性解释为原始字符序列（带字面量的值也能按模板对齐提取）
        this.applyMaskValue(ctrlMask, extractMaskFrom(ctrlMask, value, 0), null)
      } else {
        this.lastRawValue = value
        const display = this._formatter ? this._formatter(value) : value
        if (i.value !== display) i.value = display
      }
      // 提交基线取 rawValue() 语义值（mask-raw 模式为去格式化序列，与 oas-change 比对口径一致）
      if (!isEcho) this.committedValue = this.rawValue()
    }
    // mask 模板增/换/移：从当前显示重提取重渲染（受控回写路径已在上面处理显示与镜像）；
    // 移除后显示回归原始序列（mask 模式下 lastRawValue 即原始序列）
    const maskPattern = this.getAttr('mask', '')
    if (maskPattern === '') {
      if (this.lastMaskPattern !== null) {
        if (i.value !== this.lastRawValue) i.value = this.lastRawValue
        this.lastMaskDisplay = ''
      }
      this.lastMaskPattern = null
    } else {
      if (this.lastMaskPattern !== maskPattern && !attrValueChanged) {
        const tokens = this.maskTokens()
        if (tokens) this.applyMaskValue(tokens, extractMaskFrom(tokens, i.value, 0), null)
      }
      this.lastMaskPattern = maskPattern
      if (this._formatter || this._parser) warnMaskFormatterConflict()
    }
    // 原生表单数据同步（form-associated；无 name 浏览器自动不提交）
    this.syncFormValue()
    this.syncValidity()

    i.placeholder = placeholder
    // maxlength 透传原生 input（空值即无限制；allow-over-max 时不透传——超限可继续输入，仅计数标红；
    // mask 模式不透传——显示值长度 ≠ 原始序列长度，原生截断会破坏掩码）
    const maxlength = this.getAttr('maxlength', '')
    if (maxlength === '' || this.hasAttr('allow-over-max') || this.maskTokens() !== null) i.removeAttribute('maxlength')
    else i.setAttribute('maxlength', maxlength)
    i.disabled = disabled
    i.readOnly = readonly
    // 原生属性透传白名单：host 有则镜像、无则同步移除
    for (const attr of PASSTHROUGH_ATTRS) {
      const v = this.getAttribute(attr)
      if (v == null) i.removeAttribute(attr)
      else i.setAttribute(attr, v)
    }
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    i.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('input.defaultLabel'))
    // hint 静态提示（输入框下方，独立于校验错误）：有则显示并经 aria-describedby 关联，无则解除
    this.syncHint()
    // 清除按钮显隐策略（默认 always 不写标记，CSS 无规则即常显）
    const clearOn = normalizeChoice('show-clear-on', this.getAttr('show-clear-on', ''), 'always', VALID_CLEAR_ON)
    if (clearOn === 'always') this.removeAttribute('data-clear-on')
    else this.setAttribute('data-clear-on', clearOn)
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !this.shouldShowClear()
    }
    this.syncPasswordReveal()
    this.syncLoading()
    this.syncCount()
    this.syncAddons()
    this.syncAffixes()
    this.toggleAttribute('data-auto-width', this.hasAttr('auto-width'))
    this.syncAutoWidthVars()
    this.measureAutoWidth()
  }

  /**
   * 当前原始值（oas-input / oas-change / FormData 的统一值语义）：
   * - parser 在场：显示值反解析
   * - mask 模式：mask-raw 属性在场 → 去格式化原始字符序列；缺省 → 显示值
   * - 其余：显示值即原始值
   */
  private rawValue(): string {
    const display = this.inputEl?.value ?? ''
    // mask 在场时优先于 parser（互斥告警声明「mask 优先」——rawValue 先判 parser 会让
    // parser 在 mask 期间仍作用于提交值，与告警自相矛盾：实抓）
    if (this.maskTokens() !== null) return this.hasAttr('mask-raw') ? this.lastRawValue : display
    if (this._parser) return this._parser(display)
    return display
  }

  /** 值提交（change 语义）：与上次提交基线不同才派发 oas-change */
  private commitChange(): void {
    if (!this.inputEl) return
    const raw = this.rawValue()
    if (raw !== this.committedValue) {
      this.committedValue = raw
      this.emit('change', { value: raw })
    }
  }

  /** 表单值快照（原始值，formatter 场景返回解析后的值；render 前读属性） */
  protected override getFormValue(): string | null {
    return this.inputEl ? this.rawValue() : this.getAttr('value', '')
  }

  /** 原生校验链同步：required 且值为空 → valueMissing（flag 为 true 时 message 按 Chromium 契约必须非空） */
  private syncValidity(): void {
    if (this.hasAttr('required') && this.getFormValue() === '') {
      this.setValidity({ valueMissing: true }, this.t('form.valueMissing'))
    } else {
      this.setValidity({})
    }
  }

  /** 表单 reset：恢复到 value 属性（初始值），不派发事件（与原生 reset 一致）；
   *  mask 模式按掩码渲染显示，提交基线取 rawValue() 口径（mask-raw 下为原始序列） */
  protected override resetFormValue(): void {
    const value = this.getAttr('value', '')
    const tokens = this.maskTokens()
    this.lastRawValue = tokens ? extractMaskFrom(tokens, value, 0) : value
    if (!this.inputEl) return
    if (tokens) {
      this.applyMaskValue(tokens, this.lastRawValue, null)
    } else {
      this.inputEl.value = this._formatter ? this._formatter(value) : value
    }
    this.committedValue = this.rawValue()
    this.syncClearVisibility()
    this.syncCount()
    this.measureAutoWidth()
    this.syncValidity()
  }

  /** formatter/parser property 变化后重刷显示（不动受控基线）；mask 在场时按 mask 优先重渲染并告警互斥 */
  private refreshFormatter(): void {
    if (!this.inputEl) return
    const tokens = this.maskTokens()
    if (tokens) {
      warnMaskFormatterConflict()
      this.applyMaskValue(tokens, this.lastRawValue, null)
    } else if (this._formatter) {
      const display = this._formatter(this.lastRawValue)
      if (this.inputEl.value !== display) this.inputEl.value = display
    } else if (this.inputEl.value !== this.lastRawValue) {
      this.inputEl.value = this.lastRawValue
    }
    this.syncClearVisibility()
    this.syncCount()
    this.measureAutoWidth()
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.injectDisabled() &&
      !this.hasAttr('readonly') &&
      // loading 优先：加载中清除按钮让位给 spinner（值不变动，避免加载期误清）
      !this.hasAttr('loading') &&
      this.inputEl !== null &&
      this.inputEl.value !== ''
    )
  }

  /** loading 加载态：尾部 spinner + aria-busy（不禁用输入）；镜像 data-loading 驱动让位 CSS。
   *  aria-busy 用 set/remove（对齐 pin-input/tag pattern）：非 loading 不留宿主属性，SSR 快照零扰动 */
  private syncLoading(): void {
    const loading = this.hasAttr('loading')
    this.toggleAttribute('data-loading', loading)
    if (loading) this.setAttribute('aria-busy', 'true')
    else this.removeAttribute('aria-busy')
    if (this.spinnerEl) this.spinnerEl.hidden = !loading
  }

  /** hint 静态提示文案：文字同步 + 显隐；有文案时内层 input 经 aria-describedby 关联提示元素。
   *  与校验错误（status/aria-invalid）相互独立——提示常驻，不随校验态变化 */
  private syncHint(): void {
    const i = this.inputEl
    if (!i) return
    const hint = this.getAttr('hint', '')
    if (this.hintEl) {
      if (this.hintEl.textContent !== hint) this.hintEl.textContent = hint
      this.hintEl.hidden = hint === ''
    }
    if (hint === '') i.removeAttribute('aria-describedby')
    else i.setAttribute('aria-describedby', HINT_ID)
  }

  private syncClearVisibility(): void {
    if (!this.clearBtn || !this.inputEl) return
    this.clearBtn.hidden = !this.shouldShowClear()
  }

  /** show-password 眼睛按钮：仅 type=password + show-password + 未禁用时显示；切换明文/密文 */
  private syncPasswordReveal(): void {
    if (!this.inputEl || !this.eyeBtn) return
    const type = this.getAttr('type', 'text')
    const isPassword = type === 'password'
    if (!isPassword) this.revealed = false
    this.inputEl.type = isPassword && this.revealed ? 'text' : type
    const showEye = isPassword && this.hasAttr('show-password') && !this.injectDisabled()
    this.eyeBtn.hidden = !showEye
    if (showEye) {
      this.eyeBtn.setAttribute('aria-pressed', String(this.revealed))
      this.eyeBtn.setAttribute(
        'aria-label',
        this.revealed ? this.t('input.hidePassword') : this.t('input.showPassword'),
      )
    }
  }

  /** show-count 字数统计：字素（grapheme）计数，outside 右下角 / inside 输入区内；
   *  maxlength 在场显示 当前字素数/上限，超限标 data-over 并在状态翻转时派发 oas-validate */
  private syncCount(): void {
    if (!this.countEl || !this.inputEl) return
    const show = this.hasAttr('show-count')
    this.countEl.hidden = !show
    const position = this.getAttr('count-position', '') === 'inside' ? 'inside' : 'outside'
    this.countEl.setAttribute('data-position', position)
    this.toggleAttribute('data-count-inside', show && position === 'inside')
    if (!show) return
    const maxlength = this.getAttr('maxlength', '')
    const len = countGraphemes(this.rawValue())
    this.countEl.textContent = maxlength === '' ? String(len) : `${len}/${maxlength}`
    const over = maxlength !== '' && len > Number(maxlength)
    if (over) this.countEl.setAttribute('data-over', 'true')
    else this.countEl.removeAttribute('data-over')
    // oas-validate：越界状态翻转时派发（首帧建立基线静默，不响应初始渲染）
    if (!this.overLimitInitialized) {
      this.overLimitInitialized = true
      this.overLimit = over
    } else if (over !== this.overLimit) {
      this.overLimit = over
      this.emit('validate', { error: over ? 'exceed-maximum' : null })
    }
  }

  /** addon 区：addon-before/after 文案（attribute 文本为 slot fallback）+ prepend/append slot 复杂内容分发。
   *  双通道与 prefix/suffix 同构：slot 有分发时原生替换 fallback，显隐 = 有 attribute 文本 || slot 有内容；
   *  slot 分发时给 host 打 data-slot-prepend/append 驱动圆角合并选择器；
   *  分发自包含控件（按钮族）时给托盘打 data-addon-control 退化为贴合容器，并把圆角合并协议注入控件。 */
  private syncAddons(): void {
    const setAddon = (partName: string, attrName: string, slotMark: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${partName}"]`)
      if (!el) return
      const slotEl = el.querySelector<HTMLSlotElement>('slot')
      const fallback = el.querySelector<HTMLElement>('[data-fallback]')
      const text = this.getAttr(attrName, '')
      if (fallback) fallback.textContent = text
      // 注意不能用 flatten:true——空 slot 的扁平化结果会包含 fallback 子节点，导致恒判有内容
      const slotHasContent =
        slotEl !== null && slotEl.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim() !== '')
      el.hidden = text === '' && !slotHasContent
      if (slotHasContent) this.setAttribute(slotMark, '')
      else this.removeAttribute(slotMark)

      // 自包含控件（按钮族）：托盘退化为贴合容器（CSS [data-addon-control]），
      // 并把圆角合并协议穿透给控件——外角在行内起始侧（prepend）/结束侧（append），RTL 下互换。
      const control = slotHasContent
        ? slotEl!
            .assignedNodes()
            .find((n): n is HTMLElement => n.nodeType === 1 && ADDON_CONTROL_TAGS.has((n as HTMLElement).tagName))
        : undefined
      if (control && control.tagName === 'OAS-BUTTON') {
        el.setAttribute('data-addon-control', '')
        const start = 'var(--oas-radius-md) 0 0 var(--oas-radius-md)'
        const end = '0 var(--oas-radius-md) var(--oas-radius-md) 0'
        const atEnd = (partName === 'append') !== isRtl(this)
        el.style.setProperty('--oas-button-group-radius', atEnd ? end : start)
      } else if (control) {
        // oas-button-group / oas-compact 自行向子控件注入同一协议，仅标记托盘、不重复注入
        el.setAttribute('data-addon-control', '')
        el.style.removeProperty('--oas-button-group-radius')
      } else {
        el.removeAttribute('data-addon-control')
        el.style.removeProperty('--oas-button-group-radius')
      }
    }
    setAddon('prepend', 'addon-before', 'data-slot-prepend')
    setAddon('append', 'addon-after', 'data-slot-append')
  }

  /** 内嵌前后缀：prefix/suffix 文案（attribute 文本为 slot fallback）+ prefix-icon/suffix-icon 图标（iconRegistry 内联 SVG）。
   *  attribute 与 slot 双通道并行：slot 有分发时原生替换 fallback（零 JS 优先级判断），attribute 文本只写 fallback 不直接覆盖 span
   *  （避免误清 slot 节点）；显隐 = 有 attribute 文本 || slot 有分发内容；slot 分发时给 host 打 data-slot-prefix/suffix 驱动 input 内边距。 */
  private syncAffixes(): void {
    const renderIcon = (part: string, iconName: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const content = iconName ? iconRegistry[iconName as IconName] : undefined
      if (content) {
        el.hidden = false
        // 装饰性图标对读屏隐藏（输入框 aria-label 提供可访问名称）
        el.setAttribute('aria-hidden', 'true')
        el.textContent = ''
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '0 0 16 16')
        svg.setAttribute('width', '1em')
        svg.setAttribute('height', '1em')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.innerHTML = content
        el.appendChild(svg)
      } else {
        el.hidden = true
        el.removeAttribute('aria-hidden')
        el.textContent = ''
      }
    }
    const renderAffix = (part: string, text: string, slotMark: string): void => {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) return
      const slotEl = el.querySelector<HTMLSlotElement>('slot')
      const fallback = el.querySelector<HTMLElement>('[data-fallback]')
      if (fallback) fallback.textContent = text
      // 注意不能用 flatten:true——空 slot 的扁平化结果会包含 fallback 子节点，导致恒判有内容
      const slotHasContent =
        slotEl !== null && slotEl.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim() !== '')
      const visible = text !== '' || slotHasContent
      el.hidden = !visible
      // host 布局联动：slot 有内容时打标记驱动 input 内边距选择器（CSS :host([data-slot-*])）
      if (slotHasContent) this.setAttribute(slotMark, '')
      else this.removeAttribute(slotMark)
    }
    renderIcon('prefix-icon', this.getAttr('prefix-icon', ''))
    renderAffix('prefix', this.getAttr('prefix-text', ''), 'data-slot-prefix')
    renderIcon('suffix-icon', this.getAttr('suffix-icon', ''))
    renderAffix('suffix', this.getAttr('suffix-text', ''), 'data-slot-suffix')
  }

  /** auto-width 钳制变量：min/max 属性写入 CSS 变量（JS 不做钳制，交给 min-width/max-width） */
  private syncAutoWidthVars(): void {
    const readPx = (name: string): string | null => {
      const raw = this.getAttr(name, '')
      if (raw === '') return null
      const n = Number(raw)
      return Number.isFinite(n) && n >= 0 ? `${n}px` : null
    }
    if (this.hasAttr('auto-width')) {
      const min = readPx('auto-width-min')
      if (min) this.style.setProperty('--oas-input-auto-min', min)
      else this.style.removeProperty('--oas-input-auto-min')
      const max = readPx('auto-width-max')
      if (max) this.style.setProperty('--oas-input-auto-max', max)
      else this.style.removeProperty('--oas-input-auto-max')
    } else {
      this.style.removeProperty('--oas-input-auto-min')
      this.style.removeProperty('--oas-input-auto-max')
      this.style.removeProperty('--oas-input-measured')
    }
  }

  /** auto-width 测宽：mirror 文本 = 当前值（空值回落 placeholder），测量结果写入 --oas-input-measured。
   *  mirror 与 input 共享字号/内边距/边框规则（含前后缀让位），offsetWidth 即目标宽度；
   *  测量失败（0，如 SSR/无布局环境）不写入，回落 CSS width:100%。 */
  private measureAutoWidth(): void {
    if (!this.hasAttr('auto-width') || !this.inputEl || !this.measureEl) return
    this.measureEl.textContent = this.inputEl.value || this.getAttr('placeholder', '')
    const w = this.measureEl.offsetWidth
    if (w > 0) this.style.setProperty('--oas-input-measured', `${w}px`)
    else this.style.removeProperty('--oas-input-measured')
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }

  /** 失焦委托：把 blur 交给 shadow 内主输入 */
  override blur(): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.blur()
  }

  /** 选中输入框全部内容（委托原生 input.select） */
  select(): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.select()
  }
}

// 声明合并：为运行期用 defineProperty 遮蔽定义的 prefix/suffix 兼容属性补类型
export interface OASInput {
  /** 前缀兼容属性（遮蔽只读 Element.prefix，映射到规范属性 prefix-text） */
  prefix: string
  /** 后缀兼容属性（无 DOM 对应，为对称与 property 通道一并遮蔽，映射到规范属性 suffix-text） */
  suffix: string
}
