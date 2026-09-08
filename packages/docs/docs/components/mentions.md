# Mentions 提及

输入 `@`（或 `#` 等）触发建议浮层的提及输入组件，适合 @成员 / @任务 / 评论发布等场景。

## 基础用法

<DemoBlock title="基础用法">
  <oas-mentions style="width: 320px" placeholder="输入 @ 提及成员" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"},{"label":"赵六","value":"zhaoliu"}]'></oas-mentions>
</DemoBlock>

输入 `@` 后弹出建议列表：`↑`/`↓` 选择、`Enter` 插入（选中项并入文本）、`Esc` 或点击外部关闭。

## 关键词过滤

<DemoBlock title="关键词过滤">
  <oas-mentions style="width: 320px" placeholder="输入 @zh 或 @zhangsan 等关键词过滤" options='[{"label":"张三","value":"zhangsan"},{"label":"张伟","value":"zhangwei"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"}]'></oas-mentions>
</DemoBlock>

`@` 后继续输入即过滤：**默认按 label 或 value 小写模糊匹配**（`@zhangsan` 也能命中「张三」）；无匹配时显示空态「无匹配提及」。自定义过滤可挂 `el.filterOption(query, option)` 函数（JS property 通道）。

## 中文正文直接触发

<DemoBlock title="中文正文紧贴 @ 触发">
  <oas-mentions style="width: 320px" placeholder="直接输入中文后打 @ 试试（无需空格）" options='[{"label":"张三","value":"zhangsan"},{"label":"张伟","value":"zhangwei"},{"label":"李四","value":"lisi"}]'></oas-mentions>
</DemoBlock>

**无需在 `@` 前加空格**：「大家好@张」在中文正文里紧贴即可触发（从光标倒走至空格/换行即断界）；但关键词段内含空格/换行会截断不触发。中文输入法组合期间（拼音候选未确认）`Enter`/`↑↓` 不会误选中或误换行，组合确认后再弹层。

## prefix 多触发符（@/# 分流）

<DemoBlock title="prefix 数组（@ 成员 / # 任务）">
  <oas-mentions prefix='["@","#"]' style="width: 320px" placeholder="@ 成员、# 任务可同时触发" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"},{"label":"需求评审","value":"req-review"},{"label":"编码实现","value":"impl"},{"label":"测试验收","value":"qa"}]'></oas-mentions>
</DemoBlock>

`prefix` 默认 `@`，支持单字符串或 JSON 数组 `["@","#"]` 并存。`oas-search`/`oas-select` 的 detail 带命中 `prefix`，宿主可据此把不同触发符分流到各自数据源。

## 异步建议（oas-search + loading）

<DemoBlock title="远端搜索（模拟请求）">
  <oas-mentions id="mention-async" prefix='["@","#"]' style="width: 320px" placeholder="输入 @ 找人 / # 找任务" options='[]'></oas-mentions>
  <span id="mention-async-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

命中 `@`/`#` 或关键词变化即派发 `oas-search`（detail `{ query, prefix }`，即时派发不防抖——宿主自行防抖）。宿主请求期间置 `loading`，面板显示「加载中…」；回填 `options` 后即展示。光标在词内移动不重复派发，重新触发/关键词变化才再派发。

## 自定义选项渲染（头像富选项）

<DemoBlock title="富选项渲染（oas-option-render）">
  <oas-mentions id="mention-render" style="width: 320px" placeholder="输入 @ 试试（头像+姓名+部门）" options='[{"label":"张伟","value":"zhangwei","dept":"前端组"},{"label":"王芳","value":"wangfang","dept":"设计组"},{"label":"李娜","value":"lina","dept":"后端组"}]'></oas-mentions>
</DemoBlock>

每个选项行渲染后派发 `oas-option-render`（detail `{ index, option, element }`），`element` 为选项文本容器，宿主可改写为头像/两行富内容；`option` 携带 options 里的全部扩展字段。也可以放 `<template slot="option">` 提供静态骨架，`[data-option-label]` 节点自动绑定选项文本。

## 禁用选项

<DemoBlock title="禁用项（可见不可选）">
  <oas-mentions style="width: 320px" placeholder="输入 @ 查看离职成员置灰" options='[{"label":"张三","value":"zhangsan"},{"label":"李四（已离职）","value":"lisi","disabled":true},{"label":"王五","value":"wangwu"}]'></oas-mentions>
</DemoBlock>

options 项带 `disabled: true` 时仍展示但置灰不可选：`↑↓`/Home/End 键盘导航跳过、点击忽略、`aria-disabled` 同步；全部禁用时 `Enter` 只关闭浮层不误插。

## 可清空（clearable）

<DemoBlock title="可清空">
  <oas-mentions id="mention-clear" clearable value="今天 @张三 完成提测" style="width: 320px" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
</DemoBlock>

## 面板方向与分隔符（placement / split）

