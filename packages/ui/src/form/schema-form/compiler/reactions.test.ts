// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { compileSchema } from './compile.js'
import { compileReactions, createReactionEngine } from './reactions.js'
import { registerExprFunction } from './expr.js'
import type { CompiledReaction } from './types.js'

const BASE_SCHEMA = {
  type: 'object',
  required: ['country'],
  properties: {
    country: { type: 'string', enum: ['CN', 'US'] },
    province: { type: 'string' },
    city: { type: 'string' },
    note: { type: 'string' },
    plan: { type: 'string' },
    team: { type: 'string' },
    users: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          country: { type: 'string' },
          state: { type: 'string' },
        },
      },
    },
  },
}

function compile(ui: Record<string, unknown>) {
  const result = compileSchema(BASE_SCHEMA, ui)
  return result
}

function engineOf(ui: Record<string, unknown>, options: { maxRounds?: number } = {}) {
  const result = compile(ui)
  const warnings: string[] = []
  const engine = createReactionEngine(result.plan, result.reactions, {
    onWarn: (msg) => warnings.push(msg),
    ...options,
  })
  return { result, engine, warnings }
}

describe('reactions 编译（封闭词表 / otherwise / 冲突）', () => {
  it('fulfill 非封闭键告警；value 已转正（表达式轨，不再告警保留）', () => {
    const result = compile({
      country: {
        reactions: [
          {
            whenSchema: { schema: { const: 'US' } },
            target: 'province',
            fulfill: { visible: true, color: 'red', value: '{city}' },
          },
        ],
      },
    })
    const text = result.warnings.join('\n')
    expect(text).toContain('未知键 "color"')
    expect(text).not.toContain('保留键')
    expect(result.reactions).toHaveLength(1)
    expect(result.reactions[0]!.fulfill).toEqual({ visible: true })
    // value 表达式参与依赖图（城市变化要重算这条 reaction）
    expect(result.reactions[0]!.valueExpr).toEqual(expect.any(Function))
    expect(result.reactions[0]!.deps).toContain('city')
  })

  it('fulfill.value 表达式编译失败：只丢弃 value（其余效果保留）+ 告警', () => {
    const result = compile({
      country: {
        reactions: [
          {
            whenSchema: { schema: { const: 'US' } },
            target: 'province',
            fulfill: { required: true, value: '{country} +' },
          },
        ],
      },
    })
    expect(result.warnings.join('\n')).toContain('fulfill.value 表达式编译失败')
    expect(result.reactions).toHaveLength(1)
    expect(result.reactions[0]!.fulfill).toEqual({ required: true })
    expect(result.reactions[0]!.valueExpr).toBeUndefined()
  })

  it('fulfill.value 字面量（数字 / 布尔）：直接作为写入值', () => {
    const result = compile({
      country: {
        reactions: [{ whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { value: 42 } }],
      },
    })
    expect(result.reactions[0]!.fulfill).toEqual({ value: 42 })
    expect(result.reactions[0]!.valueExpr).toBeUndefined()
  })

  it('缺少条件（when / whenSchema 都没有）：告警且不生效', () => {
    const result = compile({
      country: {
        reactions: [{ target: 'province', fulfill: { visible: false } }],
      },
    })
    expect(result.warnings.join('\n')).toContain('缺少 whenSchema.schema')
    expect(result.reactions).toHaveLength(0)
  })

  it('when 表达式轨：编译成功并带静态依赖（V1b）', () => {
    const result = compile({
      country: {
        reactions: [{ when: "{country} == 'US' && len({city}) > 0", target: 'city', fulfill: { visible: false } }],
      },
    })
    expect(result.warnings).toEqual([])
    expect(result.reactions).toHaveLength(1)
    const reaction = result.reactions[0]!
    expect(reaction.conditionKind).toBe('expr')
    expect(reaction.deps.sort()).toEqual(['city', 'country'])
    expect(reaction.scope).toBe('country')
  })

  it('when 语法错误 / 未知字段：编译告警且该条降级（不静默生效）', () => {
    const result = compile({
      country: {
        reactions: [
          { when: '{country} ==', target: 'city', fulfill: { visible: false } },
          { when: "{nope} == 'x'", target: 'province', fulfill: { visible: false } },
          { when: "{country} == 'US'", target: 'city', fulfill: { visible: false } },
        ],
      },
    })
    const text = result.warnings.join('\n')
    expect(text).toContain('表达式编译失败')
    expect(text).toContain('未知字段')
    expect(result.reactions).toHaveLength(1)
  })

  it('when 与 whenSchema 同时提供：二选一告警并忽略', () => {
    const result = compile({
      country: {
        reactions: [
          {
            when: "{country} == 'US'",
            whenSchema: { schema: { const: 'US' } },
            target: 'city',
            fulfill: { visible: false },
          },
        ],
      },
    })
    expect(result.warnings.join()).toContain('二选一')
    expect(result.reactions).toHaveLength(0)
  })

  it('跨 reactions 写同一目标同一属性：后者胜 + 告警', () => {
    const result = compile({
      country: {
        reactions: [
          { whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: true } },
          { whenSchema: { schema: { const: 'CN' } }, target: 'province', fulfill: { visible: false } },
        ],
      },
    })
    expect(result.warnings.join()).toContain('后者胜')
    expect(result.reactions).toHaveLength(2)
  })

  it('scope 缺省 = $self（本字段），显式绝对路径照写', () => {
    const result = compile({
      country: {
        reactions: [
          { whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: true } },
          {
            whenSchema: { scope: 'city', schema: { const: 'NY' } },
            target: ['note'],
            fulfill: { required: true },
          },
        ],
      },
    })
    expect(result.reactions[0]!.scope).toBe('country')
    expect(result.reactions[1]!.scope).toBe('city')
    expect(result.reactions[1]!.targets).toEqual(['note'])
    expect(result.reactions[0]!.deps).toContain('country')
  })

  it('compileReactions 直接调用：非法路径拒绝', () => {
    const warnings: string[] = []
    const compiled: CompiledReaction[] = compileReactions(
      [{ path: '__proto__.x', reactions: [{ whenSchema: { schema: {} } }] }],
      warnings,
    )
    expect(compiled).toEqual([])
    expect(warnings.join()).toContain('非法路径')
  })
})

