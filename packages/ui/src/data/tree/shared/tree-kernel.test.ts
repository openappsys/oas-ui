import { describe, it, expect } from 'vitest'
import type { TreeAccessors } from './model.js'
import { flattenModel } from './model.js'
import { resolveFieldNames } from './fields.js'
import { cloneSlotContent } from './template.js'
import {
  closureFromValues,
  normalizeClosure,
  applyCheckStrategy,
  flipChecked,
  halfByDescendant,
  labelPath,
  descendantNodes,
} from './check.js'
import { expandableNode, loadPendingNode } from './lazy.js'

interface O {
  value: string
  label: string
  children?: O[]
  disabled?: boolean
  off?: boolean
}

const OPTIONS: O[] = [
  {
    value: 'fe',
    label: '前端',
    children: [
      {
        value: 'framework',
        label: '框架',
        children: [
          { value: 'react', label: 'React' },
          { value: 'vue', label: 'Vue' },
        ],
      },
      { value: 'css', label: '样式' },
    ],
  },
  { value: 'be', label: '后端', children: [{ value: 'node', label: 'Node' }] },
]

const ACC: TreeAccessors<O> = {
  idOf: (n) => n.value,
  labelOf: (n) => n.label,
  childrenOf: (n) => n.children,
  disabledOf: (n) => n.disabled === true,
  isLeafOf: (n) => false,
  loadedOf: (n) => false,
  inertOf: (n) => n.disabled === true || n.off === true,
}

const ctx = { model: flattenModel(OPTIONS, ACC), acc: ACC }

function rows(): O[] {
  return ctx.model.rows.map((r) => r.node)
}

describe('tree-kernel：flatten 与字段归一', () => {
  it('field-names JSON 解析：value/label/children/disabled 别名', () => {
    const f = resolveFieldNames(
      '{"value":"id","label":"name","children":"subs","disabled":"off"}',
      'value',
      'value',
      false,
    )
    expect(f.idField).toBe('id')
    expect(f.labelField).toBe('name')
    expect(f.childrenField).toBe('subs')
    expect(f.disabledField).toBe('off')
  })

  it('field-names 缺省回落默认字段名（key 语义别名用于 tree）', () => {
    const f = resolveFieldNames('', 'key', 'key', true)
    expect(f.idField).toBe('key')
    expect(f.labelField).toBe('label')
    expect(f.isLeafField).toBe('isLeaf')
    const g = resolveFieldNames('{"key":"code"}', 'key', 'key', true)
    expect(g.idField).toBe('code')
  })

  it('flatten 输出 DFS 前序行 + parent 链路 + byId 索引', () => {
    const flat = rows()
    expect(flat.map((n) => n.value)).toEqual([
      'fe',
      'framework',
      'react',
      'vue',
      'css',
      'be',
      'node',
    ])
    const depths = ctx.model.rows.map((r) => r.depth)
    expect(depths).toEqual([0, 1, 2, 2, 1, 0, 1])
    expect(ctx.model.byId.get('react')).toBe(OPTIONS[0]!.children![0]!.children![0])
    expect(ctx.model.rows[2]!.parent).toBe('framework')
    expect(ctx.model.parentById.get('vue')).toBe('framework')
  })
})

