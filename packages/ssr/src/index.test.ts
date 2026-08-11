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
    expect(customElements.get('oas-modal')).toBeUndefined()
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
    const html = await renderToString('oas-table', { columns: 'not-json', data: '[{bad' }, '', {
      locale: 'zh-CN',
    })
    expect(html).toContain('<template shadowrootmode="open">')
    // 空态占位（zh-CN 默认文案）
    expect(html).toContain('暂无数据')
    // 无数据行
    expect(html).not.toContain('part="row"')
  })

  it('oas-affix：测量组件快照为未校正态（happy-dom rect 全 0 → 吸顶态 .fixed + top），浏览器端 rAF 校正', async () => {
    const html = await renderToString('oas-affix', { offset: '100' }, '吸顶导航')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('<oas-affix offset="100">')
    // 快照语义：SSR 端 getBoundingClientRect 恒 0 → 0 <= offset → 吸顶（未校正态）
    expect(html).toContain('class="wrap fixed"')
    expect(html).toContain('style="top: 100px;"')
    // 骨架与 slot 内容同步完整
    expect(html).toContain('</template>吸顶导航</oas-affix>')
  })

  it('oas-ellipsis：文本同步入快照，省略形态类已写入、测量态（溢出/tooltip）不进快照属预期', async () => {
    const text = '这是一段很长的文本用于验证省略组件在 SSR 快照中的文本同步渲染行为'
    const html = await renderToString('oas-ellipsis', { text, rows: '2' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain(`text="${text}"`)
    // 文本内容同步写入（快照可见骨架+文本）
    expect(html).toContain(`>${text}</div>`)
    // 行数形态类（.multi + line-clamp）在 SSR 即写入（与 rows 决定，非测量依赖）
    expect(html).toContain('class="text multi"')
    expect(html).toContain('-webkit-line-clamp: 2')
    // 测量态（溢出判定）happy-dom 全 0 → 无溢出 → toggle 保持 hidden、不挂 tooltip
    expect(html).toContain('class="toggle" part="toggle" hidden=""')
    expect(html).not.toContain('oas-tooltip')
  })

  it('oas-scroll-area：骨架 + slot 内容同步，视口尺寸写入、溢出态不进快照属预期', async () => {
    const html = await renderToString('oas-scroll-area', { height: '200' }, '<p>滚动内容</p>')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('<oas-scroll-area height="200">')
    expect(html).toContain('</template><p>滚动内容</p></oas-scroll-area>')
    // 视口尺寸（非测量态）同步写入
    expect(html).toContain('class="viewport"')
    // happy-dom 溢出测量全 0 → 轨道无 visible/peek（快照=未校正态，浏览器 rAF 校正）
    expect(html).toContain('class="track track-v"')
    expect(html).not.toContain('track-v visible')
  })

  it('oas-tree：JSON data 声明式通道产出节点行快照（含展开子节点）', async () => {
    const html = await renderToString(
      'oas-tree',
      {
        data: JSON.stringify([
          { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
          { key: 'b', label: '节点 B' },
        ]),
        expanded: 'a',
      },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    // 宿主属性保留 data JSON（attribute 通道可被浏览器 upgrade 后重新解析）
    expect(html).toContain('<oas-tree data=')
    // 快照含树行骨架与节点文本
    expect(html).toContain('role="treeitem"')
    expect(html).toContain('节点 A')
    expect(html).toContain('子节点 1')
    // 展开按钮 aria-expanded 同步
    expect(html).toContain('aria-expanded="true"')
  })

  it('oas-select：JSON options 声明式通道产出触发器与下拉选项快照', async () => {
    const html = await renderToString(
      'oas-select',
      {
        options: JSON.stringify([
          { label: '苹果', value: 'apple' },
          { label: '香蕉', value: 'banana' },
          { label: '橙子', value: 'orange' },
        ]),
        value: 'banana',
        placeholder: '请选择',
      },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<style>')
    expect(html).toContain('<oas-select options=')
    expect(html).toContain('value="banana"')
    // 触发器 combobox 角色 + 已选值 label
    expect(html).toContain('role="combobox"')
    expect(html).toContain('香蕉')
    // 下拉选项行（关闭态快照，浏览器 upgrade 后交互展开）
    expect(html).toContain('role="option"')
    expect(html).toContain('苹果')
    expect(html).toContain('橙子')
    // 选中项 aria-selected 同步
    expect(html).toContain('aria-selected="true"')
  })

  it('oas-tree/oas-select：data/options JSON 非法时容错为空态快照，不抛错', async () => {
    const tree = await renderToString('oas-tree', { data: '[{bad', expanded: 'a' }, '', {
      locale: 'zh-CN',
    })
    expect(tree).toContain('<template shadowrootmode="open">')
    expect(tree).not.toContain('role="treeitem"')

    const select = await renderToString('oas-select', { options: 'not-json' }, '', {
      locale: 'zh-CN',
    })
    expect(select).toContain('<template shadowrootmode="open">')
    expect(select).not.toContain('role="option"')
    // 空态：placeholder 兜底（合法 JSON 数组空态）
    expect(select).toContain('请选择')
  })

  it('非白名单 tag 抛错并列出白名单', async () => {
    // 命令式组件（无初始 DOM）不在白名单：message/toast/notification 等动态创建，SSR 无意义
    await expect(renderToString('oas-message')).rejects.toThrow(/非白名单 tag「oas-message」/)
    await expect(renderToString('oas-toast')).rejects.toThrow(/oas-button/)
    await expect(renderToString('oas-notification')).rejects.toThrow(/oas-empty/)
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

  // ---- DSD 批次 1：表单组件白名单化（template/bind/hydrate 拆分 + 数据组件 JSON 通道） ----

  it('oas-input：骨架 + value/placeholder 宿主属性同步', async () => {
    const html = await renderToString('oas-input', { value: 'hello', placeholder: '请输入' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-input value="hello" placeholder="请输入">')
    expect(html).toContain('<input part="input"')
  })

  it('oas-textarea：骨架 + value 同步', async () => {
    const html = await renderToString('oas-textarea', { value: '多行文本', rows: '4' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-textarea value="多行文本" rows="4">')
    expect(html).toContain('<textarea part="textarea"')
  })

  it('oas-checkbox / oas-radio：选中态同步', async () => {
    const cb = await renderToString('oas-checkbox', { checked: '' }, '记住我')
    expect(cb).toContain('<oas-checkbox checked="">')
    expect(cb).toContain('<input part="checkbox"')
    expect(cb).toContain('aria-checked="true"')
    expect(cb).toContain('</template>记住我</oas-checkbox>')

    const rd = await renderToString('oas-radio', { checked: '', value: 'a' }, 'A')
    expect(rd).toContain('<oas-radio checked="" value="a">')
    expect(rd).toContain('<input part="radio"')
    expect(rd).toContain('aria-checked="true"')
  })

  it('oas-checkbox-group / oas-radio-group：fieldset 骨架 + light DOM 子项原样保留', async () => {
    const children =
      '<oas-checkbox value="a">A</oas-checkbox><oas-checkbox value="b">B</oas-checkbox>'
    const cg = await renderToString('oas-checkbox-group', { value: '["a"]' }, children)
    expect(cg).toContain('<template shadowrootmode="open">')
    expect(cg).toContain('<fieldset part="group">')
    expect(cg).toContain('</template>')
    expect(cg).toContain(children)

    const rg = await renderToString(
      'oas-radio-group',
      { value: 'a' },
      '<oas-radio value="a">A</oas-radio>',
    )
    expect(rg).toContain('<oas-radio-group value="a">')
    expect(rg).toContain('<fieldset part="group">')
    expect(rg).toContain('<oas-radio value="a">A</oas-radio>')
  })

  it('oas-switch：checked 同步 aria-checked', async () => {
    const html = await renderToString('oas-switch', { checked: '', size: 'small' }, '')
    expect(html).toContain('<oas-switch')
    expect(html).toContain('checked=""')
    expect(html).toContain('size="small"')
    expect(html).toContain('<button part="switch" role="switch"')
    expect(html).toContain('aria-checked="true"')
  })

  it('oas-slider：range 骨架 + value/min/max 同步', async () => {
    const html = await renderToString('oas-slider', { value: '60', min: '0', max: '100' }, '')
    expect(html).toContain('<oas-slider value="60" min="0" max="100">')
    expect(html).toContain('<input part="track" type="range"')
  })

  it('oas-input-number：数字输入骨架 + value 同步', async () => {
    const html = await renderToString('oas-input-number', { value: '12', min: '0', max: '100' }, '')
    expect(html).toContain('<oas-input-number value="12" min="0" max="100">')
    expect(html).toContain('<input part="input" type="number"')
    expect(html).toContain('part="up"')
    expect(html).toContain('part="down"')
  })

  it('oas-rate：评分骨架 + aria-valuenow 同步 + 星形部件', async () => {
    const html = await renderToString('oas-rate', { value: '4' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('role="slider"')
    expect(html).toContain('aria-valuenow="4"')
    expect(html).toContain('part="star"')
  })

  it('oas-auto-complete：options JSON 通道保留 + 输入骨架', async () => {
    const options = JSON.stringify([
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
    ])
    const html = await renderToString('oas-auto-complete', { options, value: 'apple' }, '')
    expect(html).toContain('<oas-auto-complete options=')
    expect(html).toContain('value="apple"')
    expect(html).toContain('<input part="input" role="combobox"')
    // 下拉关闭态：不含选项行（浏览器 upgrade 后输入才展开）
    expect(html).not.toContain('role="option"')
  })

  it('oas-combobox：options JSON 通道 + 已选值 label 回填输入框', async () => {
    const options = JSON.stringify([
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
    ])
    const html = await renderToString('oas-combobox', { options, value: 'banana' }, '')
    expect(html).toContain('<oas-combobox options=')
    expect(html).toContain('value="banana"')
    expect(html).toContain('role="combobox"')
    // 受控 value 回填 label（触发文案）
    expect(html).toContain('香蕉')
    // 下拉关闭态
    expect(html).not.toContain('role="option"')
  })

  it('oas-cascader：options JSON 通道 + 已选路径 label 展示', async () => {
    const options = JSON.stringify([
      { label: '节点 A', value: 'a', children: [{ label: '子节点 1', value: 'a-1' }] },
      { label: '节点 B', value: 'b' },
    ])
    const html = await renderToString('oas-cascader', { options, value: '["a","a-1"]' }, '')
    expect(html).toContain('<oas-cascader options=')
    expect(html).toContain('节点 A / 子节点 1')
    expect(html).toContain('part="trigger"')
    // 下拉关闭态
    expect(html).not.toContain('part="panel"')
  })

  it('oas-tree-select：options JSON 通道 + 已选节点 label 展示', async () => {
    const options = JSON.stringify([
      { label: '节点 A', value: 'a', children: [{ label: '子节点 1', value: 'a-1' }] },
    ])
    const html = await renderToString('oas-tree-select', { options, value: 'a' }, '')
    expect(html).toContain('<oas-tree-select options=')
    expect(html).toContain('value="a"')
    expect(html).toContain('节点 A')
    expect(html).toContain('part="trigger"')
    // 下拉关闭态
    expect(html).not.toContain('role="treeitem"')
  })

  it('oas-mentions：options JSON 通道 + textarea 骨架 + value 同步', async () => {
    const options = JSON.stringify([
      { label: '张三', value: 'zhangsan' },
      { label: '李四', value: 'lisi' },
    ])
    const html = await renderToString('oas-mentions', { options, value: '你好 @张' }, '')
    expect(html).toContain('<oas-mentions options=')
    expect(html).toContain('<textarea part="textarea"')
    // 提及面板关闭态
    expect(html).not.toContain('part="option"')
  })

  it('oas-date-picker：触发器 value 格式化同步，面板关闭态不进快照', async () => {
    const html = await renderToString('oas-date-picker', { value: '2024-01-15' }, '', {
      locale: 'zh-CN',
    })
    expect(html).toContain('<oas-date-picker value="2024-01-15">')
    expect(html).toContain('part="trigger"')
    expect(html).toContain('2024-01-15')
    // 面板关闭态：不含日历网格
    expect(html).not.toContain('role="grid"')
  })

  it('oas-time-picker：触发器 value 格式化同步，面板关闭态不进快照', async () => {
    const html = await renderToString('oas-time-picker', { value: '12:30:00' }, '', {
      locale: 'zh-CN',
    })
    expect(html).toContain('<oas-time-picker value="12:30:00">')
    expect(html).toContain('part="trigger"')
    expect(html).toContain('12:30:00')
    // 面板关闭态：不含选项行（列容器骨架在模板中，属预期）
    expect(html).not.toContain('role="option"')
  })

  it('oas-calendar：月网格同步入快照（选中日 + 周表头）', async () => {
    const html = await renderToString('oas-calendar', { value: '2024-02-10' }, '', {
      locale: 'zh-CN',
    })
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="grid"')
    expect(html).toContain('role="grid"')
    expect(html).toContain('part="today"')
  })

  it('oas-upload：空态骨架（无文件时占位文案走 locale）', async () => {
    const html = await renderToString('oas-upload', {}, '', { locale: 'zh-CN' })
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="zone"')
    expect(html).toContain('暂无文件')
  })

  it('oas-transfer：data JSON 通道产出左侧面板数据行', async () => {
    const html = await renderToString(
      'oas-transfer',
      {
        data: JSON.stringify([
          { key: 'a', label: '苹果' },
          { key: 'b', label: '香蕉' },
        ]),
      },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<oas-transfer data=')
    expect(html).toContain('part="option"')
    expect(html).toContain('苹果')
    expect(html).toContain('香蕉')
  })

  it('oas-transfer：data 非法 JSON 容错为空态，不抛错', async () => {
    const html = await renderToString('oas-transfer', { data: '[{bad' }, '', { locale: 'zh-CN' })
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).not.toContain('part="option"')
  })

  it('oas-color-picker：触发器色块与 hex 文本同步', async () => {
    const html = await renderToString('oas-color-picker', { value: '#0b6cff' }, '', {
      locale: 'zh-CN',
    })
    expect(html).toContain('<oas-color-picker value="#0b6cff">')
    expect(html).toContain('part="trigger"')
    expect(html).toContain('#0b6cff')
    // 预设色板由 update 同步渲染（确定性），面板本体 display:none 属关闭态
    expect(html).toContain('part="preset"')
  })

  it('oas-toggle-button：pressed 同步 aria-pressed', async () => {
    const html = await renderToString('oas-toggle-button', { pressed: '', value: 'a' }, '白天')
    expect(html).toContain('<oas-toggle-button pressed="" value="a">')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('</template>白天</oas-toggle-button>')
  })

  it('oas-toggle-group：items JSON 通道产出按钮组 + 选中态同步', async () => {
    const items = JSON.stringify([
      { label: '日', value: 'day' },
      { label: '周', value: 'week' },
    ])
    const html = await renderToString('oas-toggle-group', { items, value: 'week' }, '')
    expect(html).toContain('<oas-toggle-group items=')
    expect(html).toContain('value="week"')
    expect(html).toContain('part="item"')
    expect(html).toContain('>日<')
    expect(html).toContain('>周<')
    expect(html).toContain('aria-checked="true"')
  })

  it('oas-pin-input：value 拆格同步到每格输入框', async () => {
    const html = await renderToString('oas-pin-input', { value: '123', length: '4' }, '')
    expect(html).toContain('<oas-pin-input value="123" length="4">')
    expect(html).toContain('part="container"')
    expect(html).toContain('part="cell"')
    // 4 格且值拆到各格
    const cells = html.match(/part="cell"/g)
    expect(cells?.length).toBe(4)
  })

  it('oas-dynamic-input：model-value JSON 通道产出行骨架（内嵌 oas-input）', async () => {
    const html = await renderToString('oas-dynamic-input', { 'model-value': '["a","b"]' }, '')
    expect(html).toContain('<oas-dynamic-input model-value="[&quot;a&quot;,&quot;b&quot;]">')
    expect(html).toContain('part="rows"')
    expect(html).toContain('part="row-input"')
    expect(html).toContain('<oas-input')
    expect(html).toContain('part="add"')
  })

  it('oas-dynamic-tags：model-value JSON 通道产出标签行', async () => {
    const html = await renderToString('oas-dynamic-tags', { 'model-value': '["标签1"]' }, '')
    expect(html).toContain('<oas-dynamic-tags model-value="[&quot;标签1&quot;]">')
    expect(html).toContain('part="tags"')
    expect(html).toContain('part="tag"')
    expect(html).toContain('标签1')
    expect(html).toContain('part="input"')
  })

  it('oas-editable：展示态快照（value 文本同步，编辑态默认隐藏）', async () => {
    const html = await renderToString('oas-editable', { value: '可编辑文本' }, '')
    expect(html).toContain('<oas-editable value="可编辑文本">')
    expect(html).toContain('part="display"')
    expect(html).toContain('可编辑文本')
    // 编辑态容器默认隐藏
    expect(html).toContain('part="edit" hidden')
  })

  it('oas-form：form 骨架 + rules JSON 通道保留', async () => {
    const rules = JSON.stringify({ name: [{ required: true }] })
    const html = await renderToString(
      'oas-form',
      { rules },
      '<oas-form-item label="姓名"></oas-form-item>',
    )
    expect(html).toContain('<oas-form rules=')
    expect(html).toContain('<form part="form"')
    expect(html).toContain('</template><oas-form-item label="姓名"></oas-form-item></oas-form>')
  })

  it('oas-form-item：label 文本同步入快照', async () => {
    const html = await renderToString(
      'oas-form-item',
      { label: '姓名', required: '' },
      '<oas-input></oas-input>',
    )
    expect(html).toContain('<oas-form-item')
    expect(html).toContain('label="姓名"')
    expect(html).toContain('required=""')
    expect(html).toContain('part="label"')
    expect(html).toContain('姓名')
    // 必填星号可见（required 属性时 hidden 移除）
    expect(html).toContain('part="required"')
    expect(html).toContain('>')
    expect(html).toContain('</template><oas-input></oas-input></oas-form-item>')
  })

  it('数据组件非法 JSON 容错：auto-complete / toggle-group / dynamic-tags 空态快照', async () => {
    const ac = await renderToString('oas-auto-complete', { options: 'not-json' }, '')
    expect(ac).toContain('<template shadowrootmode="open">')

    const tg = await renderToString('oas-toggle-group', { items: 'not-json' }, '')
    expect(tg).toContain('<template shadowrootmode="open">')
    expect(tg).not.toContain('part="item"')

    const dt = await renderToString('oas-dynamic-tags', { 'model-value': 'not-json' }, '')
    expect(dt).toContain('<template shadowrootmode="open">')
    expect(dt).not.toContain('part="tag"')
  })

  // ---- DSD 批次 2：反馈组件白名单化（可见态直出快照；命令式组件无初始 DOM 不纳入） ----

  it('oas-alert：box 骨架 + type/title 同步 + closeable 关闭按钮', async () => {
    const html = await renderToString(
      'oas-alert',
      { type: 'warning', title: '提示标题', closeable: '' },
      '这是提示内容',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-alert type="warning" title="提示标题" closeable="">')
    expect(html).toContain('part="box"')
    expect(html).toContain('part="close"')
    // update 增量同步：data-type + title 文本 + 关闭按钮 aria-label（locale）
    expect(html).toContain('data-type="warning"')
    expect(html).toContain('提示标题')
    expect(html).toContain('aria-label="关闭"')
    expect(html).toContain('</template>这是提示内容</oas-alert>')
  })

  it('oas-progress：line 进度条 width + aria-valuenow 同步；circle 圆环几何同步', async () => {
    const line = await renderToString('oas-progress', { percent: '60' }, '')
    expect(line).toContain('<template shadowrootmode="open">')
    expect(line).toContain('<oas-progress percent="60">')
    expect(line).toContain('part="bar"')
    expect(line).toContain('style="width: 60%;"')
    expect(line).toContain('aria-valuenow="60"')
    expect(line).toContain('>60%</div>')

    const circle = await renderToString(
      'oas-progress',
      { type: 'circle', percent: '50', size: '72' },
      '',
    )
    expect(circle).toContain('<oas-progress type="circle" percent="50" size="72">')
    expect(circle).toContain('part="circle"')
    expect(circle).toContain('viewBox="0 0 72 72"')
  })

  it('oas-spin：wrap/mask/indicator 骨架 + data-size 同步', async () => {
    const html = await renderToString('oas-spin', { size: 'large' }, '<div>加载中</div>')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-spin size="large"')
    expect(html).toContain('part="wrap"')
    expect(html).toContain('part="indicator"')
    expect(html).toContain('data-size="large"')
    expect(html).toContain('</template><div>加载中</div></oas-spin>')
  })

  it('oas-skeleton：行/头像/标题部件按属性直出（rows/title/avatar）', async () => {
    const html = await renderToString(
      'oas-skeleton',
      { rows: '4', title: 'title', avatar: 'avatar' },
      '',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-skeleton rows="4" title="title" avatar="avatar">')
    expect(html).toContain('part="block"')
    expect(html).toContain('part="avatar"')
    expect(html).toContain('part="title"')
    expect(html.match(/part="line"/g)?.length).toBe(4)
  })

  it('oas-result：icon 字形 + title/description 文本同步入快照', async () => {
    const html = await renderToString(
      'oas-result',
      { status: 'success', title: '操作成功', description: '你的请求已处理完成' },
      '',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain(
      '<oas-result status="success" title="操作成功" description="你的请求已处理完成">',
    )
    expect(html).toContain('part="icon"')
    expect(html).toContain('data-status="success"')
    expect(html).toContain('操作成功')
    expect(html).toContain('你的请求已处理完成')
  })

  it('oas-backdrop：open 直出可见遮罩（mask 部件），透明/模糊属性透传到宿主', async () => {
    const html = await renderToString('oas-backdrop', { open: '', transparent: '' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-backdrop open="" transparent="">')
    expect(html).toContain('part="mask"')
    // 快照 style 含 transparent/blur 选择器（宿主属性命中样式）
    expect(html).toContain(':host([transparent]) .mask')
  })

  it('oas-modal：默认关闭态为宿主骨架（dialog/header/body/footer 完整，aria-hidden=true）；visible 直出可见弹窗', async () => {
    const closed = await renderToString('oas-modal', { title: '弹窗标题' }, '', { locale: 'zh-CN' })
    expect(closed).toContain('<template shadowrootmode="open">')
    expect(closed).toContain('<oas-modal title="弹窗标题">')
    expect(closed).toContain('part="dialog"')
    expect(closed).toContain('part="title"')
    expect(closed).toContain('part="cancel"')
    expect(closed).toContain('part="ok"')
    expect(closed).toContain('aria-hidden="true"')
    // 按钮文案走 locale（zh-CN）
    expect(closed).toContain('确定')
    expect(closed).toContain('取消')

    const visible = await renderToString('oas-modal', { visible: '', title: '可见弹窗' }, '', {
      locale: 'zh-CN',
    })
    expect(visible).toContain('<oas-modal visible="" title="可见弹窗">')
    expect(visible).toContain('aria-hidden="false"')
    expect(visible).toContain('可见弹窗')
  })

  it('oas-drawer：panel 骨架 + title/placement 同步', async () => {
    const html = await renderToString(
      'oas-drawer',
      { visible: '', title: '筛选', placement: 'left' },
      '',
      {
        locale: 'zh-CN',
      },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-drawer visible="" title="筛选" placement="left">')
    expect(html).toContain('part="panel"')
    expect(html).toContain('data-placement="left"')
    expect(html).toContain('筛选')
    expect(html).toContain('aria-hidden="false"')
  })

  it('oas-popconfirm：触发 slot 原样保留 + 气泡骨架（默认关闭态 aria-hidden=true）', async () => {
    const html = await renderToString(
      'oas-popconfirm',
      { title: '确认删除？' },
      '<button>删除</button>',
      {
        locale: 'zh-CN',
      },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-popconfirm title="确认删除？">')
    expect(html).toContain('part="popover"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('part="ok"')
    expect(html).toContain('确认删除？')
    // 操作按钮文案走 locale（zh-CN）
    expect(html).toContain('确定')
    expect(html).toContain('取消')
    expect(html).toContain('</template><button>删除</button></oas-popconfirm>')
  })

  it('命令式反馈组件无初始 DOM 不 SSR：message/toast/notification/snackbar/loading-bar/confirm 均不在白名单', async () => {
    for (const tag of [
      'oas-message',
      'oas-toast',
      'oas-notification',
      'oas-snackbar',
      'oas-loading-bar',
    ]) {
      await expect(renderToString(tag)).rejects.toThrow(/非白名单 tag/)
    }
    // confirm 无独立 tag（命令式 API 动态创建 oas-modal），oas-modal 在白名单
    const modal = await renderToString('oas-modal', {}, '')
    expect(modal).toContain('<template shadowrootmode="open">')
  })

  // ---- DSD 批次 3：数据展示组件白名单化（纯展示直出快照；动态组件初始帧；virtual-list 首屏窗口） ----

  it('oas-card：title 同步入快照 + 宿主属性保留', async () => {
    const html = await renderToString('oas-card', { title: '卡片标题', hoverable: '' }, '卡片内容')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-card title="卡片标题" hoverable="">')
    expect(html).toContain('part="card"')
    expect(html).toContain('卡片标题')
    expect(html).toContain('</template>卡片内容</oas-card>')
  })

  it('oas-avatar：src 模式直出 img 骨架，size 落到宿主 inline 样式', async () => {
    const html = await renderToString('oas-avatar', { src: '/a.png', size: '48' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<oas-avatar src="/a.png" size="48"')
    expect(html).toContain('<img part="image"')
    expect(html).toContain('style="width: 48px; height: 48px;')
    // 无 src 时文本占位分支
    const text = await renderToString('oas-avatar', { size: '32' }, '张')
    expect(text).toContain('part="text"')
  })

  it('oas-qrcode：纯计算 SVG path 直出（viewBox 与 width/height 同步）', async () => {
    const html = await renderToString('oas-qrcode', { value: 'HELLO', size: '128' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="0 0 21 21"')
    expect(html).toContain('width="128"')
    expect(html).toContain('<path d="M')
  })

  it('oas-watermark：文字水印 data-uri SVG 直出（textTileDataUri 确定性）', async () => {
    const html = await renderToString('oas-watermark', { text: '内部资料' }, '正文内容')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="watermark"')
    expect(html).toContain('data:image/svg+xml')
    expect(html).toContain('内部资料')
    expect(html).toContain('</template>正文内容</oas-watermark>')
  })

  it('oas-collapse：group 骨架 + light DOM 面板原样保留（open 态由浏览器端 update 按 active 写入）', async () => {
    const items = '<oas-collapse-item name="a" header="面板一">内容一</oas-collapse-item>'
    const html = await renderToString('oas-collapse', { active: 'a' }, items)
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="group"')
    // 宿主 active 属性保留（浏览器 upgrade 后据此展开面板）
    expect(html).toContain('<oas-collapse active="a">')
    // light DOM 面板原样保留（open 属性由客户端 update 写入）
    expect(html).toContain(items)
  })

  it('oas-collapse-item：header 文本同步入快照', async () => {
    const html = await renderToString('oas-collapse-item', { header: '面板一', open: '' }, '内容一')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="head"')
    expect(html).toContain('面板一')
    expect(html).toContain('</template>内容一</oas-collapse-item>')
  })

  it('oas-descriptions / oas-descriptions-item：title/label 文本同步入快照', async () => {
    const desc = await renderToString('oas-descriptions', { title: '基本信息' }, '')
    expect(desc).toContain('<template shadowrootmode="open">')
    expect(desc).toContain('part="items"')
    expect(desc).toContain('基本信息')

    const item = await renderToString('oas-descriptions-item', { label: '姓名' }, '张三')
    expect(item).toContain('part="label"')
    expect(item).toContain('姓名')
    expect(item).toContain('</template>张三</oas-descriptions-item>')
  })

  it('oas-timeline：light DOM 面板克隆为时间线行快照', async () => {
    const html = await renderToString(
      'oas-timeline',
      {},
      '<oas-timeline-item time="2024-01-01"><p>事件一</p></oas-timeline-item>',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="timeline"')
    expect(html).toContain('part="item"')
    expect(html).toContain('2024-01-01')
    expect(html).toContain('事件一')
  })

  it('oas-list：list 骨架 + 属性 data-bordered/split 同步（无 bordered 时默认 split）', async () => {
    const html = await renderToString('oas-list', { bordered: '' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="list"')
    expect(html).toContain('data-bordered="true"')
    // bordered 存在且未显式 split → split=false
    expect(html).toContain('data-split="false"')

    const split = await renderToString('oas-list', {}, '')
    expect(split).toContain('data-split="true"')
  })

  it('oas-carousel：初始帧快照（transform 按 index 同步 + 指示器行）', async () => {
    const slides = '<div>一</div><div>二</div>'
    const html = await renderToString('oas-carousel', { index: '1' }, slides)
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="track"')
    expect(html).toContain('style="transform: translateX(-100%);"')
    expect(html).toContain('part="dot"')
    // 指示器 aria-current 同步
    expect(html).toContain('aria-current="false"')
    expect(html).toContain('aria-current="true"')
  })

  it('oas-statistic：value 按 locale 格式化入快照 + prefix/suffix 文本', async () => {
    const html = await renderToString(
      'oas-statistic',
      { value: '12345', prefix: '¥', suffix: '元' },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="value"')
    expect(html).toContain('12,345')
    expect(html).toContain('¥')
    expect(html).toContain('元')
  })

  it('oas-countdown：初始值直出（value 单位为毫秒，formatDuration 确定性）', async () => {
    const html = await renderToString('oas-countdown', { value: '3600000', format: 'HH:mm:ss' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="display"')
    expect(html).toContain('01:00:00')
  })

  it('oas-chart：data JSON 通道产出 SVG 图形快照（同步确定性渲染，非 canvas）', async () => {
    const data = JSON.stringify([
      { label: '一月', value: 120 },
      { label: '二月', value: 200 },
    ])
    const html = await renderToString('oas-chart', { type: 'bar', data }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('<svg')
    expect(html).toContain('part="chart"')
    expect(html).toContain('<rect class="bar')
  })

  it('oas-code：正则高亮同步直出（token span + 行号），copyable 默认显示复制按钮', async () => {
    const html = await renderToString(
      'oas-code',
      { code: 'const a = 1', language: 'js', 'show-line-number': '' },
      '',
      { locale: 'zh-CN' },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="block"')
    expect(html).toContain('<span class="line"')
    expect(html).toContain('<span class="tok-keyword">const</span>')
    expect(html).toContain('part="copy"')
    expect(html).toContain('复制')
  })

  it('oas-equation：LaTeX 子集同步渲染为 HTML（sup/sub/frac 结构）', async () => {
    const html = await renderToString('oas-equation', { code: 'x^2 + \\frac{1}{2}' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="equation"')
    expect(html).toContain('class="sup"')
    expect(html).toContain('class="frac"')
  })

  it('oas-log：lines JSON 通道产出日志行快照 + 空态默认文案走 locale', async () => {
    const html = await renderToString(
      'oas-log',
      { lines: '["第一行","第二行"]', 'line-number': '' },
      '',
      {
        locale: 'zh-CN',
      },
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="row"')
    expect(html).toContain('第一行')
    expect(html).toContain('第二行')
    // 行号栏开启
    expect(html).toContain('data-line-number="true"')

    const empty = await renderToString('oas-log', {}, '', { locale: 'zh-CN' })
    expect(empty).toContain('暂无日志')
  })

  it('oas-masonry：columns/gap 落到内联样式（column-count/column-gap）', async () => {
    const html = await renderToString('oas-masonry', { columns: '3', gap: '12' }, '<div>卡一</div>')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="masonry"')
    expect(html).toContain('column-count: 3')
    expect(html).toContain('column-gap: 12px')
  })

  it('oas-comment：命名插槽有内容时对应区块可见（hidden 移除）', async () => {
    const html = await renderToString(
      'oas-comment',
      {},
      '<span slot="author">张三</span><div slot="content">评论内容</div>',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="comment"')
    // author/content 区块可见、avatar/time 区块隐藏
    expect(html).toContain('<div class="avatar" part="avatar" hidden')
    expect(html).not.toContain('part="author" hidden')
    expect(html).toContain('part="content"')
  })

  it('oas-marquee：内容克隆组直出（无缝循环双组结构）', async () => {
    const html = await renderToString('oas-marquee', { speed: '10' }, '<span>公告内容</span>')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="track"')
    expect(html).toContain('class="group clone"')
    expect(html).toContain('公告内容')
  })

  it('oas-number-animation：duration=0 直出目标值（无动画）', async () => {
    const html = await renderToString('oas-number-animation', { value: '9527', duration: '0' }, '')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="value"')
    expect(html).toContain('9527')
  })

  it('oas-gradient-text：渐变 JSON 白名单校验后写内联样式', async () => {
    const html = await renderToString(
      'oas-gradient-text',
      { gradient: '["#ff0000","#0000ff"]' },
      '渐变文字',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('linear-gradient(to right, #ff0000, #0000ff)')
    expect(html).toContain('</template>渐变文字</oas-gradient-text>')
  })

  it('oas-aspect-ratio：ratio 归一化写入宿主 aspect-ratio', async () => {
    const html = await renderToString('oas-aspect-ratio', { ratio: '16/9' }, '<img src="/a.png">')
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="content"')
    expect(html).toContain('aspect-ratio: 16 / 9')
  })

  it('oas-virtual-list：items JSON 通道产出首屏窗口行 + padding 占位（scrollTop=0 窗口）', async () => {
    const items = JSON.stringify(Array.from({ length: 100 }, (_, i) => `项${i}`))
    const html = await renderToString(
      'oas-virtual-list',
      { height: '100', 'item-height': '20', items },
      '',
    )
    expect(html).toContain('<template shadowrootmode="open">')
    expect(html).toContain('part="viewport"')
    // 窗口 = ceil(100/20)+buffer4 = 9 项（可见 5 + 上下各 4）
    expect(html.match(/part="item"/g)?.length).toBe(9)
    expect(html).toContain('项0')
    expect(html).toContain('项8')
    // 底部 padding 撑满剩余高度（(100-9)*20=1820px）
    expect(html).toContain('height: 1820px')
    // 首屏窗口不含越界项（无 data-index=9 及以上）
    expect(html).not.toContain('data-index="9"')
  })

  it('数据展示组件非法 JSON 容错：chart/log/virtual-list 空态快照', async () => {
    const chart = await renderToString('oas-chart', { data: '[{bad json' }, '', { locale: 'zh-CN' })
    expect(chart).toContain('<template shadowrootmode="open">')
    expect(chart).toContain('暂无数据')

    const log = await renderToString('oas-log', { lines: 'not-json' }, '', { locale: 'zh-CN' })
    expect(log).toContain('暂无日志')

    const vl = await renderToString('oas-virtual-list', { items: 'not-json' }, '')
    expect(vl).toContain('<template shadowrootmode="open">')
    expect(vl).not.toContain('part="item"')
  })
})
