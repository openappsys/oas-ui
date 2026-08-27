/**
 * HTML 转义工具（注入安全规范的基础）。
 *
 * 注入前必须先转义、且**先转义 `&`**（否则会二次破坏已有实体）。三个函数对应三种注入上下文：
 * - `escapeText`：最小集 `& < >`——文本内容（含 code/equation 预转义，避免注入引号实体干扰高亮正则）
 * - `escapeHtml`：全量 `& < > " '`——文本 / 双引号属性值通用（OWASP 集合；文本里的多余引号实体渲染回原字符，无害）
 * - `escapeAttr`：全量（同 escapeHtml）——显式「属性上下文」语义（必须转义包裹引号，否则可引号逃逸闭合属性）
 *
 * 均对 null / undefined 归一为 ''。
 */
function resolve(input: unknown): string {
  return input === null || input === undefined ? '' : String(input)
}

/** 文本上下文最小转义：`&` `<` `>`（code/equation 预转义用，避免引入引号实体） */
export function escapeText(input: unknown): string {
  return resolve(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 全量转义：`&` `<` `>` `"` `'`——文本 / 双引号属性值通用 */
export function escapeHtml(input: unknown): string {
  return resolve(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 属性上下文转义（同 escapeHtml，显式语义：必须转义包裹引号） */
export const escapeAttr = escapeHtml
