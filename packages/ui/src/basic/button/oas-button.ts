import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type ButtonType = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'text'
export type ButtonSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'
/** variant 形态维度（正交 type 语义色）：solid 实底 / outlined 描边 / dashed 虚线描边 / filled 浅底 / text 文字 / link 链接 */
export type ButtonVariant = 'solid' | 'outlined' | 'dashed' | 'filled' | 'text' | 'link'

const VALID_BUTTON_SIZES: readonly ButtonSize[] = ['xs', 'small', 'medium', 'large', 'xl']
const VALID_BUTTON_VARIANTS: readonly ButtonVariant[] = [
  'solid',
  'outlined',
  'dashed',
  'filled',
  'text',
  'link',
]

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重） */
function normalizeButtonSize(raw: string): ButtonSize {
  if ((VALID_BUTTON_SIZES as readonly string[]).includes(raw)) return raw as ButtonSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-button] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
  }
  return 'medium'
}

const warnedSizes = new Set<string>()

/**
 * 自定义色实心底的文字色：按相对亮度取深/浅，保证对比可读。
 * 支持 #rgb/#rrggbb/rgb(a) 解析；其余写法（var()/色名）返回 ''（走 CSS 兜底 token）。
 */
function pickOnColor(color: string): string {
  let r = 0
  let g = 0
  let b = 0
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/(.)/g, '$1$1') : hex[1]!
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else if (rgb) {
    r = Number(rgb[1])
    g = Number(rgb[2])
    b = Number(rgb[3])
  } else {
    return ''
  }
  // W3C 相对亮度；0.35 阈值：亮底（如暗色主题 primary）取深字、暗底（如 #7c3aed）取白字
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  return lum > 0.35 ? '#18181b' : '#ffffff'
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([block]) {
  display: block;
  width: 100%;
}
:host([block]) button {
  width: 100%;
}
button,
a[part='button'] {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  /* color 自定义色的兜底入口：无 type 时 outlined/filled/text 等形态也能吃到 --oas-button-color */
  --btn-color: var(--oas-button-color, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  /* 默认单行不换行（通行做法）；长文换行需显式 wrap 属性（见末尾 .wrap 规则） */
  white-space: nowrap;
  text-align: center;
  /* button-group 通过自定义属性合并相邻圆角/拉满宽度（::slotted 后不支持链 ::part，故走变量穿透） */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
  width: var(--oas-button-group-width, auto);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  text-decoration: none;
  box-sizing: border-box;
}
button:hover,
a[part='button']:hover {
  background: var(--oas-color-bg-hover);
}
/* 图标按钮：图标与文字间距走 --oas-space-2 */
button.has-icon {
  gap: var(--oas-space-2);
}
/* 纯图标按钮：等宽正方形（width = height），去除水平内边距；优先级高于 size 档的 padding（large/xl 的 :not(.icon-only) 不覆盖） */
button.icon-only {
  aspect-ratio: 1;
  padding: 0 !important;
}
/* 块级按钮占满父容器 */
button.block {
  width: 100%;
}
/* 胶囊圆角（button-group 合并圆角经自定义属性穿透，round 显式覆盖） */
button.round,
a[part='button'].round {
  border-radius: var(--oas-radius-full, 999px);
}
/* 圆形按钮（纯图标常用）：正方形 + 正圆角 */
button.circle,
a[part='button'].circle {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 50%;
}
/* 图标在右：icon 后置到文字之后（icon-end 尾部图标天然在最后，用 :not 排除） */
button.icon-end .icon:not([part='icon-end']),
a[part='button'].icon-end .icon:not([part='icon-end']) {
  order: 2;
}
/* 朴素按钮：弱化填充（浅底 + 主色文字），text 已是朴素 */
button.plain.primary {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-primary) 80%, black);
}
button.plain.primary:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 20%, transparent);
}
button.plain.primary:active {
  background: color-mix(in srgb, var(--oas-color-primary) 26%, transparent);
}
button.plain.success {
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-success) 80%, black);
}
button.plain.success:hover {
  background: color-mix(in srgb, var(--oas-color-success) 20%, transparent);
}
button.plain.warning {
  background: color-mix(in srgb, var(--oas-color-warning) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
}
button.plain.warning:hover {
  background: color-mix(in srgb, var(--oas-color-warning) 20%, transparent);
}
button.plain.danger {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
  border-color: transparent;
  color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
}
button.plain.danger:hover {
  background: color-mix(in srgb, var(--oas-color-danger) 20%, transparent);
}

/* 链接按钮禁用态（a 无 disabled 属性，用 aria-disabled + 与 button 一致配色） */
a[part='button'][aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
a[part='button'][aria-disabled='true']:hover {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.icon {
  display: inline-flex;
}
.icon[hidden] {
  display: none;
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 选中态（button-group 单/多选经 host aria-pressed 标记）；置于类型规则前，有色按钮由下方规则覆盖 */
:host([aria-pressed='true']) button,
:host([aria-pressed='true']) a[part='button'] {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
button[part~='button'][disabled],
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
button.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
a[part='button'].primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
button.primary:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
button.primary:active {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
}
button.success {
  background: color-mix(in srgb, var(--oas-color-success) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: var(--oas-color-text-on-success);
}
a[part='button'].success {
  background: color-mix(in srgb, var(--oas-color-success) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: var(--oas-color-text-on-success);
}
button.success:hover {
  /* hover 变暗、选中更深（0.94 → 0.85）：与 primary 的 color-mix 加深体系同向递进 */
  filter: brightness(0.94);
}
button.warning {
  background: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: var(--oas-color-text-on-warning);
}
a[part='button'].warning {
  background: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: var(--oas-color-text-on-warning);
}
button.warning:hover {
  filter: brightness(0.94);
}
button.danger {
  background: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  color: var(--oas-color-text-on-danger);
}
a[part='button'].danger {
  background: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  border-color: color-mix(in srgb, var(--oas-color-danger) 80%, black);
  color: var(--oas-color-text-on-danger);
}
button.danger:hover {
  filter: brightness(0.94);
}
/* 有色 / text 按钮的选中态覆盖（选中比 hover 更深一档：0.85 vs 0.94）。
   anchor 变体必须与 button 一样带 :host([aria-pressed]) 前缀——曾现 bug：a 镜像规则丢了前缀，
   带 href 的 primary/text 按钮静止时永久显示选中色 */
:host([aria-pressed='true']) button.primary,
:host([aria-pressed='true']) a[part='button'].primary {
  background: var(--oas-color-primary-active);
  border-color: var(--oas-color-primary-active);
  /* 选中态基础规则（:host([aria-pressed]) button）把文字设为主色，primary 深底上需白字 */
  color: var(--oas-color-text-on-primary);
}
:host([aria-pressed='true']) button.success,
:host([aria-pressed='true']) button.warning,
:host([aria-pressed='true']) button.danger,
:host([aria-pressed='true']) a[part='button'].success,
:host([aria-pressed='true']) a[part='button'].warning,
:host([aria-pressed='true']) a[part='button'].danger {
  filter: brightness(0.85);
}
:host([aria-pressed='true']) button.text,
:host([aria-pressed='true']) a[part='button'].text {
  color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
button.small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
a[part='button'].small {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
button.xs {
  height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
}
a[part='button'].xs {
  height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
}
button.xs:not(.icon-only) {
  padding: 0 6px;
  /* xs 档防过窄：最小宽放宽至 44px（其余档 56px） */
  min-width: 44px;
}
button.large {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-5);
}
a[part='button'].large {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-5);
}
button.xl {
  height: var(--oas-control-height-xl);
  font-size: var(--oas-font-size-xl);
}
a[part='button'].xl {
  height: var(--oas-control-height-xl);
  font-size: var(--oas-font-size-xl);
}
button.xl:not(.icon-only) {
  padding: 0 var(--oas-space-6);
}
/* wrap 长文换行（显式属性开启）：white-space 恢复正常、盒随内容长高，单行时与默认等高（min-height 兜底） */
button.wrap,
a[part='button'].wrap {
  white-space: normal;
  height: auto;
  min-height: var(--oas-control-height-md);
  padding-block: 2px;
}
button.small.wrap,
a[part='button'].small.wrap {
  min-height: var(--oas-control-height-sm);
}
button.xs.wrap,
a[part='button'].xs.wrap {
  min-height: var(--oas-control-height-xs);
}
button.large.wrap,
a[part='button'].large.wrap {
  min-height: var(--oas-control-height-lg);
}
button.xl.wrap,
a[part='button'].xl.wrap {
  min-height: var(--oas-control-height-xl);
}
button.text {
  border-color: transparent;
  background: transparent;
}
a[part='button'].text {
  border-color: transparent;
  background: transparent;
}
/* 幽灵按钮：透明底 + 描边，按 type 着色，hover 加深 */
button.ghost {
  background: transparent;
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
a[part='button'].ghost {
  background: transparent;
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-primary);
}
button.ghost:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border-strong);
}
button.ghost.primary {
  background: transparent;
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
a[part='button'].ghost.primary {
  background: transparent;
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
button.ghost.primary:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  border-color: var(--oas-color-primary-hover);
  color: var(--oas-color-primary-hover);
}
button.ghost.primary:active {
  background: color-mix(in srgb, var(--oas-color-primary) 16%, transparent);
  border-color: var(--oas-color-primary-active);
  color: var(--oas-color-primary-active);
}
button.ghost.success {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#16a34a 仅 3.3:1） */
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: color-mix(in srgb, var(--oas-color-success) 80%, black);
}
a[part='button'].ghost.success {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#16a34a 仅 3.3:1） */
  border-color: color-mix(in srgb, var(--oas-color-success) 80%, black);
  color: color-mix(in srgb, var(--oas-color-success) 80%, black);
}
button.ghost.success:hover {
  background: color-mix(in srgb, var(--oas-color-success) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-success) 70%, black);
  color: color-mix(in srgb, var(--oas-color-success) 70%, black);
}
button.ghost.warning {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#d97706 仅 3.18:1） */
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
}
a[part='button'].ghost.warning {
  background: transparent;
  /* 文字/描边用更深色（token 80% + 20% 黑），白底对比度 ≥ 4.5:1（#d97706 仅 3.18:1） */
  border-color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
  color: color-mix(in srgb, var(--oas-color-warning) 80%, black);
}
button.ghost.warning:hover {
  background: color-mix(in srgb, var(--oas-color-warning) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-warning) 70%, black);
  color: color-mix(in srgb, var(--oas-color-warning) 70%, black);
}
button.ghost.danger {
  background: transparent;
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
a[part='button'].ghost.danger {
  background: transparent;
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
button.ghost.danger:hover {
  background: color-mix(in srgb, var(--oas-color-danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--oas-color-danger) 70%, black);
  color: color-mix(in srgb, var(--oas-color-danger) 70%, black);
}
/* 幽灵禁用：回落到禁用配色，防止 ghost/ghost:hover 覆盖 disabled 样式 */
button.ghost[disabled],
button.ghost[disabled]:hover,
button.ghost[disabled]:active {
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
a[part='button'].ghost[disabled]:active {
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
/* ===== variant 形态维度（正交 type 语义色）===== */
/* 语义色变量：type 决定；color 属性经 --oas-button-color 覆盖 */
button.primary,
a[part='button'].primary {
  --btn-color: var(--oas-button-color, var(--oas-color-primary));
}
button.success,
a[part='button'].success {
  --btn-color: var(--oas-button-color, color-mix(in srgb, var(--oas-color-success) 80%, black));
}
button.warning,
a[part='button'].warning {
  --btn-color: var(--oas-button-color, color-mix(in srgb, var(--oas-color-warning) 80%, black));
}
button.danger,
a[part='button'].danger {
  --btn-color: var(--oas-button-color, var(--oas-color-danger));
}
/* outlined：透明底 + 语义色描边与文字 */
button.outlined,
a[part='button'].outlined {
  background: transparent;
  border-color: var(--btn-color, var(--oas-color-border));
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.outlined:hover,
a[part='button'].outlined:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* dashed：虚线描边（outlined + 虚线样式） */
button.dashed,
a[part='button'].dashed {
  background: transparent;
  border: 1px dashed var(--btn-color, var(--oas-color-border));
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.dashed:hover,
a[part='button'].dashed:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* filled：浅底 soft（语义色 12% 底 + 80% 深文字） */
button.filled,
a[part='button'].filled {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 12%, transparent);
  border-color: transparent;
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.filled.primary,
a[part='button'].filled.primary,
button.filled.success,
a[part='button'].filled.success,
button.filled.warning,
a[part='button'].filled.warning,
button.filled.danger,
a[part='button'].filled.danger {
  color: color-mix(in srgb, var(--btn-color) 80%, black);
}
button.filled:hover,
a[part='button'].filled:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 18%, transparent);
}
/* text：纯文字（无框无背景） */
button.text,
a[part='button'].text {
  background: transparent;
  border-color: transparent;
  color: var(--btn-color, var(--oas-color-text-primary));
}
button.text:hover,
a[part='button'].text:hover {
  background: color-mix(in srgb, var(--btn-color, var(--oas-color-text-primary)) 8%, transparent);
}
/* link：链接样式（主色文字 + hover 下划线），常配合 href */
button.link,
a[part='button'].link {
  background: transparent;
  border-color: transparent;
  color: var(--oas-button-color, var(--oas-color-primary));
}
button.link:hover,
a[part='button'].link:hover {
  color: var(--oas-button-color, var(--oas-color-primary-hover));
  text-decoration: underline;
  background: transparent;
}
/* solid 背景走 --oas-button-bg 变量（支持渐变覆盖，默认语义色）；仅 solid 生效，避免覆盖 filled/outlined 等形态。
   :not() 链必须包在 :where() 里归零权重——裸写会把规则堆到 (0,6,1)，压死 hover/active/aria-pressed
   选中态的 background（三态视觉反馈全失效，曾现 bug）；:where() 版 (0,1,1) 与上方 button.primary 同权重、
   靠后取胜，恰好只承担默认底色覆盖职责。 */
button.primary:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)),
a[part='button'].primary:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)) {
  background: var(--oas-button-bg, var(--oas-color-primary));
}
/* color 自定义色 + solid（默认形态）：无 type 也实心着色（覆盖 type 语义色）。
   :where() 归零 :not() 链权重，与上方类型规则同级靠后取胜；hover/active 等状态规则仍优先 */
button.has-color:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)),
a[part='button'].has-color:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)) {
  background: var(--oas-button-bg, var(--oas-button-color));
  border-color: var(--oas-button-bg, var(--oas-button-color));
  color: var(--oas-button-on-color, var(--oas-color-text-on-primary));
}
/* 自定义色实心 hover 加深（与状态色体系统一方向） */
button.has-color:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)):hover,
a[part='button'].has-color:where(:not(.filled):not(.outlined):not(.dashed):not(.text):not(.link)):hover {
  background: color-mix(in srgb, var(--oas-button-bg, var(--oas-button-color)) 85%, black);
  border-color: color-mix(in srgb, var(--oas-button-bg, var(--oas-button-color)) 85%, black);
}
/* press 反馈（wave 默认开）：按下轻微下沉 + 加深，克制不抢眼 */
button.wave,
a[part='button'].wave {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    filter var(--oas-transition-fast) var(--oas-ease-out);
}
button.wave:active,
a[part='button'].wave:active {
  transform: scale(0.97);
  filter: brightness(0.94);
}
/* disabled-focusable：视觉禁用（降饱和 + 禁用配色）但保持可聚焦/可 hover（供 tooltip 解释禁用原因）。
   不设原生 disabled；点击由 JS 拦截。置于形态规则之后覆盖 type 的 hover/active 重着色，
   同时归零 wave 的按下反馈（transform/filter），保证禁用外观恒定 */
