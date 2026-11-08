# ToolCall

Tool-call card: name, summary, status, arguments and result; collapsed by default and toggled from the header. The component only renders host data; it does not execute tools, parse functions or inject HTML.

## Basic Usage

<DemoBlock title="Running / success / error; click the header to toggle oas-toggle">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-tool-call
      id="tool-call-running"
      name="search_docs"
      summary="Search API docs"
      status="running"
      args='{"query":"scheduler"}'
    ></oas-tool-call>
    <oas-tool-call
      name="read_file"
      summary="Read component source"
      status="success"
      open
      args='{"path":"oas-scheduler.ts"}'
      result='["Read 120 lines"]'
    ></oas-tool-call>
    <oas-tool-call
      name="deploy"
      summary="Deploy preview"
      status="error"
      collapsible="false"
      result='["Network timeout"]'
    ></oas-tool-call>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

const STAGE_LABELS = { running: 'running', success: 'completed', error: 'failed' }

onMounted(async () => {
  await customElements.whenDefined('oas-tool-call')
  const el = document.getElementById('tool-call-running')
  el?.addEventListener('oas-toggle', (event) => {
    el.setAttribute('summary', `Search API docs (${event.detail.open ? 'expanded' : 'collapsed'})`)
  })

  // State matrix: the three cards share one visible readout, proving oas-toggle reaches the host
  const matrix = document.getElementById('tool-call-matrix')
  const matrixEvent = document.getElementById('tool-call-matrix-event')
  matrix?.addEventListener('oas-toggle', (event) => {
    if (!matrixEvent) return
    const stage = STAGE_LABELS[event.target?.dataset?.stage] ?? 'tool'
    matrixEvent.textContent = `${stage} "${event.detail.name}" ${event.detail.open ? 'expanded' : 'collapsed'}`
  })
})
</script>

## State Matrix

<DemoBlock title="Three calls of the same tool: running / completed / failed; all cards start expanded, click a header to collapse or expand (oas-toggle)">
  <div id="tool-call-matrix" style="display:flex;flex-direction:column;gap:var(--oas-space-3);width:100%">
    <p
      id="tool-call-matrix-event"
      role="status"
      style="margin:0;font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)"
    >
      Waiting for interaction: click any card header to collapse or expand
    </p>
    <div
      style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:var(--oas-space-3);align-items:start"
    >
      <oas-tool-call
        data-stage="running"
        name="query_orders"
        summary="Query order A-1024"
        status="running"
        open
        args='{"orderId":"A-1024"}'
      ></oas-tool-call>
      <oas-tool-call
        data-stage="success"
        name="query_orders"
        summary="Query order A-1024"
        status="success"
        open
        args='{"orderId":"A-1024"}'
        result='{"state":"shipped","carrier":"SF Express","eta":"2026-11-10"}'
      ></oas-tool-call>
      <oas-tool-call
        data-stage="error"
        name="query_orders"
        summary="Query order A-1024"
        status="error"
        open
        args='{"orderId":"A-1024"}'
        result='{"code":"ETIMEDOUT","message":"Order service did not respond within 5s"}'
      ></oas-tool-call>
    </div>
  </div>
</DemoBlock>

## API

### oas-tool-call

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `args` | Arguments text or JSON (rendered as text) | `string` | — |
| `collapsible` | Whether the body can collapse; false forces it open | `string` | `true` |
| `name` | Tool name | `string` | — |
| `open` | Start expanded | `boolean` | — |
| `result` | Result text or JSON (rendered as text) | `string` | — |
| `status` | Status: running / success / error | `string` | — |
| `summary` | One-line summary | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-toggle` | Dispatched on expand/collapse, detail: { open, name } |

#### Slots

| Name | Description |
| --- | --- |
| `icon` | Tool icon |
