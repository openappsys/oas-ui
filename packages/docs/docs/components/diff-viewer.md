# DiffViewer 文本差异查看器

只读文本差异查看器：行级差异 + 词级高亮、行内 / 并排两种视图、未修改区块折叠、固定行高虚拟滚动、完整键盘与读屏支持。适合配置版本对比、提示词审阅、格式化 JSON 前后对照等场景。不做编辑、合并、接受/拒绝变更或结构级 JSON diff。

## 基础用法

`old-text` / `new-text` 传入两段文本，默认行内（unified）视图：删除行带 `−`、新增行带 `+`，行号同时标出两侧位置。未修改行超过 `context`（默认 3）时折叠为可展开的占位行。

<DemoBlock title="配置文件版本对比">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-basic"
    height="280"
    context="2"
    aria-label="构建配置差异"
    old-text='{
  "name": "oas-ui",
  "version": "2.6.3",
  "debug": false,
  "targets": ["es2020", "es2022"],
  "plugins": ["a", "b"]
}'
    new-text='{
  "name": "oas-ui",
  "version": "2.7.0",
  "debug": true,
  "targets": ["es2022", "es2023"],
  "plugins": ["a", "b"]
}'
  ></oas-diff-viewer>
</DemoBlock>

词级高亮只标记成对替换行中真正变化的片段；行数不等的替换块保持整行高亮，避免误读。

## 空态与无差异

两侧都为空时显示空态占位；两侧内容相同时保留全部行并提示「两侧内容相同」。两种状态都保留 `role` 语义降级，不会产生空的 grid 结构。

<DemoBlock title="空态与相同内容">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-empty"
    height="120"
    aria-label="空态示例"
  ></oas-diff-viewer>
  <oas-diff-viewer
    style="width: 100%"
    id="dv-same"
    height="160"
    old-text='alpha
beta'
    new-text='alpha
beta'
  ></oas-diff-viewer>
</DemoBlock>

## 并排视图

`mode="split"` 切换为左右两列：旧文本在起始侧、新文本在结束侧（RTL 自动镜像），两侧按变更块对齐。`old-label` / `new-label` 覆盖列头文案。

<DemoBlock title="并排审阅">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-split"
    mode="split"
    height="240"
    old-label="v2.6.3"
    new-label="v2.7.0"
    split-min-width="480"
    old-text='server.host = "127.0.0.1"
server.port = 5175
cache.enabled = false
log.level = "warn"'
    new-text='server.host = "0.0.0.0"
server.port = 5175
cache.enabled = true
log.level = "info"'
  ></oas-diff-viewer>
</DemoBlock>

容器宽度小于 `split-min-width` 时自动降级为行内视图（`mode` 属性值不变），避免窄屏下每侧都不可读。并排行的 `data-op` 统一为 `replace`，真实增删操作在 `before-code` / `after-code` 单元格的 `data-op` 上；外部 `::part()` 定制请读取单元格。

## 折叠与批量操作

折叠行可点击、可 Tab 聚焦、可按 `Enter` 展开。实例方法 `expandAll()` / `collapseAll()` 批量切换；折叠状态在数据更新后重置，避免旧位置与新内容错位。

<DemoBlock title="展开全部 / 收起未修改">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-3)">
    <oas-button id="dv-expand" size="small">展开全部</oas-button>
    <oas-button id="dv-collapse" size="small">收起未修改</oas-button>
    <oas-button id="dv-update" size="small" type="primary">模拟内容更新</oas-button>
  </div>
  <oas-diff-viewer
    style="width: 100%"
    id="dv-fold"
    height="260"
    context="1"
    old-text='1. install dependencies
2. copy config
3. build packages
4. run tests
5. publish artifacts
6. notify team'
    new-text='1. install dependencies
2. copy config
3. build packages
4. run unit tests
5. run e2e tests
6. publish artifacts
7. notify team'
  ></oas-diff-viewer>
  <p id="dv-fold-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">最近事件：—</p>
</DemoBlock>

## 长文本与虚拟滚动

对齐行数超过 `virtual-threshold`（默认 2000）时自动启用固定行高虚拟滚动，DOM 中只保留视口附近的行；`virtual="true"` 强制开启，`virtual="false"` 关闭。`height` 与 `row-height` 控制视口和行高。

<DemoBlock title="3000 行仅渲染视口">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-large"
    height="260"
    row-height="20"
    virtual="true"
    virtual-threshold="100"
    context="2500"
    aria-label="长文本差异"
  ></oas-diff-viewer>
  <p id="dv-large-state" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin:var(--oas-space-2) 0 0">正在生成数据…</p>
