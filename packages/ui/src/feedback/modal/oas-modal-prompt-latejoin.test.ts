import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASModal, destroyAll, type ModalPromptCapability } from './index.js'

// 本文件验证「prompt 能力晚加入（late-join）」：宿主构造/连接时能力注册表为空，
// 之后能力包才注册（入口求值顺序、打包器重排、按需反向引入、动态 import 等场景），
// 宿主应经订阅通知幂等补齐 prompt 能力 controller（命令式层按名取回委托），而不是永久静默失效。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点（首个动态 import 前 prompt 未注册）。

describe('OASModal prompt 能力晚加入（late-join）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // openPrompt 经 trackCommandModal 登记进命令式层存活表，destroyAll 统一收口
    destroyAll()
    document.body.innerHTML = ''
  })

  it('构造/连接后才注册的 prompt 能力应补齐注入（按名可取回 controller 且 openPrompt 可用）', async () => {
    const el = new OASModal()
    document.body.appendChild(el)
    // 连接时注册表为空：按名取不到 prompt controller
    expect(el.getModalCapability<ModalPromptCapability>('prompt')).toBeNull()

    // 晚加入：动态 import prompt 能力包（模拟入口求值顺序/打包器重排/按需反向引入）
    await import('./prompt/index.js')

    // 订阅通知 → 幂等 attach → 已连接宿主可取回 controller
    const cap = el.getModalCapability<ModalPromptCapability>('prompt')
    expect(cap).not.toBeNull()

    // 补齐后立即可用：openPrompt 在宿主 light DOM 构建输入控件（行为可观察标记）
    cap!.openPrompt({ title: 'late-join', inputValue: 'v1' })
    const input = el.querySelector<HTMLInputElement>('.oas-modal-prompt input')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('v1')
  })

  it('断开的宿主退订：重连仍经 catch-up 补齐（多次重连不重复替换 controller）', () => {
    // 注册表已含 prompt（上一条用例已 import）：构造快照即注入
    const el = new OASModal()
    document.body.appendChild(el)
    const cap1 = el.getModalCapability<ModalPromptCapability>('prompt')
    expect(cap1).not.toBeNull()
    // 多次断开/重连：connectedCallback 重新订阅 + catch-up attach（attachedCaps 幂等去重），
    // controller 引用保持不变（若 catch-up 重复 attach 会新建 controller 覆盖 map 项）
    for (let i = 0; i < 2; i++) {
      el.remove()
      document.body.appendChild(el)
    }
    const cap2 = el.getModalCapability<ModalPromptCapability>('prompt')
    expect(cap2).not.toBeNull()
    expect(cap2).toBe(cap1)
    el.remove()
  })
})
