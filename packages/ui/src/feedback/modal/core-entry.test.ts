import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { modal, destroyAll, hasModalCapability } from './core/index.js'
import { OASModal } from './oas-modal.js'

// 本文件验证「纯核入口语义」（v2.5.0 L3 子路径语义修正）：
// `@oas-ui/ui/feedback/modal/core` 是不含 prompt 能力包的 core-only 入口——经它引入时
// modal.prompt 返回 null + dev 告警一次（同值去重），
// 与 oas-modal-prompt-capability.test.ts 覆盖的 core-only 语义一致。
// 注意：不得在此文件 import './prompt/index.js' 或 './index.js'——否则能力注册表被填充。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点。
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个 prompt 调用
// 必须发生在「dev 告警」用例内；后续再调 prompt 不会再触发 console.warn。

/** 触发指定对话框的关闭动画结束（happy-dom 无真实过渡；P3 销毁时序依赖 oas-closed） */
function endAnim(el: Element): void {
  const dialog = el.shadowRoot?.querySelector('.dialog')
  if (dialog) dialog.dispatchEvent(new Event('transitionend'))
}

/** 完成当前全部命令式对话框的关闭动画（驱动销毁收尾） */
function flushAnims(): void {
  for (const el of document.body.querySelectorAll('oas-modal')) endAnim(el)
}

describe('modal 纯核入口（core：不含 prompt 能力）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    destroyAll()
    flushAnims()
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('dev 告警：modal.prompt + core 入口 → 返回 null + 提示显式引能力包或换回主路径（同值去重）', () => {
    const isPromptHint = (call: unknown[]) => String(call[0]).includes('feedback/modal/prompt')
    expect(hasModalCapability('prompt')).toBe(false)
    // 首次 prompt 调用：告警一次
    const r1 = modal.prompt({ title: '输入' })
    expect(r1).toBeNull()
    const first = warnSpy.mock.calls.filter(isPromptHint)
    expect(first.length, 'core 入口首次 prompt 调用应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/feedback/modal/prompt')
    // 同值去重：后续同样调用不再重复告警，也不产生对话框
    warnSpy.mockClear()
    expect(modal.prompt({ title: '再调' })).toBeNull()
    expect(warnSpy.mock.calls.filter(isPromptHint).length).toBe(0)
    expect(document.body.querySelectorAll('oas-modal').length).toBe(0)
  })

  it('core 入口宿主元素无 prompt controller，声明式 confirm 不受影响', () => {
    const el = new OASModal()
    el.setAttribute('visible', '')
    el.innerHTML = '<p>声明式内容</p>'
    document.body.appendChild(el)
    expect(el.getModalCapability('prompt')).toBeNull()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')).not.toBeNull()
    // 命令式 confirm 照常可用且无 prompt 告警噪音
    warnSpy.mockClear()
    modal.confirm({ title: '确认' })
    expect(document.body.querySelectorAll('oas-modal').length).toBe(2)
    const promptWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('feedback/modal/prompt'),
    )
    expect(promptWarns.length).toBe(0)
  })
})
