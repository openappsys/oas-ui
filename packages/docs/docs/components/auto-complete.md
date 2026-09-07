# AutoComplete 自动完成

输入即推荐：**值是自由文本**（浏览器地址栏 / datalist 心智），建议列表只辅助输入，支持键盘选择、分组、防抖远程建议、自定义渲染。

> **与 Select(searchable) / Combobox 的边界**
>
> | 组件 | 值的来源 | 输入框形态 | 适用场景 |
> | --- | --- | --- | --- |
> | `oas-auto-complete` | **任意自由文本**，建议只是快捷方式 | 输入框即控件 | 搜索框联想、邮箱补全、标签自由输入 |
> | `oas-select searchable` | 必须来自选项集合 | 按钮触发，展开后才出现搜索框 | 收敛选择（值必须合法） |
> | `oas-combobox` | 必须来自选项集合 | 输入框即控件，输入仅过滤 | 常显输入框形态的收敛选择 |
>
> 需要值必须 ∈ 选项时用 select(searchable) 或 combobox，不要试图给 auto-complete 加「严格校验」；多选/标签场景用 `oas-select multiple` 或 `oas-dynamic-tags`，auto-complete 保持单值自由文本。

## 基础用法

<DemoBlock title="基础用法">
  <oas-auto-complete placeholder="输入「苹」试试" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-auto-complete>
</DemoBlock>

输入关键字会在下拉中自动过滤匹配项；首项默认高亮，`Enter` 直达首项；`↑`/`↓` 移动高亮、`Esc` 关闭；**失焦不清空输入**（自由文本不回退）。

## 预设值

<DemoBlock title="预设值（value）">
  <oas-auto-complete value="苹果" placeholder="已选中的值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-auto-complete id="ac-clear" clearable value="苹果" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

输入框有内容时显示清空按钮，点击清空输入并派发 `oas-clear` 与 `oas-change`（空值）。

## 远程建议（debounce + loading）

<DemoBlock title="远程搜索建议">
  <oas-auto-complete id="ac-remote" debounce="300" clearable placeholder="输入水果名（模拟远程请求）" options='[]'></oas-auto-complete>
  <span id="ac-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`debounce`（毫秒，默认 `0` 不防抖）只防抖 `oas-input` 派发与过滤触发，**输入回显不被防抖**；宿主在 `oas-input` 里请求期间置 `loading`，下拉显示「加载中…」占位，回填 `options` 后即展示。

## 聚焦即展示（trigger-on-focus）

<DemoBlock title="聚焦展示全部建议（trigger-on-focus）">
  <oas-auto-complete trigger-on-focus placeholder="聚焦即展示全部建议" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

默认**关闭**（聚焦空输入弹全量建议对紧凑表单是打扰）；显式开启后走 datalist 心智：聚焦即按当前输入过滤展示建议。

## 分组建议

<DemoBlock title="分组（group）">
  <oas-auto-complete placeholder="输入关键词" options='[{"group":"最近搜索","label":"苹果 手机","value":"iphone"},{"group":"最近搜索","label":"苹果 观察","value":"watch"},{"group":"热门搜索","label":"香蕉 牛奶","value":"banana-milk"},{"group":"热门搜索","label":"橙色 橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

选项带 `group` 字段时按组渲染组标题（不可选），组内选项缩进；键盘 `↑`/`↓` 跨组连续导航。

## 自定义选项渲染

<DemoBlock title="自定义选项（oas-option-render 事件）">
  <oas-auto-complete id="ac-render" placeholder="输入试试（富建议项）" options='[{"label":"张伟","value":"zhangwei"},{"label":"王芳","value":"wangfang"},{"label":"李娜","value":"lina"}]'></oas-auto-complete>
</DemoBlock>

<DemoBlock title="自定义选项（template 插槽）">
  <oas-auto-complete id="ac-tpl" placeholder="输入试试（模板骨架）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'>
    <template slot="option"><span>水果：</span><span data-option-label></span></template>
  </oas-auto-complete>
</DemoBlock>

双通道与 `oas-select` 一致：监听 `oas-option-render`（`detail.element` 为文本容器，宿主可改写为图标/富文本）；或在组件内放 `<template slot="option">` 提供静态骨架，`[data-option-label]` 节点自动绑定选项文本。

## 面板插槽（header / footer / empty）

<DemoBlock title="面板头尾与空态插槽">
  <oas-auto-complete id="ac-slots" placeholder="输入「梨」试试（自定义空态）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'>
    <span slot="header">输入提示：试试水果名</span>
    <span slot="footer">查看全部水果 →</span>
    <span slot="empty">换个关键词试试</span>
  </oas-auto-complete>
</DemoBlock>

`header` / `footer` 插槽渲染建议面板头尾（「输入试试 xx」提示条、「查看全部」链接）；`empty` 插槽替换默认「无匹配结果」空态文案。

## 尺寸与校验态

<DemoBlock title="尺寸（size）">
  <oas-space size="small" direction="vertical">
    <oas-auto-complete size="small" placeholder="small" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete placeholder="medium（默认）" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete size="large" placeholder="large" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
  </oas-space>
