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

## 开关文案

`checked-text` / `unchecked-text` 在开关上显示对应文案：medium/large 尺寸显示在轨道内滑块对侧，`size="small"` 时文案放到开关外侧。

<DemoBlock title="开关文案">
  <oas-switch checked-text="开" unchecked-text="关"></oas-switch>
  <oas-switch checked checked-text="已开启" unchecked-text="已关闭"></oas-switch>
  <oas-switch size="small" checked-text="开" unchecked-text="关"></oas-switch>
</DemoBlock>

## 尺寸

`size` 支持 `small` / `medium`（默认）/ `large` 三档。

<DemoBlock title="三种尺寸">
  <oas-switch size="small" checked></oas-switch>
  <oas-switch size="medium" checked></oas-switch>
  <oas-switch size="large" checked></oas-switch>
</DemoBlock>

## 自定义颜色

`color` 覆盖开启态主色（默认走 `--oas-color-primary`）。

<DemoBlock title="自定义颜色">
  <oas-switch checked color="#16a34a"></oas-switch>
  <oas-switch checked color="#dc2626" checked-text="危险开" unchecked-text="危险关"></oas-switch>
</DemoBlock>

## 事件

<DemoBlock title="切换事件">
  <oas-switch id="switch-event" checked></oas-switch>
  <span id="switch-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（`detail: { checked }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('switch-event')
  const out = document.getElementById('switch-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.checked}`
  })
})
</script>

## API

| 属性             | 说明                                                               | 默认值    |
| ---------------- | ------------------------------------------------------------------ | --------- |
| `checked`        | 是否开启                                                           | `false`   |
| `disabled`       | 禁用                                                               | `false`   |
| `loading`        | 加载态，阻止切换                                                   | `false`   |
| `checked-text`   | 开启时显示的文案；medium/large 在轨道内，small 在轨道外侧          | —         |
| `unchecked-text` | 关闭时显示的文案；medium/large 在轨道内，small 在轨道外侧          | —         |
| `size`           | 尺寸                                                               | `medium`  |
| `color`          | 开启态自定义主色，覆盖 `--oas-color-primary`（CSS 颜色值）         | —         |

| 事件         | 说明                        |
| ------------ | --------------------------- |
| `oas-change` | 切换，`detail: { checked }` |