<DemoBlock title="placement + split">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions placement="top" placeholder="面板向上展开" style="width: 320px" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
    <oas-mentions split="、" value="@张三、@李四 都已通知" style="width: 320px" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

文本非空且未禁用/只读时右上角显示清空按钮，点击清空文本并派发 `oas-clear`（detail 为清空前的值）与空值 `oas-change`。

## 自动增高（autosize）

<DemoBlock title="评论发布框（autosize + max-rows）">
  <oas-mentions autosize min-rows="2" max-rows="6" style="width: 320px" placeholder="多行评论自动增高，超 6 行出滚动条" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
</DemoBlock>

`autosize` 下高度随内容在 `min-rows`（默认 1）与 `max-rows`（默认 6，显式 `"0"` 不封顶）间自适应，超出上限出滚动条。`min-rows="2"` 常配评论场景留出首行高度。

## 尺寸 / 形态 / 校验态 / 只读

<DemoBlock title="尺寸（size）">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions size="small" placeholder="small" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions placeholder="medium（默认）" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions size="large" placeholder="large" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`size` 支持 `small / medium / large`（就近跟随 `oas-config-provider` 的 `size` 注入）。

<DemoBlock title="形态（variant）">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions variant="filled" placeholder="filled（填充）" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions variant="borderless" placeholder="borderless（无边框）" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

<DemoBlock title="校验态（status）">
  <oas-space size="small">
    <oas-mentions status="success" value="今天 @张三 提测" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions status="warning" value="提醒：只 @了 1 人" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions status="error" value="@李四 不在项目中" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`status` 支持 `success / warning / error`：`error` 联动 combobox 的 `aria-invalid`，也可由 `oas-form-item`/`oas-form` 校验态驱动（宿主 `aria-invalid` 自动镜像到输入框）。

<DemoBlock title="只读 / 禁用">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions readonly value="今天 @张三 完成提测（只读回显）" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
    <oas-mentions disabled value="禁用的提及输入" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`readonly` 可聚焦可复制、不可输入且不触发提及浮层；`disabled` 灰化不可交互。

## 面板插槽（header / footer / empty）

<DemoBlock title="面板头尾与空态插槽">
  <oas-mentions id="mention-slots" style="width: 320px" placeholder="输入 @zzz 试试空态插槽" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'>
    <span slot="header">提示：输入 @ 提及成员</span>
    <span slot="footer">共 2 位成员 · 右键 @ 更多</span>
    <span slot="empty">换个关键词，或输入 @ 查看全部</span>
  </oas-mentions>
</DemoBlock>

`header` / `footer` 插槽渲染面板头尾（提示条/统计信息）；`empty` 插槽替换默认「无匹配提及」空态。`split` 属性（默认空格）控制扫描断界与插入补位所用的分隔符，需逗号等分隔时可换。

## 触发后删除说明

提及成员以纯文本写入，`Backspace` 逐字符删除（含空格的长成员名需多按几次，可用撤销恢复）；建议浮层开启时 `Home`/`End` 跳到建议首尾、`↑`/`↓` 循环移动（跳过禁用项）。

## 事件

<DemoBlock title="事件反馈">
  <oas-mentions id="mention-event" clearable style="width: 320px" placeholder="输入 @ 选择，观察事件" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"}]'></oas-mentions>
  <span id="mention-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

`oas-select` 的 detail 为 `{ value, label, option, prefix }`——`option` 是完整选项原对象（含扩展字段），宿主无需再反查 id：

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-mentions id="mention-label" label="会议参与人" style="width: 320px" placeholder="输入 @ 提及成员" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
  <span id="mention-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`label` 作为输入框（combobox）的可访问名称（`aria-label`）：设置后读屏朗读该名称；未设置时依次回退 `placeholder` → 内置文案「提及输入框」。

## 受控值

<DemoBlock title="value（受控）">
  <oas-mentions value="今天 @张三 完成了提测" style="width: 320px" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
</DemoBlock>