button.disabled-focusable,
a[part='button'].disabled-focusable,
button.disabled-focusable:hover,
a[part='button'].disabled-focusable:hover,
button.disabled-focusable:active,
a[part='button'].disabled-focusable:active {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
  transform: none;
  filter: none;
}
/* loading 态宽度稳定：spinner 绝对定位居中不撑宽；原文字/图标仅 visibility 隐藏（保留占位宽度），
   loading 前后按钮宽度不变。带 loading-text 时原内容彻底移除，spinner 与 loading-text 流内布局 */
button.loading,
a[part='button'].loading {
  position: relative;
}
button.loading .spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
button.loading slot,
button.loading .icon {
  visibility: hidden;
}
button.loading-with-text slot,
button.loading-with-text .icon {
  display: none;
}
button.loading-with-text .spinner {
  position: static;
  transform: none;
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASButton extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'type',
      'size',
      'disabled',
      'disabled-focusable',
      'loading',
      'loading-text',
      'icon',
      'icon-end',
      'block',
      'round',
      'ghost',
      'circle',
      'icon-position',
      'href',
      'target',
      'download',
      'rel',
      'plain',
      'variant',
      'color',
      'wave',
      'auto-insert-space',
      'wrap',
    ]
  }

  private btn: HTMLElement | null = null

  /** loading="auto"：宿主 oas-click 处理返回 Promise 期间是否处于自动加载态 */
  private autoLoading = false
  /** loading="auto"：本次点击收集到的宿主异步处理 Promise（resolve/reject 后退出 loading） */
  private autoPromises: PromiseLike<unknown>[] = []
  /** 被包装的 oas-click 宿主监听器（原函数 → 包装函数），removeEventListener 时反查解绑 */
  private wrappedListeners = new WeakMap<EventListener, EventListener>()

  constructor() {
    super()
    // 尽早安装 oas-click 监听包装：宿主监听一般在 connect/render 之后注册，需先于其生效
    this.patchEventListener()
  }

  /** 是否为链接按钮（渲染 <a> 而非 <button>） */
  private isLink(): boolean {
    return this.getAttr('href', '') !== ''
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const href = this.getAttr('href', '')
    const target = this.getAttr('target', '')
    const download = this.getAttr('download', '')
    const rel = this.getAttr('rel', '')
    const tag = href ? 'a' : 'button'
    const hrefAttr = [
      href ? ` href="${href}"` : '',
      target ? ` target="${target}"` : '',
      // download 支持空值布尔（浏览器用原链接文件名），用 hasAttr 判断存在即透传
      this.hasAttr('download') ? ` download="${download}"` : '',
      rel ? ` rel="${rel}"` : '',
    ].join('')
    return `
      <style>${STYLE}</style>
      <${tag} part="button"${hrefAttr}>
        <span class="spinner" part="spinner" hidden></span>
        <span class="icon" part="icon" aria-hidden="true" hidden></span>
        <slot></slot>
        <span class="loading-text" hidden></span>
        <span class="icon" part="icon-end" aria-hidden="true" hidden></span>
      </${tag}>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector('button[part="button"], a[part="button"]')

    this.btn?.addEventListener('click', (e: MouseEvent) => {
      if (this.hasAttr('disabled') || this.hasAttr('disabled-focusable') || this.isLoading()) {
        e.preventDefault()
        return
      }
      // loading="auto"：宿主 oas-click 处理返回 Promise 期间自动进入 loading（resolve/reject 后退出）
      const isAuto = this.getAttribute('loading') === 'auto'
      if (isAuto) {
        this.autoLoading = true
        this.autoPromises = []
        this.update()
      }
      this.emit('click', { originalEvent: e })
      if (isAuto) {
        if (this.autoPromises.length > 0) {
          // allSettled：任一 reject 也不提前终止，全部 settle 后统一退出
          void Promise.allSettled(this.autoPromises).then(() => this.exitAutoLoading())
        } else {
          // 宿主未返回 Promise：同步退出，不留 loading 残影
          this.exitAutoLoading()
        }
      }
    })

    // 文字经 slot 增删时重算「纯图标 / 有文字」布局
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())

    // autofocus：转发到内部按钮（原生 autofocus 不穿透 shadow，挂载后手动聚焦一次）
    if (this.hasAttr('autofocus')) {
      queueMicrotask(() => this.btn?.focus())
    }
  }

  /**
   * 包装宿主 addEventListener/removeEventListener（仅 oas-click 生效）：捕获宿主监听器
   * 返回的 Promise，供 loading="auto" 自动 loading 使用。其余事件原样透传；
   * 走原型方法避免递归（自身已被重写）。
   */
  private patchEventListener(): void {
    const self = this
    const addOriginal = EventTarget.prototype.addEventListener
    const removeOriginal = EventTarget.prototype.removeEventListener

    Object.defineProperty(this, 'addEventListener', {
      configurable: true,
      writable: true,
      value: function (
        this: OASButton,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (type === 'oas-click' && typeof listener === 'function') {
          const fn = listener as EventListener
          // 同一监听器重复注册时复用已有包装，避免双包装双触发
          let wrapper = self.wrappedListeners.get(fn)
          if (!wrapper) {
            wrapper = (e: Event) => {
              // EventListener 类型声明返回 void，实际宿主可能返回 Promise，按 unknown 取值
              const ret = (fn as (evt: Event) => unknown)(e)
              if (ret && typeof (ret as PromiseLike<unknown>).then === 'function') {
                self.autoPromises.push(ret as PromiseLike<unknown>)
              }
            }
            self.wrappedListeners.set(fn, wrapper)
          }
          return addOriginal.call(this, type, wrapper, options)
        }
        return addOriginal.call(this, type, listener, options)
      },
    })

    Object.defineProperty(this, 'removeEventListener', {
      configurable: true,
      writable: true,
      value: function (
        this: OASButton,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ) {
        if (type === 'oas-click' && typeof listener === 'function') {
          const fn = listener as EventListener
          const wrapped = self.wrappedListeners.get(fn)
          if (wrapped) self.wrappedListeners.delete(fn)
          return removeOriginal.call(this, type, wrapped ?? listener, options)
        }
        return removeOriginal.call(this, type, listener, options)
      },
    })
  }

  /** 当前是否处于加载态：布尔 loading 属性（空值/任意值均算，仅 "auto" 除外）或 auto 自动加载中 */
  private isLoading(): boolean {
    const raw = this.getAttribute('loading')
    return (raw != null && raw !== 'auto') || this.autoLoading
  }

  /** 退出 loading="auto" 自动加载态（宿主 Promise resolve/reject 后调用） */
  private exitAutoLoading(): void {
    if (!this.autoLoading) return
    this.autoLoading = false
    this.autoPromises = []
    this.update()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（关键节点 button/a[part=button] 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('button[part="button"], a[part="button"]')) return false
    this.bind()
    return true
  }

  /** href/target 增删会改变内部元素类型（button ↔ a），需重建 shadow；其余属性走 update() */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if ((name === 'href' || name === 'target') && this.hasRendered) {
      this.shadow.innerHTML = this.template()
      this.bind()
      this.update()
      return
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  protected override update(): void {
    if (!this.btn) return
    const type = this.getAttr('type', 'default') as ButtonType
    // size 就近读取 config-provider 注入值（自身属性 > config-provider > medium）
    const size = normalizeButtonSize(this.injectValue('size', 'medium') as ButtonSize)
    const disabled = this.hasAttr('disabled')
    const disabledFocusable = this.hasAttr('disabled-focusable')
    const loading = this.isLoading()
    const loadingText = this.getAttr('loading-text', '')
    const icon = this.getAttr('icon', '')
    const iconEnd = this.getAttr('icon-end', '')
    const ghost = this.hasAttr('ghost')
    const block = this.hasAttr('block')
    const round = this.hasAttr('round')
    const circle = this.hasAttr('circle')
    const plain = this.hasAttr('plain')
    const iconPosition = this.getAttr('icon-position', 'start')
    const link = this.isLink()
    // variant 形态维度：显式 variant 属性优先；否则按旧属性映射（ghost→outlined、plain→filled、type=text→text），默认 solid
    const rawVariant = this.getAttr('variant', '') as ButtonVariant | ''
    const variant: ButtonVariant = (VALID_BUTTON_VARIANTS as readonly string[]).includes(rawVariant)
      ? (rawVariant as ButtonVariant)
      : ghost
        ? 'outlined'
        : plain
          ? 'filled'
          : type === 'text'
            ? 'text'
            : 'solid'
    const color = this.getAttr('color', '')
    const wave = this.getAttr('wave', 'true') !== 'false'

    const hasLeadingIcon = icon !== '' && iconRegistry[icon as IconName] !== undefined
    const hasEndIcon = iconEnd !== '' && iconRegistry[iconEnd as IconName] !== undefined
    const hasIcon = hasLeadingIcon || hasEndIcon
    const hasText = (this.textContent ?? '').trim().length > 0
    const iconOnly = hasIcon && !hasText

    this.btn.className = [
      type,
      size,
      // variant 形态 class（solid 为默认不加 class；旧属性 ghost/plain 仍保留 class 兼容旧 CSS）
      variant !== 'solid' ? variant : '',
      ghost ? 'ghost' : '',
      block ? 'block' : '',
      round ? 'round' : '',
      circle ? 'circle' : '',
      plain ? 'plain' : '',
      iconPosition === 'end' ? 'icon-end' : '',
      hasIcon ? 'has-icon' : '',
      iconOnly ? 'icon-only' : '',
      wave ? 'wave' : '',
      this.hasAttr('wrap') ? 'wrap' : '',
      color ? 'has-color' : '',
      disabledFocusable ? 'disabled-focusable' : '',
      loading ? 'loading' : '',
      loading && loadingText ? 'loading-with-text' : '',
    ]
      .filter(Boolean)
      .join(' ')
    // color 自定义色：覆盖 type 语义色（经 --oas-button-color 变量，CSS 配色处兜底引用）
    if (color) {
      this.btn.style.setProperty('--oas-button-color', color)
      // 实心底文字色按底色亮度取黑/白（on-primary 对中间调自定义色可能不可读）
      this.btn.style.setProperty('--oas-button-on-color', pickOnColor(color))
    } else {
      this.btn.style.removeProperty('--oas-button-color')
      this.btn.style.removeProperty('--oas-button-on-color')
    }
    this.btn.setAttribute('aria-busy', loading ? 'true' : 'false')
    // aria-disabled 语义：disabled/loading 真禁用；disabled-focusable 视觉禁用但可聚焦
    const ariaDisabled = disabled || loading || disabledFocusable
    // 链接按钮（a）无 disabled 属性，用 aria-disabled 承载禁用语义 + CSS 禁用态；button 用原生 disabled
    if (link) {
      this.btn.setAttribute('aria-disabled', ariaDisabled ? 'true' : 'false')
      // download/rel 透传（href 模式）：变化经 update 增量同步，不重建 DOM
      const download = this.getAttr('download', '')
      const rel = this.getAttr('rel', '')
      if (this.hasAttr('download')) this.btn.setAttribute('download', download)
      else this.btn.removeAttribute('download')
      if (rel) this.btn.setAttribute('rel', rel)
      else this.btn.removeAttribute('rel')
    } else {
      ;(this.btn as HTMLButtonElement).disabled = disabled || loading
      if (disabledFocusable) this.btn.setAttribute('aria-disabled', 'true')
      else this.btn.removeAttribute('aria-disabled')
    }

    const spinner = this.btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !loading

    // loading-text：loading 时替换 label 显示（hidden 由 update 控制显隐）
    const loadingTextEl = this.btn.querySelector<HTMLElement>('.loading-text')
    if (loadingTextEl) {
      loadingTextEl.textContent = loadingText
      loadingTextEl.hidden = !(loading && loadingText)
    }

    // 图标：iconRegistry 内联 SVG（跟随 currentColor，装饰性对读屏隐藏）
    const iconEl = this.btn.querySelector<HTMLElement>('.icon')
    if (iconEl) this.renderIcon(iconEl, icon)
    const endIconEl = this.btn.querySelector<HTMLElement>('[part="icon-end"]')
    if (endIconEl) this.renderIcon(endIconEl, iconEnd)

    // 可访问名称：宿主 aria-label 优先；纯图标无文字时以图标名兜底
    const hostLabel = this.getAttribute('aria-label')
    if (hostLabel) {
      this.btn.setAttribute('aria-label', hostLabel)
    } else if (iconOnly) {
      this.btn.setAttribute('aria-label', icon || iconEnd)
    } else {
      this.btn.removeAttribute('aria-label')
    }

    // 中文间自动空格（默认开）：两个连续汉字之间插入空格（中文排版优化）
    this.applyAutoInsertSpace()
  }

  /** 向图标容器注入 iconRegistry 内联 SVG：空名/无效名时隐藏（跟随 currentColor，装饰性对读屏隐藏） */
  private renderIcon(el: HTMLElement, name: string): void {
    const content = name ? iconRegistry[name as IconName] : undefined
    el.hidden = !content
    el.innerHTML = ''
    if (content) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 16 16')
      svg.setAttribute('width', '1em')
      svg.setAttribute('height', '1em')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('focusable', 'false')
      svg.innerHTML = content
      el.appendChild(svg)
    }
  }

  /** 中文间自动空格：slot 文本里两个连续 CJK 字符间插入空格（auto-insert-space 默认关，opt-in） */
  private applyAutoInsertSpace(): void {
    if (!this.hasAttr('auto-insert-space') || this.getAttr('auto-insert-space', '') === 'false')
      return
    // 遍历宿主直接文本节点，两个连续汉字间插空格（不破坏元素子节点结构）
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) continue
      const text = node.textContent ?? ''
      const spaced = text.replace(/([\u4e00-\u9fa5])([\u4e00-\u9fa5])/g, '$1 $2')
      if (spaced !== text) node.textContent = spaced
    }
  }
}
