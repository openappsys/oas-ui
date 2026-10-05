# PullRefresh 下拉刷新

移动端下拉刷新容器组件：默认插槽为滚动内容（列表等），容器自身为滚动盒（高度由宿主约束）。列表滚到顶部继续下拉时露出顶部指示区，随拉动位移跟手（阻力曲线渐近位移上限）；释放超过阈值触发刷新——派发 `oas-refresh` 并停驻阈值高度进「刷新中」视觉，宿主完成异步刷新后移除 `refreshing` 属性，组件播「刷新成功」文案随后回弹复位。桌面端鼠标按住纵向拖拽同效（pointer events 统一），滚轮滚动不受干扰。配色走语义 token，暗色主题自动适配。

## 基础用法

给容器一个固定高度（宿主约束），内容为普通列表。触屏在列表顶部继续下拉；桌面按住鼠标左键纵向拖拽同效。释放后宿主置 `refreshing` 开始异步刷新，完成后移除（demo 模拟 900ms 数据拉取）。

<DemoBlock title="下拉刷新 + 事件可见反馈">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-basic" style="height: 280px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 01 —— 在顶部继续下拉试试</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 04</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 05</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 06</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 07</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 08</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 09</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 10</div>
      <div style="padding: 10px 14px">列表项 11（滚回顶部再下拉可再次触发）</div>
    </oas-pull-refresh>
    <p id="pr-basic-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">在列表内从顶部向下拉 →</p>
  </div>
</DemoBlock>

## 阈值与阻力

`threshold`（默认 60px）决定释放时触发刷新所需的拉动位移；`max-pull`（默认 100px）为位移上限——拉动位移按阻力曲线 `pull = maxPull × (1 − e^(−dy/maxPull))` 渐近上限（每像素增益递减，模拟「物理阻尼」手感）。位移过阈值后指示区箭头翻转、文案变「松开立即刷新」；不足阈值释放则回弹归零，无任何副作用。

<DemoBlock title="threshold=40 / max-pull=160：更轻的触发与更长的行程">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-threshold" threshold="40" max-pull="160" style="height: 240px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 01 —— 下拉 40px 以上松手即触发</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 04</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 05</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 06</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 07</div>
      <div style="padding: 10px 14px">列表项 08</div>
    </oas-pull-refresh>
    <p id="pr-threshold-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">试试更短的拉动距离 →</p>
  </div>
</DemoBlock>

## 禁用

`disabled` 全禁手势（config-provider 全局禁用注入同效）：拖拽中置位立即取消回弹，不派发任何事件。

<DemoBlock title="disabled：手势不响应">
  <div style="width: 100%">
    <oas-pull-refresh id="pr-disabled" disabled style="height: 180px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 01 —— 拉动无响应（已禁用）</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 02</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 03</div>
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--oas-color-border)">列表项 04</div>
      <div style="padding: 10px 14px">列表项 05</div>
    </oas-pull-refresh>
    <p id="pr-disabled-out" style="margin: 8px 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">disabled 下拉动不会触发 oas-refresh</p>
  </div>
</DemoBlock>

## 滚动协调与可访问性

- 容器带 `overscroll-behavior-y: contain`（防滚动链：顶部继续下拉不会把滚动传给页面或触发页面级下拉刷新）与 `touch-action: pan-y`；指针起始于顶部且向下拉时组件接管手势并 `preventDefault` 阻断原生滚动，起始于非顶部或向上拉则完全放行原生滚动。
- 滚轮滚动不受影响（手势只由 pointer 拖拽触发）。
- 指示区 `role="status"` + `aria-live="polite"`：状态文案切换（下拉刷新 → 松开立即刷新 → 刷新中… → 刷新成功）读屏自动播报；组件不抢键盘焦点，内容语义完全由宿主提供。
- `prefers-reduced-motion` 下回弹/翻转过渡停用（状态切换瞬时完成，spinner 保留）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（property 赋值/方法调用必须晚于自定义元素定义）
  Promise.all([customElements.whenDefined('oas-pull-refresh')]).then(() => {
    // oas-refresh → 宿主置 refreshing 模拟异步刷新 → 完成移除 → success 文案 → 复位
    const wire = (id, outId, delay) => {
      const host = document.getElementById(id)
      const out = document.getElementById(outId)
      let timer = null
      host?.addEventListener('oas-refresh', () => {
        if (out) out.textContent = 'oas-refresh 已派发 → 宿主拉取数据中（refreshing 停驻）'
        host.setAttribute('refreshing', '')
        clearTimeout(timer)
        timer = setTimeout(() => {
          host.removeAttribute('refreshing')
          if (out) out.textContent = '刷新完成（refreshing 已移除 → 「刷新成功」→ 回弹复位）'
        }, delay)
      })
    }
    wire('pr-basic', 'pr-basic-out', 900)
    wire('pr-threshold', 'pr-threshold-out', 700)
    wire('pr-disabled', 'pr-disabled-out', 700)
  })
})
</script>

## API

### oas-pull-refresh

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 全禁下拉手势（config-provider 全局禁用注入同效）；拖拽中途置位立即取消回弹，不派发事件 | `boolean` | — |
| `max-pull` | 拉动位移上限（px，默认 100）：阻力曲线 `pull = maxPull × (1 − e^(−dy/maxPull))` 渐近上限，增益递减 | — | — |
| `refreshing` | 刷新中（宿主受控）：oas-refresh 派发后宿主置 true 开始异步刷新，完成后移除；组件播 success 文案约 600ms 后回弹复位；refreshing 期间再次下拉忽略；无手势直接置位（程序性刷新）同样停驻刷新中视觉、不派发事件 | `boolean` | — |
| `threshold` | 触发刷新的下拉阈值（px，默认 60）：释放时拉动位移达到该值才派发 oas-refresh；非法/非正回落默认，生效值夹取不超过 max-pull | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-refresh` | 下拉位移达到阈值后释放时派发一次；组件停驻阈值高度进刷新中视觉，等宿主置 refreshing（不置则保持停驻等待宿主） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 滚动内容（列表等）；容器自身为滚动盒（overflow-y: auto），高度由宿主约束 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-pull-refresh-indicator-height` | `48px` |
| `--oas-pull-refresh-label-color` | `var(--oas-color-text-secondary)` |
| `--oas-pull-refresh-spinner-color` | `var(--oas-color-primary)` |

#### Parts

| Part | 说明 |
| --- | --- |
| `root` | 滚动盒容器（overflow-y: auto + 防滚动链） |
| `track` | 位移层（拉动 transform 承载，回弹过渡） |
| `indicator` | 指示区（role="status" + aria-live="polite"） |
| `arrow` | 下拉箭头（过阈值翻转，刷新中/成功态隐藏） |
| `spinner` | 刷新中旋转指示器（与箭头互斥） |
| `label` | 状态文案（i18n 四态） |
| `content` | 内容区（默认插槽投影） |
