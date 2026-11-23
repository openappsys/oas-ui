// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canonicalDslPath, hasWildcard, parseDslPath, pathDependencyMatches, pathPatternMatches } from './path.js'

describe('DSL 路径归一（唯一用户可见语法）', () => {
  it('方括号下标 / 点号 / {index} 占位归一为段数组', () => {
    expect(parseDslPath('users[0].name')).toEqual(['users', '0', 'name'])
    expect(parseDslPath('users.0.name')).toEqual(['users', '0', 'name'])
    expect(parseDslPath('a[0][1].b')).toEqual(['a', '0', '1', 'b'])
    expect(parseDslPath('matrix.{index}.tags')).toEqual(['matrix', '[]', 'tags'])
  })

  it('数组通配 users[].name 归一为 [] 段', () => {
    expect(parseDslPath('users[].name')).toEqual(['users', '[]', 'name'])
    expect(hasWildcard('users[].name')).toBe(true)
    expect(hasWildcard('users[0].name')).toBe(false)
  })

  it('规范键：两种书写面得到同一键', () => {
    expect(canonicalDslPath('users[0].name')).toBe('users.0.name')
    expect(canonicalDslPath('users.0.name')).toBe('users.0.name')
    expect(canonicalDslPath('users[].name')).toBe('users.[].name')
  })

  it('保留键段 / 空路径 / $self 拒绝', () => {
    expect(parseDslPath('__proto__.x')).toBeNull()
    expect(parseDslPath('')).toBeNull()
    expect(parseDslPath('$self')).toBeNull()
  })

  it('前缀匹配：容器目标覆盖子树，通配匹配任意下标', () => {
    expect(pathPatternMatches('users', 'users.0.name')).toBe(true)
    expect(pathPatternMatches('users.[].name', 'users.3.name')).toBe(true)
    expect(pathPatternMatches('users.[].name', 'users.3.first')).toBe(false)
    expect(pathPatternMatches('users.[].name', 'users')).toBe(false)
  })

  it('依赖命中：互为前缀（含数组重编号）均视为受影响', () => {
    expect(pathDependencyMatches('users.[].name', 'users.0.name')).toBe(true)
    expect(pathDependencyMatches('users', 'users.0.name')).toBe(true)
    expect(pathDependencyMatches('users.[].name', 'users')).toBe(true)
    expect(pathDependencyMatches('profile.city', 'users.0.name')).toBe(false)
  })
})
