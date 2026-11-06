import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { syncCrossRootAccessibleName } from './aria-named.js'

/**
 * 跨 shadow 可访问名同步（aria-labelledby 混合通道）纯逻辑测试。
 *
 * happy-dom 不实现 ariaLabelledByElements 引用反射（Chrome 128+ 特性）——
 * 本环境天然覆盖「不支持引用属性的引擎走文本兜底」分支；活引用赋值分支由
 * 真实 Chromium 的 qa-regression e2e（AX 树 name 断言）覆盖。
 */
describe('shared/aria-named', () => {
  let host: HTMLElement
  let inner: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    host = document.createElement('oas-host')
    inner = document.createElement('input')
    host.attachShadow({ mode: 'open' }).append(inner)
    document.body.append(host)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 在宿主文档里建一个引用目标元素 */
  function refEl(id: string, text: string): HTMLElement {
    const el = document.createElement('span')
    el.id = id
    el.textContent = text
    document.body.append(el)
    return el
  }

  it('本环境不实现 ariaLabelledByElements（文本兜底分支的测试前提）', () => {
    expect('ariaLabelledByElements' in inner).toBe(false)
  })

  it('labelledby 在场 + 引用元素存在：aria-labelledby 属性原样镜像 + aria-label 写引用文本快照', () => {
    refEl('lbl-title', '仓库名称')
    refEl('lbl-desc', '勾选启用同步')
    host.setAttribute('aria-labelledby', 'lbl-title lbl-desc')

    syncCrossRootAccessibleName(host, inner, null)

    expect(inner.getAttribute('aria-labelledby')).toBe('lbl-title lbl-desc')
    expect(inner.getAttribute('aria-label')).toBe('仓库名称 勾选启用同步')
  })

  it('引用文本各自 trim 后以空格连接（多 idref 空格分隔）', () => {
    refEl('a', '  左侧空白  ')
    refEl('b', '纯文本')
    host.setAttribute('aria-labelledby', 'a   b')

    syncCrossRootAccessibleName(host, inner, null)

    expect(inner.getAttribute('aria-label')).toBe('左侧空白 纯文本')
  })

  it('部分 idref 缺失：跳过缺失项，只用可解析元素', () => {
    refEl('real', '有效标签')
    host.setAttribute('aria-labelledby', 'ghost real')

    syncCrossRootAccessibleName(host, inner, null)

    expect(inner.getAttribute('aria-labelledby')).toBe('ghost real')
    expect(inner.getAttribute('aria-label')).toBe('有效标签')
  })

  it('引用元素文本全空白：视同无有效引用，aria-label 回落 fallback', () => {
    refEl('blank', '   ')
    host.setAttribute('aria-labelledby', 'blank')

    syncCrossRootAccessibleName(host, inner, '宿主名')

    expect(inner.getAttribute('aria-label')).toBe('宿主名')
  })

  it('引用全缺失（idref 无对应元素）：不抛错，aria-label 回落 fallback', () => {
    host.setAttribute('aria-labelledby', 'ghost-1 ghost-2')

    expect(() => syncCrossRootAccessibleName(host, inner, '回落名')).not.toThrow()
    expect(inner.getAttribute('aria-label')).toBe('回落名')
  })

  it('引用全缺失且 fallback 为 null：移除内层 aria-label（不写空名）', () => {
    host.setAttribute('aria-labelledby', 'ghost')

    syncCrossRootAccessibleName(host, inner, null)

    expect(inner.hasAttribute('aria-label')).toBe(false)
  })

  it('宿主移除 labelledby：属性镜像摘除、aria-label 恢复 fallback 通道', () => {
    refEl('lbl', '引用名')
    host.setAttribute('aria-labelledby', 'lbl')
    syncCrossRootAccessibleName(host, inner, null)
    expect(inner.getAttribute('aria-label')).toBe('引用名')

    host.removeAttribute('aria-labelledby')
    syncCrossRootAccessibleName(host, inner, '宿主 aria-label')

    expect(inner.hasAttribute('aria-labelledby')).toBe(false)
    expect(inner.getAttribute('aria-label')).toBe('宿主 aria-label')
  })

  it('宿主移除 labelledby 且 fallback 为 null：aria-label 一并摘除（零残留）', () => {
    refEl('lbl', '引用名')
    host.setAttribute('aria-labelledby', 'lbl')
    syncCrossRootAccessibleName(host, inner, null)

    host.removeAttribute('aria-labelledby')
    syncCrossRootAccessibleName(host, inner, null)

    expect(inner.hasAttribute('aria-labelledby')).toBe(false)
    expect(inner.hasAttribute('aria-label')).toBe(false)
  })

  it('空字符串 labelledby 视同不在场（不产生空 idref 引用）', () => {
    syncCrossRootAccessibleName(host, inner, '回落名')

    expect(inner.hasAttribute('aria-labelledby')).toBe(false)
    expect(inner.getAttribute('aria-label')).toBe('回落名')
  })

  it('v1 快照语义：引用文本变化后不重调不自动追踪', () => {
    const el = refEl('lbl', '初始名')
    host.setAttribute('aria-labelledby', 'lbl')
    syncCrossRootAccessibleName(host, inner, null)

    el.textContent = '改名了'
    expect(inner.getAttribute('aria-label')).toBe('初始名')

    // 宿主属性任意变化触发重同步后才拿到新快照
    syncCrossRootAccessibleName(host, inner, null)
    expect(inner.getAttribute('aria-label')).toBe('改名了')
  })

  it('支持 ariaLabelledByElements 的引擎：写活引用（含摘除清空）', () => {
    // 模拟 Chrome 128+ 的 ARIA 引用反射属性
    const reflected = inner as HTMLElement & { ariaLabelledByElements?: Element[] | null }
    Object.defineProperty(inner, 'ariaLabelledByElements', {
      configurable: true,
      writable: true,
      value: null,
    })
    const a = refEl('ra', '甲')
    const b = refEl('rb', '乙')
    host.setAttribute('aria-labelledby', 'ra rb')

    syncCrossRootAccessibleName(host, inner, null)

    expect(reflected.ariaLabelledByElements).toEqual([a, b])
    // 文本兜底同时在场（引用反射不可用时的兜底名）
    expect(inner.getAttribute('aria-label')).toBe('甲 乙')

    // 摘除：活引用清空
    host.removeAttribute('aria-labelledby')
    syncCrossRootAccessibleName(host, inner, null)
    expect(reflected.ariaLabelledByElements).toBeNull()
  })

  it('支持引用反射但引用全缺失：活引用置 null（不悬空）', () => {
    const reflected = inner as HTMLElement & { ariaLabelledByElements?: Element[] | null }
    Object.defineProperty(inner, 'ariaLabelledByElements', {
      configurable: true,
      writable: true,
      value: null,
    })
    host.setAttribute('aria-labelledby', 'ghost')

    syncCrossRootAccessibleName(host, inner, '回落名')

    expect(reflected.ariaLabelledByElements).toBeNull()
    expect(inner.getAttribute('aria-label')).toBe('回落名')
  })
})
