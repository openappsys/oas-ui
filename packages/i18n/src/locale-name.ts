import { normalizeLocaleTag, stripLocaleExtensions } from '@oas-ui/core'

export { normalizeLocaleTag } from '@oas-ui/core'

/**
 * 内置语言包的 canonical 名 + 常用别名表（键均为 `normalizeLocaleTag` 后的小写形式）。
 *
 * 设计：
 * - canonical 用 BCP 47；`zh-CN` 暂时保留（改 canonical 是 breaking），`zh-Hant` 为新增；
 * - `pt` 历史文案实际是巴西葡语，canonical 为 `pt-BR`，`pt` 作为兼容别名；
 * - 语言级语言包（en/ja/ko/de/fr/es/ru/ar）接受常见地区变体，统一回落到语言级；
 * - `pt-PT` 故意不映射到 `pt-BR`（避免把巴西葡语当欧洲葡语），留给未来的独立语言包。
 */
const ALIASES: Record<string, string> = {
  zh: 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-my': 'zh-CN',
  'zh-hans-cn': 'zh-CN',
  'zh-hans-sg': 'zh-CN',
  'zh-hans-my': 'zh-CN',
  'zh-hant': 'zh-Hant',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant-tw': 'zh-Hant',
  'zh-hant-hk': 'zh-Hant',
  'zh-hant-mo': 'zh-Hant',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'en-nz': 'en',
  'en-ie': 'en',
  'en-in': 'en',
  'en-za': 'en',
  ja: 'ja',
  'ja-jp': 'ja',
  ko: 'ko',
  'ko-kr': 'ko',
  de: 'de',
  'de-de': 'de',
  'de-at': 'de',
  'de-ch': 'de',
  fr: 'fr',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  'fr-be': 'fr',
  'fr-ch': 'fr',
  es: 'es',
  'es-es': 'es',
  'es-419': 'es',
  'es-mx': 'es',
  'es-ar': 'es',
  'es-co': 'es',
  'es-us': 'es',
  ru: 'ru',
  'ru-ru': 'ru',
  ar: 'ar',
  'ar-eg': 'ar',
  'ar-sa': 'ar',
  'ar-ae': 'ar',
  'ar-ma': 'ar',
  'ar-dz': 'ar',
  'ar-tn': 'ar',
  'ar-iq': 'ar',
  'ar-jo': 'ar',
  'ar-kw': 'ar',
  'ar-lb': 'ar',
  'ar-ly': 'ar',
  'ar-om': 'ar',
  'ar-qa': 'ar',
  'ar-sy': 'ar',
  'ar-ye': 'ar',
  'ar-bh': 'ar',
}

/**
 * 把用户输入归一为内置语言包的 canonical 名。
 * 未命中别名表时返回按 BCP 47 大小写归一后的原值（自定义语言包可继续使用任意合法名）。
 */
export function canonicalizeLocale(name: string): string {
  const normalized = normalizeLocaleTag(name)
  if (!normalized) return normalized
  const direct = ALIASES[normalized.toLowerCase()]
  if (direct) return direct
  // 去掉 BCP 47 扩展段（-u- / -t- …）后重试；私有段（-x-）不剥离（en-XA 等自定义伪语言不能被吞成 en）
  const stripped = stripLocaleExtensions(normalized)
  if (stripped !== normalized) {
    const alias = ALIASES[stripped.toLowerCase()]
    if (alias) return alias
  }
  return normalized
}

/** 返回指向某个 canonical 名、但名称不同的全部别名（供按 locale 名注册翻译器时使用） */
export function localeAliases(canonical: string): string[] {
  const target = canonical.toLowerCase()
  return Object.entries(ALIASES)
    .filter(([alias, value]) => value.toLowerCase() === target && alias !== target)
    .map(([alias]) => alias)
}
