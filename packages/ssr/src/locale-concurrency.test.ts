import { describe, it, expect, beforeEach } from 'vitest'
import enPack from '@oas-ui/i18n/en'
import { getLocaleName, onLocaleChange, setLocale } from '@oas-ui/i18n'
import { onTranslatorChange } from '@oas-ui/core'
import { renderToString } from './index.js'
import { ensureShim } from './shim.js'

/**
 * SSR locale 请求局部化：冷/热并发、全局态与清理。
 *
 * 验收语义（renderToString 显式 opts.locale）：
 * - 显式 locale 只影响本次请求与嵌套子树——不改全局 locale、不触发 locale/translator 广播、
 *   不输出 provider 包装；
 * - 未传 locale 保持旧行为：沿用调用时全局 locale；
 * - 冷加载并发（真实 import 竞态窗口）与热并发（全部命中缓存）都不得把语言串到其它请求上；
 * - 成功与异常路径都清干净临时 DOM（shim document 内无孤儿 provider / 目标宿主）。
 *
 * 本文件首用例保持冷态：oas-empty / oas-tag 此前未被任何用例渲染，首例即真实冷 import
 * 竞态（多请求共用同一 import promise，收口交错后旧实现会把 setLocale 与渲染错位配对）。
 */

type Locale = 'zh-CN' | 'en'

interface LocaleText {
  empty: string
  close: string
}

const TEXT: Record<'zh' | 'en', LocaleText> = {
  zh: { empty: '暂无数据', close: 'aria-label="关闭"' },
  en: { empty: 'No data', close: 'aria-label="Close"' },
} as const

function localeText(locale: Locale): LocaleText {
  return locale === 'zh-CN' ? TEXT.zh : TEXT.en
}

function forbidKey(locale: Locale): LocaleText {
  return locale === 'zh-CN' ? TEXT.en : TEXT.zh
}

/** 默认空态文案走本次 locale（不带 slot 内容，action 具名插槽不占默认通道） */
function expectEmptyLocale(html: string, locale: Locale, marker: string): void {
  expect(html, `${marker} 应携带自身 attribute marker`).toContain(marker)
  const want = localeText(locale).empty
  const forbid: Locale = locale === 'zh-CN' ? 'en' : 'zh-CN'
  expect(html, `${marker} 空态文案应为 ${locale}`).toContain(want)
  expect(html, `${marker} 不应串到 ${forbid} 文案`).not.toContain(forbidKey(locale).empty)
  // 不输出临时 provider 包装
  expect(html).not.toContain('<oas-config-provider')
  // raw key 泄漏兜底（未注册时 t() 回退返回 key）
  expect(html).not.toContain('empty.noData')
}

/** tag.close 翻译路径（closable 关闭按钮 aria-label） */
function expectTagLocale(html: string, locale: Locale, marker: string): void {
  expect(html, `${marker} 应携带自身 attribute marker`).toContain(marker)
  const want = localeText(locale).close
  const forbid: Locale = locale === 'zh-CN' ? 'en' : 'zh-CN'
  expect(html, `${marker} 关闭按钮 aria-label 应为 ${locale}`).toContain(want)
  expect(html, `${marker} 不应串到 ${forbid} 文案`).not.toContain(forbidKey(locale).close)
  expect(html).not.toContain('<oas-config-provider')
  expect(html).not.toContain('tag.close')
}

/**
 * slot="action" 内嵌一个 locale 敏感子组件（oas-tag closable → aria-label 走 tag.close）。
 * 用具名插槽占位：不占 oas-empty 默认插槽（默认空态文案仍直出），同一渲染块同时核
 * 「宿主自身文案」与「嵌套子组件文案」都随本次请求 locale。
 */
function nestedTagSlot(label: string): string {
  return `<oas-tag slot="action" closable>${label}</oas-tag>`
}

