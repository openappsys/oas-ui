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

## 上翻加载历史

<DemoBlock title="require-more 分段加载">
  <oas-log id="log-history" line-number offset-top="8" style="height: 240px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    滚动到顶部触发 <code>oas-require-more</code>（detail <code>{ from: 'top' }</code>），模拟延迟后把更早的 10 行插到顶部（key 对齐 reconcile，已有行不重建），行号自动重排、阅读位置保持。
  </p>
</DemoBlock>

## 行级高亮

<DemoBlock title="关键词 / 正则高亮">
  <oas-log id="log-highlight" highlight='["ERROR", "WARN", {"pattern": "\\b5\\d\\d\\b"}]' style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>highlight</code> JSON 数组：字符串为字面关键词，<code>pattern</code> 条目为正则（反斜杠按 JSON 转义写，如 <code>\\d</code>）；命中片段包 mark（token 语义底色），匹配文本全部走 textContent 防注入。
  </p>
</DemoBlock>

## 级别着色

<DemoBlock title="levels 级别语义色">
  <oas-log id="log-levels" line-number levels='["info", "success", "warning", "error", "debug"]' style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>levels</code> JSON 数组与 <code>lines</code> 按索引对齐：info / success / warning / error 映射 token 语义色（暗色自动换色），支持 warn / fatal 等别名，非法级别不着色。
  </p>
</DemoBlock>

## 加载态与 scrollTo

<DemoBlock title="loading + scrollTo()">
  <div style="width: 100%; display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-2)">
    <oas-button id="log-fetch-btn" size="small" type="primary">模拟拉取</oas-button>
    <oas-button id="log-to-top" size="small">回到顶部</oas-button>
    <oas-button id="log-to-bottom" size="small">回到底部</oas-button>
  </div>
  <oas-log id="log-methods" style="height: 220px; width: 100%; background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-log>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    <code>loading</code> 属性显示加载浮层并同步 <code>aria-busy</code>；<code>scrollTo('top' | 'bottom' | 像素)</code> 方法供外部按钮跳转。
  </p>
</DemoBlock>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// demo 定时器句柄：SPA 路由切换时组件销毁，必须在 onUnmounted 清理
// （勿用 window beforeunload——它只在整页卸载触发，且常驻处理器会阻断后续整页导航）
let streamTimer = null
const historyTimers = []

onUnmounted(() => {
  if (streamTimer) window.clearInterval(streamTimer)
  for (const t of historyTimers) window.clearTimeout(t)
})

onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 lines setter（preview 构建下赋值丢失会整页空日志）
  customElements.whenDefined('oas-log').then(() => {
  const basic = document.querySelector('#log-basic')
  if (basic) {
    basic.lines = [
      '$ pnpm dev',
      '> oas-ui@0.1.0 dev',
      '> vitepress dev docs --port 5175',
      '',
      '  vitepress v1.0.0',
      '  ➜ Local: http://localhost:5175/',
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
    // demo 组件销毁时停止定时器（onUnmounted 清理，SPA 路由切换亦生效）
    streamTimer = window.setInterval(() => {
      const line = payload[i % payload.length]
      stream.lines = [...stream.lines, `[${new Date().toLocaleTimeString()}] ${line}`]
      i += 1
    }, 1200)
  }

  const fixed = document.querySelector('#log-fixed')
  if (fixed) {
    fixed.lines = Array.from({ length: 20 }, (_, i) => `fixed-line ${i + 1}`)
  }

  // require-more 上翻加载历史：到顶派发 → 模拟接口延迟 → 顶部插入更早批次
  customElements.whenDefined('oas-log').then(() => {
    const history = document.querySelector('#log-history')
    if (history) {
      let oldest = 41
      history.lines = Array.from({ length: 40 }, (_, i) => `audit 记录 ${oldest + i}，操作成功`)
      history.addEventListener('oas-require-more', (e) => {
        const from = e.detail && e.detail.from
        if (from !== 'top' || oldest <= 1 || history.hasAttribute('loading')) return
        history.setAttribute('loading', '')
        const timer = window.setTimeout(() => {
          const start = Math.max(1, oldest - 10)
          const batch = Array.from(
            { length: oldest - start },
            (_, i) => `audit 记录 ${start + i}，操作成功`,
          )
          oldest = start
          history.lines = [...batch, ...history.lines]
          history.removeAttribute('loading')
        }, 400)
        historyTimers.push(timer)
      })
    }

    const highlight = document.querySelector('#log-highlight')
    if (highlight) {
      highlight.lines = [
        'INFO  服务启动完成，监听 :5175',
        'INFO  GET /api/users 200 12ms',
        'WARN  磁盘占用超过 80%，请清理',
        'ERROR 连接数据库超时，重试第 1 次',
        'INFO  POST /api/orders 201 15ms',
        'ERROR 连接数据库超时，重试第 2 次',
        'INFO  GET /api/products 200 21ms',
        'WARN  慢查询：SELECT * FROM orders 耗时 500ms',
        'INFO  定时任务 gc 执行完成',
      ]
    }

    const levels = document.querySelector('#log-levels')
    if (levels) {
      levels.lines = [
        'INFO  应用启动中…',
        'DEBUG 加载配置 oas.config.ts',
        'INFO  数据库连接池就绪（10 连接）',
        'DEBUG 预热缓存：12 个键',
        'SUCCESS 构建完成，耗时 3.2s',
        'WARN  依赖 foo 有新版本 2.0',
        'ERROR 部署节点 node-3 健康检查失败',
        'INFO  流量切换到 node-1/node-2',
      ]
    }

    // loading + scrollTo：模拟首屏拉取 → 填充 50 行 → 外部按钮跳转
    const methods = document.querySelector('#log-methods')
    const fetchBtn = document.querySelector('#log-fetch-btn')
    if (methods) {
      methods.setAttribute('loading', '')
      const timer = window.setTimeout(() => {
        methods.lines = Array.from(
          { length: 50 },
          (_, i) => `[${String(i + 1).padStart(2, '0')}] 构建步骤 ${i + 1} 完成`,
        )
        methods.removeAttribute('loading')
      }, 900)
      historyTimers.push(timer)
    }
    if (methods && fetchBtn) {
      fetchBtn.addEventListener('oas-click', () => {
        if (methods.hasAttribute('loading')) return
        methods.setAttribute('loading', '')
        const timer = window.setTimeout(() => {
          methods.lines = Array.from(
            { length: 50 },
            (_, i) => `[${String(i + 1).padStart(2, '0')}] 重新拉取：步骤 ${i + 1} 完成`,
          )
          methods.removeAttribute('loading')
        }, 900)
        historyTimers.push(timer)
      })
      document.querySelector('#log-to-top')?.addEventListener('oas-click', () => methods.scrollTo('top'))
      document
        .querySelector('#log-to-bottom')
        ?.addEventListener('oas-click', () => methods.scrollTo('bottom'))
    }
  })
  })
})
</script>

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-log-font` 显式定制（如 `18px`）。

## 事件与方法

- `oas-require-more`：滚动进入顶部/底部阈值区时派发（detail `{ from: 'top' | 'bottom' }`），边缘触发——停留不连发，离开区域后复位；阈值由 `offset-top` / `offset-bottom`（px）控制。
- `scrollTo('top' | 'bottom' | number)`：滚动视口到顶/底/指定像素位置，供外部"回到底部"按钮调用。
- `loading`：加载浮层遮罩视口，同步 `aria-busy`，文案走 locale（`loading.loading`）。
- `levels` / `highlight`：行级别语义色 / 行级关键词·正则高亮通道（JSON 属性，语法见上方 demo）。

顶部插入历史行时 reconcile 按行内容 key 对齐：已有行节点复用、行号自动重排、视口阅读位置自动补偿。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-scroll` | 追加后自动滚动到底（仅贴底时滚动） | `string` | `true` |
| `empty-text` | 空态文案（覆盖 locale 默认值） | — | — |
| `highlight` | 行高亮规则（JSON 数组）：字符串=字面关键词；`{ text }` / `{ pattern, flags }` = 正则；命中片段包 mark 底色（warning token） | `string` | — |
| `levels` | 行级别（JSON 数组，与 lines 索引对齐）：info/success/warning/error（warn/fatal 等别名归一），映射语义色 token | `string` | — |
| `line-number` | 显示左侧行号栏 | `boolean` | — |
| `lines` | 日志行 JSON 字符串（属性通道） | `string[]` | `[]` |
| `loading` | 加载态（视口浮层 + spinner + aria-busy） | `boolean` | — |
| `offset-bottom` | 距底部多远视为触底（px，触发 `oas-require-more` 的 from=bottom，默认 0） | — | — |
| `offset-top` | 距顶部多远视为触顶（px，触发 `oas-require-more` 的 from=top，默认 0） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-require-more` | 滚动进入顶部/底部阈值区边缘派发一次（停留不连发、离开复位），`detail: { from: "top" \| "bottom" }`；宿主上翻拉历史/下拉拉新 |

部件：`::part(viewport)` 滚动视口、`::part(log)` 日志内容、`::part(row)` 单行、`::part(line-number)` 行号、`::part(line)` 行文本、`::part(empty)` 空态。