describe('reactions 求值（whenSchema 单轨 + 多 target + otherwise 回静态值）', () => {
  const ui = {
    country: {
      reactions: [
        {
          whenSchema: { schema: { enum: ['US'] } },
          target: ['province', 'city'],
          fulfill: { visible: false, required: false },
        },
      ],
    },
    province: { options: { placeholder: '省' } },
  }

  it('条件成立应用 fulfill，多 target 同时生效', () => {
    const { engine } = engineOf(ui)
    const effects = engine.evaluate({ country: 'US' })
    expect(effects.get('province')).toEqual({ visible: false, required: false })
    expect(effects.get('city')).toEqual({ visible: false, required: false })
  })

  it('条件不成立且无 otherwise：回落静态值（country=CN 时 province 静态 visible=true/required=false）', () => {
    const { engine } = engineOf(ui)
    const effects = engine.evaluate({ country: 'CN' })
    expect(effects.get('province')).toEqual({ visible: true, required: false })
  })

  it('显式 otherwise 优先于静态值', () => {
    const { engine } = engineOf({
      country: {
        reactions: [
          {
            whenSchema: { schema: { const: 'US' } },
            target: 'province',
            fulfill: { disabled: true },
            otherwise: { disabled: false },
          },
        ],
      },
    })
    expect(engine.evaluate({ country: 'US' }).get('province')).toEqual({ disabled: true })
    expect(engine.evaluate({ country: 'CN' }).get('province')).toEqual({ disabled: false })
  })

  it('数组通配 scope/target：逐行求值，行条件不同时互不串扰', () => {
    const { engine } = engineOf({
      'users[].country': {
        reactions: [{ whenSchema: { schema: { const: 'US' } }, target: 'users[].state', fulfill: { visible: false } }],
      },
    })
    const effects = engine.evaluate({
      users: [
        { country: 'US', state: 'CA' },
        { country: 'CN', state: 'ZJ' },
      ],
    })
    expect(effects.get('users.0.state')).toEqual({ visible: false })
    expect(effects.get('users.1.state')).toEqual({ visible: true })
  })

  it('依赖图定向刷新：命中的 reaction 才重算，未命中返回 null', () => {
    const { engine } = engineOf(ui)
    expect(engine.impacted('country')).toEqual([0])
    expect(engine.impacted('city')).toEqual([])
    expect(engine.evaluateChanged({ country: 'US' }, 'city')).toBeNull()
    expect(engine.evaluateChanged({ country: 'US' }, 'country')?.get('province')).toEqual({
      visible: false,
      required: false,
    })
  })

  it('定点迭代守卫：maxRounds 用满即告警并保留最后一轮', () => {
    const { engine, warnings } = engineOf(ui, { maxRounds: 1 })
    const effects = engine.evaluate({ country: 'US' })
    expect(warnings.join()).toContain('未收敛')
    expect(effects.get('province')).toEqual({ visible: false, required: false })
  })
})

