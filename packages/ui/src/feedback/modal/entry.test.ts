import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { modal, destroyAll, hasModalCapability } from './index.js'
import { OASModal } from './oas-modal.js'

// 本文件验证「主路径入口语义」（v2.5.0 L3 子路径语义修正）：
// 主路径 index.js 顶部 import prompt 能力包（import 即注册），因此经
// `@oas-ui/ui/feedback/modal` 引入时 prompt 能力默认就位——modal.prompt 全链路可用，
// 无需再显式引能力包（恢复 2.4.0 语义）。
// 纯核（/core 子路径不含能力）的边界由 ./core-entry.test.ts 单独覆盖。
// vitest 按文件隔离模块图，本文件独享一份「index 即含能力」的注册表起点。

/** 触发指定对话框的关闭动画结束（happy-dom 无真实过渡；P3 销毁时序依赖 oas-closed） */
function endAnim(el: Element): void {
  const dialog = el.shadowRoot?.querySelector('.dialog')
  if (dialog) dialog.dispatchEvent(new Event('transitionend'))
}

/** 完成当前全部命令式对话框的关闭动画（驱动销毁收尾） */
function flushAnims(): void {
  for (const el of document.body.querySelectorAll('oas-modal')) endAnim(el)
}

describe('modal 主路径入口（index 内含 prompt 能力）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyAll()
    flushAnims()
    document.body.innerHTML = ''
  })

  it('能力注册表已含 prompt：宿主元素构造即注入 prompt controller', () => {
    expect(hasModalCapability('prompt')).toBe(true)
    const el = new OASModal()
    document.body.appendChild(el)
    expect(el.getModalCapability('prompt')).not.toBeNull()
    el.remove()
  })

  it('仅 import 主路径即可 modal.prompt：返回句柄、创建可见对话框并渲染输入框', async () => {
    const p = modal.prompt({ title: '项目名', inputValue: 'oas-ui', placeholder: '请输入' })
    await Promise.resolve()
    expect(p).not.toBeNull()
    const el = document.body.querySelector('oas-modal') as OASModal
    expect(el).not.toBeNull()
    expect(el.hasAttribute('visible')).toBe(true)
    const input = el.querySelector<HTMLInputElement>('input')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('oas-ui')
    expect(input!.getAttribute('placeholder')).toBe('请输入')
    p.close()
  })
})
