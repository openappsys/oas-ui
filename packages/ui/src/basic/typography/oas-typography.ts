import { OASElement } from '@oas-ui/core'

export type TextType = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'disabled'

export type AlignType = 'start' | 'center' | 'end' | 'justify'

export type WeightType = 'regular' | 'medium' | 'semibold' | 'bold'

/** align 合法档位（text-align 的 start/end 为逻辑值，RTL 安全；start 对应 left、end 对应 right） */
const ALIGN_VALUES: readonly AlignType[] = ['start', 'center', 'end', 'justify']

/** weight 档位 → font-weight 数值（与 strong 布尔 600 兼容：semibold 即 strong 字重） */
const WEIGHT_MAP: Record<WeightType, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

const TYPE_COLOR: Record<TextType, string> = {
  default: 'var(--oas-color-text-primary)',
  secondary: 'var(--oas-color-text-secondary)',
  success: 'var(--oas-color-success-text)',
  warning: 'var(--oas-color-warning-text)',
  danger: 'var(--oas-color-danger-text)',
  disabled: 'var(--oas-color-text-disabled)',
}

const BASE_STYLE = `
:host {
  display: inline-block;
  max-width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
/* wrap：text + actions 的 flex 容器（actions 前置/后置靠 order 生效）；
   max-width 约束链：:host（父容器定宽）→ wrap（参照 host）→ text（参照 wrap），
   任一环缺失都会让省略约束落空外溢（本层曾因缺 max-width 导致 suffix 卡片文字跑出卡片） */
.wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 0;
  max-width: 100%;
}
.text {
  display: inline;
  margin: 0;
}
.text.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}
/* 修饰布尔：strong/mark/code/underline/delete/italic/numeric（class 驱动，语义与原生 strong/mark/code/u/del/em 对齐） */
.text.strong {
  font-weight: 600;
}
/* mark 背景色走 CSS 变量开口 --oas-text-mark-bg：宿主可在元素/祖先上设置变量自定义标记色，
   缺省回退 warning 语义色（dark/high-contrast 主题由 token 自动适配，组件不自造色值） */
.text.mark {
  background: color-mix(
    in srgb,
    var(--oas-text-mark-bg, var(--oas-color-warning)) 18%,
    transparent
  );
  padding: 0 var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
}
/* numeric 数字等宽：表格/统计数字列对齐（font-variant-numeric: tabular-nums） */
.text.numeric {
  font-variant-numeric: tabular-nums;
}
.text.code {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.875em;
  /* 内联代码框居中：inline-flex 内容居中 + 行高收紧贴字形 + 对称 padding。
     根源是中文字形走系统字体回退、与等宽字体度量不一致——flex 居中消解行盒度量差 */
  display: inline-flex;
  align-items: center;
  line-height: 1.35;
  background: var(--oas-color-bg-hover);
  padding: 0.2em var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  border: 1px solid var(--oas-color-border);
}
.text.underline {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.text.delete {
  text-decoration: line-through;
}
.text.italic {
  font-style: italic;
}
/* depth 三档弱化（纯 token 组合，无自造色值） */
.text.depth-1 {
  color: var(--oas-color-text-secondary);
}
.text.depth-2 {
  color: color-mix(in srgb, var(--oas-color-text-secondary) 50%, var(--oas-color-text-disabled));
}
.text.depth-3 {
  color: var(--oas-color-text-disabled);
}
/* 组合：delete + underline 同设时删除线优先（text-decoration 单值，delete 后写覆盖 underline） */
.text.delete.underline {
  text-decoration: line-through;
}
/* ellipsis-suffix：省略时后缀完整展示在省略号后（flex 布局，suffix 不收缩） */
.text.ellipsis.has-suffix {
  display: inline-flex;
  max-width: 100%;
}
.text.ellipsis.has-suffix > .content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
/* line-clamp 多行省略：纯 CSS -webkit-line-clamp（行数走变量），与 ellipsis 互斥 */
.text.line-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--oas-line-clamp, 2);
  line-clamp: var(--oas-line-clamp, 2);
  overflow: hidden;
  max-width: 100%;
}
.suffix {
  flex-shrink: 0;
  white-space: nowrap;
}
.suffix[hidden] {
  display: none;
}
/* actions 操作条：复制/自定义按钮整体前置/后置 */
.actions {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
  margin-left: var(--oas-space-1);
  order: 2;
}
.actions.start {
  order: 0;
  margin-left: 0;
  margin-right: var(--oas-space-1);
}
.actions[hidden] {
  display: none;
}
.copy-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 0 0 var(--oas-space-1);
  cursor: pointer;
  color: var(--oas-color-primary);
  font-size: 1em;
  vertical-align: baseline;
}
.copy-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

function styleFor(tag: string): string {
  return BASE_STYLE
}

interface TypoOptions {
  tag: string
  levels?: boolean
  part: string
}

type TypographyConstructor = CustomElementConstructor & {
  observedAttributes: string[]
}

function createTypography(
  tag: string,
  options: { levels?: boolean; part: string },
): TypographyConstructor {
  const { levels = false, part } = options

  class OASTypography extends OASElement {
    static override get observedAttributes(): string[] {
      return [
        'level',
        'type',
        'ellipsis',
        'copyable',
        'copy-text',
        'ellipsis-suffix',
        'actions-position',
        'line-clamp',
        'tag',
        'depth',
        'strong',
        'mark',
        'code',
        'underline',
        'delete',
        'italic',
        'align',
        'weight',
        'numeric',
      ]
    }

    private root: HTMLElement | null = null
    private contentEl: HTMLElement | null = null
    private suffixEl: HTMLElement | null = null
    private actionsEl: HTMLElement | null = null
    private copyBtn: HTMLButtonElement | null = null

    /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
    private template(): string {
      const level = Number(this.getAttr('level', '3')) || 3
      const tagName = levels ? (`h${level}` as const) : tag
      return `
        <style>${BASE_STYLE}</style>
        <span class="wrap" part="wrap">
          <${tagName} class="text" part="${part}">
            <span class="content" part="content"><slot></slot></span>
            <span class="suffix" part="suffix" hidden></span>
          </${tagName}>
          <span class="actions" part="actions" hidden>
            <slot name="actions"></slot>
            <button class="copy-btn" part="copy" hidden></button>
          </span>
        </span>
      `
    }

    /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
    private bind(): void {
      this.root = this.shadow.querySelector('.text')
      this.contentEl = this.shadow.querySelector('.content')
      this.suffixEl = this.shadow.querySelector('.suffix')
      this.actionsEl = this.shadow.querySelector('.actions')
      this.copyBtn = this.shadow.querySelector('.copy-btn')
      this.copyBtn?.addEventListener('click', () => this.handleCopy())
      // actions slot 内容变化同步显隐；监听器注册 onCleanup 防断开泄漏
      const actionsSlot = this.shadow.querySelector('slot[name="actions"]')
      const onSlotChange = () => this.update()
      actionsSlot?.addEventListener('slotchange', onSlotChange)
      this.onCleanup(() => actionsSlot?.removeEventListener('slotchange', onSlotChange))
    }

    protected override render(): void {
      this.shadow.innerHTML = this.template()
      this.bind()
    }

    /** 真水合：校验 SSR 快照结构（关键节点 .text 存在）后直接接管，跳过 shadow 重建 */
    protected override hydrate(): boolean {
      if (!this.shadow.querySelector('.text')) return false
      this.bind()
      return true
    }

    /** 合法 tag 白名单（换标签语义；危险标签 script/iframe 等天然不在列） */
    private static readonly VALID_TAGS = new Set([
      'span',
      'p',
      'div',
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'del',
      'ins',
      'mark',
      'code',
      'sub',
      'sup',
      'small',
      'abbr',
      'cite',
      'q',
      'time',
      'address',
    ])

    /** tag 换标签：合法则换（重建元素），非法忽略 */
    private syncTag(targetTag: string): void {
      const root = this.root
      if (!root) return
      if (root.tagName.toLowerCase() === targetTag) return
      if (!OASTypography.VALID_TAGS.has(targetTag)) return
      const next = document.createElement(targetTag)
      next.className = root.className
      next.style.cssText = root.style.cssText
      next.setAttribute('part', part)
      // content/suffix 子结构迁移（slot 投影跟随）
      while (root.firstChild) next.appendChild(root.firstChild)
      root.replaceWith(next)
      this.root = next
      // 换标签后 content/suffix 引用失效，重绑
      this.contentEl = next.querySelector('.content')
      this.suffixEl = next.querySelector('.suffix')
    }

    protected override update(): void {
      // 换标签决策链（先全部做完，最后统一施加 class——syncTag 重建元素后 class 需基于新引用重跑）
      const type = this.getAttr('type', 'default') as TextType
      const useCodeTag = this.hasAttr('code')
      const useDelTag = this.hasAttr('delete')
      const tagAttr = this.getAttr('tag', '')
      const customTag =
        tagAttr && OASTypography.VALID_TAGS.has(tagAttr.toLowerCase()) ? tagAttr.toLowerCase() : ''
      const wantTag =
        customTag || (useCodeTag ? 'code' : useDelTag ? 'del' : levels ? this.rootTagName() : tag)
      if (this.root!.tagName.toLowerCase() !== wantTag) this.syncTag(wantTag)
      // level（仅 title；与修饰 code/delete 冲突时 level 优先——标题语义重于修饰）
      if (levels && !useCodeTag && !useDelTag && !customTag) {
        const level = Math.min(Math.max(Number(this.getAttr('level', '3')) || 3, 1), 5)
        const tagName = `h${level}` as const
        if (this.root!.tagName.toLowerCase() !== tagName) this.syncTag(tagName)
      }
      const root = this.root
      if (!root) return
      const ellipsis = this.hasAttr('ellipsis')
      const lineClampRaw = this.getAttr('line-clamp', '')
      const lineClamp = Number(lineClampRaw)
      const hasLineClamp = Number.isInteger(lineClamp) && lineClamp >= 1 && lineClampRaw !== ''
      // line-clamp 与 ellipsis 互斥：line-clamp 优先
      const useEllipsis = ellipsis && !hasLineClamp
      root.classList.toggle('ellipsis', useEllipsis)
      root.classList.toggle('line-clamp', hasLineClamp)
      if (hasLineClamp) root.style.setProperty('--oas-line-clamp', String(lineClamp))
      else root.style.removeProperty('--oas-line-clamp')
      // type 语义色
      for (const key of Object.keys(TYPE_COLOR) as TextType[]) {
        root.classList.toggle(key, key === type && type !== 'default')
      }
      root.style.color = type === 'default' ? '' : TYPE_COLOR[type]!
      // depth 三档弱化（type 非 default 时忽略 depth——语义色优先）
      const depthRaw = this.getAttr('depth', '')
      const useDepth = type === 'default' && ['1', '2', '3'].includes(depthRaw)
      for (const d of ['1', '2', '3']) {
        root.classList.toggle(`depth-${d}`, useDepth && depthRaw === d)
      }
      // 修饰六布尔（class 驱动样式；code/delete 换原生标签已在换标签链处理）+ numeric 数字等宽
      for (const b of [
        'strong',
        'mark',
        'code',
        'underline',
        'delete',
        'italic',
        'numeric',
      ] as const) {
        root.classList.toggle(b, this.hasAttr(b))
      }
      // 文本对齐（align 四档；text-align 的 start/end 为逻辑值，RTL 安全）
      const align = this.getAttr('align', '') as AlignType
      root.style.textAlign = (ALIGN_VALUES as readonly string[]).includes(align) ? align : ''
      // 字重档（weight 四档；显式档经内联优先于 strong 布尔类的 600）
      const weight = this.getAttr('weight', '') as WeightType
      root.style.fontWeight = WEIGHT_MAP[weight] ? WEIGHT_MAP[weight] : ''
      // suffix：ellipsis 或 line-clamp 开启时展示
      const suffix = this.getAttr('ellipsis-suffix', '')
      if (this.suffixEl) {
        const showSuffix = suffix !== '' && (useEllipsis || hasLineClamp)
        this.suffixEl.hidden = !showSuffix
        if (showSuffix) this.suffixEl.textContent = suffix
        root.classList.toggle('has-suffix', showSuffix)
      }
      // actions：有 slot 内容或 copyable 时展示；start 前置
      const actionsSlot = this.shadow.querySelector('slot[name="actions"]') as HTMLSlotElement
      const hasActionsContent = actionsSlot.assignedNodes().length > 0
      if (this.actionsEl) {
        this.actionsEl.hidden = !(hasActionsContent || this.hasAttr('copyable'))
        this.actionsEl.classList.toggle(
          'start',
          this.getAttr('actions-position', 'end') === 'start',
        )
      }
      // copyable 按钮
      if (this.copyBtn) {
        this.copyBtn.hidden = !this.hasAttr('copyable')
        this.copyBtn.setAttribute('aria-label', this.t('typography.copy'))
        this.copyBtn.textContent = this.t('typography.copy')
      }
    }

    /** title 的默认标签（level 驱动） */
    private rootTagName(): string {
      const level = Math.min(Math.max(Number(this.getAttr('level', '3')) || 3, 1), 5)
      return `h${level}`
    }

    private async handleCopy(): Promise<void> {
      const text = this.getAttr('copy-text', '') || this.textContent || ''
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
        }
        this.emit('copy', { text })
      } catch {
        this.emit('copy-error', { text })
      }
    }
  }

  return OASTypography
}

export const OASText = createTypography('span', { part: 'text' })
export const OASTitle = createTypography('div', { levels: true, part: 'title' })
export const OASParagraph = createTypography('p', { part: 'paragraph' })
