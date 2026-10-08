import { OASElement } from '@oas-ui/core'

/** 附件状态机（与 oas-upload 状态词表对齐） */
export type AttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done'
/** 三档尺寸（sm 接受 small 别名） */
export type AttachmentSize = 'default' | 'sm' | 'xs'

/** 进行中态（spinner + aria-busy）；其余为终态/初始态 */
const BUSY_STATES = new Set(['uploading', 'processing'])

/** state 全词表（与 oas-upload 状态词表对齐，库内一致） */
const STATES = new Set(['idle', 'uploading', 'processing', 'error', 'done'])

/** 三档尺寸：default/sm/xs（sm 接受 small 别名，归一逻辑见 normalizeSize） */
function normalizeSize(raw: string | null): string {
  if (!raw) return 'default'
  const v = raw.trim()
  if (v === 'sm' || v === 'small') return 'sm'
  if (v === 'xs') return 'xs'
  return 'default'
}

/** 内置缺省文件图标（组件专属语义美术，本地常量——原创手绘，aria-hidden 装饰） */
const FILE_ICON =
  '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" fill="none"><path d="M4 2.5 h5 L12.5 6 v7 a1 1 0 0 1 -1 1 h-7.5 a1 1 0 0 1 -1 -1 v-9.5 a1 1 0 0 1 1 -1 z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 2.5 V6 h3.5" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 9 h5 M5.5 11.5 h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'

