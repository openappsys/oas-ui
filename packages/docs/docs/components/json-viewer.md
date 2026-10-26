# JSONViewer JSON 查看器

只读 JSON 树查看器：折叠/展开、搜索、JSONPath 复制、固定行高虚拟滚动、键盘与读屏支持。适合作为接口响应查看、配置审阅、日志展开等场景的嵌入积木；左右对照可并排放两个实例。

## 基础用法

通过 `text` attribute 传入 JSON 原文，默认展开根节点（`default-expand-depth="1"`）。字符串值在 DOM 中保留完整文本，超长时单行省略并通过 `title` 提供原文。

<DemoBlock title="接口响应查看">
  <oas-json-viewer id="jv-basic" height="300" text='{"code":0,"message":"ok","data":{"user":{"id":1024,"name":"张三","roles":["admin","editor"]},"stats":{"requests":1280,"latency":23.6,"healthy":true},"note":null}}'></oas-json-viewer>
</DemoBlock>

也可以用 `data` property 直接传对象或数组；与 `text` 最近写入者生效。写 `data` 会移除 `text` 属性，写 `text` 会清空 `data` 缓存。

<DemoBlock title="data property 对象通道">
  <oas-json-viewer id="jv-data" height="260"></oas-json-viewer>
</DemoBlock>

## 自定义展开/收起图标

用 `template[slot="toggle-collapsed"]` 与 `template[slot="toggle-expanded"]` 分别提供折叠态和展开态内容，可放文本、SVG 或带框元素；未提供对应模板时回落默认三角形，叶节点始终不显示图标。模板内容中的 `part="toggle-icon"` 可配合 `::part(toggle-icon)` 定制样式，也可直接写内联样式。

<DemoBlock title="带框 + / − 图标（点击根行切换）">
  <oas-json-viewer id="jv-custom-toggle" height="220" default-expand-depth="0" text='{"code":0,"message":"ok","data":{"name":"张三","admin":true}}'>
    <template slot="toggle-collapsed">
      <span part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid currentColor;border-radius:3px">+</span>
    </template>
    <template slot="toggle-expanded">
      <span part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid currentColor;border-radius:3px">−</span>
    </template>
  </oas-json-viewer>
</DemoBlock>

## 受控展开

`expanded` 属性在场即进入受控模式：组件只派发 `oas-toggle` / `oas-expanded-change`，不写回属性。宿主更新 `expanded` 后树跟随渲染。路径统一为单引号 JSONPath，例如 `$['data']['users'][0]`。

<DemoBlock title="expanded 受控 + 外部按钮">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-3)">
    <oas-button id="jv-expand-all" size="small">全部展开</oas-button>
    <oas-button id="jv-collapse-all" size="small">全部收起</oas-button>
    <oas-button id="jv-expand-root" size="small">只展开根</oas-button>
  </div>
  <oas-json-viewer id="jv-controlled" height="280" default-expand-depth="0" expanded='["$"]' text='{"service":"billing","replicas":3,"env":{"region":"cn-east-1","debug":false},"ports":[80,443]}'></oas-json-viewer>
  <p id="jv-controlled-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">受控展开：$</p>
</DemoBlock>

## 搜索

搜索大小写不敏感，匹配对象键与原始值；命中后自动展开祖先但不隐藏其他节点。工具栏提供计数与上一个/下一个循环导航。`Ctrl/Cmd+F` 在组件内聚焦时拦截并聚焦搜索框；`search-shortcut="false"` 可关闭。

<DemoBlock title="搜索计数与自动展开">
  <oas-json-viewer id="jv-search" height="300" search="a" text='{"name":"Ada","tags":["alpha","beta"],"profile":{"city":"Shanghai","active":true},"items":[{"label":"apple"},{"label":"pear"}]}'></oas-json-viewer>
  <p id="jv-search-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">搜索状态：—</p>
</DemoBlock>

## 复制路径 / 值 / 子树

工具栏可以复制当前活动节点的 JSONPath、原始值或子树 JSON；也可以调用 `copyPath()`、`copyValue()`、`copyJson()`。复制前派发可取消的 `oas-copy`，成功后派发 `oas-copied`，失败派发 `oas-copy-error`。`copyable="false"` 只隐藏按钮，方法仍可调用。

