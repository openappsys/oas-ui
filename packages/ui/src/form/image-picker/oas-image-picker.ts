import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { compressImageFile, parseCompressAttr, type CompressMeta, type CompressOptions } from './image-process.js'

/**
 * oas-image-picker —— 多图选择（form 族）。
 *
 * 移动端/桌面通用的图片选择器：点击或拖拽选图 → 缩略图网格预览 → 排序 → 删除，带数量上限。
 * 组件只管「选哪些图、什么顺序」，上传由宿主把 `files` 交给上传链路。
 *
 * 属性（kebab-case）：
 * - `max`：数量上限，默认 9；非法/非正数回落默认并告警
 * - `accept`：文件类型过滤（原生 `accept` 语法），默认 `image/*`
 * - `capture`：在场时透传原生 `capture`（移动端直接拉起相机）
 * - `disabled`：禁用（不可选、不可排序/删除）
 * - `readonly`：只读预览（隐藏添加入口，操作按钮禁用但可见）
 * - `compress`：选图自动压缩（v2.6.9，缺省关 = 现状逐字节等价）——
 *   空串 = 开启缺省档（quality 0.8 / max-dimension 4096）；JSON `{"quality":0.8,"max-dimension":1920}`
 *   覆盖档位；非法 JSON / 字段越界 devWarn 一次并按关闭处理。开启后用户选入的 JPEG/PNG/WebP
 *   会被 canvas 重绘（按浏览器解码已正立的位图等比缩到 `max-dimension` 内）并重编码为
 *   **同类型 File**（PNG 保留透明；GIF/SVG 等不动）；解码失败 / canvas 不可用优雅降级保留原文件。
 *   EXIF 方向：浏览器 `<img>` 解码已按 EXIF 正立渲染，压缩输出恒为正立图（重编码不携带
 *   方向标记，手机竖拍照片不会躺倒）；源文件的 EXIF Orientation 以**元信息**进
 *   detail.compressed[].orientation（宿主可据此区分原始方向标记）。
 *   压缩只作用于**用户新选入**的文件（受控 `files` property 写入不压缩——宿主给的即最终值）。
 *   开启期间 `oas-change` detail 增加 `compressed` 数组（与 `files` 对齐：每项为压缩元信息
 *   `{ originalWidth, originalHeight, width, height, orientation, quality }` 或 null=未处理）。
 *   并发选入（两次连续选文件都在压缩在途）按最新列表重算余量截断，终态不越过 `max`。
 *
 * Property（仅 JS，不反射 attribute）：
 * - `files`：当前图片列表（`File[]`，受控；赋值即刷新且**不派发**事件）
 *
 * 插槽：无（缩略图由文件生成，不接受 light DOM 内容）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：用户新增 / 删除 / 排序后派发，`detail: { files, count }`（compress 开启时附 `compressed`）
 * - `oas-exceed-limit`：选择总数超过上限，`detail: { count, max }`（超出部分被丢弃；
 *   在 `oas-change` 之后派发——宿主先拿到新列表，再收到丢弃提示）
 * - `oas-reject`：被 `accept` 过滤掉的文件，`detail: { files }`
 *
 * 方法：
 * - `open()`：打开系统文件选择器（需用户手势上下文）
 * - `clear()`：清空列表（派发 `oas-change`）
 * - `remove(index)` / `move(index, delta)`：程序化删除 / 前后移动（派发 `oas-change`）
 *
 * a11y：网格 `role="list"`，每张缩略图带文件名 alt，操作为原生按钮并带序号可读名称；
 * 计数区 `aria-live="polite"` 播报数量变化。缩略图 URL 由 `URL.createObjectURL` 生成，
 * 文件移出列表时按个回收，组件断开连接时全量回收（重连按 `files` 懒重建）。
 */

const DEFAULT_MAX = 9

