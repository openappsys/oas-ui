import { describe, it, expect, beforeEach } from 'vitest'
import { OASTabs } from './index.js'

// 本文件验证「能力晚加入（late-join）」：宿主构造/连接时能力注册表为空，
// 之后能力包才注册（入口求值顺序、打包器重排、按需反向引入、动态 import 等场景），
// 宿主应经订阅通知幂等补齐能力 controller，而不是永久静默失效。
// vitest 按文件隔离模块图，本文件独享一份空注册表起点。

describe('OASTabs manager 能力晚加入（late-join）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('构造后才注册的 manager 能力应补齐注入已连接的宿主', async () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="文档一" value="a" editable><p>内容一</p></oas-tab-panel>
      <oas-tab-panel label="文档二" value="b" editable><p>内容二</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    // 构造/连接时注册表为空：manager 未注入（无能力样式标记）
    expect(el.shadowRoot!.querySelector('style[data-oas-tabs-manager]')).toBeNull()

    // 晚加入：动态 import 能力包（模拟入口求值顺序/打包器重排/按需反向引入）
    await import('./manager/index.js')

    // 订阅通知 → 幂等 attach → 宿主已连接故 hostConnected 立即触发 → 能力样式注入
    expect(el.shadowRoot!.querySelector('style[data-oas-tabs-manager]')).not.toBeNull()
    el.remove()
  })

  it('断开的宿主退订：重连后仍经 catch-up 补齐（不泄漏不错过）', async () => {
    const el = new OASTabs()
    el.innerHTML = `<oas-tab-panel label="文档一" value="a" editable><p>内容</p></oas-tab-panel>`
    document.body.appendChild(el)
    el.remove()
    // 断开期间注册表仍为空；重连时 catch-up + 重新订阅
    document.body.appendChild(el)
    await import('./manager/index.js')
    expect(el.shadowRoot!.querySelector('style[data-oas-tabs-manager]')).not.toBeNull()
    // 幂等：重复 attach 不重复注入样式
    const count = el.shadowRoot!.querySelectorAll('style[data-oas-tabs-manager]').length
    expect(count).toBe(1)
    el.remove()
  })
})
