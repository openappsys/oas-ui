/**
 * `<template>` 插槽内容克隆工具（全组件共享）。
 *
 * 浏览器对 `<template>` 子节点存在两种挂载形态：
 * - 静态 HTML / SSR 快照：子节点在 `template.content` 里；
 * - Vue 等框架 CSR 挂载：用 `insertBefore` 直插 template 元素，子节点落在元素自身
 *   childNodes、`content` 为空——只克隆 content 会得到空白（dev 演示站尤甚）。
 *
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

/**
 * 插槽内容签名（用于按内容变化决定是否重渲染的缓存键）。
 * 注意 template 的 `innerHTML` / `outerHTML` 在 CSR 直插形态下都是空串，
 * 必须按实际源节点序列化，否则内容变化检测失效、空克隆会被缓存住。
 */
export function slotContentSignature(tpl: HTMLTemplateElement): string {
  const source = tpl.content.childNodes.length > 0 ? tpl.content : tpl
  const box = document.createElement('div')
  for (const node of Array.from(source.childNodes)) {
    box.appendChild(node.cloneNode(true))
  }
  return box.innerHTML
}
