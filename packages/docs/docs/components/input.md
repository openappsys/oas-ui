# Input 输入框

原生 `<input>` 增强的基础输入组件。

## 基础用法

<DemoBlock title="基础用法">
  <oas-input placeholder="请输入内容" style="width: 240px"></oas-input>
</DemoBlock>

## 类型

<DemoBlock title="type">
  <oas-input type="password" placeholder="密码" style="width: 240px"></oas-input>
  <oas-input type="number" placeholder="数字" style="width: 240px"></oas-input>
  <oas-input type="email" placeholder="邮箱" style="width: 240px"></oas-input>
</DemoBlock>

`type` 透传原生 input 类型，支持 `text` / `password` / `number` / `email` 等。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-input clearable value="有内容时可一键清空" style="width: 240px"></oas-input>
</DemoBlock>

存在内容且设置 `clearable` 时显示清除按钮，点击后清空并聚焦，派发 `oas-clear`。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-input disabled placeholder="禁用" style="width: 240px"></oas-input>
  <oas-input readonly value="只读内容" style="width: 240px"></oas-input>
</DemoBlock>

## 前后缀（addon）

<DemoBlock title="prepend / append">
  <oas-input prepend="http://" placeholder="域名" style="width: 240px"></oas-input>
  <oas-input append="元" placeholder="金额" style="width: 240px"></oas-input>
  <oas-input prepend="¥" append="/人" placeholder="单价" style="width: 240px"></oas-input>
</DemoBlock>

`prepend` / `append` 为输入框外侧的 addon 文案块（如单位、域名），分别走独立的 `::part(prepend)` / `::part(append)`，禁用时 addon 灰化。

## 图标

<DemoBlock title="prefix-icon / suffix-icon">
  <oas-input prefix-icon="search" placeholder="搜索" style="width: 240px"></oas-input>
  <oas-input suffix-icon="eye" placeholder="密码" type="password" style="width: 240px"></oas-input>
</DemoBlock>

`prefix-icon` / `suffix-icon` 接受图标名（`@oas-ui/icons` 的 iconRegistry），内联渲染 SVG 装饰图标。

## 内嵌前后缀与清空并存

<DemoBlock title="prefix / suffix + clearable">
  <oas-input prefix="$" suffix=".00" clearable value="1280" style="width: 240px"></oas-input>
  <oas-input suffix-icon="chevron-down" clearable value="可清空带图标" style="width: 240px"></oas-input>
</DemoBlock>

`prefix` / `suffix` 为输入框内部文案，与 `clearable`、图标、addon 可并存不冲突。

## 事件

<DemoBlock title="输入与清除事件">
  <oas-input id="input-event" clearable placeholder="输入或点击清除" style="width: 240px"></oas-input>
  <span id="input-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

监听 `oas-input`（输入中）与 `oas-clear`（清除）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('input-event')
  const out = document.getElementById('input-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })
})
</script>

## API

| 属性          | 说明            | 默认值  |
| ------------- | --------------- | ------- |
| `value`       | 值（受控）      | 无      |
| `placeholder` | 占位提示        | 无      |
| `type`        | 原生 input 类型 | `text`  |
| `clearable`   | 可清空          | `false` |
| `disabled`    | 禁用            | `false` |
| `readonly`    | 只读            | `false` |
| `prepend`     | 前置 addon 文案块 | 无    |
| `append`      | 后置 addon 文案块 | 无    |
| `prefix`      | 内嵌前置文案    | 无      |
| `suffix`      | 内嵌后置文案    | 无      |
| `prefix-icon` | 前置图标名      | 无      |
| `suffix-icon` | 后置图标名      | 无      |

| 事件        | 说明                                  |
| ----------- | ------------------------------------- |
| `oas-input` | 输入中，`detail: { value }`           |
| `oas-clear` | 点击清除，`detail: { originalEvent }` |