</DemoBlock>

## 比较策略

`ignore-whitespace` 在比较前归一空白（连续空白折叠、行首尾裁剪），显示仍为原文；`max-edits`（默认 1000）限制行级编辑距离，超出时降级为整块替换并给出提示，避免超大差异阻塞主线程。

<DemoBlock title="忽略空白差异">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-loose"
    height="180"
    ignore-whitespace
    max-edits="100"
    old-text='const a = 1
const b   = 2
const c = 3'
    new-text='const a = 1
const b = 2
const c = 4'
  ></oas-diff-viewer>
</DemoBlock>

## 纯文本审阅

`toolbar="false"` 隐藏统计与批量按钮，`show-line-numbers="false"` 隐藏行号，`wrap` 允许长行折行（折行时退出虚拟滚动，行高按内容自适应）。

<DemoBlock title="无工具栏、折行">
  <oas-diff-viewer
    style="width: 100%"
    id="dv-text"
    toolbar="false"
    wrap
    show-line-numbers="false"
    height="200"
    old-text='The quick brown fox jumps over the lazy dog. This sentence is intentionally long so that the wrap behaviour can be inspected in a narrow container.'
    new-text='The quick brown fox leaps over the lazy dog. This sentence is intentionally long so that the wrap behaviour can be inspected in a narrow container.'
  ></oas-diff-viewer>
</DemoBlock>

## 统计与事件

`stats` 只读 property 返回 `{ added, removed, unchanged, hunks }`；挂载与数据更新后派发 `oas-diff-change`（同结构 detail）。折叠块展开后派发 `oas-hunk-toggle`；`expandAll()` / `collapseAll()` 会为每个发生变化的折叠区间各派发一次（`expanded` 分别为 `true` / `false`），detail 为 `{ index, expanded, start, count }`。

```js
const viewer = document.querySelector('#dv-basic')
viewer.stats // { added: 3, removed: 3, unchanged: 3, hunks: 1 }
viewer.scrollToChange(0) // 滚动到第一个变更块
viewer.expandAll()
viewer.addEventListener('oas-hunk-toggle', (event) => {
  console.log(event.detail) // { index, expanded, start, count }
})
```

## 键盘与可访问性

视口是单一 Tab 焦点，`aria-activedescendant` 指向活动行；表格语义为 `role="grid"` + `row` + `gridcell`，行号对读屏隐藏，变更行带「新增行 N / 删除行 M」可访问名称。新增 / 删除同时用 `+` / `−` 前缀、背景色与读屏名称表达，不单靠颜色。

| 按键 | 行为 |
| --- | --- |
| `↑` / `↓` | 上/下一行 |
| `Home` / `End` | 首行 / 末行 |
| `PageUp` / `PageDown` | 向上 / 向下翻页 |
| `Enter` / `Space` | 展开/收起当前折叠块 |

## 主题与部件

新增 / 删除背景与词级高亮走专用不透明 token（`--oas-color-diff-add-bg` / `--oas-color-diff-del-bg` 及 `-word-` 变体，暗色自动切换），行号走 `--oas-color-diff-gutter-text`；可用 `::part()` 定制 `viewer`、`toolbar`、`status`、`added`、`removed`、`summary`、`split-head`、`row`、`code`、`before-no`、`after-no`、`fold`、`fold-toggle`、`placeholder`。RTL 下逻辑属性镜像，并排视图的旧文本保持在起始侧。

## API

从 `@oas-ui/ui/data/diff-viewer`（或 `@oas-ui/ui`）还可按需导入纯模型工具，便于宿主预处理或自定义渲染：`diffLines`、`layoutRows`、`buildDiffRows`、`layoutSplitRows`、`buildSplitRows`、`inlineSegments`、`splitLines`。这些函数不依赖 DOM。

