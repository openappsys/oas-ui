/**
 * 树内核 —— slot 模板克隆工具（tree × tree-select 共享）。
 *
 * 浏览器对 `<template>` 子节点存在两种挂载形态：
 * - 静态 HTML / SSR 快照：子节点在 `template.content` 里；
 * - Vue 等框架 CSR 挂载：用 `insertBefore` 直插 template 元素，子节点落在元素自身
 *   childNodes、`content` 为空——直接克隆 content 会得到空白。
 * 按内容优先取源再逐节点深克隆，dev 与生产双形态都能正确渲染，不改动宿主模板 DOM。
 */
export function cloneSlotContent(tpl: HTMLTemplateElement): DocumentFragment {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const frag = document.createDocumentFragment()
  for (const node of Array.from(source.childNodes)) {
    frag.appendChild(node.cloneNode(true))
  }
  return frag
}
