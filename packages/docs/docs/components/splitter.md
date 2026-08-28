# Splitter 分割面板

可调整面板尺寸的分割组件，支持鼠标拖拽、键盘方向键、双击复位、折叠、延迟渲染、多面板与自定义手柄。

## 基础用法

<DemoBlock title="默认 50/50">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 自定义初始比例

<DemoBlock title="30% / 70%">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="30">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 限制范围

<DemoBlock title="min / max 百分比">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="20" max="80">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 20% ~ 80%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 像素 min/max

min / max 支持像素值：`200px` 后缀按像素夹取（相对容器宽度换算），纯数字仍按百分比。

<DemoBlock title='min="200px" max="500px"'>
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="200px" max="500px">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板 200px ~ 500px</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 垂直方向

`vertical` 属性让面板上下堆叠、分隔条横向，键盘用 ↑ / ↓ 调整。

<DemoBlock title="vertical 上下堆叠">
  <div style="height: 260px; width: 100%">
    <oas-splitter vertical percent="40">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">上面板 40%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 折叠

`collapsible` 属性在分隔条上显示折叠按钮，点击收起/展开前一侧面板；折叠状态写回 `collapsed` 属性并派发 `oas-collapse` 事件。

<DemoBlock title="collapsible 折叠 / 展开">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-collapse-info">左面板：展开</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-collapse-demo" percent="50" collapsible>
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
      </oas-splitter>
    </div>
  </oas-space>
</DemoBlock>

<DemoBlock title="collapsed 初始折叠态">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" collapsible collapsed>
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板（初始折叠）</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 双击复位

双击分隔条回到初始比例（拖拽后想恢复时直接双击即可），复位同样会派发 `oas-resize`。

<DemoBlock title="双击分隔条复位">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">先拖拽分隔条，再双击分隔条复位回 30%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter percent="30">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板（初始 30%）</div>
      </oas-splitter>
    </div>
  </oas-space>
</DemoBlock>

## 延迟渲染

`lazy` 属性下拖拽时只移动分隔条的视觉位置、不实时重渲面板内容，松手才写回比例并派发一次 `oas-resize`，适合内容渲染较重的面板。

<DemoBlock title="lazy 拖拽延迟落盘">
  <div style="height: 200px; width: 100%">
    <oas-splitter lazy percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 手柄定制

`slot="handle"` 可在分隔条内放自定义手柄内容（图标/圆点等），拖拽与键盘操作不受影响。

<DemoBlock title='slot="handle" 自定义手柄'>
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
      <div slot="handle" style="display: flex; gap: 2px; align-items: center">
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
      </div>
    </oas-splitter>
  </div>
</DemoBlock>

## 多面板

直接子元素即面板，分隔条自动插在相邻面板间；`sizes` 用逗号分隔的百分比指定各面板比例，数量不匹配时回落均分。每个分隔条独立支持拖拽/键盘/折叠。

<DemoBlock title="multiple 三面板 sizes">
  <div style="height: 200px; width: 100%">
    <oas-splitter sizes="30,40,30" collapsible>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">面板一 30%</div>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">面板二 40%</div>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">面板三 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## 调整事件

<DemoBlock title="oas-resize 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-info">左侧占比：50%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-demo" percent="50">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">左面板</div>
      </oas-splitter>
    </div>
    <oas-tag type="info">拖拽分隔条，或聚焦分隔条后使用 ← / → 方向键调整</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const splitter = document.getElementById('splitter-demo')
  const info = document.getElementById('splitter-info')
  splitter?.addEventListener('oas-resize', (e) => {
    info.textContent = `左侧占比：${e.detail.percent}%`
  })
  const collapseDemo = document.getElementById('splitter-collapse-demo')
  const collapseInfo = document.getElementById('splitter-collapse-info')
  collapseDemo?.addEventListener('oas-collapse', (e) => {
    collapseInfo.textContent = `左面板：${e.detail.collapsed ? '已收起' : '展开'}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 受控折叠：存在即收起分隔条前一侧面板（组件折叠时自动写回；外部设置/移除即时生效） | `boolean` | — |
| `collapsible` | 分隔条上显示折叠按钮，点击收起/展开前一侧面板 | `boolean` | — |
| `lazy` | 延迟渲染：拖拽中只动分隔条视觉位置，松手才写回比例并重渲面板（适合重内容面板） | `boolean` | — |
| `max` | 上一面板最大占比：数字按百分比，`200px` 后缀按像素夹取；非法回落默认 90 | `string` | `90` |
| `min` | 上一面板最小占比：数字按百分比，`200px` 后缀按像素夹取；非法回落默认 10 | `string` | `10` |
| `percent` | 上一面板占比（%） | `string` | `50` |
| `sizes` | 多面板模式各面板占比（逗号分隔百分比，如 `30,40,30`）；数量与面板数不匹配回落均分 | `string` | — |
| `vertical` | 垂直方向：面板上下堆叠，分隔条横向，键盘用 ArrowUp/Down | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-collapse` | 折叠按钮切换，`detail: { collapsed, side }`（side=left 指分隔条前一侧） |
| `oas-resize` | 调整后触发。两面板 `detail: { percent }`；多面板 `detail: { percent, index, sizes }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `handle` | 分隔条内自定义手柄内容（图标/圆点等），不设时回退默认 grip |
| `left` | 左面板内容（两面板模式） |
| `pane-${i}` | 内部插槽：多面板模式组件自动按面板索引分配，宿主无需设置 |
| `right` | 右面板内容（两面板模式） |

分隔条 `role="separator"` + `tabindex="0"`，聚焦后 ← / → 每次调整 1%。
