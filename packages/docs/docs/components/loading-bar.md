# LoadingBar 顶部加载条

页面顶部（或底部）的全局加载进度条，命令式 API 驱动。多次 `start` 并发计数，最后一个 `finish`/`error` 才收尾；支持增量控制、局部容器、反向/RTL 与生命周期事件。

## 基础用法

<DemoBlock title="开始与完成">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 2000)">开始加载</oas-button>
    <oas-button onclick="loadingBar.finish()">立即完成</oas-button>
  </oas-space>
  <p>活动会话：<code id="lb-active">false</code></p>
</DemoBlock>

`loadingBar.start()` 开始自动推进（渐进逼近 90%），`finish()` 补满格并淡出移除。

## 失败状态

<DemoBlock title="失败与兜底报错">
  <oas-space>
    <oas-button type="danger" onclick="loadingBar.start(); setTimeout(() => loadingBar.error(), 2000)">模拟加载失败</oas-button>
    <oas-button type="danger" onclick="loadingBar.error()">直接报错（未 start）</oas-button>
  </oas-space>
</DemoBlock>

未 `start` 直接调用 `error()` 为兜底语义：不经过 0→推进 的加载过程，直接以错误态满格收尾（红色 + 淡出），保证失败可见、不闪烁。批次内任一 `error` 决定最终终态。

## 会话计数

<DemoBlock title="并发会话计数">
  <oas-space>
    <oas-button type="primary" onclick="lbStart(1)">开始任务 A</oas-button>
    <oas-button type="primary" onclick="lbStart(1)">开始任务 B</oas-button>
    <oas-button onclick="loadingBar.finish()">完成一个任务</oas-button>
  </oas-space>
  <p>当前会话数：<code id="lb-count">0</code></p>
</DemoBlock>

多次 `start` 并发计数，进度条只推进一条；每完成一个会话 `finish()` 一次，最后一个才触发收尾。当前会话数实时显示（`loadingBar.getEl()?.sessions` 可查询）。

## 位置

<DemoBlock title="顶部 / 底部">
  <oas-space>
    <oas-button onclick="loadingBar.start()">顶部（默认）</oas-button>
    <oas-button onclick="loadingBar.start({ position: 'bottom' })">底部</oas-button>
  </oas-space>
</DemoBlock>

## 局部容器

<DemoBlock title="局部加载条">
  <div id="lb-local-box" style="position: relative; height: 72px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); display: flex; align-items: flex-end">
    <oas-button type="primary" onclick="lbLocal()" id="lb-local-btn">容器内加载</oas-button>
  </div>
</DemoBlock>

`to` 指定挂载容器（元素/选择器/函数），加载条相对容器定位，互不影响全局加载条。容器需为定位上下文（如 `position: relative`），否则 `position: absolute` 会向上找最近的定位祖先。

## 增量控制

<DemoBlock title="增量控制与节拍">
  <oas-space>
    <oas-button type="primary" onclick="lbStartSpeed()" id="lb-inc-start">开始</oas-button>
    <oas-button onclick="loadingBar.increment(10)">推进 10</oas-button>
    <oas-button onclick="loadingBar.set(60)">设为 60%</oas-button>
    <oas-button onclick="loadingBar.decrement(10)">回退 10</oas-button>
  </oas-space>
  <oas-space>
    <span>推进节拍：</span>
    <select onchange="lbPickSpeed(this.value)">
      <option value="100">快（100ms）</option>
      <option value="200" selected>默认（200ms）</option>
      <option value="500">慢（500ms）</option>
      <option value="1000">更慢（1000ms）</option>
    </select>
  </oas-space>
  <p>当前进度：<code id="lb-progress">—</code></p>
</DemoBlock>

`increment`/`decrement` 相对推进/回退（默认随机 0–10），`set` 精确设置（0–100 夹取）；`start(speed)` 或 `speed` 属性控制推进节拍（ms/拍）。

## 反向与 RTL

<DemoBlock title="反向推进 / RTL">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start({ reverse: true })">反向推进</oas-button>
  </oas-space>
  <div id="lb-rtl-box" dir="rtl" style="position: relative; height: 72px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); display: flex; align-items: flex-end">
    <oas-button type="primary" onclick="lbRtl()">RTL 容器内加载</oas-button>
  </div>
</DemoBlock>

`reverse` 从行内末端（end）向起点生长；RTL 下默认从行内起点（右侧）生长，布局全部使用逻辑属性（`inset-inline-*` / `inset-block-*`）。

## 生命周期事件

<DemoBlock title="事件与活动态">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start()">开始</oas-button>
    <oas-button onclick="loadingBar.finish()">完成</oas-button>
    <oas-button type="danger" onclick="loadingBar.error()">报错</oas-button>
  </oas-space>
  <p>最近事件：<code id="lb-log">—</code></p>
