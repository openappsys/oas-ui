import { OASElement } from '@oas-ui/core'

export type BadgeMode = 'count' | 'ribbon'
export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger'
export type BadgePlacement = 'start' | 'end'
/** 缎带纵向位置：hang 挂沿下（默认）/ edge 贴顶边 / cross 骑跨顶边；非法值静默回落 hang */
export type BadgeRibbonPosition = 'hang' | 'edge' | 'cross'
/** bookmark 燕尾尖头方向：down 朝下（默认，顶边垂挂）/ left 朝左（贴右缘、缺口朝卡内）/ right 朝右（贴左缘镜像）；非法值静默回落 down */
export type BadgeRibbonDirection = 'down' | 'left' | 'right'
/** bookmark 侧挂（left/right）纵向位置：top 贴顶边 / center 垂直居中（默认）/ bottom 贴底边；非法值回落 center */
export type BadgeRibbonVertical = 'top' | 'center' | 'bottom'
/** diagonal 斜带档位：sm 紧凑（默认）/ md 中等 / lg 宽幅大字；档位只改带宽/字号/钉点的
    fallback 默认值，宿主 CSS 变量（--oas-badge-diagonal-*）优先级更高；非法值回落 sm */
export type BadgeRibbonSize = 'sm' | 'md' | 'lg'
/** 缎带锚点：8 位置预置（4 边中 + 4 角）。斜形态（diagonal/triangle）只认 4 角，
    非斜形态认全部 8 位置；非法值静默回落。用于替代并统一 placement/ribbon-position
    /ribbon-direction/ribbon-vertical 的定位职责（这些保留为兼容别名） */
export type BadgeRibbonAnchor =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
/** 缎带形态：fold 直条+折叠（默认）/ diagonal 45° 对角斜带 / triangle 角落三角 / bookmark 顶边燕尾竖条 / side 侧边竖挂 / seal 圆形锯齿印章 / banner 顶部横贯横幅 / flag 侧燕尾横旗（横条 + 探出端 V 缺口）；非法值静默回落 fold */
export type BadgeRibbonForm =
  | 'fold'
  | 'diagonal'
  | 'triangle'
  | 'bookmark'
  | 'side'
  | 'seal'
  | 'banner'
  | 'flag'
  | 'rounded'
  | 'zigzag'
  | 'arrow'
/** 吸引动画：外圈脉冲扩散 / 轻微上下弹跳（仅 count/dot/standalone 徽标，ribbon 不受影响） */
export type BadgeAttention = 'pulse' | 'bounce'
/** 角标四角定位（默认 top-right；非法值静默回落） */
export type BadgeCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
/** 状态点形态（行内独立元素，与角标模式互斥） */
export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning'
export type BadgeSize = 'small'
/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；非法名按普通色值处理） */
export type BadgePresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const BADGE_PRESET_COLORS: readonly BadgePresetColor[] = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
]

const VALID_STATUS: readonly string[] = ['success', 'processing', 'default', 'error', 'warning']
const VALID_ATTENTION: readonly string[] = ['pulse', 'bounce']
const VALID_CORNER: readonly string[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left']
const VALID_RIBBON_DIRECTIONS: readonly string[] = ['down', 'left', 'right']
const VALID_RIBBON_VERTICALS: readonly string[] = ['top', 'center', 'bottom']
const VALID_RIBBON_SIZES: readonly string[] = ['sm', 'md', 'lg']
const VALID_RIBBON_ANCHORS: readonly string[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]
/** 形态-锚点矩阵：斜形态（diagonal/triangle）穿角只认 4 角；非斜形态（fold/flag/banner/
    side/seal/bookmark）认全部 8 位置（4 边中 + 4 角），rolled 修饰符自动跟随宿主形态。
    任意位置靠 offset 微调兜底；不支持的锚点静默回落形态默认位置 */
const FORM_ANCHORS: Record<string, readonly string[]> = {
  fold: VALID_RIBBON_ANCHORS,
  diagonal: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  triangle: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  side: VALID_RIBBON_ANCHORS,
  banner: VALID_RIBBON_ANCHORS,
  seal: VALID_RIBBON_ANCHORS,
  bookmark: VALID_RIBBON_ANCHORS,
  flag: VALID_RIBBON_ANCHORS,
  rounded: VALID_RIBBON_ANCHORS,
  zigzag: VALID_RIBBON_ANCHORS,
  arrow: VALID_RIBBON_ANCHORS,
}
const VALID_RIBBON_FORMS: readonly string[] = [
  'fold',
  'diagonal',
  'triangle',
  'bookmark',
  'side',
  'seal',
  'banner',
  'flag',
  'rounded',
  'zigzag',
  'arrow',
]

/** corner 平移符号：X 向右为正，Y 向下为正（top 角 Y 为负） */
const CORNER_SIGN: Record<string, { sx: string; sy: string }> = {
  'top-right': { sx: '', sy: '-' },
  'top-left': { sx: '-', sy: '-' },
  'bottom-right': { sx: '', sy: '' },
  'bottom-left': { sx: '-', sy: '' },
}

/** 状态点语义色映射（status 属性） */
const STATUS_COLOR: Record<string, string> = {
  success: 'var(--oas-color-success)',
  processing: 'var(--oas-color-primary)',
  error: 'var(--oas-color-danger)',
  warning: 'var(--oas-color-warning)',
  default: 'var(--oas-color-text-secondary)',
}

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
  // W3C 相对亮度；0.35 阈值：亮底取深字、暗底取白字
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  return lum > 0.35 ? '#18181b' : '#ffffff'
}

/**
 * color 属性解析：4 语义色 → token + on-color；11 预设名 → --oas-preset-* token
 * （on-color 走 text-on-primary，dark 自动切深字）；其余按任意 CSS 色值注入，
 * 实心文字色用 pickOnColor 按底色亮度取黑/白。
 */
function resolveBadgeColor(color: string): { bg: string; on: string } {
  const semantic: Record<string, [string, string]> = {
    primary: ['var(--oas-color-primary)', 'var(--oas-color-text-on-primary)'],
    success: ['var(--oas-color-success)', 'var(--oas-color-text-on-success)'],
    warning: ['var(--oas-color-warning)', 'var(--oas-color-text-on-warning)'],
    danger: ['var(--oas-color-danger)', 'var(--oas-color-text-on-danger)'],
  }
  const s = semantic[color]
  if (s) return { bg: s[0], on: s[1] }
  if ((BADGE_PRESET_COLORS as readonly string[]).includes(color)) {
    return { bg: `var(--oas-preset-${color})`, on: 'var(--oas-color-text-on-primary)' }
  }
  return { bg: color, on: pickOnColor(color) }
}

/** offset 属性解析："x,y" px 数字；非法值返回 null（静默忽略） */
function parseOffset(raw: string): { x: string; y: string } | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) return null
  return { x: m[1]!, y: m[2]! }
}

/**
 * seal 印章锯齿：以元素中心为圆心、外/内半径交替采样生成锯齿多边形（百分比坐标）。
 * clip-path 内嵌进 STYLE 模板，SSR 快照与客户端渲染共用同一份几何。
 */
