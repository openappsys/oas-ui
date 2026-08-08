# Progress 进度条

显示任务执行进度，支持线形与圆环两种形态、状态色与隐藏文字。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0"></oas-progress>
    <oas-progress percent="30"></oas-progress>
    <oas-progress percent="60"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

## 状态

<DemoBlock title="状态">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="66" status="error"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

## 隐藏文字

<DemoBlock title="隐藏文字">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="80"></oas-progress>
    <oas-progress percent="80" no-text></oas-progress>
  </oas-space>
</DemoBlock>

## 圆形进度

<DemoBlock title="Circle 圆环">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="0"></oas-progress>
    <oas-progress type="circle" percent="30"></oas-progress>
    <oas-progress type="circle" percent="60"></oas-progress>
    <oas-progress type="circle" percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

圆环默认直径 48、线宽 6，圆心显示百分比；`type="circle"` 切换形态。

## 圆形尺寸与线宽

<DemoBlock title="尺寸 / 线宽">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="75" size="72" stroke-width="10"></oas-progress>
    <oas-progress type="circle" percent="40" size="96" stroke-width="14"></oas-progress>
    <oas-progress type="circle" percent="60" size="48" stroke-width="4"></oas-progress>
  </oas-space>
</DemoBlock>

## 圆形状态

<DemoBlock title="Circle 状态色">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="66" status="error"></oas-progress>
    <oas-progress type="circle" percent="100" status="success"></oas-progress>
    <oas-progress type="circle" percent="40" show-text="false"></oas-progress>
  </oas-space>
</DemoBlock>

`status="success|error"` 整环变色（success 绿、error 红）；`show-text="false"` 隐藏圆心百分比。

## 动态进度

<DemoBlock title="动态进度">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-space size="large" wrap>
      <oas-progress id="dynamic-progress" percent="0"></oas-progress>
      <oas-progress id="dynamic-circle" type="circle" percent="0"></oas-progress>
    </oas-space>
    <oas-button type="primary" onclick="startProgress()">开始模拟任务</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.startProgress = () => {
    const bar = document.getElementById('dynamic-progress')
    const circle = document.getElementById('dynamic-circle')
    let percent = 0
    const timer = setInterval(() => {
      percent += 10
      bar.setAttribute('percent', String(percent))
      circle.setAttribute('percent', String(percent))
      if (percent >= 100) {
        clearInterval(timer)
        message.success('任务完成')
      }
    }, 300)
  }
})
</script>

## API

### 属性

| 属性           | 说明                                                                  | 类型      | 默认值  |
| -------------- | --------------------------------------------------------------------- | --------- | ------- |
| `percent`      | 进度百分比（0–100，自动夹取）                                         | `number`  | `0`     |
| `status`       | 状态色；`error` 红色、`success` 绿色，未设置且进度满 100 时显示成功绿 | `string`  | —       |
| `no-text`      | 隐藏右侧/圆心百分比文本                                               | `boolean` | `false` |
| `show-text`    | 是否显示百分比文本                                                    | `boolean` | `true`  |
| `type`         | 形态：`line`（线形）/ `circle`（圆环）                                | `string`  | `line`  |
| `size`         | circle 直径（px）                                                     | `number`  | `48`    |
| `stroke-width` | circle 线宽（px）                                                     | `number`  | `6`     |

`role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`（line 与 circle 均同步）。
