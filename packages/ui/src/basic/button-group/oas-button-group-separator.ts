import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  width: 1px;
  align-self: stretch;
  overflow: hidden;
  font-family: inherit;
}
/* 纵向组（button-group vertical）内渲染横向线 */
:host([vertical]) {
  width: auto;
  height: 1px;
}
.line {
  display: block;
  width: 100%;
  height: 100%;
  margin-block: var(--oas-space-1);
  background: var(--oas-color-border-strong);
}
:host([vertical]) .line {
  margin-block: 0;
  margin-inline: var(--oas-space-1);
}
`

/**
 * 按钮组内部分隔线：横向组渲染 1px 竖线、纵向组（vertical 属性由外层 button-group 同步）渲染 1px 横线。
 * 贴合相邻按钮参与组内布局、不参与圆角合并；纯展示装饰，无交互、无事件。
 */
export class OASButtonGroupSeparator extends OASElement {
  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="line" part="line" aria-hidden="true"></span>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  /** 真水合：线骨架存在即接管（纯静态组件，无事件绑定） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('.line') !== null
  }
}
