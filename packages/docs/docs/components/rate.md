# Rate 评分

星级评分，支持键盘方向键调节、半星交互、悬停预览、只读展示与触屏拖拽，默认点击已选中的同一颗星可清空。

## 基础用法

<DemoBlock title="基础用法">
  <oas-rate value="3"></oas-rate>
</DemoBlock>

## 自定义数量

<DemoBlock title="max">
  <oas-rate value="7" max="10"></oas-rate>
</DemoBlock>

通过 `max` 设置星星数量。

## 半选

<DemoBlock title="半选（allow-half）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-half" value="3.5" allow-half></oas-rate>
    <span id="rate-half-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
</DemoBlock>

`allow-half` 开启后半星可交互：点击星的**左半区**打 `i-0.5` 分、**右半区**打 `i` 分；键盘 `←`/`→` 以 `0.5` 步进。

## 悬停预览

<DemoBlock title="悬停预览（oas-hover）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-hover" value="2"></oas-rate>
    <span id="rate-hover-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
</DemoBlock>

悬停时星星按预览值填充（不提交 `value`），并派发 `oas-hover`（`detail: { value }`）；移出组件派发 `detail: { value: null }` 并回落已提交值显示。`allow-half` 下预览同样按半区 `0.5` 粒度。

## 点击清空

<DemoBlock title="点击清空（allow-clear）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-clear" value="3"></oas-rate>
    <span id="rate-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-2); flex-wrap: wrap;">
    <oas-rate value="4" allow-clear="false"></oas-rate>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">allow-clear="false"：点已选中的星不清空</span>
  </div>
</DemoBlock>

`allow-clear` 默认开启，再次点击当前已选中的同一颗星会清空为 `0` 并派发 `oas-change`（`detail: { value: 0 }`）；设为 `"false"` 后点击不清空。

## 尺寸

<DemoBlock title="尺寸（size）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate size="small" value="3"></oas-rate>
    <oas-rate value="3"></oas-rate>
    <oas-rate size="large" value="3"></oas-rate>
  </div>
</DemoBlock>

`size` 三档：`small`（16px）/ `medium`（默认 20px）/ `large`（28px）；可用 CSS 变量 `--oas-rate-star-size` 细调，非法值回落 `medium` 并告警。

## 自定义图标

<DemoBlock title="自定义图标（icon 属性）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate icon="♥" value="3"></oas-rate>
    <oas-rate icon="☕" value="2"></oas-rate>
    <oas-rate icon="⚡" value="5"></oas-rate>
  </div>
</DemoBlock>

通过 `icon` 属性传入字符或 SVG 标记即可替换星星图标：

<DemoBlock title="自定义图标（icon 属性 · SVG）">
  <oas-rate icon="<svg viewBox='0 0 16 16' width='20' height='20' aria-hidden='true' focusable='false'><path d='M8 1 L9.6 5.2 L14 5.8 L10.9 8.8 L11.8 13.2 L8 11 L4.2 13.2 L5.1 8.8 L2 5.8 L6.4 5.2 Z' fill='currentColor'/></svg>" value="4"></oas-rate>
</DemoBlock>

## 自定义图标（slot）

<DemoBlock title="自定义图标（slot）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4">
      <span slot="icon">★</span>
    </oas-rate>
    <oas-rate value="2">
      <svg slot="icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 2 L10 6.2 L14.5 6.8 L11.2 9.9 L12.2 14.4 L8 12.2 L3.8 14.4 L4.8 9.9 L1.5 6.8 L6 6.2 Z" fill="currentColor"/></svg>
    </oas-rate>
  </div>
</DemoBlock>

通过 `slot="icon"` 传入任意元素，会克隆到每一颗星上。优先级：`icon` 属性 > `slot="icon"` > 默认星形。

## 双态图标

<DemoBlock title="双态图标（void-icon）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="3" icon="❤" void-icon="♡"></oas-rate>
    <oas-rate value="2">
      <span slot="icon">●</span>
      <span slot="void-icon">○</span>
    </oas-rate>
  </div>
</DemoBlock>

未选中星的图标走 `void-icon`（属性或 `slot="void-icon"`），选中星仍走 `icon` 通道；半星的基座为 void 图标、覆盖层为选中图标。未配置 void 时全态同图标、仅颜色区分（默认描边星即天然双态）。

