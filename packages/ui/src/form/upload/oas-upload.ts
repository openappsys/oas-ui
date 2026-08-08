import { OASElement } from '@oas-ui/core'

interface FileStatus {
  percent: number
  status: 'pending' | 'uploading' | 'done'
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 100%;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
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

export class OASUpload extends OASElement {
  static override get observedAttributes(): string[] {
    return ['accept', 'multiple', 'max', 'disabled', 'auto-upload']
  }

  private input: HTMLInputElement | null = null
  private zone: HTMLElement | null = null
  private list: HTMLElement | null = null
  private _files: File[] = []
  private statusMap = new Map<File, FileStatus>()
  private timer: ReturnType<typeof setInterval> | null = null

  /** files 走 property（File[] 无法用 JSON 属性表达），设置后立即重渲列表 */
  get files(): File[] {
    return [...this._files]
  }

  set files(list: File[]) {
    this._files = Array.isArray(list) ? [...list] : []
    this.statusMap.clear()
    for (const f of this._files) {
      this.statusMap.set(f, { percent: 0, status: 'pending' })
    }
    this.renderList()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <input class="file-input" type="file" hidden />
      <div class="zone" part="zone" role="button" tabindex="0"></div>
      <div class="list" part="list"></div>
    `
    this.input = this.shadow.querySelector('.file-input')
    this.zone = this.shadow.querySelector('.zone')
    this.list = this.shadow.querySelector('.list')

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
    // 拖拽高亮与文件接收
    this.zone?.addEventListener('dragenter', (e: DragEvent) => {
      e.preventDefault()
      if (this.hasAttr('disabled')) return
      this.zone?.classList.add('dragging')
    })
    this.zone?.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault()
    })
    this.zone?.addEventListener('dragleave', () => {
      this.zone?.classList.remove('dragging')
    })
    this.zone?.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault()
      this.zone?.classList.remove('dragging')
      if (this.hasAttr('disabled')) return
      const dropped = e.dataTransfer?.files ? [...e.dataTransfer.files] : []
      if (dropped.length > 0) this.addFiles(dropped)
    })

    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
    })
    this.update()
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
    this.renderList()
  }

  private addFiles(added: File[]): void {
    if (this.hasAttr('disabled')) return
    const max = Number(this.getAttr('max', '0')) || 0
    const accept = this.getAttr('accept', '')
    const multi = this.hasAttr('multiple')
    let next = [...this._files]
    for (const f of added) {
      if (!multi && next.length >= 1) break
      if (max > 0 && next.length >= max) break
      if (accept && !this.matchesAccept(f.name, f.type, accept)) continue
      next.push(f)
    }
    if (next.length === this._files.length) return
    for (const f of next) {
      if (!this.statusMap.has(f)) this.statusMap.set(f, { percent: 0, status: 'pending' })
    }
    this._files = next
    this.renderList()
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
    this.renderList()
    this.emit('remove', { file, index })
    this.emit('change', { files: this.files })
  }

  private renderList(): void {
    const list = this.list
    if (!list) return
    list.innerHTML = ''
    if (this._files.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('upload.empty')
      list.appendChild(empty)
      return
    }
    const disabled = this.hasAttr('disabled')
    for (const file of this._files) {
      const st = this.statusMap.get(file) ?? { percent: 0, status: 'pending' }
      const item = document.createElement('div')
      item.className = 'item'
      item.setAttribute('part', 'item')

      const meta = document.createElement('div')
      meta.className = 'meta'
      const name = document.createElement('div')
      name.className = 'name'
      name.textContent = file.name
      const size = document.createElement('div')
      size.className = 'size'
      size.textContent = formatSize(file.size)
      meta.append(name, size)

      const progress = document.createElement('oas-progress')
      progress.setAttribute('part', 'progress')
      progress.setAttribute('percent', String(st.percent))
      progress.setAttribute('show-text', st.status === 'done' ? 'true' : 'false')

      const rm = document.createElement('button')
      rm.className = 'remove'
      rm.type = 'button'
      rm.disabled = disabled
      rm.setAttribute('aria-label', this.t('upload.remove', { name: file.name }))
      rm.textContent = '×'
      rm.addEventListener('click', () => this.removeFile(file))

      item.append(meta, progress, rm)
      list.appendChild(item)
    }
  }
}
