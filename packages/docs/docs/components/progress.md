# Progress 进度条

显示任务执行进度，支持状态色与隐藏文字。

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

## 动态进度

<DemoBlock title="动态进度">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress id="dynamic-progress" percent="0"></oas-progress>
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
    let percent = 0
    const timer = setInterval(() => {
      percent += 10
      bar.setAttribute('percent', String(percent))
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

| 属性      | 说明                                                      | 类型      | 默认值  |
| --------- | --------------------------------------------------------- | --------- | ------- |
| `percent` | 进度百分比（0–100）                                       | `number`  | `0`     |
| `status`  | 状态色；`error` 显示红色，未设置且进度满 100 时显示成功绿 | `string`  | —       |
| `no-text` | 隐藏右侧百分比文本                                        | `boolean` | `false` |

`role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`。
