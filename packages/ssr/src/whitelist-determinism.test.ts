import { describe, it, expect } from 'vitest'
import { renderToString, WHITELIST, type WhiteListTag } from './index.js'

/**
 * 全白名单快照确定性实测（维护批 M2 fix round）：
 * 每个 tag 用最小样本属性连续渲染两次，逐字节比对——任何组件把模块级/静态自增
 * 计数（uid/seq/Counter）写进快照都会在此红。样本属性覆盖各自「含 id 输出」的
 * 渲染路径（form 族关联 id / overlay 面板 id / 渐变 id 等）。
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
  it('每个白名单 tag 最小渲染两次逐字节一致（175 tag 穷尽）', async () => {
    const nondeterministic: string[] = []
    let checked = 0
    for (const tag of WHITELIST) {
      const attrs = SAMPLE_ATTRS[tag] ?? {}
      const first = await renderToString(tag, attrs, '')
      const second = await renderToString(tag, attrs, '')
      checked++
      if (first !== second) nondeterministic.push(tag)
    }
    expect(nondeterministic, '同属性两次渲染必须逐字节一致（自增计数进快照即违例）').toEqual([])
    expect(checked, '白名单全部 tag 都必须实际渲染比对').toBe(WHITELIST.length)
  })
})
