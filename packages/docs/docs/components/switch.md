# Switch 开关

`role="switch"` 的开关按钮。

## 基础用法

<DemoBlock title="基础用法">
  <oas-switch></oas-switch>
  <oas-switch checked></oas-switch>
</DemoBlock>

## 禁用与加载

<DemoBlock title="disabled / loading">
  <oas-switch disabled checked></oas-switch>
  <oas-switch loading checked></oas-switch>
</DemoBlock>

`loading` 显示加载动画并阻止切换，用于异步提交场景。

## 标签

`label` 属性在开关旁渲染文本标签，点击标签即可切换（原生 `label` 关联），同时为 `role="switch"` 提供可访问名称；`label-position="start"` 把标签放到开关左侧，默认 `end`（右侧）。也可以用默认插槽放入自定义内容（优先于 `label` 属性文本）。

<DemoBlock title="标签">
  <oas-space direction="vertical" size="small" style="width: 360px; background: var(--oas-color-bg-hover); padding: var(--oas-space-2)">
    <oas-switch label="消息通知"></oas-switch>
    <oas-switch label="仅安全更新" label-position="start"></oas-switch>
    <oas-switch label="插槽标签"><b>自定义内容</b></oas-switch>
    <oas-switch label="禁用态" disabled checked></oas-switch>
  </oas-space>
</DemoBlock>

热区说明：开关宿主宽度收缩为控件实际宽度（`width: fit-content`），在竖向布局容器（如上面的 `oas-space direction="vertical"`）中不会被拉伸成整行宽——视觉宽度与点击热区保持一致；需要扩大点击热区时用 `label` 提供可点文本。无 `label` 时宿主也可自设 `aria-label`（自动镜像到内部按钮作可访问名称）。

## 开关文案

`checked-text` / `unchecked-text` 在开关上显示对应文案：medium/large/xl 尺寸显示在轨道内滑块对侧，`size="xs"` / `size="small"` 时文案放到开关外侧。

<DemoBlock title="开关文案">
  <oas-switch checked-text="开" unchecked-text="关"></oas-switch>
  <oas-switch checked checked-text="已开启" unchecked-text="已关闭"></oas-switch>
  <oas-switch size="xs" checked-text="开" unchecked-text="关"></oas-switch>
  <oas-switch size="small" checked-text="开" unchecked-text="关"></oas-switch>
</DemoBlock>

## 尺寸

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；非法值回落 `medium` 并提示告警。

<DemoBlock title="五种尺寸">
  <oas-switch size="xs" checked></oas-switch>
  <oas-switch size="small" checked></oas-switch>
  <oas-switch size="medium" checked></oas-switch>
  <oas-switch size="large" checked></oas-switch>
  <oas-switch size="xl" checked></oas-switch>
</DemoBlock>

## 自定义颜色

`color` 覆盖开启态主色（默认走 `--oas-color-primary`）。

<DemoBlock title="自定义颜色">
  <oas-switch checked color="#16a34a"></oas-switch>
  <oas-switch checked color="#dc2626" checked-text="危险开" unchecked-text="危险关"></oas-switch>
</DemoBlock>

## 滑块图标

`checked-icon` / `unchecked-icon` 在滑块上渲染图标（oas-icons 图标名），开启/关闭切换图标随之切换，适合星标收藏、昼夜模式等场景：

<DemoBlock title="滑块图标">
  <oas-switch checked-icon="star-filled" unchecked-icon="star"></oas-switch>
  <oas-switch checked-icon="check" unchecked-icon="close" size="large"></oas-switch>
</DemoBlock>

## 值映射

`true-value` / `false-value` 自定义开关的取值（字符串），`oas-change` 的 `detail.value` 返回当前映射值（未设置时为布尔 `true` / `false`）；读 `el.value` 也可直接获得当前映射值，适合表单提交 `'YES'` / `'NO'` 这类场景。

<DemoBlock title="true-value / false-value">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-value" true-value="YES" false-value="NO" label="表单值映射"></oas-switch>
    <oas-tag id="switch-value-info" type="info">value: "NO"</oas-tag>
  </oas-space>
</DemoBlock>

## 切换前拦截

`el.beforeChange = (next) => boolean | Promise<boolean>`（JS property 通道，attribute 传不了函数）：返回 `false` 或 Promise reject 则不切换；异步确认（如关闭两步验证前请求后端）在途期间组件进入加载态（spinner + 禁点），防止重复触发。

