---
description: 自由拖拽浮块：任意子元素包装成可拖拽块，指针统一拖拽（4px 阈值内视为点击），边界钳制（视口或选择器），方向轴限制、可选惯性与位置记忆，键盘方向键微调与 aria-live 位置播报。
---

# Drag 自由拖拽浮块

把任意子元素包成可拖拽的浮块：指针拖拽（鼠标 / 触屏 / 笔统一）、边界钳制、可选惯性与位置记忆；键盘方向键微调。典型场景是悬浮客服钮、悬浮工具块。

## 基础用法（悬浮客服钮）

默认整个宿主就是拖拽面，`boundary` 指定可拖动范围（这里用演示区容器，实际页面可用 `viewport`）。位移 4px 以内视为点击，按钮照常响应。

<DemoBlock title="boundary=&quot;#dg-stage&quot;">
  <div
    id="dg-stage"
    style="position: relative; width: 100%; height: 240px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover)"
  >
    <oas-drag
      id="dg-button"
      boundary="#dg-stage"
      remember
      storage-key="oas-drag-demo-button"
      style="position: absolute; inset-block-end: 16px; inset-inline-end: 16px"
    >
      <oas-button type="primary">在线客服</oas-button>
    </oas-drag>
  </div>
  <span id="dg-button-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">拖动客服钮试试（也可以 Tab 聚焦后用方向键微调）</span>
</DemoBlock>

## 手柄形态（工具块）

提供 `handle` 插槽时只有手柄区能起拖，其余区域保持原有交互；手柄内容自带焦点，宿主不再抢占 Tab 停靠点。

<DemoBlock title="handle 插槽">
  <div
    id="dg-stage-handle"
    style="position: relative; width: 100%; height: 220px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"
  >
    <oas-drag
      id="dg-panel"
      boundary="#dg-stage-handle"
      axis="both"
      style="position: absolute; inset-block-start: 12px; inset-inline-start: 12px; max-inline-size: 260px"
    >
      <div slot="handle" style="cursor: grab; padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md) 0 0 var(--oas-radius-md)">⠿ 拖动</div>
      <div style="padding: var(--oas-space-3); background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
        <strong>快捷工具</strong>
        <p style="margin: var(--oas-space-1) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">只有左侧手柄区能拖，面板内容照常点击。</p>
      </div>
    </oas-drag>
  </div>
</DemoBlock>

## 方向轴、惯性与位置播报

`axis="x"` 限制为横向拖拽；`inertia` 松手滑行（按最后速度每帧衰减 0.95、最多 60 帧，触边即停；最后一次速度采样距今超过 100ms 视为已停住、不滑行；`prefers-reduced-motion: reduce` 下瞬停）；`announce` 让位置变化经 `aria-live` 播报。

<DemoBlock title="axis=&quot;x&quot; + inertia + announce">
  <div
    id="dg-stage-axis"
    style="position: relative; width: 100%; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden"
  >
    <oas-drag
      id="dg-chip"
      boundary="#dg-stage-axis"
      axis="x"
      inertia
      announce
      style="position: absolute; inset-block-start: 36px; inset-inline-start: 12px"
    >
      <span style="display: inline-block; padding: var(--oas-space-2) var(--oas-space-4); background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); border-radius: 999px">横向拖动</span>
    </oas-drag>
  </div>
  <span id="dg-chip-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 吸附（网格与吸附点）

- `snap`：网格吸附——正整数值为网格尺寸（px），字面量 `grid` 按 8px。松手（含惯性滑行收尾）时把位移对齐到最近的网格点，并补一次 `oas-drag` 反映吸附后的终值。
- `snap-targets`：吸附点 JSON 数组 `[{ x, y }]`（相对初始布局位置的位移坐标）。松手时距最近吸附点小于等于 `snap-threshold`（默认 12px）即**精确吸附**；拖拽过程中接近吸附点会显示提示环（`part="snap-hint"`，虚线主色圆环，纯视觉、不参与命中）。
- 吸附只作用于**指针拖拽的落点**：键盘微调（1px / Shift 10px）与 `position` 写入保持精确，不被吸附改写；`axis` 单轴约束仍然生效（吸附加钳制的先后顺序不会绕过 axis）。
- 非法 `snap` / `snap-targets` / `snap-threshold` 一次性 devWarn 并按不吸附处理（拖拽本身照常工作）。

<DemoBlock title="网格吸附 snap=20 与吸附点 snap-targets">
  <div
    id="dg-stage-snap"
    style="position: relative; width: 100%; height: 220px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden"
  >
    <oas-drag
      id="dg-snap-grid"
      boundary="#dg-stage-snap"
      snap="20"
      style="position: absolute; inset-block-start: 16px; inset-inline-start: 16px"
    >
      <span style="display: inline-block; padding: var(--oas-space-2) var(--oas-space-3); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md)">网格吸附 20px</span>
    </oas-drag>
    <oas-drag
      id="dg-snap-target"
      boundary="#dg-stage-snap"
      snap-targets='[{"x":200,"y":30},{"x":60,"y":60}]'
      snap-threshold="16"
      style="position: absolute; inset-block-start: 120px; inset-inline-start: 16px"
    >
      <span style="display: inline-block; padding: var(--oas-space-2) var(--oas-space-3); background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); border-radius: var(--oas-radius-md)">吸附点（拖近看提示环）</span>
    </oas-drag>
  </div>
  <span id="dg-snap-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 无障碍与交互约定

