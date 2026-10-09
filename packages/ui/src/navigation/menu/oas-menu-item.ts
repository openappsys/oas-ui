import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-menu> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
:host([hidden]) {
  display: none;
}
`

/**
 * 菜单项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 items 字段
 * （value/disabled/loading/icon/icon-color/kind/danger/href/target/rel/shortcut）。
 * 直接子元素 <oas-menu-item>/<oas-menu-group>/<oas-menu-divider> 递归为子菜单 children。
 * 宿主 <oas-menu> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASMenuItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled', 'loading', 'icon', 'icon-color', 'kind', 'danger', 'href', 'target', 'rel', 'shortcut']
  }

  /**
   * 前置媒体模板查询（便捷通道，同时作为 api:scan 的插槽归属标记——
   * 插槽内容由宿主 <oas-menu>/<oas-dropdown> 的解析层提取渲染，归属数据载体本身）。
   */
  get leadingSlotTemplate(): HTMLTemplateElement | null {
    return this.querySelector<HTMLTemplateElement>(':scope > template[slot="leading"]')
  }

  /**
   * 提取前置媒体内容（克隆，与 light DOM 解耦——宿主重渲染时经 MutationObserver 重新解析重克隆）：
   * `<template slot="leading">`（content 优先，兼容框架 CSR 直插形态）或直接子元素 `[slot="leading"]`。
   * 静态工具挂在数据载体类上：宿主解析层调用，插槽标记字符串归属本组件（api:scan 归属正确）。
   */
  static extractLeadingFrom(el: Element): Node[] {
    // 仅取本项自己的直接子模板（`:scope >`）——裸 querySelector 会命中嵌套子菜单项的前置媒体，
    // 使父项被误挂子项的 leading（菜单项可递归嵌套子级）
    const tpl = el.querySelector<HTMLTemplateElement>(':scope > template[slot="leading"]')
    if (tpl) {
      const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
      return Array.from(source.childNodes).map((n) => n.cloneNode(true))
    }
    return Array.from(el.children)
      .filter((c) => c.getAttribute('slot') === 'leading')
      .map((c) => c.cloneNode(true))
  }

  /** 默认插槽 label 提取时的前置媒体节点判定（template/元素两种通道的文本都不计入 label） */
  static isLeadingNode(node: ChildNode): boolean {
    return node instanceof Element && node.getAttribute('slot') === 'leading'
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-menu> 的 MutationObserver 感知后统一重渲染
  }
}
