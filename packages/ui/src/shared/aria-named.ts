/**
 * 跨 shadow 可访问名同步（aria-labelledby 混合通道）。
 *
 * 背景：aria-labelledby 的 idref 解析不跨 shadow 边界——宿主上的引用列表即使
 * 原样镜像给 shadow 内控件，真实引擎的可访问名计算也解析不到 light DOM 里的
 * 引用元素，内层控件可访问名为空（axe label 规则同样抓不到名字）。
 *
 * 混合通道（labelledby 在场时优先）：
 * 1. aria-labelledby 属性照旧原样镜像（工具链 / 静态分析兼容）；
 * 2. 引用元素解析成功且内层控件支持 ariaLabelledByElements（ARIA 引用反射，
 *    Chromium 128+）→ 写活引用：真实 AT 走引用名计算，引用文本变化自动跟随；
 * 3. 同时把引用元素文本快照（各引用 trim 后以空格连接）写进内层 aria-label——
 *    不支持引用反射引擎的兜底名（axe label 规则永远认它）。v1 快照语义：
 *    引用文本后续变化不自动追踪，宿主属性变化触发重同步时刷新；
 * 4. 引用全缺失 / 文本全空白 → 视同无有效引用，aria-label 回落 fallbackLabel
 *    （由调用方按组件 aria-label 通道语义传入，如宿主 aria-label 或 locale
 *    回退名），不写空名。
 *
 * labelledby 不在场 → 清活引用，aria-label 恢复 fallbackLabel 通道（宿主
 * aria-label 或组件缺省名；null 表示该通道本就无值，移除内层 aria-label）。
 */

/** ARIA 引用反射属性（Chrome 128+；DOM lib 类型未覆盖，防御式声明） */
type AriaReflected = Element & { ariaLabelledByElements?: Element[] | null }

export function syncCrossRootAccessibleName(host: Element, inner: Element, fallbackLabel: string | null): void {
  // aria-labelledby 属性镜像（原样拷贝；宿主移除内层同步摘除）
  const labelledby = host.getAttribute('aria-labelledby')
  if (labelledby != null && labelledby !== '') inner.setAttribute('aria-labelledby', labelledby)
  else inner.removeAttribute('aria-labelledby')

  const reflected = inner as AriaReflected
  const supportsRefs = 'ariaLabelledByElements' in inner

  if (labelledby == null || labelledby === '') {
    // 通道关闭：清活引用 + aria-label 回落宿主通道现状
    if (supportsRefs) reflected.ariaLabelledByElements = null
    if (fallbackLabel) inner.setAttribute('aria-label', fallbackLabel)
    else inner.removeAttribute('aria-label')
    return
  }

  // 解析 idref（同文档 light DOM；缺失元素跳过，不抛错）
  const doc = host.ownerDocument
  const refs = labelledby
    .split(/\s+/)
    .filter((id) => id !== '')
    .map((id) => doc.getElementById(id))
    .filter((el): el is HTMLElement => el != null)

  // 活引用（引擎支持时）：空引用列表置 null，不留悬空数组
  if (supportsRefs) reflected.ariaLabelledByElements = refs.length > 0 ? refs : null

  // 文本兜底：各引用元素文本 trim 后以空格连接；全空白视同无有效引用
  const text = refs
    .map((el) => (el.textContent ?? '').trim())
    .filter((s) => s !== '')
    .join(' ')
    .trim()

  if (text) inner.setAttribute('aria-label', text)
  else if (fallbackLabel) inner.setAttribute('aria-label', fallbackLabel)
  else inner.removeAttribute('aria-label')
}