- 整宿主拖拽形态下宿主是焦点停靠点（`tabindex="0"`，可访问名 i18n `drag.label`，操作提示经 `aria-describedby` 关联）；方向键微调 1px，Shift+方向键 10px，受 `axis` 与边界约束
- `announce` 开启时位置变化经 `aria-live="polite"` 播报；`disabled` 关闭拖拽并移除焦点停靠点
- 指针位移 4px 以内视为点击（不捕获指针、不阻止默认行为），因此子元素内的按钮、输入框照常工作
- 越过阈值的拖拽结束后，浏览器补发的那一次 `click` 会被吞掉（松手恰好落在子按钮上不误触），之后的正常点击不受影响；`pointercancel`（滚动 / 手势中断）只收尾拖拽，不写位置记忆、不起惯性
- 开 `inertia` 时一次甩动共派发**两次** `oas-drag-end`：松手（pointerup）一次、惯性滑行收尾一次（`source` 同为 `pointer`）；滑行被再次按下抢占时无滑行收尾。只需一次「结束」信号的场景按第二次到达处理，或以时间窗去重
- 手柄形态下只有手柄区起拖；子元素内的输入框保留自己的方向键语义

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../.vitepress/theme/when-defined'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const report = (id, label) => {
    const el = document.getElementById(id)
    if (!el) return
    onUpgraded(el, () => {
      text(`${id}-out`, `${label}：x ${el.position.x}, y ${el.position.y}`)
      el.addEventListener('oas-drag-end', (event) => {
        text(`${id}-out`, `${label}结束：x ${event.detail.x}, y ${event.detail.y}（${event.detail.source}）`)
      })
      el.addEventListener('oas-drag', (event) => {
        if (event.detail.source !== 'keyboard') return
        text(`${id}-out`, `${label}：x ${event.detail.x}, y ${event.detail.y}（键盘）`)
      })
    })
  }
  report('dg-button', '客服钮位置')
  report('dg-chip', '横向拖动位置')
  // 吸附：落点反馈（网格 / 吸附点的终值）
  const snapOut = document.getElementById('dg-snap-out')
  for (const [id, label] of [
    ['dg-snap-grid', '网格吸附'],
    ['dg-snap-target', '吸附点'],
  ]) {
    const el = document.getElementById(id)
    if (!el) continue
    onUpgraded(el, () => {
      el.addEventListener('oas-drag-end', (event) => {
        snapOut.textContent = `${label}落点：x ${event.detail.x}, y ${event.detail.y}`
      })
    })
  }
})
</script>

## API

### oas-drag

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `announce` | 位置变化经 `aria-live="polite"` 播报（缺省关闭） | `boolean` | — |
| `aria-label` | 可访问名称（缺省 i18n drag.label） | `string` | — |
| `axis` | 拖拽方向轴：`both`（缺省）/ `x` 仅横向 / `y` 仅纵向；非法值回落 `both` 并告警 | `string` | `both` |
| `boundary` | 拖拽边界：`viewport`（缺省，视口）或 CSS 选择器（该元素的矩形；未命中告警一次并回落视口） | `string` | `viewport` |
| `disabled` | 关闭拖拽：指针与键盘都不生效，并移除焦点停靠点 | `boolean` | — |
| `inertia` | 松手后惯性滑行（按最后速度每帧衰减 0.95、最多 60 帧，触边即停；最后一次速度采样距今超过 100ms 视为已停住、不滑行）；`prefers-reduced-motion: reduce` 下瞬停 | `boolean` | — |
| `keyboard` | 键盘微调：缺省开启（`tabindex="0"` + 方向键 1px / Shift+方向键 10px）；写 `false` 关闭 | `string` | — |
| `remember` | 把位置写入 `localStorage` 并在挂载时恢复；不可用（SSR / 隐私模式 / 配额满）时静默降级 | `boolean` | — |
| `snap` | 吸附网格尺寸：正整数值为网格 px，字面量 `grid` = 8px；松手（含惯性收尾）时位移对齐到最近网格点，键盘微调不受影响 | `string` | — |
| `snap-targets` | 吸附点 JSON 数组 `[{ x, y }]`（相对初始布局位置的位移坐标）：松手时距最近吸附点 ≤ `snap-threshold` 即精确吸附；拖拽中接近吸附点显示提示环（`part="snap-hint"`） | `string` | — |
| `snap-threshold` | 吸附点距离阈值（px，默认 12）；非法值告警一次并回落默认 | `string` | — |
| `storage-key` | 位置记忆的存储键（缺省 `oas-drag`） | `string` | `oas-drag` |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `position` | 当前位移 `{ x, y }`（相对初始布局位置）：get+set 双通道；赋值立即钳制生效，不派发事件 | `DragPosition \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `reset` | `reset(): void` | 回到初始位置（位移归零）并清除位置记忆 |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-drag` | 位置变化（指针拖拽 / 键盘微调 / 惯性滑行）时派发，`detail: { x, y, source }` |
| `oas-drag-end` | 指针拖拽结束时派发，`detail: { x, y, source }`；开惯性时一次甩动共派发两次——松手（pointerup）一次、惯性滑行收尾一次（source 同为 pointer），滑行被再次按下抢占时不派滑行收尾 |
| `oas-drag-start` | 指针拖拽越过 4px 阈值、接管指针时派发一次，`detail: { x, y, source }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 默认插槽：被包装的浮块内容（整宿主可拖时的拖拽面） |
| `handle` | 拖拽手柄区：提供内容后只有手柄区能起拖 |