describe('reactions 表达式轨（when）：求值 / 依赖图 / 宿主函数', () => {
  it('表达式条件驱动 fulfill，与 whenSchema 同一效果出口', () => {
    const { engine } = engineOf({
      plan: {
        reactions: [
          {
            when: "{plan} == 'pro' && len({team}) >= 2",
            target: ['note', 'city'],
            fulfill: { disabled: true },
            otherwise: { disabled: false },
          },
        ],
      },
    })
    const pro = engine.evaluate({ plan: 'pro', team: 'ab' })
    expect(pro.get('note')).toEqual({ disabled: true })
    expect(pro.get('city')).toEqual({ disabled: true })
    const free = engine.evaluate({ plan: 'free', team: 'ab' })
    expect(free.get('note')).toEqual({ disabled: false })
  })

  it('$self 解析为源字段当前值（含数组行通配）', () => {
    const { engine } = engineOf({
      'users[].country': {
        reactions: [{ when: "$self == 'US'", target: 'users[].state', fulfill: { visible: false } }],
      },
    })
    const effects = engine.evaluate({
      users: [
        { country: 'US', state: 'CA' },
        { country: 'CN', state: 'ZJ' },
      ],
    })
    expect(effects.get('users.0.state')).toEqual({ visible: false })
    expect(effects.get('users.1.state')).toEqual({ visible: true })
  })

  it('依赖图：表达式静态依赖命中才重算；宿主函数轨道任何变更都重算', () => {
    const { engine, result } = engineOf({
      plan: {
        reactions: [{ when: "{plan} == 'pro'", target: 'note', fulfill: { disabled: true } }],
      },
      country: {
        reactions: [{ when: "{province} == 'X'", target: 'city', fulfill: { visible: false } }],
      },
    })
    const planIndex = result.reactions.findIndex((reaction) => reaction.sourcePath === 'plan')
    const countryIndex = result.reactions.findIndex((reaction) => reaction.sourcePath === 'country')
    expect(planIndex).toBeGreaterThanOrEqual(0)
    expect(countryIndex).toBeGreaterThanOrEqual(0)
    expect(engine.impacted('plan')).toEqual([planIndex])
    expect(engine.impacted('province')).toEqual([countryIndex])
    expect(engine.impacted('city')).toEqual([])

    const unregister = registerExprFunction('endsWithX', (value) => String(value ?? '').endsWith('x'))
    try {
      const { engine: dynamicEngine, result: dynamicResult } = engineOf({
        plan: {
          reactions: [{ when: 'endsWithX({plan})', target: 'note', fulfill: { disabled: true } }],
        },
      })
      const index = dynamicResult.reactions.findIndex((reaction) => reaction.sourcePath === 'plan')
      expect(dynamicEngine.impacted('anything')).toEqual([index])
      expect(dynamicEngine.evaluate({ plan: 'prox' }).get('note')).toEqual({ disabled: true })
    } finally {
      unregister()
    }
  })

  it('表达式求值异常（宿主函数抛错）：按条件不成立处理 + 提示一次', () => {
    const unregister = registerExprFunction('boom', () => {
      throw new Error('boom')
    })
    try {
      const { engine, warnings } = engineOf({
        plan: {
          reactions: [{ when: 'boom({plan})', target: 'note', fulfill: { disabled: true } }],
        },
      })
      const effects = engine.evaluate({ plan: 'x' })
      expect(effects.get('note')).toEqual({ disabled: false })
      expect(warnings.filter((line) => line.includes('表达式求值失败'))).toHaveLength(1)
    } finally {
      unregister()
    }
  })
})