<DemoBlock title="复制事件反馈">
  <oas-json-viewer id="jv-copy" height="260" text='{"a.b":[{"c":"hello"}],"nested":{"ok":true}}'></oas-json-viewer>
  <p id="jv-copy-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">点击工具栏复制按钮，或调用实例方法。</p>
</DemoBlock>

```js
const viewer = document.querySelector('#jv-copy')
viewer.scrollToPath("$['a.b'][0]['c']")
await viewer.copyPath()   // $['a.b'][0]['c']
await viewer.copyValue()  // hello
await viewer.copyJson()   // "hello"
```

## 大 JSON 与虚拟滚动

可见行超过 200 时默认启用固定行高虚拟滚动，DOM 中只保留视口附近的行；`virtual="false"` 可强制关闭，`height` / `row-height` 控制视口与行高。10k 节点实例仍可搜索、键盘导航和 `scrollToPath()`。

<DemoBlock title="10k 节点仅渲染视口">
  <oas-json-viewer id="jv-large" height="320" row-height="22"></oas-json-viewer>
  <p id="jv-large-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">正在生成数据…</p>
</DemoBlock>

## 错误态与恢复

非法 `text` 显示错误面板并派发 `oas-parse-error`，包含 `message` 与可定位的 `line` / `column`；写入合法 `data` 或 `text` 后自动恢复。嵌套层级过深导致建树/遍历栈溢出时同样进入可恢复错误态（文案走 locale key），不向宿主抛 `RangeError`；复制超深子树失败时派发 `oas-copy-error` 并显示失败提示。

<DemoBlock title="解析失败 → 写入合法数据恢复">
  <div style="display:flex;gap:var(--oas-space-2);margin-bottom:var(--oas-space-3)">
    <oas-button id="jv-recover" size="small" type="primary">写入合法数据</oas-button>
  </div>
  <oas-json-viewer id="jv-error" height="180" text='{"broken": }'></oas-json-viewer>
  <p id="jv-error-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">等待解析错误…</p>
</DemoBlock>

## 显示与配置

`compact` 紧凑模式（默认行高 20、字号 11px）、`toolbar="false"` 隐藏工具栏、`copyable="false"` 隐藏复制按钮、`search-shortcut="false"` 关闭快捷键、`indent` 控制复制 JSON 的缩进空格数、`aria-label` 命名树。下例同时设置 `height`、`row-height`、`default-expand-depth="2"` 与 `virtual="false"`。

<DemoBlock title="紧凑只读面板">
  <oas-json-viewer id="jv-compact" style="width: 100%" compact toolbar="false" copyable="false" search-shortcut="false" indent="4" default-expand-depth="2" height="220" row-height="22" virtual="false" aria-label="构建配置" text='{"build":{"target":"es2022","minify":true,"sourcemap":false},"plugins":["a","b"]}'></oas-json-viewer>
</DemoBlock>

## 键盘与可访问性

树容器是单一 Tab 焦点，使用 `aria-activedescendant` 指向活动行；行带 `role="treeitem"`、`aria-level`、`aria-posinset`、`aria-setsize` 与 `aria-expanded`。

| 按键 | 行为 |
| --- | --- |
| `↑` / `↓` | 上/下一个可见行 |
| `→` | 展开容器；已展开时进入第一个子节点 |
| `←` | 收起容器；已收起时回到父节点 |
| `Home` / `End` | 首行 / 末行 |
| `Enter` / `Space` | 展开/收起当前容器 |
| `Ctrl/Cmd+F` | 聚焦搜索框（组件内聚焦时） |

## 主题与部件

颜色全部走 CSS 变量 token，暗色主题自动跟随；可用 `::part()` 定制 `viewer`、`toolbar`、`viewport`、`row`、`key`、`value`、`twisty`、`error`、`copy-status` 等部件。`toolbar="false"` 时复制结果通过右下角浮层提示（`part="copy-status"`）。RTL 下缩进使用逻辑属性，JSON 文本保持字符方向隔离。

