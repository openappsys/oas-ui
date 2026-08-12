import { describe, it, expect } from 'vitest'
import { renderOasToString, useOasRender } from './ssr.js'

/**
 * @oas-ui/nuxt SSR helper 单测。
 *
 * 经 vitest alias（packages/ssr/src）直接驱动 @oas-ui/ssr 渲染器：
 * 首次调用自行装载 happy-dom shim + 按需装载白名单组件目录（与 ssr 包自身测试同栈）。
 * 断言对象是产出的 DSD 静态快照字符串。locale 相关断言显式传 opts.locale，
 * 不依赖全局 locale 状态（全局默认 zh-CN 且本文件不修改它）。
 */
describe('@oas-ui/nuxt SSR helper', () => {
  it('renderOasToString：透传 renderToString 产出 DSD 快照（宿主属性 + light DOM）', async () => {
    const html = await renderOasToString('oas-button', { type: 'primary', size: 'large' }, '提交')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-button type="primary" size="large">')
    expect(html).toContain('</template>提交</oas-button>')
  })

  it('renderOasToString：locale 透传（zh-CN empty 文案）', async () => {
    const html = await renderOasToString('oas-empty', {}, '', { locale: 'zh-CN' })
    expect(html).toContain('暂无数据')
    expect(html).not.toContain('No data')
  })

  it('renderOasToString：非白名单 tag 抛错', async () => {
    await expect(renderOasToString('oas-message')).rejects.toThrow(/非白名单 tag/)
  })

  it('useOasRender：返回可调用的渲染函数，等价 renderOasToString', async () => {
    const render = useOasRender()
    expect(typeof render).toBe('function')
    const html = await render('oas-divider', { dashed: 'dashed' }, '分割线')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-divider dashed="dashed">')
    expect(html).toContain('</template>分割线</oas-divider>')
  })

  it('重复调用幂等：同一进程内多次渲染结果一致', async () => {
    const a = await renderOasToString('oas-tag', { type: 'success' }, '标签', { locale: 'zh-CN' })
    const b = await renderOasToString('oas-tag', { type: 'success' }, '标签', { locale: 'zh-CN' })
    expect(b).toBe(a)
  })
})
