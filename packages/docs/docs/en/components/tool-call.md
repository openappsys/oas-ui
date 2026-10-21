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

onMounted(async () => {
  await customElements.whenDefined('oas-tool-call')
  const el = document.getElementById('tool-call-running')
  el?.addEventListener('oas-toggle', (event) => {
    el.setAttribute('summary', `Search API docs (${event.detail.open ? 'expanded' : 'collapsed'})`)
  })
})
</script>

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