describe('@oas-ui/ssr renderToString locale 请求局部化', () => {
  beforeEach(() => {
    // 未传 locale 的旧行为依赖调用时全局 locale，用例间复位
    setLocale('zh-CN')
    const { document } = ensureShim()
    if (document.body && document.body.childElementCount > 0) {
      throw new Error(`[test] shim document.body 存在前置残留节点：${document.body.innerHTML.slice(0, 200)}`)
    }
  })

  it('冷并发：32 次 zh-CN/en 混合 Promise.all，逐请求 marker 核对语言与嵌套子树', async () => {
    // 冷加载：32 个请求抢同一组真实 import promise（oas-empty / oas-tag 首次装载）
    const renders = Array.from({ length: 32 }, (_, i) => {
      const locale: Locale = i % 2 === 0 ? 'zh-CN' : 'en'
      return renderToString('oas-empty', { 'data-req': `req-${i}`, 'data-lang': locale }, nestedTagSlot(`结果 ${i}`), {
        locale,
      }).then((html) => ({ html, locale, i }))
    })
    const results = await Promise.all(renders)
    for (const { html, locale, i } of results) {
      expectEmptyLocale(html, locale, `data-req="req-${i}" data-lang="${locale}"`)
      // 嵌套子组件随同一临时 provider 取翻译
      expectTagLocale(html, locale, `data-req="req-${i}"`)
      expect(html).toContain(`结果 ${i}`)
    }
  })

  it('热并发：96 次混合 locale、多翻译路径（empty/tag/transfer），逐请求核对', async () => {
    const tags = ['oas-empty', 'oas-tag', 'oas-transfer'] as const
    const renders = Array.from({ length: 96 }, (_, i) => {
      const locale: Locale = i % 2 === 0 ? 'zh-CN' : 'en'
      const tag = tags[i % tags.length]!
      const slot = tag === 'oas-tag' ? `条目 ${i}` : ''
      return renderToString(tag, { 'data-req': `req-${i}` }, slot, { locale }).then((html) => ({
        html,
        locale,
        tag,
        i,
      }))
    })
    const results = await Promise.all(renders)
    for (const { html, locale, tag, i } of results) {
      if (tag === 'oas-tag') {
        // 翻译路径 tag.close
        expectTagLocale(html, locale, `data-req="req-${i}"`)
      } else {
        // 翻译路径 empty.noData / transfer.empty（同 key 双组件）
        expectEmptyLocale(html, locale, `data-req="req-${i}"`)
      }
    }
  })

  it('全局 locale 不被显式 locale 改写：显式渲染前后全局 locale 不变、locale/translator 广播为 0', async () => {
    // 先切全局 en（自传语言包：自动注册 + 一次广播，属测试前置，不计入显式 SSR 广播）
    setLocale(enPack)
    expect(getLocaleName()).toBe('en')
    let localeBroadcasts = 0
    let translatorBroadcasts = 0
    const offLocale = onLocaleChange(() => {
      localeBroadcasts++
    })
    const offTranslator = onTranslatorChange(() => {
      translatorBroadcasts++
    })
    try {
      const results = await Promise.all(
        Array.from({ length: 24 }, (_, i) =>
          renderToString('oas-empty', { 'data-req': `req-${i}` }, ``, {
            locale: 'zh-CN',
          }),
        ),
      )
      for (let i = 0; i < results.length; i++) {
        expectEmptyLocale(results[i]!, 'zh-CN', `data-req="req-${i}"`)
      }
      // 显式 locale 不改全局 locale
      expect(getLocaleName()).toBe('en')
      // 显式 SSR 期间 locale / translator 广播为 0
      expect(localeBroadcasts).toBe(0)
      expect(translatorBroadcasts).toBe(0)
      // 随后不传 locale 的渲染仍用全局 locale（en）
      const globalHtml = await renderToString('oas-empty', { 'data-global': 'en' }, '')
      expectEmptyLocale(globalHtml, 'en', 'data-global="en"')
      expect(globalHtml).not.toContain(forbidKey('en').empty)
    } finally {
      offLocale()
      offTranslator()
    }
  })

  it('成功后 shim document 无临时 provider / 目标宿主；人为异常路径也清理，后续请求可继续', async () => {
    const { document } = ensureShim()
    // 成功路径：渲染完成后共享 DOM 内不含本次调用临时元素
    const okHtml = await renderToString('oas-empty', {}, nestedTagSlot('成功请求'), { locale: 'en' })
    expectEmptyLocale(okHtml, 'en', '')
    expectTagLocale(okHtml, 'en', '')
    expect(document.body.querySelectorAll('oas-config-provider').length).toBe(0)
    expect(document.body.childElementCount).toBe(0)

    // 异常路径：目标子组件渲染时抛错，provider 与目标仍被 try/finally 清掉；后续请求照常成功
    const TagClass = ensureShim().customElements.get('oas-tag') as
      | (typeof HTMLElement & { prototype: { render?: () => void } })
      | undefined
    expect(TagClass, 'oas-tag 已注册').toBeTruthy()
    const originalRender = TagClass!.prototype.render
    TagClass!.prototype.render = () => {
      throw new Error('人为异常：目标渲染中断')
    }
    try {
      await expect(renderToString('oas-empty', {}, nestedTagSlot('中断请求'), { locale: 'en' })).rejects.toThrow(
        '人为异常',
      )
    } finally {
      TagClass!.prototype.render = originalRender
    }
    // 异常后无孤儿 DOM，进程内残留状态不影响后续请求
    expect(document.body.querySelectorAll('oas-config-provider').length).toBe(0)
    expect(document.body.childElementCount).toBe(0)
    const followUp = await renderToString('oas-empty', {}, nestedTagSlot('后续请求'), { locale: 'zh-CN' })
    expectEmptyLocale(followUp, 'zh-CN', '')
    expectTagLocale(followUp, 'zh-CN', '')
    expect(document.body.querySelectorAll('oas-config-provider').length).toBe(0)
    expect(document.body.childElementCount).toBe(0)
  })
})
