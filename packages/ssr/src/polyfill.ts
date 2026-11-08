/**
 * Declarative Shadow DOM（DSD）polyfill —— `@oas-ui/ssr/polyfill`。
 *
 * 把 SSR 输出里的 `<template shadowrootmode>` 在客户端挂载成真正的 shadow root：
 * 用于旧引擎，以及**任何**引擎上运行期注入（`innerHTML`）的 DSD 快照——片段解析从不自动附加。
 * 必须先于组件注册求值，组件 upgrade 才能按 SSR 指纹真水合：
 * `import '@oas-ui/ssr/polyfill'` → `import '@oas-ui/ui'`。
 *
 * 契约：幂等（挂载即移除模板，二次执行零命中）、递归（嵌套 DSD）、支持 open/closed、
 * 宿主已有 shadow root 时只清理残留模板；非法 `shadowrootmode` 值与原生解析一致（不挂载）。
 * 详见包 README。
 */

/** 声明式 shadow root 的模式属性（与 HTML 规范同名） */
const SHADOW_ROOT_MODE_ATTR = 'shadowrootmode'

/** DSD 模板选择器（光 DOM 内） */
const DSD_TEMPLATE_SELECTOR = 'template[shadowrootmode]'

export interface HydrateDeclarativeShadowRootsOptions {
  /**
   * 跳过引擎能力探测，强制扫描并挂载。
   *
   * 原生 DSD 只在**文档解析期**生效：运行期经 `innerHTML` 等注入的模板即使在支持 DSD 的引擎上
   * 也不会自动附加 shadow root，此时需要显式 `force`。
   */
  force?: boolean
}

/** 探测结果缓存（模块级一次）：探测本身要建元素 + 解析片段，不值得重复 */
let supportCache: boolean | null = null

/**
 * 引擎是否能在**片段解析**时自动附加声明式 shadow root（模块级缓存）。
 *
 * 原生 DSD 只在文档解析期生效，片段级能力无法用解析结果反推，故这里只回答
 * 「注入的模板会不会自己挂上」——为 false 时 `hydrateDeclarativeShadowRoots` 扫描一遍（零命中即 no-op）。
 * 探测用 `setHTMLUnsafe`：`innerHTML` 里的 DSD 模板会让 Chromium 刷控制台警告，polyfill 不得污染零告警页面。
 */
export function isDeclarativeShadowDomSupported(): boolean {
  if (supportCache === null) supportCache = detectFragmentSupport()
  return supportCache
}

function detectFragmentSupport(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const probe = document.createElement('div')
    const setUnsafe = (probe as { setHTMLUnsafe?: (html: string) => void }).setHTMLUnsafe
    if (typeof setUnsafe !== 'function') return false
    setUnsafe.call(probe, `<template ${SHADOW_ROOT_MODE_ATTR}="open"></template>`)
    return probe.shadowRoot !== null
  } catch {
    // 极端受限环境（禁止建元素 / 禁用 setHTMLUnsafe）：按不支持处理，扫描时自然零命中
    return false
  }
}

/**
 * 挂载 `root` 子树内所有声明式 shadow root（递归，幂等）。
 *
 * 只映射 `shadowrootmode`（`open` / `closed`，即 SSR 快照产出的形态）；
 * `shadowrootdelegatesfocus` / `clonable` / `serializable` 属性不在映射范围。
 *
 * @param root 扫描起点（默认整份 `document`；Node 等无 document 环境显式传入或不调用）
 * @param options `force: true` 跳过引擎能力探测
 * @returns 本次是否真的挂载了至少一个 shadow root（false = 无需处理/no-op）
 */
export function hydrateDeclarativeShadowRoots(
  root?: Document | Element,
  options: HydrateDeclarativeShadowRootsOptions = {},
): boolean {
  if (!options.force && isDeclarativeShadowDomSupported()) return false
  if (!root) {
    // Node / 无 document 环境：不抛错，直接视为无处理对象
    if (typeof document === 'undefined') return false
    root = document
  }
  return hydrateWithin(root)
}

/**
 * 处理一层作用域内的 DSD 模板。
 *
 * 先取查询快照：挂载会移除 template 并把 `content` 搬进 shadow，实时 NodeList 会随之变化。
 * 文档序保证外层模板先于内层——但内层模板位于外层的 `template.content`（独立 DocumentFragment），
 * 本层查询看不到，故挂载后对新 shadow root 递归。
 */
function hydrateWithin(scope: ParentNode): boolean {
  let attached = false
  const templates = Array.from(scope.querySelectorAll(DSD_TEMPLATE_SELECTOR)) as HTMLTemplateElement[]
  for (const template of templates) {
    const mode = template.getAttribute(SHADOW_ROOT_MODE_ATTR)
    // 非法值：原生解析同样不附加 shadow root，保留模板（不猜测语义）
    if (mode !== 'open' && mode !== 'closed') continue
    const host = template.parentElement
    // 模板不在元素内（如孤立片段）或宿主不是合法 shadow 宿主：跳过
    if (!host || typeof host.attachShadow !== 'function') continue
    if (host.shadowRoot) {
      // 已有 shadow root（组件先行 CSR 升级 / 已挂载过）：只清理残留的惰性模板，绝不覆盖已有内容
      template.remove()
      continue
    }
    let shadow: ShadowRoot
    try {
      shadow = host.attachShadow({ mode })
    } catch {
      // 不可作 shadow 宿主的元素（如部分被禁止的宿主）：保持模板原样
      continue
    }
    // content 是 DocumentFragment：appendChild 会移动其子节点（含嵌套 DSD 模板）
    shadow.appendChild(template.content)
    template.remove()
    attached = true
    // 嵌套 DSD：继续处理新 shadow root 内部
    if (hydrateWithin(shadow)) attached = true
  }
  return attached
}

// 子路径副作用：浏览器环境且片段解析需要 polyfill 时，求值即扫描一次整份文档。
// SSR/Node 安全：无全局 document 时整段跳过（`@oas-ui/ssr` 主入口的 Node 渲染不受影响）。
// 文档仍在解析（脚本在 <head> 同步执行）时等 DOMContentLoaded，否则立即扫描。
if (typeof document !== 'undefined' && !isDeclarativeShadowDomSupported()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrateDeclarativeShadowRoots(document), { once: true })
  } else {
    hydrateDeclarativeShadowRoots(document)
  }
}
