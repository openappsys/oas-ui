# SwipeCell 滑动操作

列表项横向滑动露出操作按钮组：默认插槽为**内容层**（列表项主体），`slot="actions"` 为**操作按钮组**（宿主放置 `button` / `oas-button`）。向 inline-start 方向滑动内容层即可露出 inline-end 侧的操作区，松手按位移阈值吸附开合；`oas-open` / `oas-close` 在开 / 关落定时各派发一次（程序性 `open` 属性变化同样派发）。

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

`threshold` 控制释放吸附阈值（默认 40px，位移超过即吸附到开态，否则回弹）；`disabled` 全禁手势；`open` 可读写用于受控或程序化开合。程序化改 `open` 也会派发 `oas-open` / `oas-close`。

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
    <oas-swipe-cell id="swipe-open-demo" open>
      <div style="padding: var(--oas-space-3) var(--oas-space-4); background: var(--oas-color-bg); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">初始 open：操作区已露出</div>
      <oas-button slot="actions" type="primary" style="height: 100%">编辑</oas-button>
    </oas-swipe-cell>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="swipe-open-toggle" size="small">切换 open</oas-button>
    </div>
  </div>
</DemoBlock>

## 键盘与无障碍

- 操作区为 `role="group"` 并带可访问名（i18n `swipeCell.actionsLabel`）。
- 操作按钮在 DOM 中天然 tabbable：焦点进入操作区时自动进入开态，键盘用户无需滑动手势即可看到并操作按钮。
- 按 Esc 关闭打开项；`prefers-reduced-motion` 下吸附无过渡动画。
- 组件不改动内容层的角色与语义，读屏按宿主提供的结构朗读。

## API

### oas-swipe-cell

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 全禁手势 | `boolean` | — |
| `open` | 打开态（可读写；程序性变化派发 oas-open / oas-close） | `boolean` | — |
| `threshold` | 释放吸附阈值（px）；位移超过则吸附到开态，否则回弹关 | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 落定关态时派发（手势、外点、滚动、Esc 或程序性 open 变化） |
| `oas-open` | 落定开态时派发（手势或程序性 open 变化） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 内容层（列表项主体）；组件不改动其语义 |
| `actions` | 操作按钮组（置于 inline-end 侧；role=group + aria-label） |

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