/** 内置 spinner（loading 内置集同款双弧，旋转动画） */
const SPINNER_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none"><path d="M8 1.5 A6.5 6.5 0 1 0 14.5 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none !important;
}
.attachment {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2_5);
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  padding: var(--oas-space-2_5) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* 竖排：图上文下（orientation 纯 CSS 消费） */
:host([orientation="vertical"]) .attachment {
  flex-direction: column;
  align-items: flex-start;
  width: 180px;
}
:host([orientation="vertical"]) .body {
  width: 100%;
}
/* size 三档：sm/xs 收内边距与媒体 */
:host([data-size="sm"]) .attachment {
  padding: var(--oas-space-1_5) var(--oas-space-2);
}
:host([data-size="sm"]) [part="media"] svg {
  width: 18px;
  height: 18px;
}
:host([data-size="xs"]) .attachment {
  padding: var(--oas-space-1) var(--oas-space-2);
}
:host([data-size="xs"]) [part="media"] svg {
  width: 15px;
  height: 15px;
}
:host([data-size="xs"]) .title {
  font-size: var(--oas-font-size-xs);
}
/* 触发器：有 href 时整卡可点（a 语义），无 href 是中性容器 */
.trigger {
  display: flex;
  align-items: inherit;
  flex-direction: inherit;
  gap: inherit;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  border-radius: inherit;
}
a.trigger:hover .title {
  color: var(--oas-color-primary-text);
  text-decoration: underline;
}
a.trigger:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 2px;
}
.media {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
}
.media ::slotted(*) {
  max-width: 64px;
  max-height: 64px;
  border-radius: var(--oas-radius-sm);
  object-fit: cover;
}
.body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.title {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.description {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* error 态：媒体/描述转 danger（文字文案同在，不单靠色传达） */
:host([data-state="error"]) .media {
  color: var(--oas-color-danger-text);
}
:host([data-state="error"]) .description {
  color: var(--oas-color-danger-text);
}
/* 进行中：spinner 旋转（reduced-motion 停转） */
.spinner {
  display: inline-flex;
  color: var(--oas-color-primary-text);
  animation: attachment-spin 0.9s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes attachment-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
/* 上传进度：细进度条（progress part 仅 uploading 态渲染） */
.progress {
  position: absolute;
  inset-inline: var(--oas-space-3);
  bottom: 3px;
  height: 3px;
  border-radius: var(--oas-radius-xs);
  background: var(--oas-color-bg-hover);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--oas-color-primary);
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
/* 操作区：仅图标按钮，aria-label 必含文件名（含目标） */
.actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-inline-start: auto;
}
.actions ::slotted(*) {
  display: inline-flex;
}
.actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out), color var(--oas-transition-fast) var(--oas-ease-out);
}
.actions button:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.actions button:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 1px;
}
.actions button[hidden] {
  display: none;
}
`

/**
 * oas-attachment —— 会话附件行（媒体 + 文件名/元数据 + 状态机 + 操作）。
 *
 * 属性：
 * - `name`：文件名（title 通道）
 * - `detail`：次级元数据（类型 · 大小等）；error 态缺省时显示 locale 错误文案
 * - `state`：`idle` | `uploading` | `processing` | `error` | `done`（默认 `done`；与 oas-upload 词表一致）
 * - `progress`：0–100（越界 clamp；仅 uploading 态渲染进度条）
 * - `size`：`default`（默认）| `sm`（别名 `small`）| `xs`
 * - `orientation`：`horizontal`（默认）| `vertical`（图上文下）
 * - `href`：有则整卡为可点触发器（`<a part="trigger">`）
 * - `removable` / `downloadable`：布尔在场——显示内置删除/下载按钮
 *
 * 媒体：缺省渲染内置文件图形（纯装饰 aria-hidden）；`slot="media"` 放缩略图即覆盖
 * （插槽优先级天然生效，无需形态属性——媒体形态由「有没有插槽内容」这一事实决定）。
 *
 * 事件：`oas-remove` / `oas-download`（detail `{ name }`）、`oas-open`（detail `{ href }`）
 *
 * 插槽：`media`（覆盖 media 属性）、`actions`（追加自定义操作）
 *
 * 部件：`attachment` / `trigger` / `media` / `title` / `description` / `spinner` / `progress` / `actions` / `remove` / `download`
 */
export class OASAttachment extends OASElement {
  static override get observedAttributes(): string[] {
    // removable/downloadable 入观察表：布尔在场驱动 update() 重算操作钮显隐，
    // 否则宿主运行时增删属性无反馈（仅首帧生效是缺陷）。
    // 无 media 属性：媒体形态由 slot="media" 有无内容天然决定（缺省内置图形，插槽即覆盖）
    return ['name', 'detail', 'state', 'progress', 'size', 'orientation', 'href', 'removable', 'downloadable']
  }

  /** 上一次连接记录的 href（oas-open detail 用） */
  private boundHref = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="attachment" part="attachment">
        <div class="trigger" part="trigger">
          <div class="media" part="media"><slot name="media">${FILE_ICON}</slot></div>
          <div class="body">
            <div class="title" part="title"></div>
            <div class="description" part="description"></div>
          </div>
        </div>
        <div class="spinner" part="spinner" hidden>${SPINNER_ICON}</div>
        <div class="actions" part="actions">
          <slot name="actions"></slot>
          <button type="button" part="download" hidden></button>
          <button type="button" part="remove" hidden></button>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；幂等可重入） */
  private bind(): void {
    const trigger = this.shadow.querySelector<HTMLElement>('[part="trigger"]')
    trigger?.addEventListener('click', this.handleTriggerClick)
    const download = this.shadow.querySelector<HTMLButtonElement>('[part="download"]')
    download?.addEventListener('click', this.handleDownloadClick)
    const remove = this.shadow.querySelector<HTMLButtonElement>('[part="remove"]')
    remove?.addEventListener('click', this.handleRemoveClick)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（attachment 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="attachment"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const root = this.shadow.querySelector<HTMLElement>('[part="attachment"]')
    if (!root) return

    const state = this.getAttr('state', 'done')
    const busy = BUSY_STATES.has(state)
    // 非法 state 保留原样进 data-state（CSS 不命中即回落默认视觉），词表校验不抛错
    this.setAttribute('data-state', state)
    this.setAttribute('data-size', normalizeSize(this.getAttribute('size')))
    if (busy) this.setAttribute('aria-busy', 'true')
    else this.removeAttribute('aria-busy')

    // 文案：detail 优先；error 态缺省显示 locale 错误文案
    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const description = this.shadow.querySelector<HTMLElement>('[part="description"]')
    if (title) title.textContent = this.getAttr('name')
    if (description) {
      const detail = this.getAttribute('detail')
      description.textContent = detail ?? (state === 'error' ? this.t('attachment.error') : '')
    }

    // spinner：仅进行中
    const spinner = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    if (spinner) spinner.hidden = !busy

    // 进度条：仅 uploading 态渲染（0–100 clamp）
    let progress = root.querySelector('[part="progress"]')
    if (state === 'uploading') {
      const pct = Math.min(100, Math.max(0, Number(this.getAttribute('progress')) || 0))
      if (!progress) {
        progress = document.createElement('div')
        progress.setAttribute('part', 'progress')
        progress.className = 'progress'
        progress.setAttribute('role', 'progressbar')
        progress.setAttribute('aria-label', this.getAttr('name'))
        const fill = document.createElement('div')
        fill.className = 'progress-fill'
        progress.appendChild(fill)
        root.appendChild(progress)
      }
      progress.setAttribute('aria-valuemin', '0')
      progress.setAttribute('aria-valuemax', '100')
      progress.setAttribute('aria-valuenow', String(pct))
      const fill = progress.querySelector<HTMLElement>('.progress-fill')
      if (fill) fill.style.width = `${pct}%`
    } else {
      progress?.remove()
    }

    // 触发器：href 有无切换 a/div（保留 trigger part 与内部结构）
    this.syncTrigger()

    // 操作按钮：removable/downloadable 布尔在场显示；aria-label 含文件名
    const name = this.getAttr('name')
    const download = this.shadow.querySelector<HTMLButtonElement>('[part="download"]')
    if (download) {
      download.hidden = !this.hasAttr('downloadable')
      download.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none"><path d="M8 2.5 V10 M4.5 7 L8 10.5 L11.5 7 M3 13 h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      download.setAttribute('aria-label', this.t('attachment.download', { name }))
    }
    const remove = this.shadow.querySelector<HTMLButtonElement>('[part="remove"]')
    if (remove) {
      remove.hidden = !this.hasAttr('removable')
      remove.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none"><path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
      remove.setAttribute('aria-label', this.t('attachment.remove', { name }))
    }
  }

  /** href 有则把触发器换成 <a>（点击派发 oas-open，浏览器接管导航），无则中性 div */
  private syncTrigger(): void {
    const href = this.getAttribute('href') ?? ''
    this.boundHref = href
    const current = this.shadow.querySelector('[part="trigger"]')
    if (!current) return
    const isAnchor = current.tagName === 'A'
    if (href && !isAnchor) {
      const a = document.createElement('a')
      a.setAttribute('part', 'trigger')
      a.className = 'trigger'
      while (current.firstChild) a.appendChild(current.firstChild)
      current.replaceWith(a)
      // 替换产生的新元素不带旧监听：重挂（切换只在 href 有无跨越时发生，不重复）
      a.addEventListener('click', this.handleTriggerClick)
    } else if (!href && isAnchor) {
      const div = document.createElement('div')
      div.setAttribute('part', 'trigger')
      div.className = 'trigger'
      while (current.firstChild) div.appendChild(current.firstChild)
      current.replaceWith(div)
      div.addEventListener('click', this.handleTriggerClick)
    } else if (isAnchor) {
      ;(current as HTMLAnchorElement).href = href
    }
  }

  private handleTriggerClick = (e: MouseEvent): void => {
    // 仅 href 模式派发 oas-open；无 href 的中性容器点击无语义。
    // cancelable：宿主 preventDefault oas-open → 组件同步 preventDefault click 阻断 <a> 导航
    if (!this.boundHref) return
    const notPrevented = this.emit('open', { href: this.boundHref }, { cancelable: true })
    if (!notPrevented) e.preventDefault()
  }

  private handleDownloadClick = (): void => {
    this.emit('download', { name: this.getAttr('name') })
  }

  private handleRemoveClick = (): void => {
    // 默认不自移除：删除决策在宿主（接事件后自行摘除或弹确认）
    this.emit('remove', { name: this.getAttr('name') })
  }
}
