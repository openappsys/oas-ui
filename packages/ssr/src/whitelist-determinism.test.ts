import { describe, it, expect } from 'vitest'
import { renderToString, WHITELIST, type WhiteListTag } from './index.js'

/**
 * 全白名单快照确定性实测（维护批 M2 fix round）：
 * 每个 tag 用最小样本属性连续渲染两次，逐字节比对——任何组件把模块级/静态自增
 * 计数（uid/seq/Counter）写进快照都会在此红。
 *
 * 分工：light DOM 子项通道的组件（avatar-group / tabs / stepper——id 派生种子来自
 * 子元素外征）由 `index.test.ts` 的表驱动 slot 用例覆盖（本文件 slotHTML 恒空），
 * 两套互补构成完整确定性门禁。
 *
 * 新增白名单组件时本用例自动纳入（WHITELIST 驱动）；若新组件最小形态不触发其
 * id 输出路径，请同步在 SAMPLE_ATTRS 补该组件的触发属性。
 */

/** 相对 packages/ssr 运行目录 */

const SAMPLE_ATTRS: Partial<Record<WhiteListTag, Record<string, string>>> = {
  'oas-picker': { columns: '[{"items":[{"label":"a"},{"label":"b"}]}]' },
  'oas-index-bar': { sections: '[{"title":"A","items":[{"label":"a1"}]}]' },
  'oas-chart': { data: '{"labels":["一","二"],"series":[{"name":"s","data":[1,2]}]}' },
  'oas-tabs': { active: 'a' },
  'oas-stepper': { steps: '[{"title":"一"}]', current: '0' },
  'oas-menu': { items: '[{"label":"首页"}]' },
  'oas-command': { items: '[{"label":"复制"}]' },
  'oas-select': { items: '[{"label":"甲","value":"1"}]' },
  'oas-combobox': { items: '[{"label":"甲","value":"1"}]' },
  'oas-auto-complete': { items: '[{"label":"甲","value":"1"}]' },
  'oas-mentions': { items: '[{"label":"甲","value":"1"}]' },
  'oas-tree-select': { items: '[{"label":"甲","value":"1"}]' },
  'oas-table': { columns: '[{"title":"列","key":"c"}]', data: '[{"c":"v"}]' },
  'oas-radio-group': { options: '[{"label":"甲","value":"1"}]' },
  'oas-checkbox-group': { options: '[{"label":"甲","value":"1"}]' },
  'oas-switch': { 'checked-text': '开' },
  'oas-checkbox': { value: 'v' },
  'oas-radio': { value: 'v', name: 'g' },
  'oas-navigation-menu': {
    items:
      '[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/c"}]},{"label":"定价","value":"pricing","href":"/p"}]',
    'keep-mounted': '',
  },
  'oas-popover': { title: 'T', content: 'C' },
  'oas-tooltip': { content: 'TIP' },
  'oas-popconfirm': { title: '确认？' },
  'oas-floating-panel': { open: '', 'panel-title': 'P', rect: '0,0,300,200' },
}

describe('全白名单快照确定性（穷尽实测）', () => {
  // timeout 30s：175 tag × 两次最小渲染是全 CPU 型串行工作，空闲 ~1.4s，但全量套件并发负载下
  // 5s 阈值反复超时（rehearse 实抓）——本测试断言快照确定性而非性能（性能有 perf 系列门禁），
  // 阈值只防挂死。
  it('每个白名单 tag 最小渲染两次逐字节一致（175 tag 穷尽）', { timeout: 30_000 }, async () => {
    const nondeterministic: string[] = []
    for (const tag of WHITELIST) {
      const attrs = SAMPLE_ATTRS[tag] ?? {}
      const first = await renderToString(tag, attrs, '')
      const second = await renderToString(tag, attrs, '')
      if (first !== second) nondeterministic.push(tag)
    }
    expect(nondeterministic, '同属性两次渲染必须逐字节一致（自增计数进快照即违例）').toEqual([])
  })
})
