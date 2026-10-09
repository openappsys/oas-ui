# SwipeCell 滑动操作

列表项横向滑动露出操作按钮组：默认插槽为**内容层**（列表项主体），`slot="actions"` 为**操作按钮组**（宿主放置 `button` / `oas-button`）。向 inline-start 方向滑动内容层即可露出 inline-end 侧的操作区，松手按位移阈值吸附开合；`oas-open` / `oas-close` 在开 / 关落定时各派发一次（程序性 `open` 属性变化同样派发）。同一项还可在**另一侧**再放一组操作（`slot="actions-start"`，见「双侧滑动」）——两侧同项互斥开合。

## 基础用法

单个滑动项：把内容放进默认插槽、操作按钮放进 `slot="actions"`。向左滑动（LTR）露出右侧操作区，松手吸附。

<DemoBlock title="单个滑动项">
  <div style="width: 100%">
    <oas-swipe-cell>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">向左滑动查看操作</div>
      <oas-button slot="actions" type="danger" style="height: 100%">删除</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## side：actions 挂左侧（向右滑开）

actions 默认挂 inline-end 侧（LTR 右侧，左滑露出）；`side="start"` 改挂 inline-start 侧（LTR 左侧，**向右滑开**）。side 是交互侧选择、与书写方向正交——RTL 下两侧定义自动镜像（侧位与滑动方向随逻辑方向翻转）。注意：当同项放置了 `slot="actions-start"` 时，`side` 被忽略、`slot="actions"` 恒归 inline-end（该槽专用于单槽场景）。

<DemoBlock title='side="start"：向右滑开'>
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-side" side="start">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">向右滑动查看操作</div>
      <oas-button slot="actions" type="primary">编辑</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## 多按钮并排

`slot="actions"` 可放多个按钮：组件按总宽度测量，滑开后整排露出（各自独立点击）：

<DemoBlock title="编辑 + 删除双按钮">
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-multi">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">向左滑动露出两个操作</div>
      <oas-button slot="actions" type="primary">编辑</oas-button>
      <oas-button slot="actions" type="danger">删除</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## 双侧滑动（两侧各有操作）

同一项可同时在两侧放置操作组：`slot="actions"` 在 inline-end 侧（LTR 左滑露出），`slot="actions-start"` 在 inline-start 侧（LTR 右滑露出）。同一手势双向拖动、可跨 0 端到端切换侧；同项内互斥（仅一侧开）。`open-side` 属性反映当前开侧（`start` / `end`），`oas-open` 事件的 `detail` 带 `{ side }`。

<DemoBlock title="左滑删除 / 右滑归档">
  <div style="width: 100%">
    <oas-swipe-cell id="swipe-dual">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">左滑露右侧「删除」，右滑露左侧「归档」</div>
      <oas-button slot="actions-start" type="primary">归档</oas-button>
      <oas-button slot="actions" type="danger">删除</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

## 单开互斥与事件

同一 document 内同一时刻至多一个滑动项处于打开态：任一项落定开态会广播，自动关闭其他打开项。点击空白处、滚动容器或按 Esc 也会关闭当前项。下方反馈区显示最近派发的 `oas-open` / `oas-close`。

<DemoBlock title="多个滑动项 + 事件反馈">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell id="swipe-demo-1">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">项目一</div>
      <oas-button slot="actions" type="primary" style="height: 100%">编辑</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell id="swipe-demo-2">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">项目二</div>
      <oas-button slot="actions" type="primary" style="height: 100%">编辑</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell id="swipe-demo-3">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">项目三</div>
      <oas-button slot="actions" type="danger" style="height: 100%">删除</oas-button>
    </oas-swipe-cell>
    <span id="swipe-demo-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滑动任意一项查看事件反馈</span>
  </div>
</DemoBlock>

## 阈值 / 禁用 / 程序开合

