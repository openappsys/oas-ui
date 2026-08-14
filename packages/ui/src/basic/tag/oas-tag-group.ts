import { OASElement } from '@oas-ui/core'
import type { OASTag } from './oas-tag.js'

const STYLE = `
:host {
  display: inline-flex;
  vertical-align: middle;
  font-family: inherit;
}
[part='group'] {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1);
}
`

/**
 * oas-tag-group —— 标签组：把多个 `<oas-tag checkable value="x">` 组合为一个选值组。
 *
 * - 单选：`value` 为单值字符串；多选：`multiple` + `value` 逗号分隔多个选中值
 * - 组监听子签 `oas-change`（冒泡），更新自身 value 并同步所有子签 `checked`
 * - disabled 透传全组不可切；零子签渲染空组不报错
 * - 事件：`oas-change`——单选 detail `{ value }`，多选 detail `{ value: string[] }`
 * - ARIA：容器 role="group" + aria-label（默认走 i18n `tagGroup.group`，可被属性覆盖）
 */
export class OASTagGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'multiple', 'disabled', 'aria-label']
  }

  private groupEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div part="group" role="group"><slot></slot></div>
    `
  }

  /** 缓存节点 + 绑定 slotchange / 组代理子签选中事件（render 与水合路径共用） */
  private bind(): void {
    this.groupEl = this.shadow.querySelector<HTMLElement>('[part="group"]')
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
    // capture 阶段拦截子签 oas-change：计算新 value 并派发组级 oas-change 后
    // stopPropagation——子签事件不外泄，宿主在组元素上只收到组级事件（detail { value }）
    this.addEventListener('oas-change', this.handleTagChange, true)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（组容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const disabled = this.hasAttr('disabled')
    const selected = this.selectedValues

    // 选值标记只作用于直接子签；子签 checked 由组 value 统一驱动（受控）
    const tags = [...this.querySelectorAll<OASTag>(':scope > oas-tag')]
    for (const tag of tags) {
      tag.toggleAttribute('disabled', disabled)
      const val = tag.getAttribute('value')
      if (val) {
        if (selected.includes(val)) tag.setAttribute('checked', '')
        else tag.removeAttribute('checked')
      } else {
        tag.removeAttribute('checked')
      }
    }

    // 容器 role="group" + aria-label（默认走 i18n，可被 aria-label 属性覆盖）
    this.groupEl?.setAttribute('aria-label', this.getAttr('aria-label', this.t('tagGroup.group')))
  }

  /** 当前选中值：单选返回 [value]，多选返回 value 逗号分隔的数组 */
  private get selectedValues(): string[] {
    const v = this.getAttr('value', '')
    if (v === '') return []
    return this.hasAttr('multiple')
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [v]
  }

  private handleTagChange = (e: Event): void => {
    // 组自身派发的 oas-change（target=组）正常传播给宿主，不拦截
    if (e.target === this) return
    // 子签事件一律不再外泄（无论是否参与选值）
    e.stopPropagation()
    const tag = e.target as OASTag
    if (!this.contains(tag)) return
    if (this.hasAttr('disabled')) return
    const val = tag.getAttribute('value')
    if (!val) return
    const current = this.selectedValues
    const multiple = this.hasAttr('multiple')

    if (multiple) {
      const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val]
      this.setAttribute('value', next.join(','))
      this.emit('change', { value: next })
    } else {
      // 单选不可取消：点击已选中项时把子签恢复选中（子签自身已先 toggle 掉），不派发事件
      if (current.includes(val)) {
        tag.setAttribute('checked', '')
        return
      }
      this.setAttribute('value', val)
      this.emit('change', { value: val })
    }
  }
}
