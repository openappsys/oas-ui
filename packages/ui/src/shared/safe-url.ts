/**
 * URL 协议白名单。
 *
 * 组件只允许导航到明确的 Web/邮件/电话协议或相对地址；`javascript:`、`data:`、
 * `vbscript:` 等可执行/内联文档协议一律回落为空串（调用方据此移除 href 或退化为非链接）。
 *
 * 注意：这里只做协议判定，不代表目标地址可信；href 写入 HTML 模板时仍必须 escapeAttr。
 */
const SAFE_PROTOCOL = /^(?:https?|mailto|tel):/i
const HAS_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i

function normalizeUrl(value: unknown): string {
  // URL 解析器会剥掉 ASCII 控制字符（含 tab/newline/CR）；判定前先做同样的归一，
  // 否则 `java\nscript:` 会绕过协议白名单但浏览器仍按 javascript: 执行。
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '')
}

export function safeUrl(value: unknown): string {
  if (value === null || value === undefined) return ''
  const url = normalizeUrl(value)
  if (!url) return ''
  if (HAS_PROTOCOL.test(url)) return SAFE_PROTOCOL.test(url) ? url : ''
  return url
}

export function isSafeUrl(value: unknown): boolean {
  if (value === null || value === undefined) return false
  const url = normalizeUrl(value)
  if (!url) return false
  return !HAS_PROTOCOL.test(url) || SAFE_PROTOCOL.test(url)
}