const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    devWarn(msg)
  }
}

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: var(--oas-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
}
.thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb[hidden] {
  display: none;
}
.ops {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  display: flex;
  justify-content: space-between;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: color-mix(in srgb, var(--oas-color-ink-deep) 60%, transparent);
}
.op {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--oas-control-height-sm);
  min-height: var(--oas-control-height-sm);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.op:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.op:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.op:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
}
.add-item {
  aspect-ratio: 1;
  list-style: none;
}
.add-item[hidden] {
  display: none;
}
.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: var(--oas-space-1);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary-text);
}
.add:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg-disabled);
}
.add[hidden] {
  display: none;
}
.plus {
  font-size: var(--oas-font-size-xl);
  line-height: 1;
}
.drop-hint {
  margin: 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
.drop-hint[hidden] {
  display: none;
}
.count {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
}
.count[hidden] {
  display: none;
}
.picker.dragover {
  outline: 2px dashed var(--oas-color-primary);
  outline-offset: var(--oas-space-1);
  border-radius: var(--oas-radius-md);
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  .op:focus-visible,
  .add:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

export class OASImagePicker extends OASElement {
  static override get observedAttributes(): string[] {
    return ['max', 'accept', 'capture', 'disabled', 'readonly', 'compress']
  }

  private pickerEl: HTMLElement | null = null
  private gridEl: HTMLElement | null = null
  private addEl: HTMLButtonElement | null = null
  private addItemEl: HTMLElement | null = null
  private inputEl: HTMLInputElement | null = null
  private countEl: HTMLElement | null = null
  private hintEl: HTMLElement | null = null

  private items: File[] = []
  /** 文件 → 缩略图 objectURL（文件移出列表时回收） */
  private urls = new Map<File, string>()
  /** 文件 → 压缩元信息（compress 开启时随 oas-change 对齐输出；WeakMap 随文件回收） */
  private compressMeta = new WeakMap<File, CompressMeta>()
  /** compress 属性原文 → 解析结果缓存（同原文不重复 JSON.parse；原文变化即失效） */
  private compressParsed: { raw: string; value: CompressOptions | null } | null = null
  /** 上次渲染指纹：文件列表 / 上限 / 禁用态不变则不重建缩略图（避免闪烁与焦点丢失） */
  private lastSig = ''

  /** @apiProperty 当前图片列表（受控；赋值即刷新，不反射 attribute，也不派发事件） */
  get files(): File[] {
    return [...this.items]
  }

  set files(list: File[]) {
    const next = Array.isArray(list) ? list.slice() : []
    const max = this.maxCount()
    const trimmed = next.slice(0, max)
    this.replaceItems(trimmed)
    if (this.hasRendered) this.update()
  }

  /** 交互锁定：禁用（含注入）或只读 */
  private get locked(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly')
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="picker" part="picker">
        <ul class="grid" part="grid" role="list" aria-label="">
          <li class="add-item" part="add-item">
            <button class="add" part="add" type="button" aria-label=""><span class="plus" aria-hidden="true">+</span><span class="add-text"></span></button>
          </li>
        </ul>
        <p class="drop-hint" part="drop-hint" hidden></p>
        <span class="count" part="count" aria-live="polite"></span>
        <input class="file" type="file" hidden>
      </div>
    `
  }

  private bind(): void {
    this.pickerEl = this.shadow.querySelector<HTMLElement>('[part="picker"]')
    this.gridEl = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.addEl = this.shadow.querySelector<HTMLButtonElement>('[part="add"]')
    this.addItemEl = this.shadow.querySelector<HTMLElement>('[part="add-item"]')
    this.inputEl = this.shadow.querySelector<HTMLInputElement>('input[type="file"]')
    this.countEl = this.shadow.querySelector<HTMLElement>('[part="count"]')
    this.hintEl = this.shadow.querySelector<HTMLElement>('[part="drop-hint"]')

    this.addEl?.addEventListener('click', this.onAddClick)
    this.inputEl?.addEventListener('change', this.onInputChange)
    this.gridEl?.addEventListener('click', this.onGridClick)
    this.pickerEl?.addEventListener('dragover', this.onDragOver)
    this.pickerEl?.addEventListener('dragleave', this.onDragLeave)
    this.pickerEl?.addEventListener('drop', this.onDrop)
    this.ensureCleanup()
  }

  /** 断开清理：全量回收缩略图 objectURL（URL 不跟着节点走，重连时按 files 懒重建） */
  private ensureCleanup(): void {
    this.onCleanup(() => this.revokeAllUrls())
  }

  /** 回收全部缩略图 URL 并清空映射（幂等） */
  private revokeAllUrls(): void {
    for (const url of this.urls.values()) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // 环境不支持 objectURL 时忽略
      }
    }
    this.urls.clear()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
    // 断开时 URL 已全量回收：清指纹强制重建缩略图（懒重建新 URL），否则残留 <img> 指向已失效的 blob
    this.lastSig = ''
    this.update()
  }

  protected override update(): void {
    const add = this.addEl
    if (!add || !this.inputEl || !this.gridEl) return

    const max = this.maxCount()
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const accept = this.getAttr('accept', 'image/*') || 'image/*'

    this.inputEl.accept = accept
    this.inputEl.multiple = true
    if (this.hasAttr('capture')) this.inputEl.setAttribute('capture', '')
    else this.inputEl.removeAttribute('capture')
    this.inputEl.disabled = disabled || readonly

    const full = this.items.length >= max
    add.hidden = readonly || full
    if (this.addItemEl) this.addItemEl.hidden = readonly || full
    add.disabled = disabled
    add.setAttribute('aria-label', this.t('imagePicker.add'))
    const addText = add.querySelector<HTMLElement>('.add-text')
    if (addText) addText.textContent = this.t('imagePicker.add')
    if (this.hintEl) {
      this.hintEl.hidden = this.items.length > 0
      this.hintEl.textContent = this.t('imagePicker.drag')
    }

    this.gridEl.setAttribute('aria-label', this.t('imagePicker.limit', { max }))
    if (this.countEl) {
      this.countEl.textContent = this.t('imagePicker.count', { count: this.items.length, max })
      this.countEl.hidden = false
    }

    const sig = `${this.items.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|')}#${max}#${disabled}#${readonly}`
    if (sig === this.lastSig) {
      this.syncOps()
      return
    }
    this.lastSig = sig
    this.renderTiles(disabled, readonly)
  }

  /** 缩略图网格重建（文件列表/上限/禁用态变化时） */
  private renderTiles(disabled: boolean, readonly: boolean): void {
    const grid = this.gridEl
    if (!grid) return
    // 只重建缩略图项；添加块（li.add-item）是常驻节点，保持在网格末尾
    for (const node of grid.querySelectorAll('[part="tile"]')) node.remove()
    const addItem = this.addItemEl
    this.items.forEach((file, index) => {
      const li = document.createElement('li')
      li.className = 'tile'
      li.setAttribute('part', 'tile')

      const img = document.createElement('img')
      img.className = 'thumb'
      img.setAttribute('part', 'thumbnail')
      img.alt = file.name
      img.draggable = false
      const url = this.urlOf(file)
      if (url) img.src = url
      else img.hidden = true
      li.appendChild(img)

      const ops = document.createElement('div')
      ops.className = 'ops'
      ops.setAttribute('part', 'ops')
      ops.appendChild(
        this.createOp('prev', index, disabled || readonly, this.t('imagePicker.movePrev', { index: index + 1 })),
      )
      ops.appendChild(
        this.createOp('remove', index, disabled || readonly, this.t('imagePicker.remove', { index: index + 1 })),
      )
      ops.appendChild(
        this.createOp('next', index, disabled || readonly, this.t('imagePicker.moveNext', { index: index + 1 })),
      )
      li.appendChild(ops)

      if (addItem) grid.insertBefore(li, addItem)
      else grid.appendChild(li)
    })
    this.syncOps()
  }

  private createOp(
    act: 'prev' | 'next' | 'remove',
    index: number,
    disabled: boolean,
    label: string,
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'op'
    btn.setAttribute('part', 'op')
    btn.dataset.act = act
    btn.dataset.index = String(index)
    btn.setAttribute('aria-label', label)
    btn.textContent = act === 'remove' ? '×' : act === 'prev' ? '←' : '→'
    btn.disabled = disabled
    return btn
  }

  /** 边界按钮禁用态同步（首个不可前移、末个不可后移） */
  private syncOps(): void {
    const readonly = this.hasAttr('readonly')
    const disabled = this.injectDisabled() || readonly
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('.op')) {
      const index = Number(btn.dataset.index)
      const act = btn.dataset.act
      btn.disabled = disabled || (act === 'prev' && index === 0) || (act === 'next' && index === this.items.length - 1)
    }
  }

  private urlOf(file: File): string {
    const existing = this.urls.get(file)
    if (existing) return existing
    let url = ''
    try {
      url = URL.createObjectURL(file)
    } catch {
      url = ''
    }
    if (url) this.urls.set(file, url)
    return url
  }

  /** 替换列表并回收移出文件的对象 URL */
  private replaceItems(next: File[]): void {
    for (const [file, url] of this.urls) {
      if (!next.includes(file)) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // 环境不支持 objectURL 时忽略
        }
        this.urls.delete(file)
      }
    }
    this.items = next
  }

  private maxCount(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return DEFAULT_MAX
    const n = Number(raw)
    if (!Number.isInteger(n) || n <= 0) {
      warnOnce(`[oas-image-picker] 非法 max "${raw}"，已回落 ${DEFAULT_MAX}；应为正整数`)
      return DEFAULT_MAX
    }
    return n
  }

  private onAddClick = (): void => {
    if (this.locked) return
    this.inputEl?.click()
  }

  private onInputChange = (): void => {
    const input = this.inputEl
    if (!input) return
    const incoming = input.files ? [...input.files] : []
    this.addFiles(incoming)
    // 允许再次选择同一文件（change 才会再次触发）
    input.value = ''
  }

  private onGridClick = (e: Event): void => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('.op')
    if (!btn || !this.gridEl?.contains(btn)) return
    if (this.locked) return
    const index = Number(btn.dataset.index)
    const act = btn.dataset.act
    if (act === 'remove') this.removeAt(index)
    else if (act === 'prev') this.move(index, -1)
    else if (act === 'next') this.move(index, 1)
  }

  private onDragOver = (e: DragEvent): void => {
    if (this.locked) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    this.pickerEl?.classList.add('dragover')
  }

  private onDragLeave = (): void => {
    this.pickerEl?.classList.remove('dragover')
  }

  private onDrop = (e: Event): void => {
    this.pickerEl?.classList.remove('dragover')
    if (this.locked) return
    e.preventDefault()
    const dt = (e as DragEvent).dataTransfer
    const incoming = dt?.files ? [...dt.files] : []
    this.addFiles(incoming)
  }

  /** 追加文件：accept 过滤 → 压缩（compress 开启时）→ 上限截断 → 派发事件 */
  private async addFiles(incoming: File[]): Promise<void> {
    if (incoming.length === 0) return
    const accepted = incoming.filter((file) => this.matchesAccept(file))
    const rejected = incoming.filter((file) => !accepted.includes(file))
    if (rejected.length > 0) this.emit('reject', { files: rejected })
    if (accepted.length === 0) return

    // 余量按当前列表乐观预截（只压缩可能入选的文件）；压缩是异步的，落地后必须按最新
    // this.items 重算余量再截断——并发两次选入都用旧余量会越过 max 上限（回归锁定）
    const max = this.maxCount()
    const room = Math.max(0, max - this.items.length)
    const candidates = accepted.slice(0, room)
    let added = candidates
    const options = this.compressOptions()
    if (options && candidates.length > 0) {
      const results = await Promise.all(candidates.map((file) => compressImageFile(file, options)))
      added = results.map((result, index) => {
        const resolved = results[index]
        if (resolved) this.compressMeta.set(resolved.file, resolved.meta)
        return resolved?.file ?? candidates[index]!
      })
      // await 落地：列表可能已被并发批次推进，按最新余量截断（终态 ≤ max）
      const latestRoom = Math.max(0, this.maxCount() - this.items.length)
      added = added.slice(0, latestRoom)
    }
    if (added.length > 0) {
      this.replaceItems([...this.items, ...added])
      this.update()
      this.emitChange()
    }
    // exceed-limit 在 oas-change 之后派发：宿主先收到新列表，再收到「有文件被丢弃」的提示。
    // 丢弃数按落地后的实际插入量核对（并发批次推进列表后旧余量已过期）
    if (accepted.length > added.length) {
      const count = this.items.length - added.length + accepted.length
      this.emit('exceed-limit', { count, max })
    }
  }

  /**
   * compress 档位：属性缺省 = null（关闭，现状等价）；空串 = 缺省档；
   * JSON = 覆盖档位；非法 = null + 单次告警（成员名带 resolve 前缀，避开 compress 撞名）。
   * 同一属性原文解析结果缓存（emitChange 每次读 compressActive，不重复 JSON.parse）。
   */
  private compressOptions(): CompressOptions | null {
    if (!this.hasAttr('compress')) return null
    const raw = this.getAttr('compress', '')
    if (this.compressParsed?.raw === raw) return this.compressParsed.value
    const parsed = parseCompressAttr(raw)
    if (!parsed) {
      warnOnce(
        `[oas-image-picker] 非法 compress "${raw || '（空）'}"，已按关闭处理；示例：compress="" 或 compress='{"quality":0.8,"max-dimension":1920}'`,
      )
    }
    this.compressParsed = { raw, value: parsed }
    return parsed
  }

  /** compress 是否实际生效（属性在场且 JSON 合法；非法 = 关闭，detail 不带 compressed） */
  private compressActive(): boolean {
    return this.compressOptions() !== null
  }

  /** accept 匹配：支持 `image/*` / MIME / 扩展名列表 */
  private matchesAccept(file: File): boolean {
    const accept = (this.getAttr('accept', 'image/*') || 'image/*').toLowerCase()
    if (accept === '*/*') return true
    const parts = accept
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) return true
    const type = (file.type || '').toLowerCase()
    const name = file.name.toLowerCase()
    return parts.some((part) => {
      if (part.endsWith('/*')) return type.startsWith(part.slice(0, -1))
      if (part.startsWith('.')) return name.endsWith(part)
      return type === part
    })
  }

  private emitChange(): void {
    // compress 实际生效时 detail 附 compressed（与 files 对齐；未处理/降级位为 null）；
    // 关闭（含非法 JSON 按关闭处理）时 detail 与现状逐字节等价
    if (this.compressActive()) {
      const compressed = this.items.map((file) => this.compressMeta.get(file) ?? null)
      this.emit('change', { files: this.files, count: this.items.length, compressed })
      return
    }
    this.emit('change', { files: this.files, count: this.items.length })
  }

  /** 程序化删除（越界忽略；派发 oas-change） */
  removeAt(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.items.length) return
    if (this.injectDisabled()) return
    const next = [...this.items]
    next.splice(index, 1)
    this.replaceItems(next)
    this.update()
    this.emitChange()
  }

  /** 程序化移动：`delta` 为 ±1（越界忽略；派发 oas-change） */
  move(index: number, delta: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.items.length) return
    if (this.injectDisabled()) return
    const target = index + delta
    if (!Number.isInteger(target) || target < 0 || target >= this.items.length) return
    const next = [...this.items]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    this.replaceItems(next)
    this.update()
    this.emitChange()
  }

  /** 打开系统文件选择器（需在用户手势中调用） */
  open(): void {
    if (this.locked) return
    this.inputEl?.click()
  }

  /** 清空列表（派发 oas-change） */
  clear(): void {
    if (this.items.length === 0) return
    this.replaceItems([])
    this.update()
    this.emitChange()
  }
}