function sealZigzag(teeth = 20, outer = 50, inner = 44): string {
  const pts: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth - Math.PI / 2
    const r = i % 2 === 0 ? outer : inner
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`)
  }
  return `polygon(${pts.join(', ')})`
}

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
}
.badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-badge-bg, var(--oas-color-danger));
  color: var(--oas-badge-on-color, var(--oas-color-text-on-danger));
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge.small {
  min-width: 13px;
  height: 13px;
  line-height: 13px;
  border-radius: 7px;
  font-size: 10px;
  padding: 0 3px;
}
.badge.small.dot {
  min-width: 6px;
  width: 6px;
  height: 6px;
}
/* corner 四角：仅切换 anchor 定位（translate 由 JS 内联写入，保证与 offset/overlap 叠加） */
.badge.corner-top-left {
  right: auto;
  left: 0;
}
.badge.corner-bottom-right {
  top: auto;
  bottom: 0;
}
.badge.corner-bottom-left {
  top: auto;
  bottom: 0;
  right: auto;
  left: 0;
}
/* attention 吸引动画：pulse 外圈脉冲扩散（颜色走 --oas-badge-pulse-color，默认跟随徽章底色） */
.badge.attention-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 2px var(--oas-badge-pulse-color, var(--oas-badge-bg, var(--oas-color-danger)));
  animation: oas-badge-attn-pulse 2.2s var(--oas-ease-in-out) infinite;
  pointer-events: none;
}
@keyframes oas-badge-attn-pulse {
  0% {
    opacity: 0.55;
    transform: scale(1);
  }
  60%,
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}
/* attention：bounce 轻微弹跳；动画覆盖内联 transform 期间用 --oas-badge-pos 保留基址（含 corner/offset 平移） */
.badge.attention-bounce {
  animation: oas-badge-attn-bounce 1.4s var(--oas-ease-in-out) infinite;
}
@keyframes oas-badge-attn-bounce {
  0%,
  100% {
    transform: var(--oas-badge-pos, translate(50%, -50%));
  }
  50% {
    transform: var(--oas-badge-pos, translate(50%, -50%)) translateY(-25%);
  }
}
/* standalone 独立徽标：默认插槽无内容时回落静态行内展示（角标定位失效，作为独立元素放在文本流/菜单行） */
.badge.standalone {
  position: static;
  transform: none;
  display: inline-flex;
  align-items: center;
  margin-inline-start: var(--oas-space-1);
  vertical-align: middle;
}
.badge[hidden] {
  display: none;
}
/* ===== status 状态点：行内独立元素（非角标定位），与 ribbon/dot/count 互斥 ===== */
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oas-status-color, var(--oas-color-text-secondary));
  flex-shrink: 0;
}
.status.processing .status-dot {
  animation: oas-badge-pulse 1.4s var(--oas-ease-in-out) infinite;
}
@keyframes oas-badge-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.65);
  }
}
@media (prefers-reduced-motion: reduce) {
  .status.processing .status-dot,
  .badge.attention-pulse::after,
  .badge.attention-bounce {
    animation: none;
  }
}
.status[hidden] {
  display: none;
}
/* 缎带：卡片上沿角标，斜角折叠效果（corner 三角 + brightness 折叠阴影） */
.ribbon {
  position: absolute;
  top: var(--oas-space-2);
  z-index: 1;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  height: var(--oas-control-height-xs);
  line-height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  /* 定位合成：anchor 边中居中（--oas-ribbon-anchor-* 百分比）+ offset 任意微调（--oas-ribbon-offset-* px）
     两者 calc 叠加，translate 独立属性与各形态 transform 共存 */
  translate: calc(var(--oas-ribbon-anchor-x, 0px) + var(--oas-ribbon-offset-x, 0px))
    calc(var(--oas-ribbon-anchor-y, 0px) + var(--oas-ribbon-offset-y, 0px));
  /* color 与背景同色：corner 经 currentColor 继承同色后由 brightness 压暗成折叠；
     color 属性（语义色 class / 预设名 / 任意色值）经 --oas-badge-bg 变量覆盖 */
  color: var(--oas-badge-bg, var(--oas-color-danger));
  background-color: var(--oas-badge-bg, var(--oas-color-danger));
  border-radius: var(--oas-radius-sm);
}
/* ribbon-position 三选：hang（默认，基类 top）挂沿下 / edge 贴顶边 / cross 骑跨顶边；
   仅改纵向 top，与 placement（横向锚点）正交，非法值回落基类 hang */
.ribbon.position-edge {
  top: 0;
}
.ribbon.position-cross {
  top: -6px;
}
.ribbon-text {
  color: var(--oas-badge-on-color, var(--oas-color-text-on-danger));
}
.ribbon.color-primary {
  color: var(--oas-color-primary);
  background-color: var(--oas-color-primary);
}
.ribbon.color-primary .ribbon-text {
  color: var(--oas-color-text-on-primary);
}
.ribbon.color-success {
  color: var(--oas-color-success);
  background-color: var(--oas-color-success);
}
.ribbon.color-success .ribbon-text {
  color: var(--oas-color-text-on-success);
}
.ribbon.color-warning {
  color: var(--oas-color-warning);
  background-color: var(--oas-color-warning);
}
.ribbon.color-warning .ribbon-text {
  color: var(--oas-color-text-on-warning);
}
/* 折叠角：尖三角（clip-path 三点三角，顶边沿缎带下沿、斜边折向内下），
   经 currentColor 继承缎带底色 + brightness 压暗成折叠阴影；
   start 侧必须显式镜像（clip-path 走元素本地坐标，不随锚点自动翻转——曾现 bug） */
.ribbon-corner {
  position: absolute;
  top: 100%;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  background: currentColor;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  filter: brightness(75%);
}
.ribbon.placement-end {
  inset-inline-end: calc(var(--oas-space-2) * -1);
  border-end-end-radius: 0;
}
.ribbon.placement-end .ribbon-corner {
  inset-inline-end: 0;
}
.ribbon.placement-start {
  inset-inline-start: calc(var(--oas-space-2) * -1);
  border-end-start-radius: 0;
}
.ribbon.placement-start .ribbon-corner {
  inset-inline-start: 0;
  /* 折叠三角随侧镜像：start 侧直角在右上（clip-path 不随锚点自动镜像，需显式翻） */
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}
/* ===== ribbon-form 形态维度：fold（默认）直条+折叠即基类，不写额外标记 ===== */

/* diagonal：经典 corner ribbon——带斜穿角点：中心钉在角点内侧（默认 pin 25px），rotate ±45°
   后两端分别被两条边线裁断，角尖为空白三角外露（带不盖角点）。带长 141%（对角线）
   保证两端都越边；宿主需 overflow:hidden。ribbon-anchor 四角锚点（top-left/top-right/
   bottom-left/bottom-right）；placement-end/start 保留为 top-left/top-right 兼容别名。
   尺寸档位 ribbon-size（sm 默认 / md / lg）只改 --oas-badge-diagonal-* 的 fallback，
   宿主自定义属性优先级更高。 */
.ribbon.form-diagonal {
  /* 派生钉点：宿主 --oas-badge-diagonal-pin 优先，未设置用档位 fallback（sm 25px） */
  --oas-diag-pin: var(--oas-badge-diagonal-pin, 25px);
  width: 141%;
  height: var(--oas-badge-diagonal-height, 30px);
  line-height: var(--oas-badge-diagonal-height, 30px);
  padding: 0;
  border-radius: 0;
  font-size: var(--oas-badge-diagonal-font, var(--oas-font-size-xs));
  text-align: center;
  transform-origin: center;
}
/* 兼容别名：placement-end=top-left / placement-start=top-right（anchor-* 未设置时回落） */
.ribbon.form-diagonal.placement-end {
  top: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  inset-inline-start: calc(var(--oas-diag-pin) - 70.5%);
  transform: rotate(-45deg);
}
.ribbon.form-diagonal.placement-start {
  top: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  inset-inline-start: auto;
  inset-inline-end: calc(var(--oas-diag-pin) - 70.5%);
  transform: rotate(45deg);
}
/* 四角锚点——每个角独立规则（避免组合选择器覆盖顺序歧义，也便于测试精确断言）。
   置于 placement 兼容别名之后：anchor 设置时覆盖 placement-end/start（同特异性靠后生效） */
.ribbon.form-diagonal.anchor-top-left {
  top: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  bottom: auto;
  inset-inline-start: calc(var(--oas-diag-pin) - 70.5%);
  inset-inline-end: auto;
  transform: rotate(-45deg);
}
.ribbon.form-diagonal.anchor-top-right {
  top: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  bottom: auto;
  inset-inline-start: auto;
  inset-inline-end: calc(var(--oas-diag-pin) - 70.5%);
  transform: rotate(45deg);
}
.ribbon.form-diagonal.anchor-bottom-left {
  top: auto;
  bottom: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  inset-inline-start: calc(var(--oas-diag-pin) - 70.5%);
  inset-inline-end: auto;
  transform: rotate(45deg);
}
.ribbon.form-diagonal.anchor-bottom-right {
  top: auto;
  bottom: calc(var(--oas-diag-pin) - var(--oas-badge-diagonal-height, 30px) / 2);
  inset-inline-start: auto;
  inset-inline-end: calc(var(--oas-diag-pin) - 70.5%);
  transform: rotate(-45deg);
}
/* 文字沿带向卡内偏移（可选微调）：rotate(-45°) 的带文字局部 +X 朝右上、rotate(45°) 朝右下，
   默认 0（文字居中于带中心，几何已保证两端留边） */
.ribbon.form-diagonal.anchor-top-left .ribbon-text,
.ribbon.form-diagonal.anchor-bottom-right .ribbon-text,
.ribbon.form-diagonal.placement-end .ribbon-text {
  display: block;
  transform: translateX(var(--oas-badge-diagonal-text-inset, 0px));
}
.ribbon.form-diagonal.anchor-top-right .ribbon-text,
.ribbon.form-diagonal.anchor-bottom-left .ribbon-text,
.ribbon.form-diagonal.placement-start .ribbon-text {
  display: block;
  transform: translateX(calc(var(--oas-badge-diagonal-text-inset, 0px) * -1));
}
.ribbon.form-diagonal .ribbon-corner {
  display: none;
}
/* 文字居中于条带中心 = 角点 = 可见斜带中段，无需平移补偿 */
.ribbon.form-diagonal .ribbon-text {
  display: block;
}

/* diagonal 尺寸档位：md / lg 在 sm（基础）之上增大带宽与字号，并把带中心钉点加深
   （文字越长钉点越深，两端才不贴裁切线；对 md 字号约 31px 半长，lg 钉点 45px 时
   两端各留约 23px 余量）。档位只改 fallback 默认值，宿主 --oas-badge-diagonal-* 优先 */
.ribbon.form-diagonal.ribbon-size-md {
  --oas-diag-pin: var(--oas-badge-diagonal-pin, 35px);
  height: var(--oas-badge-diagonal-height, 33px);
  line-height: var(--oas-badge-diagonal-height, 33px);
  font-size: var(--oas-badge-diagonal-font, var(--oas-font-size-sm));
}
.ribbon.form-diagonal.ribbon-size-lg {
  --oas-diag-pin: var(--oas-badge-diagonal-pin, 45px);
  height: var(--oas-badge-diagonal-height, 36px);
  line-height: var(--oas-badge-diagonal-height, 36px);
  font-size: var(--oas-badge-diagonal-font, var(--oas-font-size-md));
}

/* triangle：角落纯三角形（clip-path 直角三角）+ 内嵌小图标/slot 内容。
   ribbon-anchor 四角锚点（top-left/top-right/bottom-left/bottom-right），clip-path 直角
   朝向锚点角、文字贴直角边；placement-end/start 保留为 top-left/top-right 兼容别名 */
.ribbon.form-triangle {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 0;
  line-height: 1;
}
/* 兼容别名：placement-end=top-left / placement-start=top-right（anchor-* 未设置时回落） */
.ribbon.form-triangle.placement-end {
  top: 0;
  inset-inline-end: 0;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}
.ribbon.form-triangle.placement-start {
  top: 0;
  inset-inline-end: auto;
  inset-inline-start: 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
/* 四角锚点（置于 placement 别名之后，anchor 设置时覆盖） */
.ribbon.form-triangle.anchor-top-left {
  top: 0;
  bottom: auto;
  inset-inline-start: 0;
  inset-inline-end: auto;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
.ribbon.form-triangle.anchor-top-right {
  top: 0;
  bottom: auto;
  inset-inline-start: auto;
  inset-inline-end: 0;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}
.ribbon.form-triangle.anchor-bottom-left {
  top: auto;
  bottom: 0;
  inset-inline-start: 0;
  inset-inline-end: auto;
  clip-path: polygon(0 100%, 100% 100%, 0 0);
}
.ribbon.form-triangle.anchor-bottom-right {
  top: auto;
  bottom: 0;
  inset-inline-start: auto;
  inset-inline-end: 0;
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}
.ribbon.form-triangle .ribbon-text {
  position: absolute;
  top: var(--oas-space-1);
  inset-inline-end: var(--oas-space-1);
  display: flex;
  align-items: center;
}
.ribbon.form-triangle.anchor-bottom-left .ribbon-text,
.ribbon.form-triangle.anchor-bottom-right .ribbon-text {
  top: auto;
  bottom: var(--oas-space-1);
}
.ribbon.form-triangle.anchor-top-left .ribbon-text,
.ribbon.form-triangle.anchor-bottom-left .ribbon-text,
.ribbon.form-triangle.placement-start .ribbon-text {
  inset-inline-end: auto;
  inset-inline-start: var(--oas-space-1);
}
.ribbon.form-triangle .ribbon-corner {
  display: none;
}

/* bookmark：顶边垂挂竖条 + 底部燕尾 V 缺口（clip-path polygon），贴顶边 */
.ribbon.form-bookmark {
  width: 40px;
  height: 56px;
  padding: 0 var(--oas-space-1);
  top: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: normal;
  line-height: 1.3;
  clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
}
.ribbon.form-bookmark.placement-end {
  inset-inline-end: var(--oas-space-3);
}
.ribbon.form-bookmark.placement-start {
  inset-inline-end: auto;
  inset-inline-start: var(--oas-space-3);
}
.ribbon.form-bookmark .ribbon-corner {
  display: none;
}
/* bookmark 燕尾尖头方向（ribbon-direction，仅 bookmark 生效）：
   down 顶边垂挂、底部 V 缺口朝下（默认，见基类，竖条 40×56）；left/right 改为侧边竖挂——
   条身贴对应边缘、高度收成一行文字（40×32），V 缺口朝对应方向；纵向位置由
   ribbon-vertical 控制（center 默认垂直居中 / top 贴顶边 / bottom 贴底边）。
   direction 是物理方向语义（RTL 下不翻转，同 drawer 的 placement），故用物理 left/right
   定位而非逻辑属性；placement 对 left/right 不生效（规则后置覆盖） */
.ribbon.form-bookmark.direction-left,
.ribbon.form-bookmark.direction-right {
  top: 50%;
  transform: translateY(-50%);
  left: auto;
  right: auto;
  height: 32px;
  line-height: 32px;
  white-space: nowrap;
}
.ribbon.form-bookmark.direction-left {
  right: 0;
  clip-path: polygon(28% 0, 100% 0, 100% 100%, 28% 100%, 0 50%);
}
.ribbon.form-bookmark.direction-right {
  left: 0;
  clip-path: polygon(0 0, 72% 0, 100% 50%, 72% 100%, 0 100%);
}
/* ribbon-vertical：top 贴顶边 / bottom 贴底边（center 走基类 50% 居中） */
.ribbon.form-bookmark.direction-left.vertical-top,
.ribbon.form-bookmark.direction-right.vertical-top {
  top: 0;
  transform: none;
}
.ribbon.form-bookmark.direction-left.vertical-bottom,
.ribbon.form-bookmark.direction-right.vertical-bottom {
  top: auto;
  bottom: 0;
  transform: none;
}

/* side：侧边竖挂（placement=start 左侧边中部 / end 镜像右侧），折叠角在挂点（条顶端）。
   竖排 writing-mode 写在 .ribbon-text 上（若写在条身，逻辑 inset 属性会随书写模式翻转） */
.ribbon.form-side {
  width: 22px;
  height: auto;
  min-height: 60px;
  padding: var(--oas-space-2) 0;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ribbon.form-side .ribbon-text {
  writing-mode: vertical-rl;
  /* 拉丁字母直立堆叠（mixed 会整体躺倒 90° 不可读） */
  text-orientation: upright;
  letter-spacing: 1px;
}
.ribbon.form-side.placement-end {
  inset-inline-end: calc(var(--oas-space-2) * -1);
}
.ribbon.form-side.placement-start {
  inset-inline-end: auto;
  inset-inline-start: calc(var(--oas-space-2) * -1);
}
.ribbon.form-side .ribbon-corner {
  top: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
}
.ribbon.form-side.placement-start .ribbon-corner {
  inset-inline-start: 0;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
.ribbon.form-side.placement-end .ribbon-corner {
  inset-inline-end: 0;
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

/* seal：圆形锯齿印章（clip-path 锯齿多边形，见 sealZigzag()），文字居中，骑跨角点 */
.ribbon.form-seal {
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.2;
  clip-path: ${sealZigzag()};
}
.ribbon.form-seal.placement-end {
  top: calc(var(--oas-space-2) * -1);
  inset-inline-end: calc(var(--oas-space-2) * -1);
}
.ribbon.form-seal.placement-start {
  top: calc(var(--oas-space-2) * -1);
  inset-inline-end: auto;
  inset-inline-start: calc(var(--oas-space-2) * -1);
}
.ribbon.form-seal .ribbon-corner {
  display: none;
}

/* banner：顶部横贯横幅——横贯卡片顶部全宽、两端贴卡片边线，两端下方各一个折叠角
   （缎带绕到卡片背后的折痕，暗色三角）：复用 .ribbon-corner 承载末端折叠 + ::before 承载首端折叠 */
.ribbon.form-banner {
  inset-inline-start: 0;
  inset-inline-end: 0;
  width: 100%;
  top: 0;
  border-radius: 0;
  text-align: center;
  padding: 0 var(--oas-space-3);
}
/* 首端折叠角（::before 三角，右角在左上、斜边朝右下） */
.ribbon.form-banner::before {
  content: '';
  position: absolute;
  top: 100%;
  inset-inline-start: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  background: currentColor;
  filter: brightness(75%);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
/* 末端折叠角：复用 .ribbon-corner，镜像三角（右角在右上、斜边朝左下） */
.ribbon.form-banner .ribbon-corner {
  top: 100%;
  inset-inline-end: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

/* flag：侧燕尾横旗（横条 + 探出外端侧燕尾 V 缺口；缺口始终朝探出端，placement start/end 镜像）。
   底部挂点内侧保留折叠角——复用 .ribbon-corner 尖三角，但因条身 clip-path 会把条外元素裁掉，
   折叠角须放进 clip 区域内（bottom 内侧角） */
.ribbon.form-flag {
  border-radius: 0;
  /* 燕尾缺口：V 口凹进带身、始终朝卡片内侧端（徽标在右 → 缺口在左；在左 → 缺口在右） */
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%);
}
/* 外端贴卡片边线（不探出——无边线锚定的探出端是浮空，曾现缺陷） */
.ribbon.form-flag.placement-end {
  inset-inline-end: 0;
}
.ribbon.form-flag.placement-start {
  inset-inline-start: 0;
  /* 燕尾缺口镜像到内侧右端（clip-path 走元素本地坐标，不随锚点自动翻转——同 bookmark 教训） */
  clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%);
}
.ribbon.form-flag .ribbon-corner {
  top: auto;
  bottom: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
}
.ribbon.form-flag.placement-end .ribbon-corner {
  inset-inline-start: 0;
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}
.ribbon.form-flag.placement-start .ribbon-corner {
  inset-inline-end: 0;
  /* 折叠角随侧镜像 */
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}

/* ===== 端部造型形态（rounded 圆头 / zigzag 锯齿 / arrow 箭头）：
   横条 + 端部装饰造型，装饰端始终朝卡片内侧（同 flag"缺口朝内侧端"规则：
   徽标在右（placement-end）→ 装饰在左端朝卡内；在左（placement-start）→ 装饰在右端朝卡内）。
   左下保留折叠小三角（corner 置于挂点内侧，同 flag 复用逻辑） */

/* rounded：圆头端（border-radius 即可；装饰端朝卡内） */
.ribbon.form-rounded.placement-end {
  inset-inline-end: 0;
  /* 徽标在右 → 圆头在左端朝卡内 */
  border-start-start-radius: 999px;
  border-end-start-radius: 999px;
}
.ribbon.form-rounded.placement-start {
  inset-inline-start: 0;
  /* 徽标在左 → 圆头在右端朝卡内 */
  border-start-end-radius: 999px;
  border-end-end-radius: 999px;
}
/* 折叠角在挂点外端（base 端，缎带绕卡边缘处），与装饰端分两端（参考图语义：
   折叠角在左下挂点、圆头在右端） */
.ribbon.form-rounded .ribbon-corner {
  top: auto;
  bottom: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
}
.ribbon.form-rounded.placement-end .ribbon-corner {
  /* 徽标在右 → 折叠角在右下挂点端（绕右缘），圆头在左端互不冲突 */
  inset-inline-start: auto;
  inset-inline-end: 0;
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}
.ribbon.form-rounded.placement-start .ribbon-corner {
  /* 徽标在左 → 折叠角在左下挂点端（绕左缘），圆头在右端互不冲突 */
  inset-inline-end: auto;
  inset-inline-start: 0;
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}

/* zigzag：锯齿端（clip-path 四齿；装饰端朝卡内） */
.ribbon.form-zigzag {
  border-radius: 0;
}
.ribbon.form-zigzag.placement-end {
  inset-inline-end: 0;
  /* 徽标在右 → 锯齿在左端朝卡内 */
  clip-path: polygon(
    100% 0,
    0 0,
    8px 12.5%,
    0 25%,
    8px 37.5%,
    0 50%,
    8px 62.5%,
    0 75%,
    8px 87.5%,
    0 100%,
    100% 100%
  );
}
.ribbon.form-zigzag.placement-start {
  inset-inline-start: 0;
  /* 徽标在左 → 锯齿在右端朝卡内 */
  clip-path: polygon(
    0 0,
    100% 0,
    calc(100% - 8px) 12.5%,
    100% 25%,
    calc(100% - 8px) 37.5%,
    100% 50%,
    calc(100% - 8px) 62.5%,
    100% 75%,
    calc(100% - 8px) 87.5%,
    100% 100%,
    0 100%
  );
}
.ribbon.form-zigzag .ribbon-corner {
  top: auto;
  bottom: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
}
.ribbon.form-zigzag.placement-end .ribbon-corner {
  inset-inline-start: auto;
  inset-inline-end: 0;
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}
.ribbon.form-zigzag.placement-start .ribbon-corner {
  inset-inline-end: auto;
  inset-inline-start: 0;
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}

/* arrow：箭头端（大箭头：元素加高 1.6 倍，箭头头部大三角占满全高、比条身高，
   文字垂直居中在条身；装饰端朝卡内） */
.ribbon.form-arrow {
  border-radius: 0;
  height: calc(var(--oas-control-height-xs) * 1.6);
  line-height: calc(var(--oas-control-height-xs) * 1.6);
}
.ribbon.form-arrow.placement-end {
  inset-inline-end: 0;
  /* 徽标在右 → 大箭头在左端朝卡内（尖朝左）；三角基边上下凸出条身（占满全高） */
  padding-inline-start: 22px;
  clip-path: polygon(
    100% 18.75%,
    22px 18.75%,
    22px 0,
    0 50%,
    22px 100%,
    22px 81.25%,
    100% 81.25%
  );
}
.ribbon.form-arrow.placement-start {
  inset-inline-start: 0;
  /* 徽标在左 → 大箭头在右端朝卡内（尖朝右）；三角基边上下凸出条身（占满全高） */
  padding-inline-end: 22px;
  clip-path: polygon(
    0 18.75%,
    calc(100% - 22px) 18.75%,
    calc(100% - 22px) 0,
    100% 50%,
    calc(100% - 22px) 100%,
    calc(100% - 22px) 81.25%,
    0 81.25%
  );
}
.ribbon.form-arrow .ribbon-corner {
  top: auto;
  bottom: 0;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
}
.ribbon.form-arrow.placement-end .ribbon-corner {
  inset-inline-start: auto;
  inset-inline-end: 0;
  clip-path: polygon(100% 100%, 100% 0, 0 100%);
}
.ribbon.form-arrow.placement-start .ribbon-corner {
  inset-inline-end: auto;
  inset-inline-start: 0;
  clip-path: polygon(0 100%, 0 0, 100% 100%);
}

/* ===== 非斜形态通用锚点（ribbon-anchor 8 位置：4 边中 + 4 角）=====
   适用于 fold / banner / flag / side / seal / bookmark；斜形态 diagonal/triangle
   有各自四角规则（见上），此处 :not 排除避免 inset 冲突。
   anchor 定位缎带贴卡片边/角，形态自身形状与方向保持；anchor 优先于 placement/
   ribbon-position/ribbon-direction/ribbon-vertical 兼容别名。边中居中走合成 translate 变量。 */
/* 4 角 */
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top-left {
  top: var(--oas-space-2);
  bottom: auto;
  inset-inline-start: var(--oas-space-2);
  inset-inline-end: auto;
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top-right {
  top: var(--oas-space-2);
  bottom: auto;
  inset-inline-start: auto;
  inset-inline-end: var(--oas-space-2);
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom-left {
  top: auto;
  bottom: var(--oas-space-2);
  inset-inline-start: var(--oas-space-2);
  inset-inline-end: auto;
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom-right {
  top: auto;
  bottom: var(--oas-space-2);
  inset-inline-start: auto;
  inset-inline-end: var(--oas-space-2);
}
/* 4 边中：居中走合成 translate 变量（与 offset 叠加，见 .ribbon 基类） */
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top {
  top: var(--oas-space-2);
  bottom: auto;
  inset-inline-start: 0;
  inset-inline-end: 0;
  margin-inline: auto;
  width: fit-content;
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom {
  top: auto;
  bottom: var(--oas-space-2);
  inset-inline-start: 0;
  inset-inline-end: 0;
  margin-inline: auto;
  width: fit-content;
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-left {
  top: 50%;
  bottom: auto;
  inset-inline-start: var(--oas-space-2);
  inset-inline-end: auto;
  --oas-ribbon-anchor-y: -50%;
}
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-right {
  top: 50%;
  bottom: auto;
  inset-inline-start: auto;
  inset-inline-end: var(--oas-space-2);
  --oas-ribbon-anchor-y: -50%;
}
/* anchor 时清掉兼容别名的定位（placement inset / position top / side 的 translateY / bookmark 的 direction） */
/* anchor 时清掉兼容别名的定位（placement inset / position top / side 的 translateY /
   bookmark 的 direction）；斜形态 diagonal/triangle 有 rotate 几何，排除避免清掉 */
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top-left,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top-right,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom-left,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom-right,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-top,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-bottom,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-left,
.ribbon:not(.form-diagonal):not(.form-triangle).anchor-right {
  transform: none;
}
/* side 竖条在角锚点：保持竖排但贴角（去掉自身 50% 居中 transform 已由上方清空） */
.ribbon.form-side.anchor-top-left,
.ribbon.form-side.anchor-top-right,
.ribbon.form-side.anchor-bottom-left,
.ribbon.form-side.anchor-bottom-right {
  min-height: 0;
  height: 56px;
}
/* bookmark 在通用锚点：direction/vertical 兼容别名被 anchor 覆盖（anchor 定位优先） */
.ribbon.form-bookmark.anchor-top-left,
.ribbon.form-bookmark.anchor-top-right,
.ribbon.form-bookmark.anchor-bottom-left,
.ribbon.form-bookmark.anchor-bottom-right,
.ribbon.form-bookmark.anchor-top,
.ribbon.form-bookmark.anchor-bottom,
.ribbon.form-bookmark.anchor-left,
.ribbon.form-bookmark.anchor-right {
  top: 50%;
  left: auto;
  right: auto;
  --oas-ribbon-anchor-y: -50%;
}
/* bookmark 顶部/底部锚点：保持顶边垂挂竖条，但允许锚点定位覆盖方向 */
.ribbon.form-bookmark.anchor-top-left,
.ribbon.form-bookmark.anchor-top-right,
.ribbon.form-bookmark.anchor-bottom-left,
.ribbon.form-bookmark.anchor-bottom-right {
  top: 0;
  bottom: 0;
  --oas-ribbon-anchor-y: 0;
  transform: none;
}

/* fold 贴边探出：通用锚点层用正偏移，但 fold 有折叠角、贴边需负偏移探出（同 placement-end/start）。
   仅 fold（无 form 标记，排除其他所有带 form 标记的形态），规则后置覆盖通用锚点 */
.ribbon.anchor-left:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-start: calc(var(--oas-space-2) * -1);
}
.ribbon.anchor-right:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-end: calc(var(--oas-space-2) * -1);
}
.ribbon.anchor-top-left:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-start: calc(var(--oas-space-2) * -1);
}
.ribbon.anchor-top-right:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-end: calc(var(--oas-space-2) * -1);
}
.ribbon.anchor-bottom-left:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-start: calc(var(--oas-space-2) * -1);
}
.ribbon.anchor-bottom-right:not(.form-banner):not(.form-flag):not(.form-side):not(.form-seal):not(.form-bookmark):not(.form-diagonal):not(.form-triangle) {
  inset-inline-end: calc(var(--oas-space-2) * -1);
}

/* 贴边端角去圆角（仅 fold）：只有挨着折叠角的那个角是直角，其余三个角保持圆角。
   先重置四角为基类圆角（覆盖 placement-end 的 border-end-end-radius:0 干扰），
   再单独设挨着折叠角的角为 0。anchor 是物理方向语义（left/right 不随 RTL 翻转） */
/* 贴左缘 + 折叠角下沿（anchor-left / anchor-top-left）：左下角直角 */
.ribbon.anchor-left:not(.form-banner):not(.form-flag),
.ribbon.anchor-top-left:not(.form-banner):not(.form-flag) {
  border-start-start-radius: var(--oas-radius-sm);
  border-start-end-radius: var(--oas-radius-sm);
  border-end-start-radius: 0;
  border-end-end-radius: var(--oas-radius-sm);
}
/* 贴右缘 + 折叠角下沿（anchor-right / anchor-top-right）：右下角直角 */
.ribbon.anchor-right:not(.form-banner):not(.form-flag),
.ribbon.anchor-top-right:not(.form-banner):not(.form-flag) {
  border-start-start-radius: var(--oas-radius-sm);
  border-start-end-radius: var(--oas-radius-sm);
  border-end-start-radius: var(--oas-radius-sm);
  border-end-end-radius: 0;
}
/* 贴左缘 + 折叠角上沿（anchor-bottom-left）：左上角直角 */
.ribbon.anchor-bottom-left:not(.form-banner):not(.form-flag) {
  border-start-start-radius: 0;
  border-start-end-radius: var(--oas-radius-sm);
  border-end-start-radius: var(--oas-radius-sm);
  border-end-end-radius: var(--oas-radius-sm);
}
/* 贴右缘 + 折叠角上沿（anchor-bottom-right）：右上角直角 */
.ribbon.anchor-bottom-right:not(.form-banner):not(.form-flag) {
  border-start-start-radius: var(--oas-radius-sm);
  border-start-end-radius: 0;
  border-end-start-radius: var(--oas-radius-sm);
  border-end-end-radius: var(--oas-radius-sm);
}
/* 折叠角端点与朝向：端点由锚点的"侧"决定（贴左缘 → 左端 / 贴右缘 → 右端）；
   上/下沿由纵向锚点决定（top 系 → 缎带下沿 / bottom 系 → 缎带上沿翻转）；
   clip-path 走元素本地坐标，尖朝卡内方向需显式写出 */
/* 贴左缘：折叠角在左端 */
.ribbon.anchor-top-left:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-bottom-left:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-left:not(.form-banner):not(.form-flag) .ribbon-corner {
  inset-inline-start: 0;
  inset-inline-end: auto;
}
/* 贴右缘：折叠角在右端 */
.ribbon.anchor-top-right:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-bottom-right:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  inset-inline-start: auto;
  inset-inline-end: 0;
}
/* 顶部/边中锚点：折叠角在缎带下沿 */
.ribbon.anchor-top-left:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-top-right:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-left:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  top: 100%;
  bottom: auto;
}
/* 底部锚点：折叠角在缎带上沿 */
.ribbon.anchor-bottom-left:not(.form-banner):not(.form-flag) .ribbon-corner,
.ribbon.anchor-bottom-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  top: auto;
  bottom: 100%;
}
/* clip 方向：折叠角尖朝卡内（对照 placement-end 基准：贴右缘用 polygon(0 0, 100% 0, 0 100%) 直角左上、尖朝左下=卡内）。
   贴左缘（left/top-left/bottom-left）→ 折叠角在左端、尖朝右下（卡内），用 placement-start 镜像 clip；
   贴右缘（right/top-right/bottom-right）→ 折叠角在右端、尖朝左下（卡内），用 placement-end clip */
/* 左缘侧边（anchor-left）：折叠角左端下沿、尖朝右下（卡内） */
.ribbon.anchor-left:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}
/* 右缘侧边（anchor-right）：折叠角右端下沿、尖朝左下（卡内） */
.ribbon.anchor-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
/* 左缘顶角（anchor-top-left）：折叠角左端下沿、尖朝右下（卡内） */
.ribbon.anchor-top-left:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}
/* 右缘顶角（anchor-top-right）：折叠角右端下沿、尖朝左下（卡内） */
.ribbon.anchor-top-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
/* 左缘底角（anchor-bottom-left）：折叠角左端上沿、尖朝右上（卡内，clip 垂直翻转左缘） */
.ribbon.anchor-bottom-left:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(100% 100%, 0 100%, 100% 0);
}
/* 右缘底角（anchor-bottom-right）：折叠角右端上沿、尖朝左上（卡内，clip 垂直翻转右缘） */
.ribbon.anchor-bottom-right:not(.form-banner):not(.form-flag) .ribbon-corner {
  clip-path: polygon(0 100%, 100% 100%, 0 0);
}

/* ===== rolled 端部卷边：卷边在卡片内侧端（同燕尾规则：徽标在右卷边在左、在左卷边在右），
   外端改为顶卡片边线（不再探出——无边线锚定的探出端是浮空，曾现缺陷）。
   布尔修饰、独立开关：与 fold（基类/显式 form-fold）/ flag 叠加；banner 有自己的双端折叠角
   （rolled 时 banner 折叠角保留、不叠卷边）；其他裁剪形态（diagonal/triangle/bookmark/side/seal）
   经 :not 排除、静默忽略。:where 降权便于覆写 */
/* 外端顶边线：覆盖基类/flag 的探出负偏移 */
.ribbon.rolled:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner)).placement-end {
  inset-inline-end: 0;
}
.ribbon.rolled:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner)).placement-start {
  inset-inline-start: 0;
}
/* 内侧端卷边圆角（end → 左端 pill；start 镜像右端） */
.ribbon.rolled:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner)).placement-end {
  border-start-start-radius: 999px;
  border-end-start-radius: 999px;
}
.ribbon.rolled:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner)).placement-start {
  border-start-end-radius: 999px;
  border-end-end-radius: 999px;
}
/* 卷边渐变贴内侧端（end → 左缘向右渐隐；start 镜像） */
.ribbon.rolled:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner))::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--oas-space-3);
  pointer-events: none;
  background: linear-gradient(90deg, currentColor 0%, transparent 100%);
  filter: brightness(70%);
}
.ribbon.rolled.placement-end:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner))::after {
  inset-inline-start: 0;
  border-start-start-radius: 999px;
  border-end-start-radius: 999px;
}
.ribbon.rolled.placement-start:where(:not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal):not(.form-banner))::after {
  inset-inline-end: 0;
  background: linear-gradient(270deg, currentColor 0%, transparent 100%);
  border-start-end-radius: 999px;
  border-end-end-radius: 999px;
}
/* 卷边端替代折叠角：rolled 时隐藏 corner（卷边自身就是内侧端的装饰） */
.ribbon.rolled:where(:not(.form-banner)) .ribbon-corner {
  display: none;
}

/* ===== premium 金属质感：金色渐变 + 深金描边；与 color 正交叠加（优先级 premium > color），
   规则置于全部 color 语义类之后保证覆盖；文字色按金底亮度取深色，dark 下 preset-gold 自动调亮 */
.ribbon.premium {
  color: var(--oas-preset-gold);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--oas-preset-gold) 82%, white) 0%,
    var(--oas-preset-gold) 45%,
    color-mix(in srgb, var(--oas-preset-gold) 55%, black) 100%
  );
  border: 1px solid color-mix(in srgb, var(--oas-preset-gold) 50%, black);
}
.ribbon.premium .ribbon-text {
  /* 金属刻感：近黑字 + 顶部 1px 亮边 text-shadow（凹刻效果，通行金属徽章做法） */
  color: #1a1a1a;
  font-weight: 600;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.35);
}
/* 裁剪形态：box border 会被 clip-path 裁掉，改用 0 偏移 0 模糊的 drop-shadow 沿
   clip-path 轮廓描边（四向 1px，等效细描边，见 oas-badge 测试回归断言） */
.ribbon.premium.form-triangle,
.ribbon.premium.form-bookmark,
.ribbon.premium.form-seal,
.ribbon.premium.form-diagonal,
.ribbon.premium.form-banner,
.ribbon.premium.form-flag {
  border: none;
  filter: drop-shadow(0 1px 0 color-mix(in srgb, var(--oas-preset-gold) 45%, black))
    drop-shadow(0 -1px 0 color-mix(in srgb, var(--oas-preset-gold) 45%, black))
    drop-shadow(1px 0 0 color-mix(in srgb, var(--oas-preset-gold) 45%, black))
    drop-shadow(-1px 0 0 color-mix(in srgb, var(--oas-preset-gold) 45%, black));
}
.ribbon[hidden] {
  display: none;
}
`

export class OASBadge extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'max',
      'showZero',
      'dot',
      'ribbon',
      'mode',
      'color',
      'placement',
      'text',
      'offset',
      'status',
      'size',
      'attention',
      'corner',
      'overlap',
      'ribbon-position',
      'ribbon-form',
      'ribbon-direction',
      'ribbon-vertical',
      'ribbon-size',
      'ribbon-anchor',
      'premium',
      'rolled',
    ]
  }

  private badgeEl: HTMLElement | null = null
  private ribbonEl: HTMLElement | null = null
  private ribbonSlotEl: HTMLSlotElement | null = null
  private defaultSlotEl: HTMLSlotElement | null = null
  private statusEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <sup class="badge" part="badge" hidden></sup>
      <span class="status" part="status" hidden>
        <span class="status-dot" part="status-dot" aria-hidden="true"></span>
        <span class="status-text" part="status-text"></span>
      </span>
      <div class="ribbon" part="ribbon" hidden>
        <span class="ribbon-text" part="ribbon-text">
          <slot name="ribbon"></slot>
          <span class="ribbon-fallback" part="ribbon-fallback" hidden></span>
        </span>
        <span class="ribbon-corner" part="ribbon-corner" aria-hidden="true"></span>
      </div>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.badgeEl = this.shadow.querySelector('.badge')
    this.ribbonEl = this.shadow.querySelector('.ribbon')
    this.ribbonSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot[name="ribbon"]')
    this.statusEl = this.shadow.querySelector('.status')
    // 默认插槽内容变化（standalone 判定依据）时刷新显隐与定位形态
    this.defaultSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    this.defaultSlotEl?.addEventListener('slotchange', () => this.update())
    // 缎带命名插槽增删内容（slotchange 异步触发）时刷新显隐与兜底
    this.ribbonSlotEl?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（徽标节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.badge')) return false
    this.bind()
    return true
  }

  private syncStatus(status: string, statusMode: boolean): void {
    const el = this.statusEl
    if (!el) return
    el.hidden = !statusMode
    if (!statusMode) return
    // 语义 class（success/processing/error/warning/default）+ 颜色变量注入
    for (const name of VALID_STATUS) el.classList.toggle(name, status === name)
    const dot = el.querySelector<HTMLElement>('.status-dot')
    if (dot) {
      const statusColor =
        STATUS_COLOR[status as string] ?? 'var(--oas-color-text-secondary)'
      dot.style.setProperty('--oas-status-color', statusColor)
    }
    const text = el.querySelector<HTMLElement>('.status-text')
    if (text) text.textContent = this.getAttr('text', '')
  }

  private syncRibbon(statusMode: boolean): void {
    const ribbonEl = this.ribbonEl
    const slot = this.ribbonSlotEl
    if (!ribbonEl) return

    const ribbonMode =
      this.hasAttr('ribbon') || (this.getAttr('mode', 'count') as BadgeMode) === 'ribbon'
    const color = this.getAttr('color', 'danger') as BadgeColor | BadgePresetColor
    const placement = this.getAttr('placement', 'end') as BadgePlacement
    const position = this.getAttr('ribbon-position', 'hang') as BadgeRibbonPosition
    const form = this.getAttr('ribbon-form', 'fold') as BadgeRibbonForm
    const direction = this.getAttr('ribbon-direction', 'down') as BadgeRibbonDirection
    const text = this.getAttr('text', '')

    // 语义色 class（兼容）：仅 4 语义色命中；预设名/任意色值走下方变量注入
    ribbonEl.classList.toggle('color-primary', color === 'primary')
    ribbonEl.classList.toggle('color-success', color === 'success')
    ribbonEl.classList.toggle('color-warning', color === 'warning')
    ribbonEl.classList.toggle('color-danger', color === 'danger')
    // ribbon-form 七形态：未显式设置（或非法值）回落 fold 且不写任何 form-* class（基类即 fold，向后兼容）
    const formValid =
      this.hasAttr('ribbon-form') && (VALID_RIBBON_FORMS as readonly string[]).includes(form)
    for (const name of VALID_RIBBON_FORMS) {
      ribbonEl.classList.toggle(`form-${name}`, formValid && form === name)
    }
    // ribbon-anchor 统一锚点：形态-锚点矩阵（见 FORM_ANCHORS）。anchor 写 anchor-* class；
    // 未设置时回落 placement/ribbon-position/ribbon-direction/ribbon-vertical 兼容别名。
    // 非法值或该形态不支持的锚点静默回落（不写 class，走形态默认位置）
    const anchor = this.getAttr('ribbon-anchor', '') as BadgeRibbonAnchor
    const effectiveForm = formValid ? form : 'fold'
    const allowedAnchors = FORM_ANCHORS[effectiveForm] ?? FORM_ANCHORS.fold!
    const anchorValid =
      (VALID_RIBBON_ANCHORS as readonly string[]).includes(anchor) &&
      (allowedAnchors as readonly string[]).includes(anchor)
    for (const name of VALID_RIBBON_ANCHORS) {
      ribbonEl.classList.toggle(`anchor-${name}`, anchorValid && anchor === name)
    }
    // placement 兼容别名：anchor 有效时静默（避免其 inset 规则与 anchor 冲突拉宽形态），
    // anchor 未设置时按 placement 写入（向后兼容）
    ribbonEl.classList.toggle('placement-start', !anchorValid && placement === 'start')
    ribbonEl.classList.toggle('placement-end', !anchorValid && placement !== 'start')
    // ribbon-position 三选：edge/cross 命中间隔类，hang 与非法值均回落基类（不写额外标记）
    ribbonEl.classList.toggle('position-edge', position === 'edge')
    ribbonEl.classList.toggle('position-cross', position === 'cross')
    // ribbon-direction 尖头方向：仅 bookmark 形态生效；down 与非法值回落基类（不写标记），
    // left/right 写 direction-* class（其余形态忽略，同 wide 规矩）
    const dirValid =
      formValid &&
      form === 'bookmark' &&
      (VALID_RIBBON_DIRECTIONS as readonly string[]).includes(direction)
    ribbonEl.classList.toggle('direction-left', dirValid && direction === 'left')
    ribbonEl.classList.toggle('direction-right', dirValid && direction === 'right')
    // ribbon-vertical 纵向位置：仅 bookmark 侧挂（left/right）生效；center 与非法值回落基类
    // （不写标记，基类默认垂直居中），top/bottom 写 vertical-* class
    const sideMount = dirValid && (direction === 'left' || direction === 'right')
    const vertical = this.getAttr('ribbon-vertical', 'center') as BadgeRibbonVertical
    ribbonEl.classList.toggle('vertical-top', sideMount && vertical === 'top')
    ribbonEl.classList.toggle('vertical-bottom', sideMount && vertical === 'bottom')
    // premium 金属质感：布尔属性加 class（正交于 color/form，视觉覆盖优先级见样式顺序）
    ribbonEl.classList.toggle('premium', this.hasAttr('premium'))
    // rolled 端部卷边：布尔修饰（独立开关），class 恒写；视觉仅在 fold/banner/flag 生效
    // （其余裁剪形态由样式 :not 排除，见 STYLE 注释）
    ribbonEl.classList.toggle('rolled', this.hasAttr('rolled'))
    // ribbon-size 斜带档位：仅与 diagonal 组合；其他形态静默忽略（不写入 class，无视觉影响）。
    // 档位只改 --oas-badge-diagonal-* 的 fallback 默认值，宿主 CSS 变量优先级更高
    const size = this.getAttr('ribbon-size', 'sm') as BadgeRibbonSize
    const sizeValid =
      formValid && form === 'diagonal' && (VALID_RIBBON_SIZES as readonly string[]).includes(size)
    ribbonEl.classList.toggle('ribbon-size-md', sizeValid && size === 'md')
    ribbonEl.classList.toggle('ribbon-size-lg', sizeValid && size === 'lg')

    // color 变量注入（语义色与 class 双保险；预设名/任意色值唯一生效路径）
    const resolved = resolveBadgeColor(color)
    ribbonEl.style.setProperty('--oas-badge-bg', resolved.bg)
    ribbonEl.style.setProperty('--oas-badge-on-color', resolved.on)

    // offset 任意位置微调：translate 独立属性与形态 transform 叠加；非法值移除
    const ribbonOffset = parseOffset(this.getAttr('offset', ''))
    if (ribbonOffset) {
      ribbonEl.style.setProperty('--oas-ribbon-offset-x', `${ribbonOffset.x}px`)
      ribbonEl.style.setProperty('--oas-ribbon-offset-y', `${ribbonOffset.y}px`)
    } else {
      ribbonEl.style.removeProperty('--oas-ribbon-offset-x')
      ribbonEl.style.removeProperty('--oas-ribbon-offset-y')
    }

    // text 属性走独立兜底元素（不写 slot 节点——写 slot 兜底会在部分浏览器触发
    // slotchange→update 无限循环卡死主线程）；slot 有 assigned 内容时兜底隐藏
    const fallback = ribbonEl.querySelector<HTMLElement>('.ribbon-fallback')
    if (fallback) {
      fallback.textContent = text
      fallback.hidden = text === '' || (slot?.assignedNodes().length ?? 0) > 0
    }

    const hasAssigned = slot ? slot.assignedNodes().length > 0 : false
    // 空态：未启用缎带或没有任何内容（text/slot 均无）时不显示；status 激活时互斥隐藏
    ribbonEl.hidden = statusMode || !ribbonMode || (text === '' && !hasAssigned)
  }

  protected override update(): void {
    const status = this.getAttr('status', '') as BadgeStatus
    const statusMode = (VALID_STATUS as readonly string[]).includes(status)
    this.syncStatus(status, statusMode)

    const el = this.badgeEl
    if (el) {
      // 互斥：status 优先渲染，角标徽标隐藏
      if (statusMode) {
        el.hidden = true
      } else {
        const raw = this.getAttr('value', '')
        const dot = this.hasAttr('dot')
        const showZero = this.hasAttr('showZero')

        const value = raw === '' ? NaN : Number(raw)
        const hasValue = !Number.isNaN(value)

        // standalone：默认插槽无内容时徽标回落为静态行内展示
        const standalone = !this.defaultSlotEl || this.defaultSlotEl.assignedNodes().length === 0
        el.classList.toggle('standalone', standalone)

        // size 小尺寸档
        el.classList.toggle('small', this.getAttr('size', '') === 'small')
        // color 全模式：语义色 / 预设名 / 任意色值；无 color 时移除变量（CSS 回落默认 danger）
        const color = this.getAttr('color', '') as BadgeColor | BadgePresetColor
        if (color) {
          const resolved = resolveBadgeColor(color)
          el.style.setProperty('--oas-badge-bg', resolved.bg)
          el.style.setProperty('--oas-badge-on-color', resolved.on)
        } else {
          el.style.removeProperty('--oas-badge-bg')
          el.style.removeProperty('--oas-badge-on-color')
        }

        // offset：叠加到角标 translate；standalone/非法值静默忽略
        const offset = parseOffset(this.getAttr('offset', ''))
        // corner 四角定位（默认 top-right；非法值静默回落）
        const corner = this.getAttr('corner', 'top-right') as BadgeCorner
        const cornerName = (VALID_CORNER as readonly string[]).includes(corner)
          ? corner
          : 'top-right'
        el.classList.toggle('corner-top-left', cornerName === 'top-left')
        el.classList.toggle('corner-bottom-right', cornerName === 'bottom-right')
        el.classList.toggle('corner-bottom-left', cornerName === 'bottom-left')
        // overlap=circular：包裹圆形内容时平移幅度从 50% 收到 1-√2/2 ≈ 29.29%（几何内收）
        const ratio = this.hasAttr('overlap') ? 29.29 : 50
        const sign = CORNER_SIGN[cornerName]!
        let pos = ''
        if (offset && !standalone) {
          pos = `translate(calc(${sign.sx}${ratio}% + ${offset.x}px), calc(${sign.sy}${ratio}% + ${offset.y}px))`
        } else if (!standalone && (cornerName !== 'top-right' || ratio !== 50)) {
          pos = `translate(${sign.sx}${ratio}%, ${sign.sy}${ratio}%)`
        }
        if (pos) {
          el.style.transform = pos
        } else {
          el.style.removeProperty('transform')
        }

        // attention 吸引动画（pulse 外圈脉冲 / bounce 弹跳）；非法值静默忽略；
        // 仅作用于角标/独立徽标（ribbon 不受影响）。bounce 在动画覆盖 transform 期间
        // 用 --oas-badge-pos 保留基址；独立徽标基址为恒等平移
        const attention = this.getAttr('attention', '') as BadgeAttention
        const validAttention = (VALID_ATTENTION as readonly string[]).includes(attention)
        el.classList.toggle('attention-pulse', validAttention && attention === 'pulse')
        el.classList.toggle('attention-bounce', validAttention && attention === 'bounce')
        if (validAttention && attention === 'bounce') {
          el.style.setProperty(
            '--oas-badge-pos',
            pos || (standalone ? 'translate(0, 0)' : 'translate(50%, -50%)'),
          )
        } else {
          el.style.removeProperty('--oas-badge-pos')
        }

        el.classList.toggle('dot', dot)

        if (dot) {
          el.textContent = ''
          el.hidden = false
        } else if (!hasValue || (value === 0 && !showZero)) {
          el.hidden = true
        } else {
          const max = this.getAttr('max', '')
          const maxNum = max === '' ? NaN : Number(max)
          const display = !Number.isNaN(maxNum) && value > maxNum ? `${maxNum}+` : String(value)
          el.textContent = display
          el.hidden = false
        }
      }
    }

    this.syncRibbon(statusMode)
  }
}
