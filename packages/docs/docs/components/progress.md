# Progress 进度条

显示任务进度。

## 基础用法

<div class="demo" style="width: 400px">
  <oas-space direction="vertical">
    <oas-progress percent="40"></oas-progress>
    <oas-progress percent="100"></oas-progress>
    <oas-progress percent="66" status="error"></oas-progress>
  </oas-space>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `percent` | 进度 0-100 | `0` |
| `status` | `error` 等状态色 | — |
| `no-text` | 隐藏百分比文本 | `false` |

`role="progressbar"` + `aria-valuenow/min/max`。