<script>
if (typeof window !== 'undefined') {
  customElements.whenDefined('oas-json-viewer').then(() => {
  const dataEl = document.querySelector('#jv-data')
  if (dataEl) {
    dataEl.data = {
      project: 'OAS-UI',
      components: 163,
      stable: true,
      maintainers: [{ name: '张三', role: 'core' }, { name: '李四', role: 'docs' }],
      meta: { license: 'MIT', stars: 1280 },
    }
  }

  const controlled = document.querySelector('#jv-controlled')
  const controlledState = document.querySelector('#jv-controlled-state')
  if (controlled) {
    const setExpanded = (paths) => {
      controlled.setAttribute('expanded', JSON.stringify(paths))
      if (controlledState) controlledState.textContent = `受控展开：${paths.length ? paths.join(', ') : '（空）'}`
    }
    controlled.addEventListener('oas-toggle', (event) => {
      const { path, expanded } = event.detail
      const set = new Set(controlled.expanded)
      if (expanded) set.add(path)
      else set.delete(path)
      setExpanded([...set])
    })
    controlled.addEventListener('oas-expanded-change', (event) => setExpanded(event.detail.paths))
    document.querySelector('#jv-expand-all')?.addEventListener('click', () => controlled.expandAll())
    document.querySelector('#jv-collapse-all')?.addEventListener('click', () => controlled.collapseAll())
    document.querySelector('#jv-expand-root')?.addEventListener('click', () => setExpanded(['$']))
  }

  const searchEl = document.querySelector('#jv-search')
  const searchState = document.querySelector('#jv-search-state')
  if (searchEl && searchState) {
    searchEl.addEventListener('oas-search-change', (event) => {
      const { query, matches, activeIndex } = event.detail
      searchState.textContent = `搜索「${query}」：${matches} 个命中，当前 ${activeIndex + 1}`
    })
    const count = searchEl.shadowRoot?.querySelector('[part="count"]')?.textContent
    if (count) searchState.textContent = `搜索「${searchEl.getAttribute('search') ?? ''}」：${count}`
  }

  const copyEl = document.querySelector('#jv-copy')
  const copyState = document.querySelector('#jv-copy-state')
  if (copyEl && copyState) {
    copyEl.scrollToPath("$['a.b'][0]['c']")
    copyEl.addEventListener('oas-copied', (event) => {
      copyState.textContent = `已复制 ${event.detail.kind}：${event.detail.text.slice(0, 80)}`
    })
    copyEl.addEventListener('oas-copy-error', () => {
      copyState.textContent = '复制失败：浏览器未授予剪贴板权限'
    })
  }

  const largeEl = document.querySelector('#jv-large')
  const largeState = document.querySelector('#jv-large-state')
  if (largeEl && largeState) {
    largeEl.data = Array.from({ length: 10_000 }, (_, i) => i)
    const updateCount = () => {
      const rendered = largeEl.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0
      largeState.textContent = `10,000 个节点；当前 DOM 行数 ${rendered}（固定行高虚拟窗口）`
    }
    largeEl.shadowRoot?.querySelector('[part="viewport"]')?.addEventListener('scroll', updateCount, {
      passive: true,
    })
    requestAnimationFrame(updateCount)
  }

  const errorEl = document.querySelector('#jv-error')
  const errorState = document.querySelector('#jv-error-state')
  if (errorEl && errorState) {
    errorEl.addEventListener('oas-parse-error', (event) => {
      const { message, line, column } = event.detail
      errorState.textContent = `解析失败${line ? `（${line}:${column}）` : ''}：${message}`
    })
    const panel = errorEl.shadowRoot?.querySelector('[part="error"]')?.textContent
    if (panel) errorState.textContent = panel
    document.querySelector('#jv-recover')?.addEventListener('click', () => {
      errorEl.data = { recovered: true, items: [1, 2, 3] }
      errorState.textContent = '已写入合法数据，错误态自动恢复。'
    })
  }
  })
}
</script>

## 工具函数

从 `@oas-ui/ui/data/json-viewer`（或 `@oas-ui/ui`）还可按需导入纯模型工具，便于宿主做自定义渲染或预处理：`buildJsonTree`、`flattenVisible`、`searchJson`、`encodeJsonPath`、`parseJsonPath`、`collectAncestorPaths`、`serializeValue`、`serializeJson`。这些函数不依赖 DOM。

