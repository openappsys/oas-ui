import { OASFormElement } from '@oas-ui/core'

/**
 * 上传条目：本地新选文件（File），或已上传回显记录（{name, url}，初值语义、状态 done）。
 * File 走真实/模拟上传通道；回显记录只参与列表展示与预览。
 */
export interface UploadEchoFile {
  name: string
  url: string
  size?: number
}

export type UploadEntry = File | UploadEchoFile

export interface UploadRequestOptions {
  file: File
  name: string
  action: string
  method: string
  headers: Record<string, string>
  data: Record<string, string>
  withCredentials: boolean
  onProgress: (e: { percent: number }) => void
  onSuccess: (response: unknown) => void
  onError: (err: { status?: number; response?: unknown }) => void
}

/** custom-request 逃生舱：宿主接管上传请求（分片/OSS 直传/WebSocket 等非标通道由此走） */
export type UploadCustomRequest = (options: UploadRequestOptions) => { abort?: () => void } | void

/** before-upload 钩子：返回 false 拒绝；返回 File 转换（transform 语义）；Promise 同理 */
export type UploadBeforeUpload = (file: File) => boolean | File | Promise<boolean | File | void> | void

interface FileStatus {
  percent: number
  status: 'pending' | 'uploading' | 'done' | 'error'
}

type ListType = 'list' | 'picture' | 'picture-card'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 100%;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
.zone {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-6) var(--oas-space-4);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
  cursor: pointer;
  text-align: center;
  color: var(--oas-color-text-secondary);
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.zone:hover {
  border-color: var(--oas-color-primary);
}
.zone:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.zone.dragging {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 8%, transparent);
}
/* template[slot="trigger"] 克隆容器：与 slot fallback 同构的纵向居中流（克隆内容原样接管触发区） */
.trigger-tpl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-1);
}
.trigger-tpl[hidden] {
  display: none;
}
.zone[aria-disabled='true'] {
  cursor: not-allowed;
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.zone .icon {
  /* 固定宿主尺寸：DSD 快照阶段 oas-icon 尚未 upgrade（shadow 为空、flex 子项 block 化后高度 0），
     upgrade 后图标渲染 28px——尺寸不定会导致升级前后拖拽区高度跳变（真水合布局闪动断言 ±1px 失败）。
     显式定宽高 + inline-flex 居中，令升级前后占用一致；同时消除内联 svg 的基线间隙。 */
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xl);
  line-height: 1;
  color: var(--oas-color-primary);
}
.zone .hint {
  font-size: var(--oas-font-size-sm);
}
/* tip 提示：属性文本或 template[slot="tip"] 克隆，拖拽区下方次要文案 */
.tip {
  margin-top: var(--oas-space-2);
  text-align: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.tip[hidden] {
  display: none;
}
.list {
  margin-top: var(--oas-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.list[hidden] {
  display: none;
}
.item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
}
.item .meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
.item .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* list/picture 行：点文件名打开预览浮层（对齐 text 列表点击文件名预览的主流形态） */
.item .name-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.item .name-btn:hover {
  color: var(--oas-color-primary);
}
.item .name-btn:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}
.item .size {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.item .remove {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-lg);
  line-height: 1;
  cursor: pointer;
  padding: var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.item .remove:hover {
  color: var(--oas-color-danger);
}
.item .remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item .remove[disabled] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
/* 行内操作：retry（失败重试）/ cancel（上传中取消），仅在对应态出现 */
.item .act-inline {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  padding: var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.item .act-inline:hover {
  color: var(--oas-color-primary);
}
.item .act-inline.cancel:hover {
  color: var(--oas-color-danger);
}
.item .act-inline:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 失败态：行名与边框转危险色 */
.item.is-error {
  border-color: var(--oas-color-danger);
}
.item.is-error .name,
.item.is-error .name-btn {
  color: var(--oas-color-danger);
}
/* picture 模式：列表带小缩略图 */
.item-picture .item-thumb {
  flex: none;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  overflow: hidden;
}
.item-picture .item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* picture-card 模式：卡片缩略图墙 */
.list-cards {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.card {
  position: relative;
  width: 104px;
  height: 104px;
  border: 1px solid var(--oas-color-border);
  /* 圆形头像卡：--oas-upload-card-radius: 50% 即圆（不占独立枚举） */
  border-radius: var(--oas-upload-card-radius, var(--oas-radius-md));
  overflow: hidden;
  background: var(--oas-color-bg);
  flex: none;
}
.card.is-error {
  border-color: var(--oas-color-danger);
}
.card .thumb {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  cursor: zoom-in;
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg-hover);
}
.card .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card .thumb-name {
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-xs);
  padding: 0 var(--oas-space-1);
}
.card .remove {
  position: absolute;
  top: var(--oas-space-1);
  right: var(--oas-space-1);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--oas-radius-sm);
  /* 底色/字色成对取 text-primary+bg：light 深底白字、dark 浅底深字。
     不用 color-overlay 底（双主题均为深色半透明）——dark 下配 bg 字色 × 与底融为一体不可读 */
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
  cursor: pointer;
  opacity: 0;
  /* 隐藏态不拦截指针事件：否则 20x20 透明角标会吃掉缩略图点击 */
  pointer-events: none;
  transition: opacity var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover .remove,
.card .remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
}
.card .remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.card .remove[disabled] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.card .actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  background: var(--oas-color-overlay);
  opacity: 0;
  /* 覆盖层永不拦截指针事件（hover 态也不）：整卡点击回落到缩略图（oas-preview），
     只有内部 .act 操作按钮在 hover 时才可命中，避免鼠标移动触发 hover 后吞掉缩略图点击 */
  pointer-events: none;
  transition: opacity var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover .actions,
.card:focus-within .actions {
  opacity: 1;
}
.card .actions .act {
  pointer-events: none;
}
.card:hover .actions .act,
.card:focus-within .actions .act {
  pointer-events: auto;
}
.card .actions .act {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  cursor: pointer;
  /* 触控热区伪元素（coarse）的定位基准 */
  position: relative;
}
.card .actions .act:hover {
  color: var(--oas-color-primary);
}
.card .actions .act[disabled] {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.card .actions .act:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.card .progress-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--oas-space-1);
  background: var(--oas-color-overlay);
  /* 纯信息展示，不拦截缩略图点击 */
  pointer-events: none;
}
/* ---- 触屏（pointer: coarse）适配：无 hover 可依赖，操作层改状态常显 + 触控热区 ≥44px ---- */
@media (pointer: coarse) {
  /* 右上角删除×常显；20px 视觉不动，::after 透明扩展出 ≥44px 热区（跟随 --oas-touch-target-min） */
  .card .remove {
    opacity: 1;
    pointer-events: auto;
  }
  .card .remove::after {
    content: '';
    position: absolute;
    inset: calc((20px - var(--oas-touch-target-min, 44px)) / 2);
  }
  /* 失败/上传中态的操作遮罩常显（触屏无法 hover 唤起；正常态预览走缩略图点按、删除走右上角×） */
  .card.is-error .actions,
  .card.is-uploading .actions {
    opacity: 1;
  }
  .card.is-error .actions .act,
  .card.is-uploading .actions .act {
    pointer-events: auto;
  }
  /* 操作钮 28px 视觉 → ≥44px 热区（相邻热区轻微重叠由 paint 序裁决，可接受） */
  .card .actions .act::after {
    content: '';
    position: absolute;
    inset: calc((28px - var(--oas-touch-target-min, 44px)) / 2);
  }
}
/* 预览浮层 */
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--oas-color-overlay);
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display:flex 优先级压过 UA 的 [hidden] 规则，
   否则关闭态的预览浮层始终占满视口拦截全页指针事件——曾致真水合 e2e 全页点击被 oas-upload 拦截） */
.preview-mask[hidden] {
  display: none;
}
.preview-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-3);
  max-width: 90vw;
  max-height: 90vh;
  padding: var(--oas-space-4);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
}
.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
  color: var(--oas-color-text-secondary);
}
.preview-body img {
  max-width: 80vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: var(--oas-radius-md);
  display: block;
}
.preview-name {
  max-width: 60vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
}
.preview-size {
  font-size: var(--oas-font-size-xs);
}
.preview-close {
  min-width: var(--oas-space-6);
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
}
.preview-close:hover {
  background: var(--oas-color-bg-hover);
}
.preview-close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.empty {
  padding: var(--oas-space-4);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
/* ---- 裁剪对话框（crop：picture/picture-card + accept 图片时选择后进入）----
   自绘轻量浮层（与预览浮层同构：fixed mask + [hidden] 显式覆盖 display）。 */
.crop-mask {
  position: fixed;
  inset: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--oas-color-overlay);
}
.crop-mask[hidden] {
  display: none;
}
.crop-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  /* 窄屏兜底：dialog 自身限宽限高 + 内部滚动（360/375px 手机不横向溢出页面） */
  max-width: calc(100vw - var(--oas-space-4));
  max-height: calc(100vh - var(--oas-space-4));
  overflow: auto;
  padding: var(--oas-space-4);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
}
/* 窄屏整体缩放舞台（zoom 等比缩放布局与指针增量，320×240 模型坐标不走样） */
@media (max-width: 400px) {
  .crop-dialog {
    padding: var(--oas-space-2);
  }
  .crop-stage {
    zoom: 0.85;
  }
}
@media (max-width: 340px) {
  .crop-stage {
    zoom: 0.75;
  }
}
/* 裁剪舞台：物理像素坐标系（320×240，与 canvas 绘制缓冲 1:1），锁定 LTR——
   裁剪几何映射不得随书写方向镜像（theme-editor 色值 LTR 隔离同款惯例） */
