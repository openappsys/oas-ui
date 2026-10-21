# ToolCall 工具调用

工具调用卡片：展示名称、摘要、状态、参数和结果；默认折叠，点击头部展开。组件只展示宿主数据，不执行工具、不解析函数、不注入 HTML。

## 基础用法

<DemoBlock title="运行中 / 成功 / 失败；点击头部切换 oas-toggle">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-tool-call
      id="tool-call-running"
      name="search_docs"
      summary="搜索 API 文档"
      status="running"
      args='{"query":"scheduler"}'
    ></oas-tool-call>
    <oas-tool-call
      name="read_file"
      summary="读取组件源码"
      status="success"
      open
      args='{"path":"oas-scheduler.ts"}'
      result='["已读取 120 行"]'
    ></oas-tool-call>
    <oas-tool-call
      name="deploy"
      summary="部署预览"
      status="error"
      collapsible="false"
      result='["网络超时"]'
    ></oas-tool-call>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-tool-call')
  const el = document.getElementById('tool-call-running')
  el?.addEventListener('oas-toggle', (event) => {
    el.setAttribute('summary', `搜索 API 文档（${event.detail.open ? '展开' : '折叠'}）`)
  })
})
</script>

## API

### oas-tool-call

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `args` | 参数文本或 JSON（按文本展示） | `string` | — |
| `collapsible` | 是否可折叠；false 时强制展开 | `string` | `true` |
| `name` | 工具名 | `string` | — |
| `open` | 初始展开 | `boolean` | — |
| `result` | 结果文本或 JSON（按文本展示） | `string` | — |
| `status` | 状态：running / success / error | `string` | — |
| `summary` | 一行摘要 | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-toggle` | 展开/折叠时派发，detail: { open, name } |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `icon` | 工具图标 |
