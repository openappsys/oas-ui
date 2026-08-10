# Log 日志流

等宽字体的日志展示容器，支持增量追加与"贴底"自动滚动，适合构建控制台/构建输出等场景。

## 基础用法

<DemoBlock title="基础日志流">
  <oas-log id="log-basic" style="height: 280px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
</DemoBlock>

通过 `lines` property（或 `lines` 属性传 JSON 字符串）提供数据；追加内容时只增量渲染新增行，不重建已有节点。

## 行号

<DemoBlock title="显示行号">
  <oas-log id="log-number" line-number style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
</DemoBlock>

## 追加与自动滚动

<DemoBlock title="追加日志流（贴底自动滚动）">
  <oas-log id="log-stream" line-number style="height: 240px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    每 1.2s 追加一条日志；仅当用户停靠在底部时自动滚动，上翻阅读历史时不会打断。
  </p>
</DemoBlock>

## 关闭自动滚动

<DemoBlock title="auto-scroll=false">
  <oas-log id="log-fixed" auto-scroll="false" style="height: 200px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    设置 <code>auto-scroll="false"</code> 后追加内容不会自动滚到底。
  </p>
</DemoBlock>

## 空态

<DemoBlock title="空日志">
  <oas-log style="height: 200px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    空 <code>lines</code> 显示空态占位，文案走 locale（可通过 <code>empty-text</code> 覆盖）。
  </p>
</DemoBlock>

<DemoBlock title="自定义空态文案">
  <oas-log empty-text="暂无日志输出，等待命令执行…" style="height: 180px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>empty-text</code> 覆盖默认空态文案（默认「暂无日志」）。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const basic = document.querySelector('#log-basic')
  if (basic) {
    basic.lines = [
      '$ pnpm dev',
      '> oas-ui@0.1.0 dev',
      '> vitepress dev docs --port 5173',
      '',
      '  vitepress v1.0.0',
      '  ➜ Local: http://localhost:5173/',
      '  ➜ Network: use --host to expose',
      '[debug] 组件注册完成：oas-log / oas-masonry / oas-comment',
    ]
  }

  const numbered = document.querySelector('#log-number')
  if (numbered) {
    numbered.lines = Array.from({ length: 40 }, (_, i) => `task-${i + 1} 完成，耗时 ${(i % 9) + 1}ms`)
  }

  const stream = document.querySelector('#log-stream')
  if (stream) {
    const payload = [
      'GET /api/users 200 12ms',
      'GET /api/orders 200 8ms',
      'POST /api/session 201 15ms',
      'PUT /api/cart 204 6ms',
      'GET /api/products 200 21ms',
      'WARN 磁盘占用超过 80%',
      'GET /api/reports 200 33ms',
    ]
    let i = 0
    stream.lines = Array.from({ length: 3 }, (_, k) => `[${new Date().toLocaleTimeString()}] 服务启动中…（第 ${k + 1} 行）`)
    const timer = window.setInterval(() => {
      const line = payload[i % payload.length]
      stream.lines = [...stream.lines, `[${new Date().toLocaleTimeString()}] ${line}`]
      i += 1
    }, 1200)
    // demo 页销毁时停止定时器
    window.addEventListener('beforeunload', () => window.clearInterval(timer))
  }

  const fixed = document.querySelector('#log-fixed')
  if (fixed) {
    fixed.lines = Array.from({ length: 20 }, (_, i) => `fixed-line ${i + 1}`)
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-scroll` | 追加后自动滚动到底（仅贴底时滚动） | `string` | `true` |
| `empty-text` | 空态文案（覆盖 locale 默认值） | — | — |
| `line-number` | 显示左侧行号栏 | `boolean` | — |
| `lines` | 日志行 JSON 字符串（属性通道） | `string[]` | — |

部件：`::part(viewport)` 滚动视口、`::part(log)` 日志内容、`::part(row)` 单行、`::part(line-number)` 行号、`::part(line)` 行文本、`::part(empty)` 空态。
