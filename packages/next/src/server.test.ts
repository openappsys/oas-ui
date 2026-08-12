import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OasComponent, serializeChildren } from './server.js'
import { renderOas, normalizeAttrs } from './ssr.js'

/**
 * @oas-ui/next 服务端集成单测。
 *
 * 纯逻辑单测，不要求真跑 next build：
 * - `renderOas` / `normalizeAttrs`：低层渲染路径 + attrs 归一化
 * - `OasComponent`：RSC 渲染路径（react-dom/server 的 renderToStaticMarkup 验证
 *   产出结构；真实环境由 Next 的 RSC 渲染器执行，机制等价）
 * - `serializeChildren`：children → light DOM HTML
 *
 * locale 相关断言显式传 opts.locale，不依赖全局 locale 状态
 * （全局默认 zh-CN 且本文件不修改它）。
 */
describe('@oas-ui/next 服务端集成', () => {
  describe('renderOas（低层）', () => {
    it('产出 DSD 快照 + 宿主属性 + light DOM', async () => {
      const html = await renderOas('oas-button', { type: 'primary', size: 'large' }, '提交')
      expect(html).toContain('<template shadowrootmode="open">')
      expect(html).toContain('<oas-button type="primary" size="large">')
      expect(html).toContain('</template>提交</oas-button>')
    })

    it('attrs 归一化：number/boolean 序列化为字符串', async () => {
      // oas-avatar 的 size 接受数值（px），oas-tag 的 closable 为布尔开关
      const avatar = await renderOas('oas-avatar', { size: 48 }, '张')
      expect(avatar).toContain('<oas-avatar size="48"')
      expect(avatar).toContain('</template>张</oas-avatar>')

      const tag = await renderOas('oas-tag', { closable: true }, '标签')
      expect(tag).toContain('<oas-tag closable="true">')
      expect(tag).toContain('</template>标签</oas-tag>')
    })

    it('attrs 值含引号/尖括号时正确转义', async () => {
      const html = await renderOas('oas-button', { title: 'a"b<c>&d' }, 'x')
      expect(html).toContain('title="a&quot;b&lt;c&gt;&amp;d"')
    })

    it('locale 透传：zh-CN empty 文案', async () => {
      const html = await renderOas('oas-empty', {}, '', { locale: 'zh-CN' })
      expect(html).toContain('暂无数据')
    })

    it('非白名单 tag 抛错', async () => {
      await expect(renderOas('oas-message')).rejects.toThrow(/非白名单 tag/)
    })
  })

  describe('normalizeAttrs', () => {
    it('值统一序列化，保持键不变', () => {
      expect(normalizeAttrs({ type: 'primary', disabled: true, size: 40 })).toEqual({
        type: 'primary',
        disabled: 'true',
        size: '40',
      })
    })
    it('空/未传返回空对象', () => {
      expect(normalizeAttrs()).toEqual({})
      expect(normalizeAttrs({})).toEqual({})
    })
  })

  describe('serializeChildren', () => {
    it('字符串直接透传（不转义，作为 light DOM）', () => {
      expect(serializeChildren('提交')).toBe('提交')
      expect(serializeChildren('<b>粗体</b>')).toBe('<b>粗体</b>')
    })
    it('ReactNode 经 renderToStaticMarkup 序列化', () => {
      expect(serializeChildren(createElement('b', null, '粗体'))).toBe('<b>粗体</b>')
      expect(serializeChildren(123)).toBe('123')
    })
  })

  describe('OasComponent（RSC 渲染路径）', () => {
    it('children 为字符串时产出宿主 HTML + DSD 快照，包一层 oas-ssr div', async () => {
      const el = await OasComponent({
        tag: 'oas-button',
        attrs: { type: 'primary' },
        children: '提交',
      })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain(
        '<div class="oas-ssr"><oas-button type="primary"><template shadowrootmode="open">',
      )
      expect(markup).toContain('</template>提交</oas-button></div>')
    })

    it('attrs 布尔/数字归一化进入宿主属性', async () => {
      const el = await OasComponent({
        tag: 'oas-checkbox',
        attrs: { checked: true },
        children: '记住我',
      })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain('<oas-checkbox checked="true"><template shadowrootmode="open">')
    })

    it('slotHTML 原始 HTML 优先于 children', async () => {
      const el = await OasComponent({
        tag: 'oas-card',
        slotHTML: '<b>卡片内容</b>',
        children: '被覆盖',
      })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain('</template><b>卡片内容</b></oas-card></div>')
      expect(markup).not.toContain('被覆盖')
    })

    it('children ReactNode 自动序列化为 light DOM', async () => {
      const el = await OasComponent({
        tag: 'oas-card',
        children: createElement('span', { className: 'c' }, '内容'),
      })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain('<span class="c">内容</span>')
    })

    it('renderOptions.locale 透传到渲染器', async () => {
      const el = await OasComponent({ tag: 'oas-empty', renderOptions: { locale: 'zh-CN' } })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain('暂无数据')
    })

    it('自定义 wrapperClassName', async () => {
      const el = await OasComponent({
        tag: 'oas-divider',
        wrapperClassName: 'my-wrap',
        slotHTML: '',
      })
      const markup = renderToStaticMarkup(el)
      expect(markup).toContain('<div class="my-wrap"><oas-divider>')
    })
  })
})
