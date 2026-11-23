// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { compileSchema } from './compile.js'
import type { ArrayPlan, FieldPlan, GroupPlan, TabsPlan } from './types.js'

const schema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: '姓名', minLength: 2 },
    age: { type: 'integer', description: '周岁' },
    vip: { type: 'boolean' },
    city: { type: 'string', enum: ['bj', 'sh'] },
    mail: { type: 'string', format: 'email' },
    address: {
      type: 'object',
      required: ['street'],
      properties: { street: { type: 'string' }, zip: { type: 'string' } },
    },
    tags: { type: 'array', items: { enum: ['a', 'b'] } },
    users: {
      type: 'array',
      items: {
        type: 'object',
        required: ['nick'],
        properties: {
          nick: { type: 'string' },
          matrix: {
            type: 'array',
            items: { type: 'object', properties: { label: { type: 'string' } } },
          },
        },
      },
    },
  },
} as const

const ui = {
  name: { layout: { span: 12 }, options: { placeholder: '请输入姓名' } },
  age: { layout: { span: 12 } },
  address: { layout: { type: 'group', title: '联系地址' } },
  users: { layout: { span: 24 } },
}

describe('编译层：渲染计划（字段 / 分组 / 数组 / 标签页）', () => {
  it('顶层字段映射与 required 传播（父级 required → 子字段 required）', () => {
    const result = compileSchema(schema, ui)
    const byName = new Map(result.plan.map((node) => [node.key, node]))
    const name = byName.get('field:name') as FieldPlan
    expect(name.widget.tag).toBe('oas-input')
    expect(name.label).toBe('姓名')
    expect(name.rules.required).toBe(true)
    expect(name.rules.minLength).toBe(2)
    expect(name.span).toBe(12)
    expect(name.staticRequired).toBe(true)
    expect(name.widget.props.placeholder).toBe('请输入姓名')

    const age = byName.get('field:age') as FieldPlan
    expect(age.widget.tag).toBe('oas-input-number')
    expect(age.help).toBe('周岁')
    expect(age.rules.required).toBeUndefined()

    expect((byName.get('field:vip') as FieldPlan).widget.tag).toBe('oas-switch')
    expect((byName.get('field:city') as FieldPlan).widget.tag).toBe('oas-select')
    expect((byName.get('field:mail') as FieldPlan).widget.props.type).toBe('email')
    expect((byName.get('field:tags') as FieldPlan).widget.tag).toBe('oas-checkbox-group')

    // 对象 → 分组容器；组内字段名带前缀
    const address = byName.get('group:address') as GroupPlan
    expect(address.kind).toBe('group')
    expect(address.label).toBe('联系地址')
    expect(address.children.map((child) => (child as FieldPlan).name)).toEqual(['address.street', 'address.zip'])
    expect((address.children[0] as FieldPlan).rules.required).toBe(true)
  })

  it('对象数组 → form-list 计划：行内字段裸名、required 传播、数组级规则', () => {
    const result = compileSchema(schema, ui)
    const users = result.plan.find((node) => node.key === 'array:users') as ArrayPlan
    expect(users.kind).toBe('array')
    expect(users.name).toBe('users')
    expect(users.children.map((child) => (child as FieldPlan).name)).toEqual(['nick', 'matrix'])
    expect((users.children[0] as FieldPlan).rules.required).toBe(true)
    // 嵌套数组：模板名带 {index}（外层 form-list 替换为行号）
    const matrix = users.children[1] as ArrayPlan
    expect(matrix.kind).toBe('array')
    expect(matrix.name).toBe('matrix')
    expect((matrix.children[0] as FieldPlan).name).toBe('label')
    expect((matrix.children[0] as FieldPlan).inArrayRow).toBe(true)
  })

  it('uiSchema.widget 覆盖容器判定：object 字段交给 matrix 渲染为单控件（不再是分组）', () => {
    const result = compileSchema(
      {
        type: 'object',
        properties: {
          review: { type: 'object', title: '服务评价' },
          priority: { type: 'array', items: { type: 'string' }, title: '优先级' },
        },
      },
      {
        review: {
          widget: 'oas-matrix',
          options: {
            rows: [{ key: 'speed', label: '响应速度' }],
            columns: [{ key: 'good', label: '好' }],
          },
        },
        priority: {
          widget: 'oas-rank',
          options: { options: [{ key: 'a', label: 'A' }] },
        },
      },
    )
    const byKey = new Map(result.plan.map((node) => [node.key, node]))
    const review = byKey.get('field:review') as FieldPlan
    expect(review.kind).toBe('field')
    expect(review.widget.tag).toBe('oas-matrix')
    expect(JSON.parse(review.widget.props.rows!)).toEqual([{ key: 'speed', label: '响应速度' }])
    expect(JSON.parse(review.widget.props.columns!)).toEqual([{ key: 'good', label: '好' }])
    expect(byKey.get('group:review'), 'object 字段不得再渲染成分组容器').toBeUndefined()

    const priority = byKey.get('field:priority') as FieldPlan
    expect(priority.widget.tag).toBe('oas-rank')
    expect(JSON.parse(priority.widget.props.options!)).toEqual([{ key: 'a', label: 'A' }])
    expect(result.warnings.join()).not.toContain('不在内置控件表内')
  })

  it('layout.type=tabs 产出标签页容器（未列出字段并入首标签并告警）', () => {
    const result = compileSchema(
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
      },
      { '': { layout: { type: 'tabs', tabs: [{ key: 't1', title: '甲', fields: ['a', 'b'] }] } } },
    )
    // 根节点的空路径注解非法（compile 会告警），改用根对象属性场景：
    expect(result.warnings.join()).toContain('路径非法')
    const withRootObject = compileSchema(
      {
        type: 'object',
        properties: {
          group: {
            type: 'object',
            properties: { a: { type: 'string' }, b: { type: 'string' }, c: { type: 'string' } },
          },
        },
      },
      { group: { layout: { type: 'tabs', tabs: [{ key: 't1', title: '甲', fields: ['a', 'b'] }] } } },
    )
    const tabs = withRootObject.plan[0] as TabsPlan
    expect(tabs.kind).toBe('tabs')
    expect(tabs.tabs).toHaveLength(1)
    expect(tabs.tabs[0]!.children.map((node) => (node as FieldPlan).name)).toEqual(['group.a', 'group.b', 'group.c'])
    expect(withRootObject.warnings.join()).toContain('未覆盖字段 [c]')
  })

  it('schema default 汇总为嵌套初始值', () => {
    const result = compileSchema({
      type: 'object',
      properties: {
        name: { type: 'string', default: '张三' },
        profile: { type: 'object', properties: { city: { type: 'string', default: 'bj' } } },
        list: { type: 'array', items: { type: 'object', properties: { x: { type: 'string' } } } },
      },
    })
    expect(result.defaults).toEqual({ name: '张三', profile: { city: 'bj' } })
  })

  it('uiSchema 路径不存在 / 未知键告警（防拼写错误静默失效）', () => {
    const result = compileSchema(schema, {
      nam: { widget: 'oas-textarea' },
      name: { widgte: 'oas-textarea' },
    })
    const text = result.warnings.join('\n')
    expect(text).toContain('uiSchema 路径在数据 schema 中不存在："nam"')
    expect(text).toContain('未知键 "widgte"')
  })

  it('uiSchema 数组通配路径命中行内字段，不误报不存在', () => {
    const result = compileSchema(schema, { 'users[].nick': { options: { placeholder: '昵称' } } })
    expect(result.warnings.join()).not.toContain('不存在')
    const users = result.plan.find((node) => node.key === 'array:users') as ArrayPlan
    expect((users.children[0] as FieldPlan).widget.props.placeholder).toBe('昵称')
  })

  it('根节点非 object / 空 schema：返回可展示错误而非静默空白', () => {
    expect(compileSchema({ type: 'string' }).error).toContain('根节点必须是 object')
    expect(compileSchema(null).error).toBeDefined()
    expect(compileSchema({ type: 'object', properties: {} }).plan).toEqual([])
  })

  it('$ref 循环在编译层表现为 error（组件渲染空态 + 原因）', () => {
    const result = compileSchema({
      type: 'object',
      $defs: { a: { type: 'object', properties: { b: { $ref: '#/$defs/a' } } } },
      properties: { root: { $ref: '#/$defs/a' } },
    })
    expect(result.error).toContain('循环 $ref')
    expect(result.plan).toEqual([])
  })

  it('keepValueOnHidden 注解透传到节点', () => {
    const result = compileSchema(schema, { note: { keepValueOnHidden: true } })
    expect(result.warnings.join()).toContain('不存在')
    const result2 = compileSchema(
      { type: 'object', properties: { note: { type: 'string' } } },
      { note: { keepValueOnHidden: true } },
    )
    expect(result2.plan[0]!.keepValueOnHidden).toBe(true)
  })

  it('V2 能力命中即告警（array-table / 值变换钩子 / 远程数据源），不静默', () => {
    const result = compileSchema(
      {
        type: 'object',
        properties: {
          rows: { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } } } },
          money: { type: 'string', transform: 'upper' },
        },
      },
      {
        rows: { widget: 'array-table' },
        money: { convertValue: 'cents', dataSource: '/api/money' },
      },
    )
    const text = result.warnings.join('\n')
    expect(text).toContain('array-table')
    expect(text).toContain('convertValue')
    expect(text).toContain('dataSource')
    expect(text).toContain('V2 能力')
  })
})
