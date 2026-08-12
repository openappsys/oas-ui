import { OASElement } from '@oas-ui/core'

interface FileStatus {
  percent: number
  status: 'pending' | 'uploading' | 'done'
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
  font-size: var(--oas-font-size-xl);
  line-height: 1;
  color: var(--oas-color-primary);
}
.zone .hint {
  font-size: var(--oas-font-size-sm);
}
.list {
  margin-top: var(--oas-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
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
  border-radius: var(--oas-radius-md);
  overflow: hidden;
  background: var(--oas-color-bg);
  flex: none;
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
  transition: opacity var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover .remove,
.card .remove:focus-visible {
  opacity: 1;
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
  transition: opacity var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover .actions,
.card:focus-within .actions {
  opacity: 1;
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
}
/* 预览浮层 */
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: var(--oas-z-modal, 1050);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--oas-color-overlay);
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

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export class OASUpload extends OASElement {
  static override get observedAttributes(): string[] {
    return ['accept', 'multiple', 'max', 'disabled', 'auto-upload', 'list-type']
  }

  private input: HTMLInputElement | null = null
  private zone: HTMLElement | null = null
  private list: HTMLElement | null = null
  private previewMask: HTMLElement | null = null
  private previewBody: HTMLElement | null = null
  private previewCloseBtn: HTMLButtonElement | null = null
  private _files: File[] = []
  private statusMap = new Map<File, FileStatus>()
  private urlMap = new Map<File, string>()
  private previewFile: File | null = null
  private previousFocus: HTMLElement | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.closePreview()
  }

  /** files 走 property（File[] 无法用 JSON 属性表达），设置后立即重渲列表 */
  get files(): File[] {
    return [...this._files]
  }

  set files(list: File[]) {
    this.revokeAllUrls()
    this._files = Array.isArray(list) ? [...list] : []
    this.statusMap.clear()
    for (const f of this._files) {
      this.statusMap.set(f, { percent: 0, status: 'pending' })
    }
    this.renderList()
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
        <oas-icon class="icon" name="upload" size="28"></oas-icon>
        <span class="hint"></span>
      </div>
      <div class="list" part="list"></div>
      <div class="preview-mask" part="preview" hidden>
        <div class="preview-dialog" role="dialog" aria-modal="true">
          <div class="preview-body"></div>
          <button type="button" class="preview-close" part="preview-close"></button>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定文件选择/点击/拖拽事件（render 与水合路径共用） */
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

    this.zone?.addEventListener('click', () => {
      if (this.hasAttr('disabled')) return
      this.input?.click()
    })
    this.zone?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.hasAttr('disabled')) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.input?.click()
      }
    })
    // 拖拽高亮与文件接收：disabled 时整体走浏览器默认（dragover 不 preventDefault →
    // 禁止 drop、显示禁止光标），避免松开鼠标时浏览器直接打开文件
    this.zone?.addEventListener('dragenter', (e: DragEvent) => {
      if (this.hasAttr('disabled')) return
      e.preventDefault()
      this.zone?.classList.add('dragging')
    })
    this.zone?.addEventListener('dragover', (e: DragEvent) => {
      if (this.hasAttr('disabled')) return
      e.preventDefault()
    })
    this.zone?.addEventListener('dragleave', () => {
      this.zone?.classList.remove('dragging')
    })
    this.zone?.addEventListener('drop', (e: DragEvent) => {
      // 无条件 preventDefault：disabled 也要阻止浏览器默认行为（打开被拖入的文件）
      e.preventDefault()
      this.zone?.classList.remove('dragging')
      if (this.hasAttr('disabled')) return
      const dropped = e.dataTransfer?.files ? [...e.dataTransfer.files] : []
      if (dropped.length > 0) this.addFiles(dropped)
    })

    this.previewCloseBtn?.addEventListener('click', () => this.closePreview())
    this.previewMask?.addEventListener('click', (e: MouseEvent) => {
      if (e.target === e.currentTarget) this.closePreview()
    })

    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
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
    const disabled = this.hasAttr('disabled')
    input.accept = this.getAttr('accept', '')
    input.multiple = this.hasAttr('multiple')
    input.disabled = disabled
    zone.setAttribute('aria-disabled', String(disabled))
    zone.setAttribute('aria-label', disabled ? '' : this.t('upload.drag'))
    const hint = zone.querySelector('.hint')
    if (hint) hint.textContent = disabled ? this.t('upload.select') : this.t('upload.drag')
    const dialog = this.shadow.querySelector('.preview-dialog')
    dialog?.setAttribute('aria-label', this.t('upload.previewDialog'))
    if (this.previewCloseBtn) this.previewCloseBtn.textContent = this.t('upload.closePreview')
    this.renderList()
  }

  private addFiles(added: File[]): void {
    if (this.hasAttr('disabled')) return
    const max = Number(this.getAttr('max', '0')) || 0
    const accept = this.getAttr('accept', '')
    const multi = this.hasAttr('multiple')
    let next = [...this._files]
    const rejected: File[] = []
    for (const f of added) {
      if (accept && !this.matchesAccept(f.name, f.type, accept)) continue
      if (!multi && next.length >= 1) {
        rejected.push(f)
        continue
      }
      if (max > 0 && next.length >= max) {
        rejected.push(f)
        continue
      }
      next.push(f)
    }
    if (next.length === this._files.length && rejected.length === 0) return
    for (const f of next) {
      if (!this.statusMap.has(f)) this.statusMap.set(f, { percent: 0, status: 'pending' })
    }
    this._files = next
    this.renderList()
    if (rejected.length > 0) {
      this.emit('exceed', { files: rejected, max, total: next.length })
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

  /** 模拟上传：逐文件推进进度并派发 oas-upload；全部完成后停止计时器 */
  startUpload(): void {
    if (this.hasAttr('disabled')) return
    if (this.timer) return
    for (const f of this._files) {
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

  private removeFile(file: File): void {
    const index = this._files.indexOf(file)
    if (index === -1) return
    this._files.splice(index, 1)
    this.statusMap.delete(file)
    this.revokeUrl(file)
    this.renderList()
    this.emit('remove', { file, index })
    this.emit('change', { files: this.files })
  }

  private urlFor(file: File): string {
    let url = this.urlMap.get(file)
    if (!url) {
      url = URL.createObjectURL(file)
      this.urlMap.set(file, url)
    }
    return url
  }

  private revokeUrl(file: File): void {
    const url = this.urlMap.get(file)
    if (url) {
      URL.revokeObjectURL(url)
      this.urlMap.delete(file)
    }
  }

  private revokeAllUrls(): void {
    for (const url of this.urlMap.values()) URL.revokeObjectURL(url)
    this.urlMap.clear()
  }

  private openPreview(file: File): void {
    if (this.hasAttr('disabled')) return
    this.previewFile = file
    this.previousFocus = document.activeElement as HTMLElement | null
    if (!this.previewBody || !this.previewMask) return
    this.previewBody.innerHTML = ''
    const url = this.urlFor(file)
    if (isImageFile(file)) {
      const img = document.createElement('img')
      img.src = url
      img.alt = file.name
      this.previewBody.appendChild(img)
    } else {
      const icon = document.createElement('oas-icon')
      icon.setAttribute('name', 'upload')
      icon.setAttribute('size', '48')
      this.previewBody.appendChild(icon)
      const name = document.createElement('div')
      name.className = 'preview-name'
      name.textContent = file.name
      const size = document.createElement('div')
      size.className = 'preview-size'
      size.textContent = formatSize(file.size)
      this.previewBody.append(name, size)
    }
    this.previewMask.removeAttribute('hidden')
    this.previewCloseBtn?.focus()
    document.addEventListener('keydown', this.handleKeydown)
    this.emit('preview', { file, url })
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

  private makeItemMeta(file: File): HTMLElement {
    const meta = document.createElement('div')
    meta.className = 'meta'
    const name = document.createElement('div')
    name.className = 'name'
    name.textContent = file.name
    const size = document.createElement('div')
    size.className = 'size'
    size.textContent = formatSize(file.size)
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

  private makeRemoveButton(file: File, disabled: boolean, className = 'remove'): HTMLButtonElement {
    const rm = document.createElement('button')
    rm.className = className
    rm.type = 'button'
    rm.disabled = disabled
    rm.setAttribute('aria-label', this.t('upload.remove', { name: file.name }))
    rm.textContent = '×'
    rm.addEventListener('click', () => this.removeFile(file))
    return rm
  }

  /** list（默认）：文本行列表 */
  private renderTextList(list: HTMLElement): void {
    const disabled = this.hasAttr('disabled')
    for (const file of this._files) {
      const st = this.statusMap.get(file) ?? { percent: 0, status: 'pending' }
      const item = document.createElement('div')
      item.className = 'item'
      item.setAttribute('part', 'item')
      item.append(
        this.makeItemMeta(file),
        this.makeProgress(st),
        this.makeRemoveButton(file, disabled),
      )
      list.appendChild(item)
    }
  }

  /** picture：列表行带 48px 小缩略图 */
  private renderPictureList(list: HTMLElement): void {
    const disabled = this.hasAttr('disabled')
    for (const file of this._files) {
      const st = this.statusMap.get(file) ?? { percent: 0, status: 'pending' }
      const item = document.createElement('div')
      item.className = 'item item-picture'
      item.setAttribute('part', 'item')

      const thumb = document.createElement('div')
      thumb.className = 'item-thumb'
      if (isImageFile(file)) {
        const img = document.createElement('img')
        img.src = this.urlFor(file)
        img.alt = file.name
        thumb.appendChild(img)
      } else {
        const icon = document.createElement('oas-icon')
        icon.setAttribute('name', 'upload')
        icon.setAttribute('size', '20')
        thumb.appendChild(icon)
      }

      item.append(
        thumb,
        this.makeItemMeta(file),
        this.makeProgress(st),
        this.makeRemoveButton(file, disabled),
      )
      list.appendChild(item)
    }
  }

  /** picture-card：卡片缩略图墙（hover 遮罩操作区 + 右上角删除） */
  private renderCards(list: HTMLElement): void {
    const disabled = this.hasAttr('disabled')
    for (const file of this._files) {
      const st = this.statusMap.get(file) ?? { percent: 0, status: 'pending' }
      const card = document.createElement('div')
      card.className = 'card'
      card.setAttribute('part', 'item')

      const thumb = document.createElement('div')
      thumb.className = 'thumb'
      if (isImageFile(file)) {
        const img = document.createElement('img')
        img.src = this.urlFor(file)
        img.alt = file.name
        thumb.appendChild(img)
      } else {
        const icon = document.createElement('oas-icon')
        icon.setAttribute('name', 'upload')
        icon.setAttribute('size', '32')
        thumb.appendChild(icon)
        const name = document.createElement('span')
        name.className = 'thumb-name'
        name.textContent = file.name
        thumb.appendChild(name)
      }
      thumb.addEventListener('click', () => this.openPreview(file))
      card.appendChild(thumb)

      // hover 遮罩操作区：预览 + 删除
      const actions = document.createElement('div')
      actions.className = 'actions'
      const prev = document.createElement('button')
      prev.className = 'act'
      prev.type = 'button'
      prev.disabled = disabled
      prev.setAttribute('aria-label', this.t('upload.preview', { name: file.name }))
      prev.appendChild(this.makeIcon('eye', '16'))
      prev.addEventListener('click', () => this.openPreview(file))
      actions.appendChild(prev)
      const rm = document.createElement('button')
      rm.className = 'act'
      rm.type = 'button'
      rm.disabled = disabled
      rm.setAttribute('aria-label', this.t('upload.remove', { name: file.name }))
      rm.appendChild(this.makeIcon('trash', '16'))
      rm.addEventListener('click', () => this.removeFile(file))
      actions.appendChild(rm)
      card.appendChild(actions)

      // 右上角删除（hover/focus 时显现，触屏与键盘可达）
      const remove = this.makeRemoveButton(file, disabled)
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
