# Swatch 色板

内联预设色快选与展示的色块件：主题色/tag 色/收藏色等「不开面板直接选色」场景。`oas-swatch` 为色块件，`oas-swatch-group` 为选择组（单选 radio 语义 / 多选 checkbox 语义，roving 键盘导航）。

## 基础用法

单选组：点选色块，选中态为外环描边；`oas-change` 携带选中值。

<DemoBlock title="单选">
  <oas-swatch-group id="sw-single">
    <oas-swatch color="blue" label="蓝"></oas-swatch>
    <oas-swatch color="green" label="绿"></oas-swatch>
    <oas-swatch color="orange" label="橙"></oas-swatch>
    <oas-swatch color="#7c3aed" label="紫"></oas-swatch>
  </oas-swatch-group>
  <span id="sw-single-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：—</span>
</DemoBlock>

## 多选

设 `multiple` 后为多选（checkbox 语义），`value` 逗号分隔多个选中值（多选 value 通道建议用预设名或 hex 色值——含逗号的色值（如 `rgb(1,2,3)`）与逗号分隔符冲突，不建议在 multiple 组内使用）。

<DemoBlock title="多选">
  <oas-swatch-group id="sw-multi" multiple>
    <oas-swatch color="red" label="红"></oas-swatch>
    <oas-swatch color="gold" label="金"></oas-swatch>
    <oas-swatch color="cyan" label="青"></oas-swatch>
    <oas-swatch color="purple" label="紫"></oas-swatch>
  </oas-swatch-group>
  <span id="sw-multi-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：[]</span>
</DemoBlock>

## 形状与尺寸

`shape` 三态（square / rounded / circle）+ `size` 五档（xs/small/medium/large/xl）。

<DemoBlock title="形状与尺寸">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-swatch color="blue" shape="square" aria-label="方形"></oas-swatch>
      <oas-swatch color="blue" shape="rounded" aria-label="圆角"></oas-swatch>
      <oas-swatch color="blue" shape="circle" aria-label="圆形"></oas-swatch>
    </oas-space>
    <oas-space size="small">
      <oas-swatch color="green" size="xs" aria-label="xs"></oas-swatch>
      <oas-swatch color="green" size="small" aria-label="small"></oas-swatch>
      <oas-swatch color="green" size="medium" aria-label="medium"></oas-swatch>
      <oas-swatch color="green" size="large" aria-label="large"></oas-swatch>
      <oas-swatch color="green" size="xl" aria-label="xl"></oas-swatch>
    </oas-space>
  </oas-space>
</DemoBlock>

## 无色与混色

`nothing` 无色/透明指示（棋盘格底）；`mixed` 混色指示（多色拼贴，多值合并场景）。

<DemoBlock title="无色与混色">
  <oas-space size="small">
    <oas-swatch nothing aria-label="无色"></oas-swatch>
    <oas-swatch mixed aria-label="混色"></oas-swatch>
    <oas-swatch color="blue" disabled aria-label="禁用"></oas-swatch>
  </oas-space>
</DemoBlock>

## 受控选中（value）

组 `value` 为受控通道：外部设置属性即时反映到选中态。

<DemoBlock title="受控 value">
  <oas-swatch-group id="sw-controlled" value="green">
    <oas-swatch color="red" label="红"></oas-swatch>
    <oas-swatch color="green" label="绿"></oas-swatch>
    <oas-swatch color="blue" label="蓝"></oas-swatch>
  </oas-swatch-group>
  <oas-button id="sw-set-red" size="small">选红</oas-button>
  <oas-button id="sw-set-blue" size="small">选蓝</oas-button>
</DemoBlock>

## 键盘导航

Tab 进入组（roving 单停）→ 方向键漫游焦点（RTL 下水平方向镜像）→ Enter/Space 选中 → Home/End 直达首/末。禁用项不参与漫游。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-swatch-group').then(() => {
    const single = document.getElementById('sw-single')
    const singleOut = document.getElementById('sw-single-out')
    single?.addEventListener('oas-change', (e) => {
      if (singleOut) singleOut.textContent = '当前：' + e.detail.value
    })
    const multi = document.getElementById('sw-multi')
    const multiOut = document.getElementById('sw-multi-out')
    multi?.addEventListener('oas-change', (e) => {
      if (multiOut) multiOut.textContent = '当前：[' + e.detail.value.join(', ') + ']'
    })
    document.getElementById('sw-set-red')?.addEventListener('oas-click', () => {
      document.getElementById('sw-controlled')?.setAttribute('value', 'red')
    })
    document.getElementById('sw-set-blue')?.addEventListener('oas-click', () => {
      document.getElementById('sw-controlled')?.setAttribute('value', 'blue')
    })
  })
})
</script>

## API

### oas-swatch

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 可访问名覆盖（宿主直写优先级最高） | — | — |
| `color` | 填充色（CSS 色值或 11 预设名，颜色统一协议） | `string` | — |
| `disabled` | 禁用（不可点、不可聚焦） | `boolean` | — |
| `label` | 可访问名（缺省 i18n swatch.color + 色值） | — | — |
| `mixed` | 混色指示（多色拼贴，多值合并场景） | `boolean` | — |
| `nothing` | 无色/透明指示（棋盘格底，不依赖 color） | `boolean` | — |
| `selected` | 受控选中态（选中外环描边；组内由 oas-swatch-group 统一驱动） | `boolean` | — |
| `shape` | 形状：`square` / `rounded`（默认）/ `circle` | `string` | `rounded` |
| `size` | 边长档位：`xs` / `small` / `medium`（默认）/ `large` / `xl` | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { color }`（组内由组拦截后派发组级 oas-change） |

### oas-swatch-group

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 组可访问名（缺省走 locale 兜底） | — | — |
| `disabled` | 禁用整组（透传子件） | `boolean` | — |
| `multiple` | 多选模式（checkbox 语义） | `boolean` | — |
| `value` | 当前值：单选为子件 color 值；多选逗号分隔多个选中值 | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value: string \| string[] }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 色板子件（`<oas-swatch>`） |
