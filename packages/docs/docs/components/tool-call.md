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

const STAGE_LABELS = { running: '运行中', success: '已完成', error: '失败' }

onMounted(async () => {
  await customElements.whenDefined('oas-tool-call')
  const el = document.getElementById('tool-call-running')
  el?.addEventListener('oas-toggle', (event) => {
    el.setAttribute('summary', `搜索 API 文档（${event.detail.open ? '展开' : '折叠'}）`)
  })

  // 状态矩阵：三张同工具卡片共用一段可见反馈，证明 oas-toggle 真的派发到宿主
  const matrix = document.getElementById('tool-call-matrix')
  const matrixEvent = document.getElementById('tool-call-matrix-event')
  matrix?.addEventListener('oas-toggle', (event) => {
    if (!matrixEvent) return
    const stage = STAGE_LABELS[event.target?.dataset?.stage] ?? '工具'
    matrixEvent.textContent = `${stage}「${event.detail.name}」${event.detail.open ? '已展开' : '已折叠'}`
  })
})
</script>

## 状态矩阵

<DemoBlock title="同一工具的三次调用：运行中 / 已完成 / 失败；三张卡片默认展开，点击头部折叠或展开（oas-toggle）">
  <div id="tool-call-matrix" style="display:flex;flex-direction:column;gap:var(--oas-space-3);width:100%">
    <p
      id="tool-call-matrix-event"
      role="status"
      style="margin:0;font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)"
    >
      等待交互：点击任一卡片头部折叠或展开
    </p>
    <div
      style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:var(--oas-space-3);align-items:start"
    >
      <oas-tool-call
        data-stage="running"
        name="query_orders"
        summary="查询订单 A-1024"
        status="running"
        open
        args='{"orderId":"A-1024"}'
      ></oas-tool-call>
      <oas-tool-call
        data-stage="success"
        name="query_orders"
        summary="查询订单 A-1024"
        status="success"
        open
        args='{"orderId":"A-1024"}'
        result='{"state":"shipped","carrier":"顺丰","eta":"2026-11-10"}'
      ></oas-tool-call>
      <oas-tool-call
        data-stage="error"
        name="query_orders"
        summary="查询订单 A-1024"
        status="error"
        open
        args='{"orderId":"A-1024"}'
        result='{"code":"ETIMEDOUT","message":"订单服务 5 秒内无响应"}'
      ></oas-tool-call>
    </div>
  </div>
</DemoBlock>

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