## API

### oas-json-viewer

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 树的可读名称（默认「JSON 树」） | — | — |
| `compact` | 紧凑模式（默认行高 20、字号 11px、更小工具栏内边距） | — | — |
| `copyable` | 复制按钮开关；`false` 只隐藏按钮，复制方法仍可调用 | `string` | — |
| `default-expand-depth` | 初始展开深度：0 只显示根，1 展开根（默认），依此类推 | `string` | `1` |
| `expanded` | 受控展开的节点 path 数组（JSON 字符串）；属性在场即受控，组件只派发事件不写回 | `string[]` | — |
| `height` | 视口高度（px，默认 360） | `string` | `360` |
| `indent` | 复制容器 JSON 时的缩进空格数（默认 2） | `string` | `2` |
| `row-height` | 固定行高（px，默认 24，最小 20） | `string` | — |
| `search` | 搜索关键词（大小写不敏感子串，匹配对象键与原始值） | `string` | — |
| `search-shortcut` | 组件内聚焦时拦截 Ctrl/Cmd+F 聚焦搜索框；`false` 关闭 | `string` | — |
| `text` | JSON 原文（attribute 通道；SSR/DSD 可用） | `string` | — |
| `toolbar` | 工具栏开关；`false` 隐藏搜索、展开与复制按钮 | `string` | — |
| `virtual` | 虚拟滚动开关；默认自动（可见行超过 200 时启用），`false` 强制关闭 | `string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `data` | 对象/数组通道（property）；与 text 最近写入者生效 | `JsonValue` | — |
| `expanded` | 受控展开 path 数组 property；写入等价于设置 expanded 属性 | `string[]` | — |
| `search` | 搜索关键词 property；写入反射 search 属性 | `string` | — |
| `text` | JSON 原文 property；写入时清空 data 缓存 | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `expandAll` | `expandAll(): void` | 展开全部容器节点；受控模式派发 oas-expanded-change |
| `collapseAll` | `collapseAll(): void` | 收起全部容器节点 |
| `expandToDepth` | `expandToDepth(depth: number): void` | 展开到指定深度：0 只留根，1 根+子级，依此类推 |
| `scrollToPath` | `scrollToPath(path: string): void` | 滚动到指定 JSONPath，并临时展开折叠祖先 |
| `searchNext` | `searchNext(): void` | 跳到下一个搜索命中（循环） |
| `searchPrev` | `searchPrev(): void` | 跳到上一个搜索命中（循环） |
| `copyPath` | `copyPath(path: string): Promise<boolean>` | 复制 JSONPath（默认当前活动节点） |
| `copyValue` | `copyValue(path: string): Promise<boolean>` | 复制值：原始值原文，容器格式化 JSON |
| `copyJson` | `copyJson(path: string): Promise<boolean>` | 复制子树 JSON（字符串带引号） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-copied` | 复制成功后派发，`detail: { path, kind, text }` |
| `oas-copy` | 复制前派发，可取消，`detail: { path, kind, text }` |
| `oas-copy-error` | 剪贴板写入失败，`detail: { path, kind, text, error }` |
| `oas-expanded-change` | 批量展开/收起被调用，`detail: { paths }`；受控模式等待宿主写回 |
| `oas-parse-error` | text 解析失败时派发，`detail: { message, line?, column?, source }` |
| `oas-search-change` | 搜索状态变化，`detail: { query, matches, activeIndex }`；无命中 activeIndex 为 -1 |
| `oas-toggle` | 展开/收起时派发，`detail: { path, expanded }`；受控模式只派发不写回 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="toggle-collapsed"]` | 折叠态图标模板（文本 / SVG / 带框元素均可，未提供时用默认三角形） |
| `template[slot="toggle-expanded"]` | 展开态图标模板（未提供时用默认三角形；叶节点不显示图标） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-json-viewer-font-size` | 代码字号（默认 12px） | `12px` |
| `--oas-json-viewer-height` | 视口高度（默认 360px；未设置 height 属性时生效） | `360px` |
| `--oas-json-viewer-row-height` | 行高（默认 24px，支持 CSS 长度；未设置 row-height/compact 时生效） | `24px` |
