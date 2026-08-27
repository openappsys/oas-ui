import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  /* 数据载体：自身无任何可视内容，由 <oas-table> 解析子元素属性为列定义后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 列（子元素声明式通道）。
 *
 * 纯数据载体：属性对齐 TableColumn 字段（key/title/sortable/width/align/fixed/hidden/
 * serial-number/ellipsis/merge/filterable/filters/summary/editable/editor/actions），
 * 默认插槽文本为 title 兜底（title 属性优先）。嵌套 <oas-table-column> 表达多级表头（children）。
 * 宿主 <oas-table> 在 columns 属性/property 未显式设置时解析子元素收敛到同一渲染路径。
 *
 * ⚠️ 函数型字段（render / filterMatch / editOptions 回调）无法经属性/JSON 序列化，
 * 子元素通道无法表达——此类列请用 `columns` property 赋值（JS 侧构造），或自定义单元格走 slot/模板。
 */
export class OASTableColumn extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'key',
      'title',
      'sortable',
      'width',
      'align',
      'fixed',
      'hidden',
      'serial-number',
      'ellipsis',
      'merge',
      'filterable',
      'filters',
      'summary',
      'editable',
      'editor',
      'actions',
    ]
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-table> 的 MutationObserver 感知后统一重渲染
  }
}
