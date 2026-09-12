import { OASElement } from '@oas-ui/core'

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
  background: var(--oas-color-overlay);
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

export class OASUpload extends OASElement {
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
  private _customRequest: UploadCustomRequest | null = null
  private _beforeUpload: UploadBeforeUpload | null = null

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.closePreview()
  }

  /** files 走 property（File/回显记录无法用 JSON 属性表达），设置后立即重渲列表 */
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
      </div>
      <div class="tip" part="tip" hidden></div>
      <div class="list" part="list"></div>
      <div class="preview-mask" part="preview" hidden>
        <div class="preview-dialog" role="dialog" aria-modal="true">
          <div class="preview-body"></div>
          <button type="button" class="preview-close" part="preview-close"></button>
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
    // 宿主级：trigger 插槽内容点击经 light DOM 冒泡到达宿主，转发打开文件选择
    this.addEventListener('click', (e: Event) => {
      if (this.injectDisabled()) return
      const t = e.target
      if (!(t instanceof Node) || t === this || !this.contains(t)) return
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

    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
      this.abortAllQuiet()
      this.revokeAllUrls()
      document.removeEventListener('keydown', this.handleKeydown)
    })
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
    const dialog = this.shadow.querySelector('.preview-dialog')
    dialog?.setAttribute('aria-label', this.t('upload.previewDialog'))
    if (this.previewCloseBtn) this.previewCloseBtn.textContent = this.t('upload.closePreview')
    this.renderList()
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

  /** 列表显隐：show-file-list="false" 时只渲染触发区（头像等自绘预览场景的前提） */
  private listVisible(): boolean {
    return this.getAttr('show-file-list', 'true') !== 'false'
  }

  private addFiles(added: File[]): void {
    if (this.injectDisabled()) return
    const hook = this._beforeUpload
    if (typeof hook === 'function') {
      void this.runBeforeUpload(hook, added)
      return
    }
    this.commitFiles(added)
  }

  /** before-upload：false/异常拒绝；返回 File 转换；异步结果统一回落 commitFiles */
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
    if (out.length > 0) this.commitFiles(out)
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
      this.emit('exceed', { files: rejected, max, total: next.length })
    }
    if (sizeRejected.length > 0) {
      this.emit('exceed', { files: sizeRejected, type: 'size', maxSize, total: next.length })
    }
    this.emit('change', { files: this.files })
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
    this._files.splice(index, 1)
    this.statusMap.delete(entry)
    this.revokeUrl(entry)
    this.renderList()
    this.emit('remove', { file: entry, index })
    this.emit('change', { files: this.files })
  }

  /** 初值/受控重置：File → pending；{name,url} 回显记录 → done(100) */
  private adoptEntries(list: Array<File | UploadEchoFile>): void {
    this.abortAllQuiet()
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.revokeAllUrls()
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
    this.statusMap.clear()
    for (const e of this._files) {
      this.statusMap.set(e, e instanceof File ? { percent: 0, status: 'pending' } : { percent: 100, status: 'done' })
    }
    this.renderList()
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
}