<DemoBlock title="before-change 异步确认">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-before" checked label="两步验证"></oas-switch>
    <oas-tag id="switch-before-info" type="info">关闭前将异步确认（约 800ms）</oas-tag>
  </oas-space>
</DemoBlock>

## 校验态

`status="success" | "warning" | "error"` 校验态着色（`error` 自动联动 `aria-invalid`，宿主自设 `aria-invalid` 等效 error 视觉）：

<DemoBlock title="status 校验态">
  <oas-switch status="success" checked></oas-switch>
  <oas-switch status="warning"></oas-switch>
  <oas-switch status="error"></oas-switch>
</DemoBlock>

## 宽度自定义

`--oas-switch-width` / `--oas-switch-height` / `--oas-switch-thumb-size` CSS 变量覆盖尺寸档的轨道宽 / 高 / 滑块大小（跨尺寸档生效）：

<DemoBlock title="CSS 变量尺寸">
  <oas-switch checked style="--oas-switch-width: 64px"></oas-switch>
  <oas-switch checked size="large" style="--oas-switch-width: 80px; --oas-switch-height: 34px"></oas-switch>
  <oas-switch checked style="--oas-switch-thumb-size: 14px"></oas-switch>
</DemoBlock>

## 事件

`oas-change`（`detail: { checked, value }`）、`oas-focus` / `oas-blur`（焦点进入 / 离开组件）。

<DemoBlock title="切换事件">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-event" checked label="事件演示"></oas-switch>
    <span id="switch-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
  </oas-space>
</DemoBlock>

受控用法：宿主持有状态时绑定 `checked` 属性并在 `oas-change` 里回写（Vue 下 `:checked="x"` + `@oas-change="x = $event.detail.checked"` 一行完成双向）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 值映射 demo：展示 change detail.value
  const valueEl = document.getElementById('switch-value')
  const valueInfo = document.getElementById('switch-value-info')
  valueEl?.addEventListener('oas-change', (e) => {
    valueInfo.textContent = `value: ${JSON.stringify(e.detail.value)}`
  })

  // before-change demo：异步确认（开启直接放行；关闭走 800ms 确认，在途 loading 防重复点击）
  const beforeEl = document.getElementById('switch-before')
  const beforeInfo = document.getElementById('switch-before-info')
  if (beforeEl) {
    beforeEl.beforeChange = async (next) => {
      if (next) return true
      beforeInfo.textContent = '正在确认…'
      await new Promise((r) => setTimeout(r, 800))
      beforeInfo.textContent = '已确认，切换完成'
      return true
    }
  }

  // 事件 demo：change / focus / blur
  const el = document.getElementById('switch-event')
  const out = document.getElementById('switch-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: checked=${e.detail.checked}, value=${JSON.stringify(e.detail.value)}`
  })
  el?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus'
  })
  el?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur'
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 可访问名（宿主覆盖通道，显式设置优先于 label 推导） | — | — |
| `checked` | 是否开启 | `boolean` | — |
| `checked-icon` | 选中态滑块图标（oas-icon 图标名） | `string` | — |
| `checked-text` | 开启时显示的文案；medium/large/xl 在轨道内，xs/small 在轨道外侧 | — | — |
| `color` | 开启态自定义主色，覆盖 `--oas-color-primary`（CSS 颜色值） | — | — |
| `disabled` | 禁用 | `boolean` | — |
| `false-value` | 未选中时的映射值 | `string` | — |
| `label` | 标签文本（label 通道，点击标签切换；slot 同名插槽可传富内容） | `string` | — |
| `label-position` | 标签位置：`end`（默认，右侧）/ `start`（左侧） | `string` | — |
| `loading` | 加载态，阻止切换 | `boolean` | — |
| `size` | 尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；非法值回落 `medium` 并告警 | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`；error 联动 aria-invalid | `string` | — |
| `true-value` | 选中时的映射值（读 value getter 取映射值） | `string` | — |
| `unchecked-icon` | 未选中态滑块图标 | `string` | — |
| `unchecked-text` | 关闭时显示的文案；medium/large/xl 在轨道内，xs/small 在轨道外侧 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 失焦时派发 |
| `oas-change` | 切换，`detail: { checked }` |
| `oas-focus` | 聚焦时派发 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
