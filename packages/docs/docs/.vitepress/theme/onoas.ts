// 文档站 demo 脚手架：把 onoas-* 内联属性绑定为对应 CustomEvent 监听。
// 例：<oas-modal onoas-ok="closeModal('x')" onoas-cancel="...">
//     → 监听 oas-ok / oas-cancel 事件，执行属性值（全局作用域 eval）。
// 属性值可访问 window 上挂载的命令式 API（message / closeModal 等）。

function bindOne(root: ParentNode): void {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el instanceof HTMLElement && el.dataset.onoasBound === 'true') continue
    if (!(el instanceof HTMLElement)) continue
    let has = false
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('onoas-')) {
        has = true
        const eventName = `oas-${attr.name.slice('onoas-'.length)}`
        el.addEventListener(eventName, (e) => {
          try {
            // new Function：可访问 window 上的命令式 API（message / toast 等），并注入事件对象
            new Function('event', attr.value)(e)
          } catch (err) {
            console.error(`[demo] onoas-${eventName} 执行失败:`, err)
          }
        })
      }
    }
    if (has) el.dataset.onoasBound = 'true'
  }
}

function bindOnOas(root: ParentNode): void {
  bindOne(root)
  const mo = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          bindOne(node)
          if (node.shadowRoot) bindOne(node.shadowRoot)
          // 组件 light DOM 挂载前的属性：Vue 渲染后元素已是可查询目标
        }
      }
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })
}

export { bindOnOas }