.crop-stage {
  position: relative;
  width: 320px;
  height: 240px;
  overflow: hidden;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  direction: ltr;
  touch-action: none;
  cursor: grab;
}
.crop-stage:active {
  cursor: grabbing;
}
.crop-stage canvas {
  position: absolute;
  inset: 0;
  width: 320px;
  height: 240px;
  display: block;
}
/* 裁剪框：边框 + 外侧压暗（大扩散 box-shadow 盖住框外区域）；整体拖动移动 */
.crop-frame {
  position: absolute;
  border: 1px solid var(--oas-color-primary);
  box-shadow: 0 0 0 9999px var(--oas-color-overlay);
  cursor: move;
  touch-action: none;
}
.crop-frame:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 9999px var(--oas-color-overlay),
    var(--oas-focus-ring);
}
/* 右下角缩放手柄（拖拽改框体尺寸；固定比例模式下锁定宽高比） */
.crop-handle {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--oas-color-primary);
  cursor: nwse-resize;
  touch-action: none;
}
.crop-toolbar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.crop-zoom-btn {
  appearance: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.crop-zoom-btn:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.crop-zoom-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.crop-zoom-text {
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.crop-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
}
.crop-btn {
  min-width: 64px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.crop-btn:hover {
  background: var(--oas-color-bg-hover);
}
.crop-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.crop-btn.is-primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.crop-btn.is-primary:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 88%, var(--oas-color-bg));
}
`

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 回显记录按扩展名判断图片（File 走 MIME type） */
const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i

function isImageEntry(entry: UploadEntry): boolean {
  if (entry instanceof File) return entry.type.startsWith('image/')
  return IMAGE_URL_RE.test(entry.name) || IMAGE_URL_RE.test(entry.url)
}

function nameOf(entry: UploadEntry): string {
  if (entry instanceof File) return entry.webkitRelativePath || entry.name
  return entry.name
}

function sizeOf(entry: UploadEntry): number {
  return entry instanceof File ? entry.size : (entry.size ?? 0)
}

/** 裁剪舞台物理尺寸（与 canvas 绘制缓冲 1:1；轻量内建对话框的固定基准） */
const CROP_STAGE_W = 320
const CROP_STAGE_H = 240
/** 缩放界限：1 = cover 基准（图像铺满舞台），上限 8×；按钮/滚轮单步系数 */
const CROP_ZOOM_MIN = 1
const CROP_ZOOM_MAX = 8
const CROP_ZOOM_STEP = 1.25
/** 裁剪框最小边（px）：防止拖拽缩放把框缩没 */
const CROP_FRAME_MIN = 40

/**
 * crop-aspect 解析：`"1:1"` / `"16:9"` → 宽高比（正数）；`free` / 缺失 / 非法（非 `w:h` 形态、
 * 非正数值）→ null = 自由比例（框体可任意拉伸）。
 */
export function resolveCropAspect(raw: string | null): number | null {
  const s = (raw ?? '').trim().toLowerCase()
  if (!s || s === 'free') return null
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(s)
  if (!m) return null
  const w = Number.parseFloat(m[1]!)
  const h = Number.parseFloat(m[2]!)
  if (!(w > 0) || !(h > 0)) return null
  return w / h
}

/**
 * 裁剪导出 MIME：jpeg/webp 原样保留（canvas 原生支持），其余（png/gif/svg/bmp…）统一导出
 * png（canvas 会压平动画/矢量，png 无损通用）。
 */
function cropExportMime(srcType: string): string {
  if (srcType === 'image/jpeg' || srcType === 'image/webp') return srcType
  return 'image/png'
}

/** 裁剪结果文件名：基名保留，扩展名跟随导出 MIME（jpeg→.jpg / webp→.webp / 其余→.png） */
export function cropFileName(name: string, mime: string): string {
  const ext = mime === 'image/jpeg' ? '.jpg' : mime === 'image/webp' ? '.webp' : '.png'
  const base = name.replace(/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i, '')
  return `${base || 'image'}${ext}`
}

export class OASUpload extends OASFormElement {
  /** 原生表单集成（label for / FormData / reset / fieldset disabled）；沿静态原型链已可继承，显式声明便于阅读与检索 */
  static override formAssociated = true

  static override get observedAttributes(): string[] {
    return [
      'accept',
      'multiple',
      'max',
      'disabled',
      'auto-upload',
      'list-type',
      'disabled-skip',
      'action',
      'name',
      'method',
      'headers',
      'data',
      'with-credentials',
      'max-size',
      'directory',
      'paste',
      'show-file-list',
      'replace',
      'tip',
      // 图片上传前裁剪（crop 通道开关 + 固定宽高比）
      'crop',
      'crop-aspect',
      // 表单关联通道：required 驱动原生校验链（valueMissing）
      'required',
    ]
  }

  private input: HTMLInputElement | null = null
  private zone: HTMLElement | null = null
  private list: HTMLElement | null = null
  private previewMask: HTMLElement | null = null
  private previewBody: HTMLElement | null = null
  private previewCloseBtn: HTMLButtonElement | null = null
  private _files: UploadEntry[] = []
  private statusMap = new Map<UploadEntry, FileStatus>()
  private urlMap = new Map<UploadEntry, string>()
  private previewFile: UploadEntry | null = null
  private previousFocus: HTMLElement | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  /** 进行中的上传控制器（XHR / custom-request 返回的 abort 句柄） */
  private uploadControllers = new Map<File, { abort: () => void }>()
  /** form.reset 基线：初始文件列表快照（受控写入跟随刷新；用户交互置脏后冻结） */
  private initialFiles: UploadEntry[] = []
  /** 用户交互脏标记（对齐原生 dirty 语义）：置位后基线冻结，reset 恢复基线并清脏 */
  private filesDirty = false
  private _customRequest: UploadCustomRequest | null = null
  private _beforeUpload: UploadBeforeUpload | null = null

  // ---- 裁剪（crop）通道状态 ----
  private cropMask: HTMLElement | null = null
  private cropDialogEl: HTMLElement | null = null
  private cropStage: HTMLElement | null = null
  private cropCanvas: HTMLCanvasElement | null = null
  private cropFrame: HTMLElement | null = null
  private cropHandle: HTMLElement | null = null
  private cropZoomText: HTMLElement | null = null
  private cropOkBtn: HTMLButtonElement | null = null
  private cropCancelBtn: HTMLButtonElement | null = null
  /** 待裁剪队列（多选批量：逐张处理，确认/取消后接续下一张） */
  private cropQueue: File[] = []
  /** 当前正在裁剪的文件（null = 对话框关闭） */
  private cropping: File | null = null
  /** 裁剪舞台图像（异步解码；happy-dom 下不解码——几何全走守卫，confirm 仍可用） */
  private cropImg: HTMLImageElement | null = null
  private cropImgUrl: string | null = null
  private cropPrevFocus: HTMLElement | null = null
  /**
   * 裁剪几何（stage 物理像素坐标系）：
   * - zoom：相对 cover 基准的缩放倍数（1 = 图像恰铺满舞台）
   * - ix/iy：图像显示左上角在舞台内的偏移（恒负或 0，图像覆盖整舞台）
   * - fx/fy/fw/fh：裁剪框左上角与尺寸（始终完整落在舞台内）
   */
  private cropState = { zoom: 1, ix: 0, iy: 0, fx: 0, fy: 0, fw: 0, fh: 0, imgLoaded: false }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.closePreview()
  }

  private handleCropEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.cropping) this.cancelCrop()
  }

  /** @apiProperty 文件列表（受控；File/回显记录无法用 attribute 表达，赋值即刷新列表） */
  get files(): UploadEntry[] {
    return [...this._files]
  }

  set files(list: Array<File | UploadEchoFile>) {
    this.adoptEntries(list)
  }

  /** 回显初值通道（defaultFileList 语义）：与 files 同构，命名上区分「初始列表」语义 */
  get defaultFiles(): UploadEntry[] {
    return [...this._files]
  }

  set defaultFiles(list: Array<File | UploadEchoFile>) {
    this.adoptEntries(list)
  }

  /** custom-request 逃生舱：函数 property（函数无法走 attribute 通道），非函数赋值容错为 null */
  get customRequest(): UploadCustomRequest | null {
    return this._customRequest
  }

  set customRequest(fn: UploadCustomRequest | null) {
    this._customRequest = typeof fn === 'function' ? fn : null
  }

  /** before-upload 钩子：函数 property；false 拒绝、File 转换、Promise 异步生效 */
  get beforeUpload(): UploadBeforeUpload | null {
    return this._beforeUpload
  }

  set beforeUpload(fn: UploadBeforeUpload | null) {
    this._beforeUpload = typeof fn === 'function' ? fn : null
  }

  private get listType(): ListType {
    const v = this.getAttr('list-type', 'list')
    return v === 'picture' || v === 'picture-card' ? v : 'list'
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <input class="file-input" type="file" hidden />
      <div class="zone" part="zone" role="button" tabindex="0">
        <slot name="trigger">
          <oas-icon class="icon" name="upload" size="28"></oas-icon>
          <span class="hint"></span>
        </slot>
        <div class="trigger-tpl" part="trigger-tpl" hidden></div>
      </div>
      <div class="tip" part="tip" hidden></div>
      <div class="list" part="list"></div>
      <div class="preview-mask" part="preview" hidden>
        <div class="preview-dialog" role="dialog" aria-modal="true">
          <div class="preview-body"></div>
          <button type="button" class="preview-close" part="preview-close"></button>
        </div>
      </div>
      <div class="crop-mask" part="crop" hidden>
        <div class="crop-dialog" role="dialog" aria-modal="true">
          <div class="crop-stage">
            <canvas class="crop-canvas" width="${CROP_STAGE_W}" height="${CROP_STAGE_H}"></canvas>
            <div class="crop-frame" tabindex="0">
              <div class="crop-handle"></div>
            </div>
          </div>
          <div class="crop-toolbar">
            <button type="button" class="crop-zoom-btn" data-zoom="out"></button>
            <span class="crop-zoom-text">100%</span>
            <button type="button" class="crop-zoom-btn" data-zoom="in"></button>
          </div>
          <div class="crop-actions">
            <button type="button" class="crop-btn crop-cancel"></button>
            <button type="button" class="crop-btn is-primary crop-ok" part="crop-ok"></button>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定文件选择/点击/拖拽/粘贴事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('.file-input')
    this.zone = this.shadow.querySelector('.zone')
    this.list = this.shadow.querySelector('.list')
    this.previewMask = this.shadow.querySelector('.preview-mask')
    this.previewBody = this.shadow.querySelector('.preview-body')
    this.previewCloseBtn = this.shadow.querySelector('.preview-close')

    this.input?.addEventListener('change', () => {
      if (!this.input?.files) return
      this.addFiles([...this.input.files])
      this.input.value = ''
    })

    this.zone?.addEventListener('click', (e: Event) => {
      if (this.injectDisabled()) return
      // trigger 插槽内容（light DOM 子节点）的点击走宿主级监听转发，这里跳过避免双开文件对话框
      const t = e.target
      if (t instanceof Node && t !== this && this.contains(t)) return
      this.input?.click()
    })
    // 宿主级：trigger 插槽内容点击经 light DOM 冒泡到达宿主，转发打开文件选择；
    // label 点击（form-associated 后 <label for> 合成 click 落点 = 宿主本身）同样激活文件选择
    this.addEventListener('click', (e: Event) => {
      if (this.injectDisabled() || e.defaultPrevented) return
      const t = e.target
      if (!(t instanceof Node)) return
      if (t !== this) {
        if (!this.contains(t)) return
        this.input?.click()
        return
      }
      // target = 宿主：仅 composedPath 起点也是宿主（label 合成 click）才激活；
      // shadow 内点击（zone 等）retarget 后 target 也是宿主，但起点是 shadow 内元素，
      // zone 监听已处理过，这里再开会双开文件对话框
      if (e.composedPath()[0] !== this) return
      this.input?.click()
    })
    this.zone?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.injectDisabled()) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.input?.click()
      }
    })
    // 拖拽高亮与文件接收：disabled 时整体走浏览器默认（dragover 不 preventDefault →
    // 禁止 drop、显示禁止光标），避免松开鼠标时浏览器直接打开文件
    this.zone?.addEventListener('dragenter', (e: DragEvent) => {
      if (this.injectDisabled()) return
      e.preventDefault()
      this.zone?.classList.add('dragging')
    })
    this.zone?.addEventListener('dragover', (e: DragEvent) => {
      if (this.injectDisabled()) return
      e.preventDefault()
    })
    this.zone?.addEventListener('dragleave', () => {
      this.zone?.classList.remove('dragging')
    })
    this.zone?.addEventListener('drop', (e: DragEvent) => {
      // 无条件 preventDefault：disabled 也要阻止浏览器默认行为（打开被拖入的文件）
      e.preventDefault()
      this.zone?.classList.remove('dragging')
      if (this.injectDisabled()) return
      const dropped = e.dataTransfer?.files ? [...e.dataTransfer.files] : []
      if (dropped.length > 0) this.addFiles(dropped)
    })

    // 粘贴上传（默认关）：组件上粘贴剪贴板文件即添加（截图 Ctrl+V 场景）
    this.addEventListener('paste', (e: Event) => {
      if (!this.hasAttr('paste') || this.injectDisabled()) return
      const ce = e as ClipboardEvent
      const files = ce.clipboardData?.files
      if (!files || files.length === 0) return
      e.preventDefault()
      this.addFiles([...files])
    })

    this.previewCloseBtn?.addEventListener('click', () => this.closePreview())
    this.previewMask?.addEventListener('click', (e: MouseEvent) => {
      if (e.target === e.currentTarget) this.closePreview()
    })

    this.bindCrop()

    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
      this.abortAllQuiet()
      this.revokeAllUrls()
      document.removeEventListener('keydown', this.handleKeydown)
      // 裁剪通道收尾：清队列 + 释放对象 URL + 摘全局监听（不还原焦点——断连时焦点语义已无意义）
      this.cropQueue.length = 0
      this.cropping = null
      this.releaseCropImage()
      document.removeEventListener('keydown', this.handleCropEsc)
      this.cropMask?.setAttribute('hidden', '')
    })
  }

  /** 裁剪对话框：缓存引用 + 绑定指针/滚轮/键盘交互（render 与水合路径共用，只跑一次） */
  private bindCrop(): void {
    this.cropMask = this.shadow.querySelector('.crop-mask')
    this.cropDialogEl = this.shadow.querySelector('.crop-dialog')
    this.cropStage = this.shadow.querySelector('.crop-stage')
    this.cropCanvas = this.shadow.querySelector('.crop-canvas')
    this.cropFrame = this.shadow.querySelector('.crop-frame')
    this.cropHandle = this.shadow.querySelector('.crop-handle')
    this.cropZoomText = this.shadow.querySelector('.crop-zoom-text')
    this.cropOkBtn = this.shadow.querySelector('.crop-ok')
    this.cropCancelBtn = this.shadow.querySelector('.crop-cancel')
    if (!this.cropStage || !this.cropFrame || !this.cropHandle) return

    // 舞台空白处按下 → 拖动图像平移（框/手柄的监听先 stopPropagation，不落到这里）
    this.cropStage.addEventListener('pointerdown', (e: Event) => {
      const startIx = this.cropState.ix
      const startIy = this.cropState.iy
      this.startCropDrag(e as PointerEvent, (dx, dy) => {
        this.cropState.ix = startIx + dx
        this.cropState.iy = startIy + dy
        this.clampCropImage()
        this.renderCropStage()
      })
    })
    // 滚轮缩放（图像不动框，框下图像点保持不动，见 setCropZoom）
    this.cropStage.addEventListener(
      'wheel',
      (e: Event) => {
        e.preventDefault()
        const we = e as WheelEvent
        this.setCropZoom(this.cropState.zoom * (we.deltaY < 0 ? CROP_ZOOM_STEP : 1 / CROP_ZOOM_STEP))
      },
      { passive: false },
    )
    // 裁剪框按下 → 整体拖动移动（钳在舞台内）
    this.cropFrame.addEventListener('pointerdown', (e: Event) => {
      e.stopPropagation()
      const startFx = this.cropState.fx
      const startFy = this.cropState.fy
      this.startCropDrag(e as PointerEvent, (dx, dy) => {
        this.cropState.fx = Math.min(Math.max(0, startFx + dx), CROP_STAGE_W - this.cropState.fw)
        this.cropState.fy = Math.min(Math.max(0, startFy + dy), CROP_STAGE_H - this.cropState.fh)
        this.syncCropFrame()
      })
    })
    // 手柄按下 → 缩放框体（固定比例模式锁定宽高比；自由比例独立拉伸）
    this.cropHandle.addEventListener('pointerdown', (e: Event) => {
      e.stopPropagation()
      const aspect = resolveCropAspect(this.getAttr('crop-aspect', ''))
      const s = { ...this.cropState }
      this.startCropDrag(e as PointerEvent, (dx, dy) => {
        this.resizeCropFrame(s, aspect, dx, dy)
      })
    })
    // 键盘微调：方向键移动裁剪框（Shift 加速 10px），移动后焦点保持在框上
    this.cropFrame.addEventListener('keydown', (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0
      if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      else if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      else return
      e.preventDefault()
      this.cropState.fx = Math.min(Math.max(0, this.cropState.fx + dx), CROP_STAGE_W - this.cropState.fw)
      this.cropState.fy = Math.min(Math.max(0, this.cropState.fy + dy), CROP_STAGE_H - this.cropState.fh)
      this.syncCropFrame()
    })
    // 工具栏：放大/缩小按钮（滚轮的键盘可达通道）
    for (const b of this.shadow.querySelectorAll<HTMLButtonElement>('.crop-zoom-btn')) {
      b.addEventListener('click', () => {
        const dir = b.getAttribute('data-zoom') === 'out' ? 1 / CROP_ZOOM_STEP : CROP_ZOOM_STEP
        this.setCropZoom(this.cropState.zoom * dir)
      })
    }
    this.cropOkBtn?.addEventListener('click', () => this.confirmCrop())
    this.cropCancelBtn?.addEventListener('click', () => this.cancelCrop())
  }

  /** 通用拖拽：pointerdown 起手，window 级 move/up 跟踪增量（不依赖 setPointerCapture 兼容性） */
  private startCropDrag(e: PointerEvent, onMove: (dx: number, dy: number) => void): void {
    if (!this.cropping) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const move = (ev: PointerEvent): void => onMove(ev.clientX - startX, ev.clientY - startY)
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** 手柄拖拽的框体缩放：固定比例按主驱动轴换算；两轴独立钳在舞台内 + 最小边 */
  private resizeCropFrame(
    s: { fx: number; fy: number; fw: number; fh: number },
    aspect: number | null,
    dx: number,
    dy: number,
  ): void {
    const maxW = CROP_STAGE_W - s.fx
    const maxH = CROP_STAGE_H - s.fy
    if (aspect !== null) {
      // 固定比例：|dx| 为主驱动轴（框宽从手柄侧增减），高度随之换算，再被高度上限钳回
      let fw = Math.min(Math.max(CROP_FRAME_MIN, s.fw + dx), maxW)
      let fh = fw / aspect
      if (fh > maxH) {
        fh = maxH
        fw = fh * aspect
      }
      this.cropState.fw = fw
      this.cropState.fh = fh
    } else {
      this.cropState.fw = Math.min(Math.max(CROP_FRAME_MIN, s.fw + dx), maxW)
      this.cropState.fh = Math.min(Math.max(CROP_FRAME_MIN, s.fh + dy), maxH)
    }
    this.syncCropFrame()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（上传区与列表容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.zone')) return false
    if (!this.shadow.querySelector('.list')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const input = this.input
    const zone = this.zone
    if (!input || !zone) return
    const disabled = this.injectDisabled()
    input.accept = this.getAttr('accept', '')
    input.multiple = this.hasAttr('multiple')
    input.disabled = disabled
    // 目录上传：webkitdirectory 落到隐藏 input（File.webkitRelativePath 保留相对路径进列表）
    ;(input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = this.hasAttr('directory')
    zone.setAttribute('aria-disabled', String(disabled))
    zone.setAttribute('aria-label', disabled ? '' : this.t('upload.drag'))
    const hint = zone.querySelector('.hint')
    if (hint) hint.textContent = disabled ? this.t('upload.select') : this.t('upload.drag')
    this.syncTip()
    this.syncTriggerTpl()
    const dialog = this.shadow.querySelector('.preview-dialog')
    dialog?.setAttribute('aria-label', this.t('upload.previewDialog'))
    if (this.previewCloseBtn) this.previewCloseBtn.textContent = this.t('upload.closePreview')
    this.syncCropChrome()
    this.renderList()
    // 原生表单数据 + 校验链同步（form-associated；无 name 时浏览器自动不提交）
    this.syncFormValue()
    this.syncValidity()
  }

  /** tip：属性文本优先，缺席时回落 template[slot="tip"] 克隆；两者皆无则隐藏 */
  private syncTip(): void {
    const tip = this.shadow.querySelector<HTMLElement>('.tip')
    if (!tip) return
    const attr = this.getAttr('tip', '')
    if (attr) {
      tip.textContent = attr
      tip.hidden = false
      return
    }
    const tpl = this.querySelector('template[slot="tip"]')
    if (tpl instanceof HTMLTemplateElement) {
      tip.innerHTML = ''
      tip.appendChild(tpl.content.cloneNode(true))
      tip.hidden = false
    } else {
      tip.hidden = true
    }
  }

  /**
   * trigger：native slot 分发 light-DOM 子元素；但 `<template slot="trigger">` 的 template
   * 元素本身被分配进 slot 后内容永不渲染（inert）——触发区整块空白（头像自绘 demo 双向空白实抓）。
   * 模板在场时走克隆通道：隐藏 slot，把模板内容克隆进 .trigger-tpl（shadow 内，点击走 zone 通路）。
   * ⚠️ 限制：克隆是 update() 时的静态快照——模板内容连接后再变更不会自动刷新（模板写完再挂组件，
   * 或之后改任意属性触发一次 update 即可重同步）。
   */
  private syncTriggerTpl(): void {
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const cloneBox = this.shadow.querySelector<HTMLElement>('.trigger-tpl')
    if (!slot || !cloneBox) return
    const tpl = this.querySelector('template[slot="trigger"]')
    if (tpl instanceof HTMLTemplateElement) {
      cloneBox.replaceChildren(tpl.content.cloneNode(true))
      cloneBox.hidden = false
      slot.hidden = true
    } else {
      cloneBox.replaceChildren()
      cloneBox.hidden = true
      slot.hidden = false
    }
  }

  /** 列表显隐：show-file-list="false" 时只渲染触发区（头像等自绘预览场景的前提） */
  private listVisible(): boolean {
    return this.getAttr('show-file-list', 'true') !== 'false'
  }

  /** 裁剪对话框静态 chrome 的 i18n 同步（locale 切换自动重刷；打开时 openCropDialog 会再写一次） */
  private syncCropChrome(): void {
    if (this.cropOkBtn) this.cropOkBtn.textContent = this.t('modal.ok')
    if (this.cropCancelBtn) this.cropCancelBtn.textContent = this.t('modal.cancel')
    const zoomOut = this.shadow.querySelector<HTMLButtonElement>('.crop-zoom-btn[data-zoom="out"]')
    const zoomIn = this.shadow.querySelector<HTMLButtonElement>('.crop-zoom-btn[data-zoom="in"]')
    zoomOut?.setAttribute('aria-label', this.t('image.preview.zoomOut'))
    zoomIn?.setAttribute('aria-label', this.t('image.preview.zoomIn'))
  }

  private addFiles(added: File[]): void {
    if (this.injectDisabled()) return
    const hook = this._beforeUpload
    if (typeof hook === 'function') {
      void this.runBeforeUpload(hook, added)
      return
    }
    this.ingestFiles(added)
  }

  /** before-upload：false/异常拒绝；返回 File 转换；异步结果统一回落 ingestFiles */
  private async runBeforeUpload(hook: UploadBeforeUpload, added: File[]): Promise<void> {
    const out: File[] = []
    for (const f of added) {
      let result: boolean | File | void
      try {
        result = await hook(f)
      } catch {
        continue
      }
      if (result === false) continue
      out.push(result instanceof File ? result : f)
    }
    if (out.length > 0) this.ingestFiles(out)
  }

  /**
   * 入列分流：crop 激活时（crop + picture/picture-card + accept 含图片），图片文件改走
   * 逐张裁剪对话框（确认后以裁剪结果入列、取消不入列）；其余文件（非图片 / accept 不匹配）
   * 直通 commitFiles（数量/大小/max 校验与 auto-upload 语义不变）。
   * 裁剪候选不再预检 size/max——裁剪本身可能把大图裁小，交由确认入列时的 commitFiles 统一裁决。
   */
  private ingestFiles(files: File[]): void {
    if (!this.cropActive()) {
      this.commitFiles(files)
      return
    }
    const accept = this.getAttr('accept', '')
    const images: File[] = []
    const others: File[] = []
    for (const f of files) {
      if (f.type.startsWith('image/') && this.matchesAccept(f.name, f.type, accept)) images.push(f)
      else others.push(f)
    }
    if (others.length > 0) this.commitFiles(others)
    if (images.length > 0) {
      this.cropQueue.push(...images)
      this.dequeueCrop()
    }
  }

  /** crop 是否激活：显式 crop 属性 + picture/picture-card 形态 + accept 包含图片类型 */
  private cropActive(): boolean {
    if (!this.hasAttr('crop')) return false
    const t = this.listType
    if (t !== 'picture' && t !== 'picture-card') return false
    const accept = this.getAttr('accept', '')
    if (!accept) return false
    return accept
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .some((p) => p === 'image/*' || p.startsWith('image/') || /^\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/.test(p))
  }

  /** 取下一张待裁剪文件（对话框互斥：当前未关不接续） */
  private dequeueCrop(): void {
    if (this.cropping) return
    const next = this.cropQueue.shift()
    if (!next) return
    this.openCropDialog(next)
  }

  /** 打开裁剪对话框：重置几何 → 定比例 → 装图像（异步解码）→ 聚焦确认钮 */
  private openCropDialog(file: File): void {
    this.cropping = file
    if (!this.cropMask || !this.cropDialogEl || !this.cropFrame || !this.cropCanvas || !this.cropOkBtn) {
      this.cropping = null
      this.dequeueCrop()
      return
    }
    this.cropPrevFocus = document.activeElement as HTMLElement | null
    this.cropState = { zoom: 1, ix: 0, iy: 0, fx: 0, fy: 0, fw: 0, fh: 0, imgLoaded: false }
    this.cropFrame.removeAttribute('data-crop-aspect')
    this.initCropFrame(resolveCropAspect(this.getAttr('crop-aspect', '')))
    this.cropDialogEl.setAttribute('aria-label', nameOf(file))
    this.cropOkBtn.textContent = this.t('modal.ok')
    if (this.cropCancelBtn) this.cropCancelBtn.textContent = this.t('modal.cancel')
    this.cropMask.removeAttribute('hidden')
    this.loadCropImage(file)
    this.renderCropStage()
    this.updateCropZoomText()
    this.cropOkBtn.focus()
    document.addEventListener('keydown', this.handleCropEsc)
  }

  /** 初始裁剪框：固定比例按 80% 舞台内接；自由比例给 60% 舞台（可任意拉伸）；均居中 */
  private initCropFrame(aspect: number | null): void {
    let fw: number
    let fh: number
    if (aspect === null) {
      fw = CROP_STAGE_W * 0.6
      fh = CROP_STAGE_H * 0.6
    } else if (aspect >= CROP_STAGE_W / CROP_STAGE_H) {
      fw = CROP_STAGE_W * 0.8
      fh = fw / aspect
    } else {
      fh = CROP_STAGE_H * 0.8
      fw = fh * aspect
    }
    this.cropState.fw = fw
    this.cropState.fh = fh
    this.cropState.fx = (CROP_STAGE_W - fw) / 2
    this.cropState.fy = (CROP_STAGE_H - fh) / 2
    this.syncCropFrame()
    if (aspect !== null) {
      this.cropFrame?.setAttribute('data-crop-aspect', this.getAttr('crop-aspect', '').trim())
    }
  }

  /** 把几何里的框写到裁剪框元素（inline 定位，物理 px，stage 已锁 LTR） */
  private syncCropFrame(): void {
    if (!this.cropFrame) return
    const { fx, fy, fw, fh } = this.cropState
    this.cropFrame.style.left = `${fx}px`
    this.cropFrame.style.top = `${fy}px`
    this.cropFrame.style.width = `${fw}px`
    this.cropFrame.style.height = `${fh}px`
  }

  /** 装载待裁剪图像（对象 URL 生命周期跟随对话框；解码完成后按 cover 居中） */
  private loadCropImage(file: File): void {
    this.releaseCropImage()
    const url = URL.createObjectURL(file)
    this.cropImgUrl = url
    const img = new Image()
    this.cropImg = img
    img.onload = () => {
      if (this.cropImg !== img) return
      this.cropState.imgLoaded = true
      this.fitCropImage()
      this.renderCropStage()
    }
    // 加载失败：舞台空白但对话框仍可取消/确认（确认导出空白结果，由宿主侧质量把控）
    img.onerror = () => {}
    img.src = url
  }

  private releaseCropImage(): void {
    if (this.cropImgUrl) {
      URL.revokeObjectURL(this.cropImgUrl)
      this.cropImgUrl = null
    }
    this.cropImg = null
  }

  /** cover 基准缩放（zoom=1 时图像恰铺满舞台）；图像未就绪时回退 1（几何全守卫） */
  private cropBaseScale(): number {
    const img = this.cropImg
    if (!img || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return 1
    return Math.max(CROP_STAGE_W / img.naturalWidth, CROP_STAGE_H / img.naturalHeight)
  }

  private cropScale(): number {
    return this.cropBaseScale() * this.cropState.zoom
  }

  /** 图像就绪后：zoom=1（cover）+ 居中 */
  private fitCropImage(): void {
    const img = this.cropImg
    if (!img || !this.cropState.imgLoaded) return
    const base = this.cropBaseScale()
    this.cropState.ix = (CROP_STAGE_W - img.naturalWidth * base) / 2
    this.cropState.iy = (CROP_STAGE_H - img.naturalHeight * base) / 2
  }

  /** 图像平移钳位：图像恒覆盖整舞台（zoom ≥ 1 = cover 基准），不允许露出空档 */
  private clampCropImage(): void {
    const img = this.cropImg
    if (!img || !this.cropState.imgLoaded) return
    const s = this.cropScale()
    const dw = img.naturalWidth * s
    const dh = img.naturalHeight * s
    this.cropState.ix = Math.min(0, Math.max(CROP_STAGE_W - dw, this.cropState.ix))
    this.cropState.iy = Math.min(0, Math.max(CROP_STAGE_H - dh, this.cropState.iy))
  }

  /** 缩放（按钮/滚轮）：以裁剪框中心为锚——缩放前后框正下方的图像点保持不动 */
  private setCropZoom(zoom: number): void {
    const next = Math.min(CROP_ZOOM_MAX, Math.max(CROP_ZOOM_MIN, zoom))
    if (next === this.cropState.zoom) {
      // 越界钳位后读数不变也刷一次显示（如重复点击已到上限）
      this.updateCropZoomText()
      return
    }
    if (this.cropImg && this.cropState.imgLoaded) {
      const cx = this.cropState.fx + this.cropState.fw / 2
      const cy = this.cropState.fy + this.cropState.fh / 2
      const oldS = this.cropScale()
      const px = (cx - this.cropState.ix) / oldS
      const py = (cy - this.cropState.iy) / oldS
      this.cropState.zoom = next
      const newS = this.cropScale()
      this.cropState.ix = cx - px * newS
      this.cropState.iy = cy - py * newS
      this.clampCropImage()
    } else {
      this.cropState.zoom = next
    }
    this.renderCropStage()
    this.updateCropZoomText()
  }

  private updateCropZoomText(): void {
    if (this.cropZoomText) this.cropZoomText.textContent = `${Math.round(this.cropState.zoom * 100)}%`
  }

  /** 舞台重绘：清底 → 按当前缩放/偏移画图像（canvas 缓冲与舞台物理尺寸 1:1） */
  private renderCropStage(): void {
    const canvas = this.cropCanvas
    if (!canvas) return
    canvas.width = CROP_STAGE_W
    canvas.height = CROP_STAGE_H
    const ctx = canvas.getContext('2d')
    const img = this.cropImg
    if (!ctx || !img || !this.cropState.imgLoaded) return
    try {
      ctx.clearRect(0, 0, CROP_STAGE_W, CROP_STAGE_H)
      const s = this.cropScale()
      ctx.drawImage(img, this.cropState.ix, this.cropState.iy, img.naturalWidth * s, img.naturalHeight * s)
    } catch {
      // 绘制失败不阻断交互（happy-dom 等 stub 环境）
    }
  }

  /** 裁剪框 → 源图自然像素矩形（stage 物理坐标线性映射，越界夹紧；未解码回退 1×1） */
  private cropSourceRect(): { sx: number; sy: number; sw: number; sh: number } {
    const img = this.cropImg
    const s = this.cropScale()
    if (!img || !(img.naturalWidth > 0) || !(img.naturalHeight > 0) || !(s > 0)) {
      return { sx: 0, sy: 0, sw: 1, sh: 1 }
    }
    const { fx, fy, fw, fh, ix, iy } = this.cropState
    const sx = Math.max(0, (fx - ix) / s)
    const sy = Math.max(0, (fy - iy) / s)
    const sw = Math.max(1, Math.min(img.naturalWidth - sx, fw / s))
    const sh = Math.max(1, Math.min(img.naturalHeight - sy, fh / s))
    return { sx, sy, sw, sh }
  }

  /**
   * 确认裁剪：离屏 canvas 按源图自然分辨率导出裁剪区域（`toBlob`）→ `oas-crop`
   * （detail { file: 原文件, blob }）→ 结果转 File 入列（commitFiles 统一走数量/大小/max
   * 校验与 auto-upload）。导出失败（blob 为空）视同取消。
   */
  private confirmCrop(): void {
    const orig = this.cropping
    if (!orig) return
    const rect = this.cropSourceRect()
    const mime = cropExportMime(orig.type)
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(rect.sw))
    out.height = Math.max(1, Math.round(rect.sh))
    const ctx = out.getContext('2d')
    const img = this.cropImg
    if (ctx && img && this.cropState.imgLoaded) {
      try {
        ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, out.width, out.height)
      } catch {
        // 绘制失败仍尝试导出（空白结果），不阻断流程
      }
    }
    out.toBlob(
      (blob) => {
        // 导出是异步的：期间对话框可能已被 Esc/取消关闭——只认仍然在裁剪的原文件
        if (this.cropping !== orig) return
        if (!blob) {
          this.cancelCrop()
          return
        }
        const outMime = blob.type || mime
        this.emit('crop', { file: orig, blob })
        const cropped = new File([blob], cropFileName(nameOf(orig), outMime), { type: outMime })
        this.cropping = null
        this.closeCropDialog()
        this.commitFiles([cropped])
        this.dequeueCrop()
      },
      mime,
      0.92,
    )
  }

  /** 取消裁剪：当前文件不入列，队列中后续文件继续接续 */
  private cancelCrop(): void {
    this.cropping = null
    this.closeCropDialog()
    this.dequeueCrop()
  }

  /** 关闭对话框：隐藏 + 释放图像资源 + 摘全局 Esc 监听 + 还原焦点（不动队列） */
  private closeCropDialog(): void {
    this.cropMask?.setAttribute('hidden', '')
    this.releaseCropImage()
    document.removeEventListener('keydown', this.handleCropEsc)
    this.cropPrevFocus?.focus()
    this.cropPrevFocus = null
  }

  /** max-size 解析：纯数字按字节；支持 B/KB/MB/GB 单位（不区分大小写） */
  private maxSizeBytes(): number {
    const raw = this.getAttr('max-size', '').trim()
    if (!raw) return 0
    const m = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(raw)
    if (!m) return 0
    const n = Number.parseFloat(m[1]!)
    const unit = (m[2] ?? 'b').toLowerCase()
    const mult: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
    if (!Number.isFinite(n)) return 0
    return Math.round(n * (mult[unit] ?? 1))
  }

  private commitFiles(added: File[]): void {
    const max = Number(this.getAttr('max', '0')) || 0
    const accept = this.getAttr('accept', '')
    const multi = this.hasAttr('multiple')
    const maxSize = this.maxSizeBytes()
    const replace = this.hasAttr('replace')
    const next: UploadEntry[] = [...this._files]
    const rejected: File[] = []
    const sizeRejected: File[] = []
    const replaced: UploadEntry[] = []
    for (const f of added) {
      if (accept && !this.matchesAccept(f.name, f.type, accept)) continue
      if (maxSize > 0 && f.size > maxSize) {
        sizeRejected.push(f)
        continue
      }
      const limit = !multi ? 1 : max > 0 ? max : 0
      if (limit > 0 && next.length >= limit) {
        if (!replace) {
          rejected.push(f)
          continue
        }
        // replace：超限替换语义——移除最早的条目为新文件腾位（max=1/单选即「选新顶旧」）
        while (next.length >= limit) {
          const out = next.shift()
          if (out !== undefined) replaced.push(out)
        }
      }
      next.push(f)
    }
    const unchanged =
      replaced.length === 0 && rejected.length === 0 && sizeRejected.length === 0 && next.length === this._files.length
    if (unchanged) return
    // 用户交互置脏：冻结 reset 基线（选文件/替换属用户对值的人工修改）
    this.filesDirty = true
    for (const e of next) {
      if (!this.statusMap.has(e)) this.statusMap.set(e, { percent: 0, status: 'pending' })
    }
    this._files = next
    this.renderList()
    for (const out of replaced) {
      this.revokeUrl(out)
      this.emit('remove', { file: out, index: 0, replaced: true })
    }
    if (rejected.length > 0) {
      // exceed-limit 为规范名（对齐 checkbox-group/select/toggle-group），exceed 为兼容别名
      this.emit('exceed', { files: rejected, max, total: next.length })
      this.emit('exceed-limit', { files: rejected, max, total: next.length })
    }
    if (sizeRejected.length > 0) {
      this.emit('exceed', { files: sizeRejected, type: 'size', maxSize, total: next.length })
      this.emit('exceed-limit', { files: sizeRejected, type: 'size', maxSize, total: next.length })
    }
    this.emit('change', { files: this.files })
    // 值变化点同步原生表单数据 + 校验链（文件选择/替换）
    this.syncFormValue()
    this.syncValidity()
    if (this.hasAttr('auto-upload')) this.startUpload()
  }

  private matchesAccept(name: string, type: string, accept: string): boolean {
    const patterns = accept
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
    if (patterns.length === 0) return true
    return patterns.some((p) => {
      if (p.startsWith('.')) return name.toLowerCase().endsWith(p)
      if (p.endsWith('/*')) return type.toLowerCase().startsWith(p.slice(0, -1))
      return type.toLowerCase() === p
    })
  }

  private parseJSONAttr(name: string): Record<string, string> {
    const raw = this.getAttr(name, '')
    if (!raw) return {}
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          out[k] = String(v)
        }
        return out
      }
    } catch {
      // 非法 JSON 容错为空
    }
    return {}
  }

  /** 是否有真实上传通道：custom-request 逃生舱优先，其次 action URL；皆无回落模拟进度 */
  private hasRealChannel(): boolean {
    return typeof this._customRequest === 'function' || this.getAttr('action', '') !== ''
  }

  /**
   * 上传入口：真实通道（action XHR / custom-request）逐文件发起；无通道回落模拟进度。
   * 注意：无通道时不发真请求也不告警（保持文档站 demo 可用性；回落语义见文档说明）。
   */
  startUpload(): void {
    if (this.injectDisabled()) return
    if (this.hasRealChannel()) {
      for (const e of this._files) {
        if (e instanceof File && this.statusMap.get(e)?.status === 'pending') this.uploadEntry(e)
      }
      return
    }
    this.startMockUpload()
  }

  /** 手动上传入口别名（对齐主流「提交」心智） */
  submit(): void {
    this.startUpload()
  }

  /** 取消上传：传入条目取消单个；无参取消全部进行中的上传 */
  abort(entry?: File): void {
    if (entry) {
      this.cancelEntry(entry)
      return
    }
    for (const e of [...this._files]) {
      if (e instanceof File && this.statusMap.get(e)?.status === 'uploading') this.cancelEntry(e)
    }
  }

  private uploadEntry(file: File): void {
    const st = this.statusMap.get(file)
    if (!st) return
    st.status = 'uploading'
    st.percent = 0
    const opts: UploadRequestOptions = {
      file,
      name: this.getAttr('name', 'file') || 'file',
      action: this.getAttr('action', ''),
      method: (this.getAttr('method', 'POST') || 'POST').toUpperCase(),
      headers: this.parseJSONAttr('headers'),
      data: this.parseJSONAttr('data'),
      withCredentials: this.hasAttr('with-credentials'),
      onProgress: (e) => {
        const cur = this.statusMap.get(file)
        if (!cur || cur.status !== 'uploading') return
        cur.percent = Math.max(0, Math.min(100, Math.round(e.percent)))
        this.emit('upload', { file, percent: cur.percent, status: 'uploading' })
        // oas-progress（PRD P2）：对外进度事件通道（内部进度已驱动 UI，此处补事件出口）
        this.emit('progress', { file, percent: cur.percent })
        this.renderList()
      },
      onSuccess: (response) => {
        const cur = this.statusMap.get(file)
        if (!cur || cur.status !== 'uploading') return
        cur.status = 'done'
        cur.percent = 100
        this.uploadControllers.delete(file)
        this.emit('success', { file, response })
        this.emit('upload', { file, percent: 100, status: 'done' })
        this.emit('progress', { file, percent: 100 })
        this.renderList()
      },
      onError: (err) => {
        const cur = this.statusMap.get(file)
        if (!cur || cur.status !== 'uploading') return
        cur.status = 'error'
        this.uploadControllers.delete(file)
        this.emit('error', { file, response: err?.response, status: err?.status })
        this.renderList()
      },
    }
    const ctrl = typeof this._customRequest === 'function' ? this._customRequest(opts) : this.xhrUpload(opts)
    const abortFn = ctrl?.abort
    if (typeof abortFn === 'function') this.uploadControllers.set(file, { abort: abortFn })
    this.renderList()
  }

  /** 内置 XHR 通道：FormData 包文件（name 字段）+ data 附加字段；进度/成功/失败/中止走真实事件 */
  private xhrUpload(opts: UploadRequestOptions): { abort: () => void } {
    const xhr = new XMLHttpRequest()
    xhr.open(opts.method, opts.action, true)
    xhr.withCredentials = opts.withCredentials
    for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v)
    const form = new FormData()
    form.append(opts.name, opts.file, opts.file.name)
    for (const [k, v] of Object.entries(opts.data)) form.append(k, v)
    const handle = { abort: () => xhr.abort() }
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && e.total > 0) {
        opts.onProgress({ percent: (e.loaded / e.total) * 100 })
      } else {
        // 无总长可计算时回落模拟推进（90% 封顶，成功事件收尾到 100）
        const cur = this.statusMap.get(opts.file)
        opts.onProgress({ percent: Math.min(90, (cur?.percent ?? 0) + 20) })
      }
    }
    const parseResponse = (text: string): unknown => {
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onSuccess(parseResponse(xhr.responseText))
      } else {
        opts.onError({ status: xhr.status, response: parseResponse(xhr.responseText || '') })
      }
    }
    xhr.onerror = () => opts.onError({})
    xhr.onabort = () => {
      // 控制器已失配 = removeEntry/adoptEntries/断连等路径已静默收尾，这里不重复派发
      if (this.uploadControllers.get(opts.file) !== handle) return
      this.uploadControllers.delete(opts.file)
      const cur = this.statusMap.get(opts.file)
      if (cur) {
        cur.status = 'pending'
        cur.percent = 0
      }
      this.emit('cancel', { file: opts.file })
      this.renderList()
    }
    xhr.send(form)
    return handle
  }

  private cancelEntry(file: File): void {
    const ctrl = this.uploadControllers.get(file)
    if (!ctrl) return
    this.uploadControllers.delete(file)
    ctrl.abort()
    // custom-request 通道没有统一的中止回调；XHR 通道的 onabort 已被上面的失配检查静默，
    // 收尾（回 pending + 派发 oas-cancel）统一在这里完成
    const st = this.statusMap.get(file)
    if (st) {
      st.status = 'pending'
      st.percent = 0
    }
    this.emit('cancel', { file })
    this.renderList()
  }

  private retryEntry(file: File): void {
    if (!this.hasRealChannel()) return
    this.emit('retry', { file })
    this.uploadEntry(file)
  }

  private abortAllQuiet(): void {
    for (const [, ctrl] of this.uploadControllers) ctrl.abort()
    this.uploadControllers.clear()
  }

  /** 模拟上传（无 action/custom-request 时的回落通道）：逐文件推进进度并派发 oas-upload */
  private startMockUpload(): void {
    if (this.timer) return
    for (const f of this._files) {
      if (!(f instanceof File)) continue
      const st = this.statusMap.get(f)
      if (st && st.status === 'pending') {
        st.status = 'uploading'
        st.percent = 0
      }
    }
    this.renderList()
    this.timer = setInterval(() => {
      let done = true
      for (const f of this._files) {
        if (!(f instanceof File)) continue
        const st = this.statusMap.get(f)
        if (!st || st.status !== 'uploading') continue
        done = false
        st.percent = Math.min(100, st.percent + 20)
        this.emit('upload', {
          file: f,
          percent: st.percent,
          status: st.percent >= 100 ? 'done' : 'uploading',
        })
        // oas-progress（PRD P2）：模拟通道同享对外进度事件
        this.emit('progress', { file: f, percent: st.percent })
        if (st.percent >= 100) st.status = 'done'
      }
      this.renderList()
      if (done || this._files.every((f) => this.statusMap.get(f)?.status === 'done')) {
        if (this.timer) clearInterval(this.timer)
        this.timer = null
      }
    }, 120)
  }

  private removeEntry(entry: UploadEntry): void {
    const index = this._files.indexOf(entry)
    if (index === -1) return
    // 上传中的文件被删除：先静默中止请求（不派发 oas-cancel）再移除
    if (entry instanceof File) {
      const ctrl = this.uploadControllers.get(entry)
      if (ctrl) {
        this.uploadControllers.delete(entry)
        ctrl.abort()
      }
    }
    // 用户交互置脏：移除后基线冻结（reset 不恢复被用户主动移除的文件）
    this.filesDirty = true
    this._files.splice(index, 1)
    this.statusMap.delete(entry)
    this.revokeUrl(entry)
    this.renderList()
    this.emit('remove', { file: entry, index })
    this.emit('change', { files: this.files })
    // 值变化点同步原生表单数据 + 校验链（文件移除）
    this.syncFormValue()
    this.syncValidity()
  }

  /** 初值/受控重置：File → pending；{name,url} 回显记录 → done(100) */
  private adoptEntries(list: Array<File | UploadEchoFile>): void {
    this.abortAllQuiet()
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.revokeAllUrls()
    // 文件列表被整体重置（受控写入/表单 reset）：进行中的裁剪流程随之作废
    this.cropQueue.length = 0
    if (this.cropping) {
      this.cropping = null
      this.closeCropDialog()
    }
    const ok: UploadEntry[] = []
    for (const e of Array.isArray(list) ? list : []) {
      if (e instanceof File) {
        ok.push(e)
      } else if (
        e &&
        typeof e === 'object' &&
        typeof (e as UploadEchoFile).name === 'string' &&
        typeof (e as UploadEchoFile).url === 'string'
      ) {
        ok.push({
          name: (e as UploadEchoFile).name,
          url: (e as UploadEchoFile).url,
          size: typeof (e as UploadEchoFile).size === 'number' ? (e as UploadEchoFile).size : undefined,
        })
      }
    }
    this._files = ok
    // form.reset 基线：初始渲染/受控写入（files/defaultFiles property）跟随刷新；用户交互置脏后冻结
    if (!this.filesDirty) this.initialFiles = [...ok]
    this.statusMap.clear()
    for (const e of this._files) {
      this.statusMap.set(e, e instanceof File ? { percent: 0, status: 'pending' } : { percent: 100, status: 'done' })
    }
    this.renderList()
    // 值变化点同步原生表单数据 + 校验链（初值/受控写入/清空，均不派发事件）
    this.syncFormValue()
    this.syncValidity()
  }

  private urlFor(entry: UploadEntry): string {
    if (!(entry instanceof File)) return entry.url
    let url = this.urlMap.get(entry)
    if (!url) {
      url = URL.createObjectURL(entry)
      this.urlMap.set(entry, url)
    }
    return url
  }

  private revokeUrl(entry: UploadEntry): void {
    const url = this.urlMap.get(entry)
    if (url) {
      URL.revokeObjectURL(url)
      this.urlMap.delete(entry)
    }
  }

  private revokeAllUrls(): void {
    for (const url of this.urlMap.values()) URL.revokeObjectURL(url)
    this.urlMap.clear()
  }

  private openPreview(entry: UploadEntry): void {
    if (this.injectDisabled()) return
    this.previewFile = entry
    this.previousFocus = document.activeElement as HTMLElement | null
    if (!this.previewBody || !this.previewMask) return
    this.previewBody.innerHTML = ''
    const url = this.urlFor(entry)
    if (isImageEntry(entry)) {
      const img = document.createElement('img')
      img.src = url
      img.alt = nameOf(entry)
      this.previewBody.appendChild(img)
    } else {
      const icon = document.createElement('oas-icon')
      icon.setAttribute('name', 'upload')
      icon.setAttribute('size', '48')
      this.previewBody.appendChild(icon)
      const name = document.createElement('div')
      name.className = 'preview-name'
      name.textContent = nameOf(entry)
      const size = document.createElement('div')
      size.className = 'preview-size'
      size.textContent = formatSize(sizeOf(entry))
      this.previewBody.append(name, size)
    }
    this.previewMask.removeAttribute('hidden')
    this.previewCloseBtn?.focus()
    document.addEventListener('keydown', this.handleKeydown)
    this.emit('preview', { file: entry, url })
  }

  private closePreview(): void {
    if (!this.previewMask || this.previewMask.hasAttribute('hidden')) return
    this.previewMask.setAttribute('hidden', '')
    this.previewFile = null
    this.previousFocus?.focus()
    this.previousFocus = null
    document.removeEventListener('keydown', this.handleKeydown)
  }

  private renderList(): void {
    const list = this.list
    if (!list) return
    list.hidden = !this.listVisible()
    if (!this.listVisible()) return
    list.innerHTML = ''
    if (this._files.length === 0) {
      list.className = 'list'
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('upload.empty')
      list.appendChild(empty)
      return
    }
    const type = this.listType
    if (type === 'picture-card') {
      list.className = 'list list-cards'
      this.renderCards(list)
    } else if (type === 'picture') {
      list.className = 'list'
      this.renderPictureList(list)
    } else {
      list.className = 'list'
      this.renderTextList(list)
    }
  }

  private statusOf(entry: UploadEntry): FileStatus {
    return this.statusMap.get(entry) ?? { percent: 0, status: 'pending' }
  }

  /** 行内容区：template[slot="item"] 克隆（[data-item-name]/[data-item-size] 绑定），缺省回落默认布局 */
  private makeItemMeta(entry: UploadEntry): HTMLElement {
    const tpl = this.querySelector('template[slot="item"]')
    if (tpl instanceof HTMLTemplateElement) {
      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.appendChild(tpl.content.cloneNode(true))
      const nameB = meta.querySelector('[data-item-name]')
      if (nameB) nameB.textContent = nameOf(entry)
      const sizeB = meta.querySelector('[data-item-size]')
      if (sizeB) sizeB.textContent = formatSize(sizeOf(entry))
      return meta
    }
    const meta = document.createElement('div')
    meta.className = 'meta'
    // list/picture 行的文件名即预览入口（点击开浮层，键盘可达）
    const name = document.createElement('button')
    name.type = 'button'
    name.className = 'name name-btn'
    name.textContent = nameOf(entry)
    name.setAttribute('aria-label', this.t('upload.preview', { name: nameOf(entry) }))
    name.addEventListener('click', () => this.openPreview(entry))
    const size = document.createElement('div')
    size.className = 'size'
    size.textContent = formatSize(sizeOf(entry))
    meta.append(name, size)
    return meta
  }

  private makeProgress(st: FileStatus): HTMLElement {
    const progress = document.createElement('oas-progress')
    progress.setAttribute('part', 'progress')
    progress.setAttribute('percent', String(st.percent))
    progress.setAttribute('show-text', st.status === 'done' ? 'true' : 'false')
    return progress
  }

  private makeIcon(name: string, size: string): HTMLElement {
    const icon = document.createElement('oas-icon')
    icon.setAttribute('name', name)
    icon.setAttribute('size', size)
    return icon
  }

  /** 行内 retry/cancel 操作按钮（真实通道专有态：error → retry；uploading 且可中止 → cancel） */
  private makeActInline(kind: 'retry' | 'cancel', entry: UploadEntry): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `act-inline ${kind}`
    b.setAttribute(
      'aria-label',
      this.t(kind === 'retry' ? 'upload.retry' : 'upload.cancelUpload', { name: nameOf(entry) }),
    )
    b.appendChild(this.makeIcon(kind === 'retry' ? 'refresh' : 'close', '14'))
    b.addEventListener('click', () => {
      if (!(entry instanceof File)) return
      if (kind === 'retry') this.retryEntry(entry)
      else this.cancelEntry(entry)
    })
    return b
  }

  private makeRemoveButton(entry: UploadEntry, disabled: boolean, className = 'remove'): HTMLButtonElement {
    const rm = document.createElement('button')
    rm.className = className
    rm.type = 'button'
    rm.disabled = disabled
    rm.setAttribute('aria-label', this.t('upload.remove', { name: nameOf(entry) }))
    rm.textContent = '×'
    rm.addEventListener('click', () => this.removeEntry(entry))
    return rm
  }

  /** list（默认）：文本行列表 */
  private renderTextList(list: HTMLElement): void {
    const disabled = this.injectDisabled()
    for (const entry of this._files) {
      const st = this.statusOf(entry)
      const item = document.createElement('div')
      item.className = 'item'
      if (st.status === 'error') item.classList.add('is-error')
      item.setAttribute('part', 'item')
      item.append(this.makeItemMeta(entry), this.makeProgress(st))
      if (st.status === 'error') item.appendChild(this.makeActInline('retry', entry))
      if (st.status === 'uploading' && entry instanceof File && this.uploadControllers.has(entry)) {
        item.appendChild(this.makeActInline('cancel', entry))
      }
      item.appendChild(this.makeRemoveButton(entry, disabled))
      list.appendChild(item)
    }
  }

  /** picture：列表行带 48px 小缩略图 */
  private renderPictureList(list: HTMLElement): void {
    const disabled = this.injectDisabled()
    for (const entry of this._files) {
      const st = this.statusOf(entry)
      const item = document.createElement('div')
      item.className = 'item item-picture'
      if (st.status === 'error') item.classList.add('is-error')
      item.setAttribute('part', 'item')

      const thumb = document.createElement('div')
      thumb.className = 'item-thumb'
      if (isImageEntry(entry)) {
        const img = document.createElement('img')
        img.src = this.urlFor(entry)
        img.alt = nameOf(entry)
        thumb.appendChild(img)
      } else {
        thumb.appendChild(this.makeIcon('upload', '20'))
      }

      item.append(thumb, this.makeItemMeta(entry), this.makeProgress(st))
      if (st.status === 'error') item.appendChild(this.makeActInline('retry', entry))
      if (st.status === 'uploading' && entry instanceof File && this.uploadControllers.has(entry)) {
        item.appendChild(this.makeActInline('cancel', entry))
      }
      item.appendChild(this.makeRemoveButton(entry, disabled))
      list.appendChild(item)
    }
  }

  /** picture-card：卡片缩略图墙（hover 遮罩操作区 + 右上角删除） */
  private renderCards(list: HTMLElement): void {
    const disabled = this.injectDisabled()
    for (const entry of this._files) {
      const st = this.statusOf(entry)
      const card = document.createElement('div')
      card.className = 'card'
      if (st.status === 'error') card.classList.add('is-error')
      // 上传中态类名：触屏（coarse）下操作遮罩常显的定位锚
      if (st.status === 'uploading') card.classList.add('is-uploading')
      card.setAttribute('part', 'item')

      const thumb = document.createElement('div')
      thumb.className = 'thumb'
      if (isImageEntry(entry)) {
        const img = document.createElement('img')
        img.src = this.urlFor(entry)
        img.alt = nameOf(entry)
        thumb.appendChild(img)
      } else {
        thumb.appendChild(this.makeIcon('upload', '32'))
        const name = document.createElement('span')
        name.className = 'thumb-name'
        name.textContent = nameOf(entry)
        thumb.appendChild(name)
      }
      thumb.addEventListener('click', () => this.openPreview(entry))
      card.appendChild(thumb)

      // hover 遮罩操作区：预览 / 重试（失败）/ 取消（上传中）/ 删除
      const actions = document.createElement('div')
      actions.className = 'actions'
      const prev = document.createElement('button')
      prev.className = 'act'
      prev.type = 'button'
      prev.disabled = disabled
      prev.setAttribute('aria-label', this.t('upload.preview', { name: nameOf(entry) }))
      prev.appendChild(this.makeIcon('eye', '16'))
      prev.addEventListener('click', () => this.openPreview(entry))
      actions.appendChild(prev)
      if (st.status === 'error') {
        const retry = document.createElement('button')
        retry.className = 'act retry'
        retry.type = 'button'
        retry.disabled = disabled
        retry.setAttribute('aria-label', this.t('upload.retry', { name: nameOf(entry) }))
        retry.appendChild(this.makeIcon('refresh', '16'))
        retry.addEventListener('click', () => {
          if (entry instanceof File) this.retryEntry(entry)
        })
        actions.appendChild(retry)
      }
      if (st.status === 'uploading' && entry instanceof File && this.uploadControllers.has(entry)) {
        const cancel = document.createElement('button')
        cancel.className = 'act cancel'
        cancel.type = 'button'
        cancel.disabled = disabled
        cancel.setAttribute('aria-label', this.t('upload.cancelUpload', { name: nameOf(entry) }))
        cancel.appendChild(this.makeIcon('close', '16'))
        cancel.addEventListener('click', () => {
          if (entry instanceof File) this.cancelEntry(entry)
        })
        actions.appendChild(cancel)
      }
      const rm = document.createElement('button')
      rm.className = 'act'
      rm.type = 'button'
      rm.disabled = disabled
      rm.setAttribute('aria-label', this.t('upload.remove', { name: nameOf(entry) }))
      rm.appendChild(this.makeIcon('trash', '16'))
      rm.addEventListener('click', () => this.removeEntry(entry))
      actions.appendChild(rm)
      card.appendChild(actions)

      // 右上角删除（hover/focus 时显现，触屏与键盘可达）
      const remove = this.makeRemoveButton(entry, disabled)
      remove.textContent = ''
      remove.appendChild(this.makeIcon('close', '12'))
      card.appendChild(remove)

      // 上传进度（非 done 时覆盖卡片底部）
      if (st.status !== 'pending' || st.percent > 0) {
        const wrap = document.createElement('div')
        wrap.className = 'progress-wrap'
        wrap.appendChild(this.makeProgress(st))
        card.appendChild(wrap)
      }

      list.appendChild(card)
    }
  }

  /**
   * 表单值快照（form-associated）：
   * - 仅 File 条目进 FormData（回显记录 {name,url} 无文件体，不参与提交）；
   * - 原生「同名多条」语义——多条 File 以 name 属性为 key 逐条 append（多选与单选同构，单文件即一条）；
   * - 无 File → null（FormData 不含此项）
   */
  protected override getFormValue(): string | FormData | null {
    const files = this._files.filter((e): e is File => e instanceof File)
    if (files.length === 0) return null
    const fd = new FormData()
    const name = this.getAttr('name', '')
    for (const f of files) fd.append(name, f, f.name)
    return fd
  }

  /** 原生校验链同步：required 且无 File → valueMissing（flag 为 true 时 message 按 Chromium 契约必须非空） */
  private syncValidity(): void {
    if (this.hasAttr('required') && this.getFormValue() === null) {
      this.setValidity({ valueMissing: true }, this.t('form.valueMissing'))
    } else {
      this.setValidity({})
    }
  }

  /** 表单 reset：恢复初始文件基线（defaultFiles 初值/最近一次受控写入），清脏，不派发事件（与原生 reset 一致） */
  protected override resetFormValue(): void {
    this.filesDirty = false
    // adoptEntries 内部不派发事件，并完成 FormData 同步（基线因清脏而跟随刷新为相同内容）
    this.adoptEntries(this.initialFiles)
    this.syncValidity()
  }

  /** shadow 内焦点/激活落点：拖拽区（role=button tabindex=0）。基类默认选择器会误中隐藏 file input（聚焦无意义），必须覆盖 */
  protected override get innerControl(): HTMLElement | null {
    return this.zone
  }
}
