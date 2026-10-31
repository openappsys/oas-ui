/**
 * i18n 家族切片边界（运行时）：只导入单个组件入口 `@oas-ui/ui/data/json-viewer`，
 * 断言只有 data 家族切片被注册——
 * - data 族 key（jsonViewer.*）解析为中文；
 * - form 族专属 key（form.valueMissing，在 form 切片、不在 data 切片）回退 raw key，
 *   证明切片边界真实生效（若整包 / 其他族切片被意外注册，此断言即红）。
 *
 * 本文件不得 import '@oas-ui/i18n' 整包（其 all-register 会注册全部 9 个家族切片，
 * 污染边界断言）或其他组件入口；t() 取自 @oas-ui/i18n/registry（本身无任何默认文案）。
 *
 * 注：不使用 form.save 之类的非真实 key 做回退断言——缺失 key 无论如何都回退，
 * 断言恒真、无边界证明力；form.valueMissing 是真实 zh-CN key 且仅由 form 切片携带。
 */
import { describe, expect, it } from 'vitest'
import { t } from '@oas-ui/i18n/registry'
import '@oas-ui/ui/data/json-viewer'

describe('i18n 家族切片边界（仅导入 data/json-viewer 单入口）', () => {
  it('data 族 key（jsonViewer.*）解析为中文，不回退 raw key', () => {
    const out = t('jsonViewer.tooDeep')
    expect(out).not.toBe('jsonViewer.tooDeep')
    expect(out).toMatch(/[\u4e00-\u9fff]/)
  })

  it('form 族专属 key（form.valueMissing，不在 data 切片）回退 raw key——切片边界真实生效', () => {
    // dev 下 registry 会因未命中打一条去重 console.warn（漏切片的最后提示），属预期行为
    expect(t('form.valueMissing')).toBe('form.valueMissing')
  })
})
