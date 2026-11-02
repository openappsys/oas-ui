/**
 * BCP 47 语言标签归一化（只做大小写/分隔符/基本形状，不处理别名与回退）。
 *
 * 规则（IETF BCP 47）：
 * - 语言子标签小写（zh / en / pt）
 * - 文字子标签首字母大写（Hans / Hant）
 * - 地区子标签大写（CN / BR / 419）
 * - 变体/扩展子标签小写
 * - 下划线是历史写法，统一替换为连字符
 *
 * 例：`zh_cn` → `zh-CN`、`pt_br` → `pt-BR`、`ZH-hant-tw` → `zh-Hant-TW`、`en-u-ca-gregory` → `en-u-ca-gregory`。
 */
export function normalizeLocaleTag(tag: string): string {
  const raw = tag.trim().replace(/_/g, '-')
  if (raw === '') return raw
  const parts = raw.split('-')
  const out: string[] = []
  const language = parts[0]
  if (!language) return raw
  out.push(language.toLowerCase())
  // 私有段独立成标签（x-…）：后续全部小写
  let inExtension = language.toLowerCase() === 'x'
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    // 单字符子标签开启扩展/私有段（u / x …），其后全部按小写处理
    if (part.length === 1) {
      out.push(part.toLowerCase())
      inExtension = true
      continue
    }
    if (inExtension) {
      out.push(part.toLowerCase())
      continue
    }
    if (/^[A-Za-z]{4}$/.test(part)) {
      // 文字子标签（Hans / Hant / Latn …）
      out.push(part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    } else if (/^([A-Za-z]{2}|\d{3})$/.test(part)) {
      // 地区子标签（CN / US / BR / 419）
      out.push(part.toUpperCase())
    } else {
      // 变体子标签（1901 / valencia …）：小写
      out.push(part.toLowerCase())
    }
  }
  return out.join('-')
}

/**
 * 截断第一个非私有的单字符扩展子标签及其后续段（如 `zh-Hant-u-nu-latn` → `zh-Hant`）。
 * 私有段（`-x-`）不截断：`en-XA` / `en-x-foo` 等自定义伪语言不能被吞成基础语言。
 * 输入应为 `normalizeLocaleTag` 归一后的标签（本函数不处理下划线/大小写）。
 */
export function stripLocaleExtensions(tag: string): string {
  const parts = tag.split('-')
  // 首段即私有段（x-…）时全部子段都属于私有段，不能把其中的单字符当扩展起点
  if (parts[0]?.toLowerCase() === 'x') return tag
  for (let i = 1; i < parts.length; i++) {
    if (parts[i]!.length === 1) {
      if (parts[i]!.toLowerCase() === 'x') return tag
      return parts.slice(0, i).join('-')
    }
  }
  return tag
}