## 逐值符号

<DemoBlock title="逐值符号（icons 属性 / slot=icon-N）">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4" icons='["😡","😠","😐","🙂","😍"]'></oas-rate>
    <oas-rate value="2" highlight-selected-only icons='["😴","😪","😐","🙂","🤩"]'></oas-rate>
    <oas-rate value="5">
      <span slot="icon-1">1</span>
      <span slot="icon-2">2</span>
      <span slot="icon-3">3</span>
      <span slot="icon-4">4</span>
      <span slot="icon-5">5</span>
    </oas-rate>
  </div>
</DemoBlock>

每颗星可配不同符号，双通道：

- `icons` 属性：JSON 字符串数组（或 property `el.icons = [...]`），逐星覆盖；
- `slot="icon-N"`：声明式逐位插槽（N 从 1 起）。

逐星优先级：`icons[i]` > `slot="icon-N"` > `icon` 属性 > `slot="icon"` > 默认星形。

`highlight-selected-only` 切换填充规则为「仅选中那颗点亮」——逐值 emoji 分级场景必备（否则选中位之前的星会全部点亮）。

## 分级表情拼法

<DemoBlock title="分级表情拼法（icons + highlight-selected-only）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-grading" value="4" highlight-selected-only icons='["😞","😞","😐","😄","😄"]'></oas-rate>
    <span id="rate-grading-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
  </div>
</DemoBlock>

「≤ 2 分 😞、≤ 3 分 😐、其余 😄」的分级表情效果无需组件级开关，用 `icons` 逐值符号 + `highlight-selected-only` 组合即可拼出（点击上方评分切换表情）。

## 自定义颜色

<DemoBlock title="自定义颜色（color / void-color）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4" color="red"></oas-rate>
    <oas-rate value="3" color="#7c3aed" void-color="var(--oas-color-text-secondary)"></oas-rate>
  </div>
</DemoBlock>

`color` 为激活星颜色、`void-color` 为未激活星颜色，均支持 11 预设名（映射 `--oas-preset-*`，暗色自动适配）与任意 CSS 色值；缺省走 `--oas-color-warning` / `--oas-color-border` token（也可用 `--oas-rate-active` / `--oas-rate-void` 变量批量定制）。

## 分段阈值色

<DemoBlock title="分段阈值色（colors）">
  <oas-rate value="2" colors='["red","gold","green"]'></oas-rate>
</DemoBlock>

`colors` 按分值段变色（低分红高分绿）：JSON 字符串数组或 property `el.colors = [...]`，段边界按 `max` 均分（3 色即三等分），悬停预览联动变色。优先级：`colors` > `color` > 默认 token。

## 辅助文案

<DemoBlock title="辅助文案（texts + show-text）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="4" show-text texts="极差,失望,一般,满意,惊喜"></oas-rate>
    <oas-rate value="3.5" allow-half show-text texts="极差,失望,一般,满意,惊喜"></oas-rate>
  </div>
</DemoBlock>

`show-text` 在右侧显示当前分对应文案，`texts` 逗号分隔（半值取 `ceil` 档）；配置 `texts` 后 `aria-valuetext` 同步当前分文案供读屏播报。

## 分值展示

<DemoBlock title="分值展示（show-score + score-template）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="3.5" allow-half show-score></oas-rate>
    <oas-rate value="4" readonly show-score score-template="评分：{value} / 5"></oas-rate>
  </div>
</DemoBlock>

`show-score` 在右侧显示分值，`score-template` 用 `{value}` 占位（缺省仅数值）；与 `show-text` 同时设置时 `show-score` 优先。

## 只读

<DemoBlock title="只读（readonly）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="3.7" readonly show-score></oas-rate>
    <oas-rate value="4" readonly></oas-rate>
    <oas-rate value="4" disabled></oas-rate>
  </div>
</DemoBlock>

`readonly` 独立于 `disabled`：不变灰、不响应点击/键盘/悬停预览，值正常展示并随表单体系提交（`aria-readonly` 同步）；只读展示支持**任意小数**（如 `3.7` 按覆盖层宽度渲染）。`disabled` 则变灰并表达禁用语义。

