import { describe, it, expect, beforeEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { renderToString } from './index.js'
import { ensureShim } from './shim.js'

/**
 * @oas-ui/ssr 渲染器单测。
 *
 * 说明：renderToString 为 async——首次调用时先装 happy-dom DOM shim，再按 tag 动态 import
 * 对应组件目录（`@oas-ui/ui/<目录>`，define 副作用注册到 shim 的 customElements）。
 * 所有断言针对产出的 DSD 静态快照字符串，happy-dom 环境本身不解析 `<template shadowrootmode>`，
 * 验证对象是输出结构而非浏览器 upgrade 行为（后者由 e2e 验收）。
 *
 * 注意：性能用例（首次冷装载 < 500ms）必须保持在本文件首位，保证其 tag 的目录
 * import 是冷加载（vitest 按声明顺序执行，同文件内此前未装载过该模块）。
 */
describe('@oas-ui/ssr renderToString', () => {
  beforeEach(() => {
    // 保证用例间 locale 全局态不串（渲染器未传 opts.locale 时沿用当前 locale）
    setLocale('zh-CN')
  })

  it('性能：白名单组件首次冷装载 + 渲染 < 500ms，二次渲染为毫秒级且远快于首次', async () => {
    // 保持本用例在文件首位：oas-divider 目录此前未被装载，首次渲染即冷装载
    const t0 = performance.now()
    const html = await renderToString('oas-divider', { dashed: 'dashed' }, '分割线')
    const firstMs = performance.now() - t0
    expect(html).toContain('<template shadowrootmode="open">')
    // 全量装载基线为 1.8~3.5s；按需装载后白名单组件首载应在 CI 容忍范围内
    expect(firstMs).toBeLessThan(500)

    const t1 = performance.now()
    await renderToString('oas-divider', { dashed: 'dashed' }, '分割线')
    const warmMs = performance.now() - t1
    expect(warmMs).toBeLessThan(100)
    expect(warmMs).toBeLessThan(firstMs)
  })

  it('按需装载：渲染白名单组件后只注册白名单，不装载全量 @oas-ui/ui', async () => {
    const { customElements } = ensureShim()
    await renderToString('oas-button', { type: 'primary' }, '确定')
    // 白名单组件已注册
    expect(customElements.get('oas-button')).toBeDefined()
    // 非白名单组件未被装载（若误走全量 @oas-ui/ui 入口此处会失败）
    expect(customElements.get('oas-input')).toBeUndefined()
    expect(customElements.get('oas-tree')).toBeUndefined()
  })

  it('oas-button：DSD 快照 + light DOM slot 文本 + 宿主属性', async () => {
    const html = await renderToString('oas-button', { type: 'primary', size: 'large' }, '提交')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    // 属性落在宿主标签上
    expect(html).toContain('<oas-button type="primary" size="large">')
    // slot 文本在 template 之外的 light DOM：DSD 模板在最前，文本随后
    expect(html).toContain('</template>提交</oas-button>')
  })

  it('真水合指纹：快照 shadow 内容最前面（style 之前）嵌入 data-oas-ssr meta，值为对应 tag', async () => {
    const btn = await renderToString('oas-button', {}, '确定')
    // 指纹紧随 template 开头；shadow 内容可能以空白文本节点起始，故 meta 与 style 之间允许有空白
    expect(btn).toContain(
      '<template shadowrootmode="open"><meta data-oas-ssr="oas-button" data-oas-ssr-v="1">',
    )
    // 指纹在 style 之前
    expect(btn.indexOf('<meta data-oas-ssr="oas-button" data-oas-ssr-v="1">')).toBeLessThan(
      btn.indexOf('<style>'),
    )
    const tag = await renderToString('oas-tag', {}, '标签')
    expect(tag).toContain('<meta data-oas-ssr="oas-tag" data-oas-ssr-v="1">')
    const empty = await renderToString('oas-empty', {}, '')
    expect(empty).toContain('<meta data-oas-ssr="oas-empty" data-oas-ssr-v="1">')
  })

  it('oas-tag：关闭按钮 aria-label 走 locale', async () => {
    const html = await renderToString('oas-tag', { type: 'success', closable: 'true' }, '新功能')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('<oas-tag type="success" closable="true">')
    expect(html).toContain('</template>新功能</oas-tag>')
    expect(html).toContain('aria-label="关闭"')
  })

  it('oas-empty：默认文案走 locale registry（zh-CN 暂无数据）', async () => {
    const html = await renderToString('oas-empty', {}, '', { locale: 'zh-CN' })
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('暂无数据')
    expect(html).not.toContain('No data')
  })

  it('oas-divider：属性与分隔文本', async () => {
    const html = await renderToString('oas-divider', { dashed: 'dashed' }, '分割线')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('<oas-divider dashed="dashed">')
    expect(html).toContain('</template>分割线</oas-divider>')
  })

  it('typography 三兄弟：oas-text / oas-title / oas-paragraph', async () => {
    const text = await renderToString('oas-text', { type: 'secondary' }, '正文')
    expect(text).toContain('<template shadowrootmode="open">')
    expect(text).toContain('<oas-text type="secondary">')
    expect(text).toContain('</template>正文</oas-text>')

    const title = await renderToString('oas-title', { level: '2' }, '标题')
    expect(title).toContain('<oas-title level="2">')
    expect(title).toContain('</template>标题</oas-title>')

    const para = await renderToString('oas-paragraph', {}, '段落')
    expect(para).toContain('<oas-paragraph>')
    expect(para).toContain('</template>段落</oas-paragraph>')
  })

  it('locale：empty 文案 zh-CN=暂无数据 / en=No data', async () => {
    const zh = await renderToString('oas-empty', {}, '', { locale: 'zh-CN' })
    expect(zh).toContain('暂无数据')
    expect(zh).not.toContain('No data')

    const enHtml = await renderToString('oas-empty', {}, '', { locale: 'en' })
    expect(enHtml).toContain('No data')
    expect(enHtml).not.toContain('暂无数据')
  })

  it('oas-table：JSON attribute 声明式通道产出表头与数据行快照', async () => {
    const html = await renderToString(
      'oas-table',
      {
        columns: JSON.stringify([
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'Age' },
        ]),
        data: JSON.stringify([
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ]),
        'row-key': 'name',
      },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    // 宿主属性保留 columns/data JSON（attribute 通道可被浏览器 upgrade 后重新解析）
    expect(html).toContain('<oas-table columns=')
    expect(html).toContain('data=')
    // 快照含表头标题与数据单元格文本（非虚拟模式同步渲染，无 rAF/测量依赖）
    expect(html).toContain('<th')
    expect(html).toContain('>Name<')
    expect(html).toContain('>Age<')
    expect(html).toContain('Alice')
    expect(html).toContain('Bob')
    // 快照含数据行部件
    expect(html).toContain('part="row"')
  })

  it('oas-table：JSON 非法时容错为空态快照，不抛错', async () => {
    const html = await renderToString(
      'oas-table',
      { columns: 'not-json', data: '[{bad' },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    // 空态占位（zh-CN 默认文案）
    expect(html).toContain('暂无数据')
    // 无数据行
    expect(html).not.toContain('part="row"')
  })

  it('非白名单 tag 抛错并列出白名单', async () => {
    await expect(renderToString('oas-input')).rejects.toThrow(
      /非白名单 tag「oas-input」/,
    )
    await expect(renderToString('oas-input')).rejects.toThrow(/oas-button/)
    await expect(renderToString('oas-tree')).rejects.toThrow(/oas-empty/)
  })

  it('attrs 值含引号/尖括号时正确转义', async () => {
    const html = await renderToString('oas-button', { title: 'a"b<c>&d' }, 'x')
    expect(html).toContain('title="a&quot;b&lt;c&gt;&amp;d"')
  })

  it('重复调用幂等：两次渲染结果一致（body 无累积）', async () => {
    const a = await renderToString('oas-button', { type: 'primary' }, '确定', { locale: 'zh-CN' })
    const b = await renderToString('oas-button', { type: 'primary' }, '确定', { locale: 'zh-CN' })
    expect(b).toBe(a)
  })
})
