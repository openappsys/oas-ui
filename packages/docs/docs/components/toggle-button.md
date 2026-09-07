# ToggleButton 切换按钮

`aria-pressed` 二态切换按钮，按下态使用主色底。支持尺寸档、图标（含纯图标形态）、选中色与校验态。

## 基础用法

<DemoBlock title="基础">
  <oas-toggle-button value="bold">加粗</oas-toggle-button>
  <oas-toggle-button value="italic" pressed>斜体</oas-toggle-button>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-toggle-button id="tb-event" value="underline">下划线</oas-toggle-button>
  <span id="tb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tb-event')
  const out = document.getElementById('tb-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: ${e.detail.value}, pressed: ${e.detail.pressed} }`
  })
})
</script>

## 禁用

<DemoBlock title="禁用">
  <oas-toggle-button value="strike" disabled>删除线</oas-toggle-button>
  <oas-toggle-button value="strike" pressed disabled>删除线（按下）</oas-toggle-button>
</DemoBlock>

## 尺寸档（size）

`size` 三档 `small` / `medium`（默认）/ `large`，控高与字号对齐全局 token；未显式设置时就近读取 config-provider 的 `size` 注入（全局密度联动）：

<DemoBlock title="尺寸档">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-toggle-button size="small" value="sm">小号 Small</oas-toggle-button>
      <oas-toggle-button size="small" value="sm-pressed" pressed>小号（按下）</oas-toggle-button>
    </oas-space>
    <oas-space size="small">
      <oas-toggle-button value="md">中号 Medium（默认）</oas-toggle-button>
      <oas-toggle-button value="md-pressed" pressed>中号（按下）</oas-toggle-button>
    </oas-space>
    <oas-space size="small">
      <oas-toggle-button size="large" value="lg">大号 Large</oas-toggle-button>
      <oas-toggle-button size="large" value="lg-pressed" pressed>大号（按下）</oas-toggle-button>
    </oas-space>
  </oas-space>
</DemoBlock>

## 图标（icon / 纯图标）

`icon` 传入 `@oas-ui/icons` 注册表图标名，在文字前渲染图标（间距走 `--oas-space-2`）。**无文字时自动进入纯图标形态**（等宽正方形），可访问名兜底取图标名，建议用 `aria-label` 提供中文名称：

<DemoBlock title="图标与纯图标">
  <oas-space size="small">
    <oas-toggle-button value="favorite" icon="star">收藏</oas-toggle-button>
    <oas-toggle-button value="like" icon="heart" pressed>点赞</oas-toggle-button>
    <oas-toggle-button value="pin" icon="star" aria-label="收藏"></oas-toggle-button>
    <oas-toggle-button value="share" icon="external-link" aria-label="分享" pressed></oas-toggle-button>
  </oas-space>
</DemoBlock>

## 选中色（color）

`color` 按 ui-spec 统一协议解析：任意 CSS 色值（实底文字色按亮度自动取黑/白）优先；11 预设名（`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`）解析为 `--oas-preset-*` token（明暗主题自适应）；缺省主色。主题级批量定制走 CSS 变量 `--oas-toggle-color` / `--oas-toggle-on-color`：

<DemoBlock title="选中色">
  <oas-space size="small">
    <oas-toggle-button color="purple" value="purple" pressed>紫色选中</oas-toggle-button>
    <oas-toggle-button color="green" value="green" pressed>绿色选中</oas-toggle-button>
    <oas-toggle-button color="#0e7490" value="custom" pressed>自定义色</oas-toggle-button>
    <oas-toggle-button color="#e5e7eb" value="light" pressed>亮色选中（自动深字）</oas-toggle-button>
  </oas-space>
</DemoBlock>

## 校验态（status）

`status` 三态 `success` / `warning` / `error`：边框着语义色、focus ring 同步染色；`error` 联动宿主 `aria-invalid`（宿主自设 `aria-invalid="true"` 等效 error 视觉）：

<DemoBlock title="校验态">
  <oas-space size="small">
    <oas-toggle-button status="success" value="ok" pressed>成功</oas-toggle-button>
    <oas-toggle-button status="warning" value="warn">警告</oas-toggle-button>
    <oas-toggle-button status="error" value="err" pressed>错误</oas-toggle-button>
  </oas-space>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 可访问名（宿主覆盖通道，写入内部 button） | — | — |
| `color` | 选中色：预设名（--oas-preset-* token）或任意 CSS 色值（自动算文字色） | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `icon` | 图标（oas-icon 图标名）；无文本时纯图标等宽正方形 | `string` | — |
| `pressed` | 是否按下（受控） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`；error 联动 aria-invalid | `string` | — |
| `value` | 值（随事件回传） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value, pressed }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