## 禁用

<DemoBlock title="禁用">
  <oas-rate value="4" disabled></oas-rate>
</DemoBlock>

## 逐星提示

<DemoBlock title="逐星提示（tooltips）">
  <oas-rate value="4" tooltips="很差,较差,一般,不错,很棒"></oas-rate>
</DemoBlock>

`tooltips` 逗号分隔逐星文案，悬停对应星显示浮动提示（内部浅集成 `oas-tooltip`，视口坐标点定位）；列表长度之外的星不显示提示。

## 触屏拖拽

<DemoBlock title="触屏拖拽（touch 滑选）">
  <oas-rate value="3" allow-half></oas-rate>
</DemoBlock>

触屏设备上按住滑动可连续打分（`allow-half` 下按半区 `0.5` 粒度），拖拽结束后的合成点击不会误触点击清空；桌面鼠标仍走悬停预览 + 点击路径。请在触屏设备上体验。

## 事件

<DemoBlock title="变化事件">
  <oas-rate id="rate-event" value="2"></oas-rate>
  <span id="rate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（点击、清空或键盘调节，`detail: { value }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('rate-event')
  const out = document.getElementById('rate-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('rate-clear')
  const clearOut = document.getElementById('rate-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    clearOut.textContent = `oas-change: ${e.detail.value}`
  })

  const halfEl = document.getElementById('rate-half')
  const halfOut = document.getElementById('rate-half-output')
  halfEl?.addEventListener('oas-change', (e) => {
    halfOut.textContent = `oas-change: ${e.detail.value}`
  })

  const hoverEl = document.getElementById('rate-hover')
  const hoverOut = document.getElementById('rate-hover-output')
  hoverEl?.addEventListener('oas-hover', (e) => {
    hoverOut.textContent = `oas-hover: ${e.detail.value}`
  })

  const gradingEl = document.getElementById('rate-grading')
  const gradingOut = document.getElementById('rate-grading-output')
  gradingEl?.addEventListener('oas-change', (e) => {
    gradingOut.textContent = `当前 ${e.detail.value} 分`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-clear` | 点击已选中的同一颗星时清空为 `0` | `string` | `true` |
| `allow-half` | 允许半星 | `boolean` | — |
| `color` | 选中色（预设名或任意 CSS 色值） | — | — |
| `colors` | 分段阈值色 JSON 数组（按 max 均分分段，如 `["#f5222d","#faad14","#52c41a"]` 三段） | `string[] \| null` | — |
| `disabled` | 禁用 | `boolean` | — |
| `highlight-selected-only` | 仅高亮选中星（其余保持未选中色） | `boolean` | — |
| `icon` | 自定义星星图标（字符或 SVG 标记） | — | — |
| `icons` | 逐值图标 JSON 数组（每值可配不同图标，如笑脸分级 😞😞😐😄😄；property 通道亦可赋数组） | `string[] \| null` | — |
| `max` | 星星数量 | `string` | `5` |
| `readonly` | 只读（独立于 disabled：不可交互、正常显示、仍随表单提交） | `boolean` | — |
| `score-template` | 分值模板串，`{value}` 占位（如 `"{value} 分"`），优先于 show-text | `string` | `{value}` |
| `show-score` | 只读场景显示分值（配 score-template） | `boolean` | — |
| `show-text` | 显示当前分值对应文案（texts） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认 20px）/ `large`（28px） | `string` | — |
| `texts` | 各分值辅助文案（逗号分隔，配 show-text） | — | — |
| `tooltips` | 逐星 tooltip 文案（逗号分隔，hover 星时显示；oas-tooltip 浅集成） | — | — |
| `value` | 当前分值（受控） | `string` | `0` |
| `void-color` | 未选中色 | — | — |
| `void-icon` | 未选中图标名（如 heart 配 ♥/♡ 双态） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 分值变化，`detail: { value }` |
| `oas-hover` | hover 星时派发，`detail: { value }`；移出为 `{ value: null }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `icon` | — |
| `void-icon` | — |

图标自定义：`icon` 属性 > `slot="icon"`（克隆到每颗星）> 默认星形。

键盘：`←`/`→`（或 `↑`/`↓`）增减，`Home` 归零，`End` 打满。