</DemoBlock>

<DemoBlock title="校验态（status）">
  <oas-space size="small">
    <oas-auto-complete status="success" value="苹果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete status="warning" value="未知水果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete status="error" value="未知水果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
  </oas-space>
</DemoBlock>

`size` 支持 `small / medium / large`（就近跟随 `oas-config-provider` 的 `size` 注入）；`status` 支持 `success / warning / error`（`error` 同步 `aria-invalid`，可被 `oas-form-item` 校验态驱动）。

## 只读

<DemoBlock title="只读（readonly）">
  <oas-auto-complete readonly value="苹果" placeholder="只读" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-auto-complete>
</DemoBlock>

`readonly` 可聚焦可复制、不可输入，聚焦与键盘不再展开建议。

## 中文输入法（IME）

输入法组合期间（拼音候选确认前）组件**不触发过滤、不派发 `oas-input`、回车不误选建议**；组合结束后以最终文本补发一次。本页所有 demo 直接用中文输入即可感知，无需额外配置。

## 禁用

<DemoBlock title="禁用">
  <oas-auto-complete disabled placeholder="不可输入" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
</DemoBlock>

## 无匹配结果

<DemoBlock title="空态">
  <oas-auto-complete placeholder="输入「梨」试试（无匹配）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## 事件

<DemoBlock title="输入与选中事件">
  <oas-auto-complete id="ac-event" clearable placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
  <span id="ac-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

监听 `oas-input`（输入中，防抖后）、`oas-change`（选中或清空）、`oas-clear`（清空）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ac-event')
  const out = document.getElementById('ac-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))

  // 远程建议 demo：模拟宿主请求（300ms 防抖已由组件承担，宿主只管请求与回填）
  const remote = document.getElementById('ac-remote')
  const remoteOut = document.getElementById('ac-remote-output')
  const ALL = ['苹果', '香蕉', '橙子', '草莓', '西瓜', '葡萄', '芒果'].map((label, i) => ({
    label,
    value: `v${i}`,
  }))
  let timer = 0
  remote?.addEventListener('oas-input', (e) => {
    const q = e.detail.value
    window.clearTimeout(timer)
    remote.setAttribute('loading', '')
    remoteOut.textContent = `请求中：${q}`
    timer = window.setTimeout(() => {
      remote.removeAttribute('loading')
      remote.setAttribute('options', JSON.stringify(ALL.filter((o) => o.label.includes(q))))
      remoteOut.textContent = `已回填 ${q ? '匹配' : '全量'}建议`
    }, 500)
  })

  // 富建议项 demo：oas-option-render 改写 element（姓名 + 邮箱两行）
  const render = document.getElementById('ac-render')
  const EMAILS = { zhangwei: 'zhangwei@example.com', wangfang: 'wangfang@example.com', lina: 'lina@example.com' }
  render?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    if (!element) return
    element.textContent = ''
    const name = document.createElement('div')
    name.textContent = option.label
    const mail = document.createElement('div')
    mail.textContent = EMAILS[option.value] ?? ''
    mail.style.fontSize = 'var(--oas-font-size-xs)'
    mail.style.color = 'var(--oas-color-text-secondary)'
    element.append(name, mail)
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 可清空（输入有内容时显示清空按钮，清空派发 `oas-clear` 与空值 `oas-change`） | `boolean` | — |
| `debounce` | 输入防抖（毫秒，默认 0 不防抖）：只防抖 `oas-input` 派发与过滤触发，不防抖输入回显 | `string` | `0` |
| `disabled` | 禁用 | `boolean` | — |
| `loading` | 加载占位（下拉显示「加载中…」，远程建议请求态） | `boolean` | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled?, group? }]`（group 为分组标题） | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | `string` | — |
| `readonly` | 只读（可聚焦可复制不可输入，聚焦与键盘不展开建议） | `boolean` | — |
| `size` | 尺寸档位：small / medium / large（默认 medium，就近跟随 config-provider 注入） | `string` | `medium` |
| `status` | 校验态：success / warning / error（error 同步 aria-invalid，可被 oas-form-item 校验驱动） | `string` | — |
| `trigger-on-focus` | 聚焦即展示建议（datalist 心智；默认关闭，维持「输入优先」现状） | `boolean` | — |
| `value` | 预设值 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中或清空，`detail: { value, label }` |
| `oas-clear` | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-input` | 输入中（防抖后），`detail: { value }` |
| `oas-option-render` | 每个选项行渲染后派发，`detail: { index, option, element }`，宿主可改写 `element`（图标/富文本） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `empty` | 自定义无匹配空态（替换默认文案） |
| `footer` | 建议面板底部内容（如「查看全部」链接） |
| `header` | 建议面板头部内容（如「输入试试 xx」提示条） |
| `template[slot="option"]` | 自定义选项模板骨架，`[data-option-label]` 节点自动绑定选项文本 |

键盘：`↑`/`↓` 移动（循环），`Enter` 选中高亮项（首项默认高亮），`Esc` 关闭。