`threshold` 控制释放吸附阈值（默认 40px，位移超过即吸附到开态，否则回弹）；`disabled` 全禁手势；`open` 可读写用于受控或程序化开合（任一侧开着即为真）。程序化改 `open` 会派发 `oas-open` / `oas-close`；`open-side` 属性（或同名 property）指定/读取开哪一侧——置 `open-side` 与 `open` 即开该侧，事件 `detail.side` 告知是哪侧。

<DemoBlock title="threshold 与 disabled">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell threshold="100">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">阈值 100px：需滑过更远才吸附开态</div>
      <oas-button slot="actions" type="danger" style="height: 100%">删除</oas-button>
    </oas-swipe-cell>
    <oas-swipe-cell disabled>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">禁用：手势不生效</div>
      <oas-button slot="actions" type="danger" disabled style="height: 100%">删除</oas-button>
    </oas-swipe-cell>
  </div>
</DemoBlock>

<DemoBlock title="程序开合（open）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-swipe-cell id="swipe-open-demo" open open-side="end">
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">初始 open：操作区已露出</div>
      <oas-button slot="actions" type="primary" style="height: 100%">编辑</oas-button>
    </oas-swipe-cell>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="swipe-open-toggle" size="small">切换 open</oas-button>
    </div>
  </div>
</DemoBlock>

## 键盘与无障碍

- 操作区为 `role="group"` 并带可访问名（i18n `swipeCell.actionsLabel`）；双侧时两组各自具备。
- 操作按钮在 DOM 中天然 tabbable：焦点进入对应侧操作区时自动开该侧，键盘用户无需滑动手势即可看到并操作按钮。
- 按 Esc 关闭打开项；`prefers-reduced-motion` 下吸附无过渡动画。
- 组件不改动内容层的角色与语义，读屏按宿主提供的结构朗读。

## API

### oas-swipe-cell

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 全禁手势 | `boolean` | — |
| `open` | 打开态（可读写；任一侧开着即为真；程序性变化派发 oas-open / oas-close） | `boolean` | — |
| `open-side` | 当前/目标开侧：`start` / `end`；与 `open` 同设即开该侧，读取反映当前开侧 | `'' \| 'start' \| 'end'` | — |
| `side` | actions 挂侧：`end`（默认，inline-end——LTR 右/RTL 左，向 inline-start 滑开）/ `start`（inline-start，向 inline-end 滑开——LTR 右滑）；与书写方向正交，RTL 自动镜像；同项有 `actions-start` 时忽略 | `string` | `end` |
| `threshold` | 释放吸附阈值（px）；位移超过则吸附到开态，否则回弹关 | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 落定关态时派发（手势、外点、滚动、Esc 或程序性 open 变化） |
| `oas-open` | 落定开态时派发（手势或程序性 open 变化），`detail: { side }` 告知开侧 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 内容层（列表项主体）；组件不改动其语义 |
| `actions` | 操作按钮组（置于 inline-end 侧；role=group + aria-label） |
| `actions-start` | 另一侧操作按钮组（置于 inline-start 侧，右滑露出；与 actions 同项互斥开合） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-swipe-cell-actions-bg` | `var(--oas-color-bg-hover)` |
| `--oas-swipe-cell-bg` | `var(--oas-color-bg)` |
| `--oas-swipe-cell-offset` | `0px` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-swipe-cell').then(() => {
    const out = document.getElementById('swipe-demo-out')
    const show = (id, type) => {
      if (out) out.textContent = `${id} → oas-${type}`
    }
    for (const id of ['swipe-demo-1', 'swipe-demo-2', 'swipe-demo-3']) {
      const el = document.getElementById(id)
      el?.addEventListener('oas-open', () => show(id, 'open'))
      el?.addEventListener('oas-close', () => show(id, 'close'))
    }
    const toggle = document.getElementById('swipe-open-toggle')
    const openDemo = document.getElementById('swipe-open-demo')
    toggle?.addEventListener('click', () => {
      openDemo?.toggleAttribute('open')
    })
  })
})
</script>