</DemoBlock>

生命周期事件在加载条元素上派发（`oas-start` / `oas-finish` / `oas-error`，bubbles + composed，可冒泡到 document）；`loadingBar.active` / `isActive()` 查询活动态，`getEl()` 取元素挂监听。

## 清空

<DemoBlock title="清空">
  <oas-space>
    <oas-button onclick="loadingBar.start()">开始</oas-button>
    <oas-button onclick="destroyAllLoadingBar()">移除加载条</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { loadingBar, destroyAllLoadingBar } = await import('@oas-ui/ui')
  window.loadingBar = loadingBar
  window.destroyAllLoadingBar = destroyAllLoadingBar

  window.lbLog = (msg) => {
    const el = document.getElementById('lb-log')
    if (el) el.textContent = msg
    const active = document.getElementById('lb-active')
    if (active) active.textContent = String(loadingBar.active)
  }
  // 生命周期事件 → 事件日志 + 会话数显示
  for (const name of ['oas-start', 'oas-finish', 'oas-error']) {
    document.addEventListener(name, (e) => {
      const count = e.detail && e.detail.count
      const countEl = document.getElementById('lb-count')
      if (countEl) countEl.textContent = String(count ?? '')
      window.lbLog(`${name}${count !== undefined ? `（剩余会话 ${count}）` : ''}`)
    })
  }

  window.lbProgress = () => {
    const el = loadingBar.getEl()
    const out = document.getElementById('lb-progress')
    if (!out) return
    const track = el && el.shadowRoot && el.shadowRoot.querySelector('[role="progressbar"]')
    out.textContent = track ? `${track.getAttribute('aria-valuenow')}%` : '—'
  }
  window.lbStart = (n) => {
    for (let i = 0; i < n; i++) loadingBar.start()
  }
  // 会话数实时轮询（finish/error 中途递减不发事件，用 sessions 查询）
  window.lbSyncCount = () => {
    const countEl = document.getElementById('lb-count')
    if (countEl) countEl.textContent = String(loadingBar.getEl()?.sessions ?? 0)
  }
  setInterval(window.lbSyncCount, 200)
  window.lbLocal = () => {
    loadingBar.start({ to: document.getElementById('lb-local-box') })
  }
  window.lbRtl = () => {
    loadingBar.start({ to: document.getElementById('lb-rtl-box') })
  }
  let lbSpeed = 200
  window.lbPickSpeed = (v) => {
    lbSpeed = Number(v)
    const el = loadingBar.getEl()
    if (el) el.setAttribute('speed', String(lbSpeed))
  }
  window.lbStartSpeed = () => {
    loadingBar.start({ speed: lbSpeed })
    window.lbProgress()
  }
  for (const fn of ['increment', 'set', 'decrement']) {
    const orig = loadingBar[fn].bind(loadingBar)
    loadingBar[fn] = (...args) => {
      orig(...args)
      window.lbProgress()
    }
  }
})
</script>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `loadingBar.start(options?)` | 开始加载，返回 `{ el }` 句柄；多次调用并发计数。`options`：`speed`（节拍 ms）、`to`（挂载容器：元素/选择器/函数）、`position`（`top`/`bottom`）、`reverse` |
| `loadingBar.finish(target?)` | 完成一个会话；并发会话下仅最后一个触发收尾 |
| `loadingBar.error(target?)` | 失败收尾；未 `start` 直接调用也以错误态收尾（不闪烁） |
| `loadingBar.increment(step?, target?)` | 手动推进（默认随机 0–10，夹取 0–100） |
| `loadingBar.set(percent, target?)` | 精确设置进度（0–100 夹取） |
| `loadingBar.decrement(step?, target?)` | 手动回退（默认随机 0–10，夹取 0–100） |
| `loadingBar.active` | 默认宿主当前是否有活跃会话 |
| `loadingBar.isActive(target?)` | 指定容器当前是否有活跃会话 |
| `loadingBar.getEl(target?)` | 取加载条元素（可挂生命周期事件监听）；未 `start` 返回 `null` |
| `destroyAllLoadingBar()` | 移除全部加载条（跨容器） |

`target` 为容器元素 / CSS 选择器 / 返回元素的函数，缺省为最近 `oas-app` 宿主或 `body`。

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `local` | — | — | — |
| `position` | — | — | — |
| `reverse` | — | — | — |
| `speed` | — | `string` | `200` |
| `status` | — | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-error` | — |
| `oas-finish` | — |
| `oas-start` | — |

进度条 `role="progressbar"`，进度通过 `aria-valuenow` 同步，活动态同步 `aria-busy`。