`value` 属性为受控通道，外部修改即时同步到文本域；输入期间外部 `options`/`loading` 等属性变化不会覆盖正在编辑的草稿。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 事件反馈 demo：监听全部 oas-* 事件，输出到最后触发者
  const el = document.getElementById('mention-event')
  const out = document.getElementById('mention-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  if (el) {
    for (const name of ['input', 'change', 'select', 'clear', 'search', 'focus', 'blur']) {
      el.addEventListener(`oas-${name}`, (e) => set(`oas-${name}`, e))
    }
  }

  // 异步建议 demo：监听 oas-search 按 prefix 分流模拟远端请求（组件不防抖，宿主自行防抖）
  const asyncEl = document.getElementById('mention-async')
  const asyncOut = document.getElementById('mention-async-output')
  const MEMBERS = [
    { label: '张三', value: 'zhangsan' },
    { label: '张伟', value: 'zhangwei' },
    { label: '李四', value: 'lisi' },
    { label: '王五', value: 'wangwu' },
  ]
  const TAGS = [
    { label: '需求评审', value: 'req-review' },
    { label: '编码实现', value: 'impl' },
    { label: '测试验收', value: 'qa' },
  ]
  let timer = 0
  asyncEl?.addEventListener('oas-search', (e) => {
    const { query, prefix } = e.detail
    const pool = prefix === '#' ? TAGS : MEMBERS
    const matched = pool.filter((o) => o.label.includes(query) || o.value.includes(query))
    window.clearTimeout(timer)
    asyncEl.setAttribute('loading', '')
    asyncOut.textContent = `${prefix}「${query}」请求中…`
    timer = window.setTimeout(() => {
      asyncEl.removeAttribute('loading')
      asyncEl.setAttribute('options', JSON.stringify(matched))
      asyncOut.textContent = `${prefix}「${query}」：返回 ${matched.length} 条`
    }, 400)
  })

  // 富选项渲染 demo：oas-option-render 改写 element（头像 + 姓名 + 部门两行）
  const renderEl = document.getElementById('mention-render')
  renderEl?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    if (!element) return
    element.textContent = ''
    const inner = document.createElement('span')
    inner.style.display = 'inline-flex'
    inner.style.alignItems = 'center'
    inner.style.gap = 'var(--oas-space-2)'
    const avatar = document.createElement('span')
    avatar.textContent = String(option.label).charAt(0)
    avatar.style.width = '20px'
    avatar.style.height = '20px'
    avatar.style.borderRadius = '50%'
    avatar.style.background = 'var(--oas-color-bg-hover)'
    avatar.style.display = 'inline-flex'
    avatar.style.alignItems = 'center'
    avatar.style.justifyContent = 'center'
    avatar.style.fontSize = 'var(--oas-font-size-xs)'
    avatar.style.flexShrink = '0'
    const main = document.createElement('span')
    main.style.display = 'inline-block'
    main.style.lineHeight = '1.3'
    const name = document.createElement('div')
    name.textContent = option.label
    const dept = document.createElement('div')
    dept.textContent = option.dept ?? ''
    dept.style.fontSize = 'var(--oas-font-size-xs)'
    dept.style.color = 'var(--oas-color-text-secondary)'
    main.append(name, dept)
    inner.append(avatar, main)
    element.appendChild(inner)
  })

  // label（可访问名称）demo：等组件升级后读取内层 textarea 的 aria-label
  const mLabel = document.getElementById('mention-label')
  const mLabelOut = document.getElementById('mention-label-output')
  const readMLabel = () => {
    const a = mLabel?.shadowRoot?.querySelector('textarea')?.getAttribute('aria-label')
    if (a !== undefined) {
      mLabelOut.textContent = `aria-label：${a}`
    } else {
      setTimeout(readMLabel, 60)
    }
  }
  readMLabel()
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `autosize` | 自适应高度（配 min-rows/max-rows） | `boolean` | — |
| `clearable` | 清空按钮（清空全部内容并派 oas-clear） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `label` | 可访问名称（默认走内置文案） | — | — |
| `loading` | 建议面板加载态（远程搜索时；配 oas-search 使用） | `boolean` | — |
| `max-rows` | 最大行数（autosize 下生效；`"0"` 不封顶） | `string` | — |
| `min-rows` | 最小行数（autosize 下生效） | `string` | `1` |
| `options` | 选项，JSON 数组 `[{ label, value }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | `string` | — |
| `placement` | 建议面板方向：`auto`（默认）/ `top` / `bottom` | `string` | `auto` |
| `prefix` | 触发前缀 | `string \| string[]` | `@` |
| `readonly` | 只读（可聚焦可读，不弹建议面板） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `split` | 提及项与后文的分隔符（默认空格；后文已分隔则不重复补） | `string` | ` ` |
| `status` | 校验态：`error` / `warning` / `success` | `string` | — |
| `value` | 值（受控，完整文本） | `string` | — |
| `variant` | 形态：`outlined`（默认）/ `filled` / `borderless` | `string` | `outlined` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 失焦时派发，`detail: { value: this.ta.value }` |
| `oas-change` | 插入后文本变化，`detail: { value }`（完整文本） |
| `oas-clear` | 清空时派发，`detail: { value }`（清空前值） |
| `oas-focus` | 聚焦时派发，`detail: { value: t.value }` |
| `oas-input` | 输入时派发（IME 组合期不派发），`detail: { value }` |
| `oas-option-render` | 选项渲染时派发（富选项通道），`detail: { index, option, element }` |
| `oas-search` | 触发符扫描到待选时派发（远程搜索钩子），`detail: { query, prefix }` |
| `oas-select` | 选中建议项，`detail: { value, label }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `footer` | 建议面板底部内容 |
| `header` | 建议面板顶部内容 |
| `template[slot="option"]` | 自定义选项模板（`[data-option-label]` 绑定） |