### oas-diff-viewer

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 差异表格的可读名称（默认「差异对比」） | — | — |
| `context` | 折叠时每侧保留的未修改行数（默认 3；0 只保留变更行本身） | `string` | `3` |
| `height` | 视口高度（px，默认 480） | `string` | `480` |
| `ignore-whitespace` | 比较前归一空白（连续空白折叠、行首尾裁剪），显示仍为原文 | `boolean` | — |
| `max-edits` | 行级编辑距离上限（默认 1000）；超出时降级为整块替换并提示 | `string` | `1000` |
| `mode` | 视图模式：`unified`（行内，默认）/ `split`（并排） | `string` | `unified` |
| `new-label` | 并排视图新文本列头文案（默认「修改后」） | `string` | — |
| `new-text` | 新文本（attribute 通道；SSR/DSD 可用） | `string` | — |
| `old-label` | 并排视图旧文本列头文案（默认「修改前」） | `string` | — |
| `old-text` | 旧文本（attribute 通道；SSR/DSD 可用） | `string` | — |
| `row-height` | 固定行高（px，默认 22，最小 12） | `string` | `22` |
| `show-line-numbers` | 行号开关；`false` 隐藏行号单元格 | `string` | — |
| `split-min-width` | 并排视图最小容器宽度（px，默认 640）；不足时自动降级行内 | `string` | `640` |
| `toolbar` | 工具栏开关；`false` 隐藏统计与批量按钮 | `string` | — |
| `virtual` | 虚拟滚动：默认自动（对齐行超过 virtual-threshold 时启用），`true` 强制开启，`false` 关闭 | `string` | — |
| `virtual-threshold` | 自动启用虚拟滚动的对齐行数阈值（默认 2000） | `string` | `2000` |
| `wrap` | 长行折行；折行时退出虚拟滚动，行高随内容自适应 | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `newText` | 新文本 property；写入反射 `new-text` 属性 | `string` | — |
| `oldText` | 旧文本 property；写入反射 `old-text` 属性 | `string` | — |
| `stats` | 差异统计（只读）：`{ added, removed, unchanged, hunks }` | `DiffStats` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `expandAll` | `expandAll(): void` | 展开全部未修改区块 |
| `collapseAll` | `collapseAll(): void` | 收起全部未修改区块 |
| `scrollToChange` | `scrollToChange(index: number): boolean` | 滚动到指定变更块并聚焦其首行；越界返回 false |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-diff-change` | 数据更新后派发，`detail: { added, removed, unchanged, hunks }` |
| `oas-hunk-toggle` | 折叠块展开/收起后派发，`detail: { index, expanded, start, count }` |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-diff-viewer-add-bg` | `var(--oas-color-diff-add-bg)` |
| `--oas-diff-viewer-add-word-bg` | `var(--oas-color-diff-add-word-bg)` |
| `--oas-diff-viewer-del-bg` | `var(--oas-color-diff-del-bg)` |
| `--oas-diff-viewer-del-word-bg` | `var(--oas-color-diff-del-word-bg)` |
| `--oas-diff-viewer-height` | `480px` |
| `--oas-diff-viewer-row-height` | `22px` |

<script>
if (typeof window !== 'undefined') {
  customElements.whenDefined('oas-diff-viewer').then(() => {
    const fold = document.querySelector('#dv-fold')
    const state = document.querySelector('#dv-fold-state')
    const log = (message) => {
      if (state) state.textContent = `最近事件：${message}`
    }
    document.querySelector('#dv-expand')?.addEventListener('click', () => fold?.expandAll())
    document.querySelector('#dv-collapse')?.addEventListener('click', () => fold?.collapseAll())
    document.querySelector('#dv-update')?.addEventListener('click', () => {
      if (!fold) return
      const stamp = fold.newText.includes('8. archive logs') ? '7. notify team' : '7. notify team\n8. archive logs'
      fold.newText = fold.newText.replace('7. notify team', stamp)
      log(`内容已更新，${fold.stats.added} 行新增 / ${fold.stats.removed} 行删除`)
    })
    fold?.addEventListener('oas-hunk-toggle', (event) => {
      const detail = event.detail
      log(`折叠块 ${detail.index + 1} ${detail.expanded ? '已展开' : '已收起'}（${detail.count} 行）`)
    })
    fold?.addEventListener('oas-diff-change', (event) => {
      const detail = event.detail
      log(`差异更新：+${detail.added} / −${detail.removed} / ${detail.hunks} 处`)
    })

    const large = document.querySelector('#dv-large')
    const largeState = document.querySelector('#dv-large-state')
    if (large) {
      const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: config.value = ${i % 7 === 0 ? 'true' : 'false'}`)
      const changed = [...lines]
      changed[9] = 'line 10: config.value = CHANGED'
      changed[2399] = 'line 2400: config.value = ALSO_CHANGED'
      large.oldText = lines.join('\n')
      large.newText = changed.join('\n')
      if (largeState) {
        largeState.textContent = `已生成 3000 行，${large.stats.hunks} 处差异；滚动查看虚拟窗口。`
      }
    }
  })
}
</script>
