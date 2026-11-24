import { describe, it, expect } from 'vitest'
import { registerExprFunction } from '../schema-form/expr/index.js'
import { affectedSteps, compileStepLogic, testCondition, type StepLogicInput } from './when-engine.js'

/** 编译辅助：只看 when / goto 产物 */
function compile(steps: StepLogicInput[], enabled = true) {
  return compileStepLogic(steps, enabled)
}

describe('when-engine 编译', () => {
  it('when 编译产出程序与静态依赖（点号 / 数组下标 / 通配均归一到规范键）', () => {
    const logic = compile([
      { key: 'a', when: '{invoice} == "yes"' },
      { key: 'b', when: 'len({users[].name}) > 0' },
      { key: 'c' },
    ])
    expect(logic.warnings).toEqual([])
    expect(logic.when).toHaveLength(2)
    expect(logic.when[0]!.deps).toEqual(['invoice'])
    expect(logic.when[1]!.deps).toEqual(['users.[].name'])
    expect(logic.when[0]!.index).toBe(0)
  })

  it('非法 when（空串 / 非字符串）与语法错只降级该条并返回告警文案', () => {
    const logic = compile([
      { key: 'a', when: '   ' },
      { key: 'b', when: '{a} =' },
      { key: 'c', when: '{a} == 1' },
    ])
    expect(logic.when.map((clause) => clause.index)).toEqual([2])
    expect(logic.warnings.join('\n')).toContain('when 必须是非空表达式字符串')
    expect(logic.warnings.join('\n')).toContain('when 表达式编译失败')
  })

  it('引擎关闭（enabled=false）时不编译且零告警（when / goto 全部失效）', () => {
    const logic = compile([{ when: '{a} ==', goto: 2 }], false)
    expect(logic.when).toEqual([])
    expect(logic.goto).toEqual([])
    expect(logic.warnings).toEqual([])
  })

  it('goto 三种书写面归一：简写索引 / 简写 key / { when, target } 对象', () => {
    const logic = compile([{ goto: 2 }, { goto: 'confirm' }, { goto: { when: '{a} == "x"', target: 'done' } }])
    expect(logic.goto.map((rule) => [rule.index, rule.target, rule.source])).toEqual([
      [0, 2, ''],
      [1, 'confirm', ''],
      [2, 'done', '{a} == "x"'],
    ])
    expect(logic.goto[0]!.program).toBeNull()
    expect(logic.goto[2]!.deps).toEqual(['a'])
  })

  it('goto 非法形态（缺 target / 空字符串 / 空 when）告警并忽略', () => {
    const logic = compile([{ goto: { target: '' } }, { goto: '' }, { goto: { when: '', target: 1 } }])
    expect(logic.goto).toEqual([])
    expect(logic.warnings.filter((line) => line.includes('goto 形态非法'))).toHaveLength(3)
  })
})

describe('when-engine 依赖跟踪', () => {
  const clauses = [
    { index: 0, deps: ['invoice'], dynamic: false },
    { index: 1, deps: ['users.[].name'], dynamic: false },
    { index: 2, deps: [], dynamic: false },
    { index: 3, deps: [], dynamic: true },
  ]

  it('命中依赖前缀与通配（数组重编号后仍命中）', () => {
    expect(affectedSteps(clauses, 'invoice')).toEqual([0, 3])
    expect(affectedSteps(clauses, 'users[3].name')).toEqual([1, 3])
    expect(affectedSteps(clauses, 'users')).toEqual([1, 3])
  })

  it('未命中的路径不触发重算；无依赖的常量条件恒不重算', () => {
    expect(affectedSteps(clauses, 'nickname')).toEqual([3])
    expect(affectedSteps([{ index: 0, deps: [], dynamic: false }], 'nickname')).toEqual([])
  })

  it('变化路径无法归一（空 / 非法）时保守全量重算', () => {
    expect(affectedSteps(clauses, '')).toEqual([0, 1, 2, 3])
    expect(affectedSteps(clauses, '__proto__')).toEqual([0, 1, 2, 3])
  })
})

describe('when-engine 求值', () => {
  it('条件求值读取跨步答案；宿主函数抛错返回 error 且按不成立处理', () => {
    const unregister = registerExprFunction('boom', () => {
      throw new Error('宿主函数故障')
    })
    try {
      const logic = compile([{ when: '{a} == 1' }, { when: 'boom()' }])
      expect(logic.when).toHaveLength(2)
      expect(testCondition(logic.when[0]!, { a: 1 })).toEqual({ value: true, error: null })
      const failed = testCondition(logic.when[1]!, { a: 1 })
      expect(failed.value).toBe(false)
      expect(failed.error).toContain('宿主函数故障')
      // 宿主函数无静态依赖面 → dynamic（任何值变化都重算）
      expect(affectedSteps(logic.when, 'whatever')).toEqual([1])
    } finally {
      unregister()
    }
  })
})