describe('tree-kernel：勾选级联闭包 + half + 导出策略', () => {
  it('closure：父级值 → 级联展开全部可勾选后代', () => {
    const checked = closureFromValues(ctx, ['fe'])
    expect([...checked].sort()).toEqual(['css', 'fe', 'framework', 'react', 'vue'].sort())
  })

  it('normalize：逐叶子勾选全选后父级收敛进闭包', () => {
    const checked = new Set<string>(['react', 'vue', 'css'])
    normalizeClosure(ctx, checked)
    // react+vue → framework；framework+css → fe
    expect(checked.has('framework')).toBe(true)
    expect(checked.has('fe')).toBe(true)
    expect(checked.has('be')).toBe(false)
  })

  it('normalize：部分勾选时父级移出闭包', () => {
    const checked = new Set<string>(['react', 'framework', 'fe'])
    normalizeClosure(ctx, checked)
    expect(checked.has('framework')).toBe(false)
    expect(checked.has('fe')).toBe(false)
    expect(checked.has('react')).toBe(true)
  })

  it('applyCheckStrategy：all 原样；child 只留叶子；parent 父级代表', () => {
    const full = closureFromValues(ctx, ['fe', 'be'])
    expect(applyCheckStrategy(ctx, full, 'all', []).sort()).toEqual(
      ['fe', 'be', 'framework', 'react', 'vue', 'css', 'node'].sort(),
    )
    expect(applyCheckStrategy(ctx, full, 'child', []).sort()).toEqual(
      ['react', 'vue', 'css', 'node'].sort(),
    )
    expect(applyCheckStrategy(ctx, full, 'parent', []).sort()).toEqual(['fe', 'be'].sort())
  })

  it('flipChecked：级联勾选与取消（取消父级连带后代）', () => {
    let checked = closureFromValues(ctx, ['react'])
    checked = flipChecked(ctx, checked, 'fe', false)
    // fe 勾选 → 后代全勾
    expect(checked.has('framework')).toBe(true)
    expect(checked.has('css')).toBe(true)
    checked = flipChecked(ctx, checked, 'framework', false)
    expect(checked.has('framework')).toBe(false)
    expect(checked.has('react')).toBe(false)
    expect(checked.has('vue')).toBe(false)
    expect(checked.has('css')).toBe(true) // fe 仍勾选 → css 保留
  })

  it('flipChecked：strictly 只翻转自身，不级联', () => {
    let checked = new Set<string>()
    checked = flipChecked(ctx, checked, 'fe', true)
    expect(checked.has('fe')).toBe(true)
    expect(checked.has('react')).toBe(false)
    checked = flipChecked(ctx, checked, 'fe', true)
    expect(checked.has('fe')).toBe(false)
  })

  it('inert 排除：disabled/off 节点不进级联、不参与收敛', () => {
    const data: O[] = [
      {
        value: 'p',
        label: 'P',
        children: [
          { value: 'd', label: 'D', off: true },
          { value: 'x', label: 'X' },
        ],
      },
    ]
    const c = { model: flattenModel(data, ACC), acc: ACC }
    const checked = closureFromValues(c, ['p'])
    expect(checked.has('p')).toBe(true)
    expect(checked.has('x')).toBe(true)
    expect(checked.has('d')).toBe(false)
  })

  it('halfByDescendant：有勾选后代但自身未勾选 → half', () => {
    const checked = closureFromValues(ctx, ['react'])
    expect(halfByDescendant(ctx, checked, 'framework')).toBe(true)
    expect(halfByDescendant(ctx, checked, 'fe')).toBe(true)
    expect(halfByDescendant(ctx, checked, 'react')).toBe(false)
  })

  it('descendantNodes 全量后代（含 inert）', () => {
    const fe = ctx.model.byId.get('fe')!
    expect(descendantNodes(ctx, fe).map((n) => n.value)).toEqual([
      'framework',
      'react',
      'vue',
      'css',
    ])
  })

  it('labelPath：根到自身 label 序列（show-path 回显）', () => {
    expect(labelPath(ctx, 'react')).toEqual(['前端', '框架', 'React'])
  })
})

describe('tree-kernel：懒加载状态机 + 模板克隆', () => {
  const lazyAcc: TreeAccessors<{
    value: string
    label: string
    children?: unknown[]
    isLeaf?: boolean
    loaded?: boolean
  }> = {
    idOf: (n) => n.value,
    labelOf: (n) => n.label,
    childrenOf: (n) => (Array.isArray(n.children) ? (n.children as never) : undefined),
    disabledOf: () => false,
    isLeafOf: (n) => n.isLeaf === true,
    loadedOf: (n) => n.loaded === true,
    inertOf: () => false,
  }

  it('expandableNode：children/isLeaf/loaded/children:[] 判定', () => {
    expect(
      expandableNode(
        { value: 'a', label: 'A', children: [{ value: 'x', label: 'X' }] },
        lazyAcc,
        true,
      ),
    ).toBe(true)
    expect(expandableNode({ value: 'b', label: 'B' }, lazyAcc, true)).toBe(true)
    expect(expandableNode({ value: 'c', label: 'C', isLeaf: true }, lazyAcc, true)).toBe(false)
    expect(expandableNode({ value: 'd', label: 'D', loaded: true }, lazyAcc, true)).toBe(false)
    expect(expandableNode({ value: 'e', label: 'E', children: [] }, lazyAcc, true)).toBe(false)
    expect(expandableNode({ value: 'f', label: 'F' }, lazyAcc, false)).toBe(false)
  })

  it('loadPendingNode：仅未加载未标记节点需要触发加载', () => {
    expect(loadPendingNode({ value: 'b', label: 'B' }, lazyAcc, true)).toBe(true)
    expect(loadPendingNode({ value: 'c', label: 'C', isLeaf: true }, lazyAcc, true)).toBe(false)
    expect(loadPendingNode({ value: 'd', label: 'D', loaded: true }, lazyAcc, true)).toBe(false)
    expect(loadPendingNode({ value: 'a', label: 'A', children: [] }, lazyAcc, true)).toBe(false)
    expect(loadPendingNode({ value: 'z', label: 'Z' }, lazyAcc, false)).toBe(false)
  })

  it('cloneSlotContent：静态与 CSR 直插双形态克隆', () => {
    const t = document.createElement('template')
    t.innerHTML = '<b data-node-label></b>'
    const frag = cloneSlotContent(t)
    expect(frag.querySelector('b')).not.toBeNull()
    expect(t.content.querySelector('b')).not.toBeNull() // 不改动源模板
  })
})