describe('reactions 值联动（fulfill.value）', () => {
  it('条件成立写入表达式结果；条件不成立无 otherwise 时不产生值效果', () => {
    const { engine } = engineOf({
      country: {
        reactions: [
          {
            when: "{country} == 'US'",
            target: 'city',
            fulfill: { value: '{province}' },
          },
        ],
      },
    })
    const us = engine.evaluate({ country: 'US', province: 'NY' })
    expect(us.get('city')).toEqual({ value: 'NY' })
    const cn = engine.evaluate({ country: 'CN', province: 'ZJ' })
    expect(cn.get('city')).toBeUndefined()
  })

  it('otherwise.value：条件不成立时写回落值', () => {
    const { engine } = engineOf({
      plan: {
        reactions: [
          {
            when: "{plan} == 'pro'",
            target: 'team',
            fulfill: { value: "'vip'" },
            otherwise: { value: "'free'" },
          },
        ],
      },
    })
    expect(engine.evaluate({ plan: 'pro' }).get('team')).toEqual({ value: 'vip' })
    expect(engine.evaluate({ plan: 'free' }).get('team')).toEqual({ value: 'free' })
  })

  it('写值参与定点迭代：value 写入的字段驱动下游条件（同一次全量求值内）', () => {
    const { engine } = engineOf({
      country: {
        reactions: [
          { when: "{country} == 'US'", target: 'city', fulfill: { value: '{province}' } },
          { when: "{city} == 'NY'", target: 'note', fulfill: { visible: false } },
        ],
      },
    })
    const effects = engine.evaluate({ country: 'US', province: 'NY' })
    expect(effects.get('city')).toEqual({ value: 'NY' })
    expect(effects.get('note')).toEqual({ visible: false })
  })

  it('写值不覆盖 visible:false 的卸载清值语义（隐藏目标不参与写值反馈）', () => {
    const { engine } = engineOf({
      country: {
        reactions: [
          { when: "{country} == 'US'", target: 'city', fulfill: { visible: false } },
          { when: "{country} == 'US'", target: 'city', fulfill: { value: "'x'" } },
          { when: "{city} == 'x'", target: 'note', fulfill: { visible: false } },
        ],
      },
    })
    const effects = engine.evaluate({ country: 'US', city: 'NY' })
    expect(effects.get('city')).toEqual({ visible: false, value: 'x' })
    // city 被隐藏 → 值已清（下游条件按「无值」求值），值写入不得把 x 反馈回去
    expect(effects.get('note')).toEqual({ visible: true })
  })

  it('表达式结果 undefined（字段无值）不产生值效果（不静默清空目标）', () => {
    const { engine } = engineOf({
      country: {
        reactions: [{ when: "{country} == 'US'", target: 'city', fulfill: { value: '{province}' } }],
      },
    })
    const effects = engine.evaluate({ country: 'US', city: 'NY' })
    expect(effects.get('city')).toBeUndefined()
  })

  it('写值循环守卫：振荡不收敛在 8 轮内告警并保留最后一轮', () => {
    const { engine, warnings } = engineOf(
      {
        plan: {
          reactions: [
            { when: "{plan} == 'x'", target: 'note', fulfill: { value: "'a'" } },
            { when: "{note} == 'a'", target: 'plan', fulfill: { value: "'y'" } },
            { when: "{plan} == 'y'", target: 'note', fulfill: { value: "'b'" } },
            { when: "{note} == 'b'", target: 'plan', fulfill: { value: "'x'" } },
          ],
        },
      },
      { maxRounds: 2 },
    )
    const effects = engine.evaluate({ plan: 'x' })
    // 第 2 轮（maxRounds 用满）即告警；保留该轮结果（note 写入 a、plan 写入 y）
    expect(effects.get('note')).toEqual({ value: 'a' })
    expect(effects.get('plan')).toEqual({ value: 'y' })
    expect(warnings.join('\n')).toContain('未收敛')
  })
})
