# Progress 进度条

显示任务执行进度，支持线形 / 圆环 / 仪表盘三种形态、状态色、不确定态、自定义颜色与文本、条纹、步进分段、缓冲段等能力。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0"></oas-progress>
    <oas-progress percent="30"></oas-progress>
    <oas-progress percent="60"></oas-progress>
    <oas-progress percent="100"></oas-progress>
  </oas-space>
</DemoBlock>

`percent` 为当前进度值（默认值域 0–100，自动夹取）；进度满 100 且未设置 `status` 时自动显示成功绿。`value` 是 `percent` 的别名（两者同设时 `percent` 优先），宿主按直觉写 `value` 同样生效。

## 状态

<DemoBlock title="状态">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="66" status="warning"></oas-progress>
    <oas-progress percent="66" status="error"></oas-progress>
    <oas-progress percent="100" status="success"></oas-progress>
  </oas-space>
</DemoBlock>

`status` 支持 `success`（绿）/ `warning`（橙）/ `error`（红）三档语义色，优先级高于「满值自动成功绿」。

## 隐藏文字

<DemoBlock title="隐藏文字">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="80"></oas-progress>
    <oas-progress percent="80" no-text></oas-progress>
  </oas-space>
</DemoBlock>

`no-text` 隐藏右侧/圆心百分比；`show-text="false"` 等效。

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

<DemoBlock title="Circle 状态色与状态图标">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="66" status="error"></oas-progress>
    <oas-progress type="circle" percent="66" status="warning"></oas-progress>
    <oas-progress type="circle" percent="100" status="success"></oas-progress>
    <oas-progress type="circle" percent="100"></oas-progress>
    <oas-progress type="circle" percent="40" show-text="false"></oas-progress>
  </oas-space>
</DemoBlock>

`status="success|error|warning"` 整环变色，且圆心百分比自动替换为对应状态图标（✓ / ✗ / 警示，真 SVG 图标）；未设 `status` 且进度满 100 时圆心同样显示成功图标。

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

## 不确定态

<DemoBlock title="Indeterminate 不确定加载">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress indeterminate label="数据加载中"></oas-progress>
    <oas-progress indeterminate status="error"></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" indeterminate></oas-progress>
      <oas-progress type="dashboard" indeterminate></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

`indeterminate` 表示「时长未知的进行中」：忽略 `percent` / `steps` / `buffer` / `striped`，line 为滑块扫过动画、circle / dashboard 为分段弧旋转；同时按无障碍规范摘除 `aria-valuenow`。`label` 属性为屏幕阅读器提供无障碍名（视觉不可见）。

## 仪表盘

<DemoBlock title="Dashboard 仪表盘">
  <oas-space size="large" wrap align="center">
    <oas-progress type="dashboard" percent="25"></oas-progress>
    <oas-progress type="dashboard" percent="60"></oas-progress>
    <oas-progress type="dashboard" percent="100"></oas-progress>
    <oas-progress type="dashboard" percent="75" size="96" stroke-width="12" label="存储空间">
      <b>75/128G</b>
    </oas-progress>
  </oas-space>
</DemoBlock>

`type="dashboard"` 为底部开口的仪表盘形态（270° 可用弧），`size` / `stroke-width` / `status` / `color` / `stroke-linecap` 与圆环一致；默认插槽投影到盘心（如上例 `75/128G`）。

## 自定义颜色

<DemoBlock title="color / track-color 自定义色">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="40" color="magenta"></oas-progress>
    <oas-progress percent="60" color="#7c3aed" track-color="rgba(124,58,237,.15)"></oas-progress>
    <oas-progress percent="80" color="linear-gradient(90deg, var(--oas-preset-cyan), var(--oas-preset-blue))" striped-flow></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" percent="66" color="gold"></oas-progress>
      <oas-progress type="dashboard" percent="42" color="lime" track-color="cyan"></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

`color` / `track-color` 接受 11 个预设色板名（走主题 token，暗色自动适配）或任意 CSS 色串；`color` 还支持渐变串（建议仅 line 形态使用——环的描边无法消费 `linear-gradient()` 背景语法）。显式 `color` 优先于 `status` 语义色。

## 自定义文本

<DemoBlock title="默认插槽自定义文本">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="70"><span>剩余 2 分 10 秒</span></oas-progress>
    <oas-progress percent="35" max="200"><span>已下载 35MB / 200MB</span></oas-progress>
    <oas-space size="large" wrap>
      <oas-progress type="circle" percent="60"><b>3/5</b></oas-progress>
      <oas-progress type="dashboard" percent="88"><span>良好</span></oas-progress>
    </oas-space>
  </oas-space>
</DemoBlock>

默认插槽覆盖内置百分比：line 投影到右侧文本区，circle / dashboard 投影到圆心，并优先于状态图标。

## 条纹

<DemoBlock title="striped 条纹 / striped-flow 流动条纹">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="60" striped></oas-progress>
    <oas-progress percent="80" striped-flow></oas-progress>
    <oas-progress percent="45" status="warning" striped-flow></oas-progress>
    <oas-progress percent="30" size="large" striped></oas-progress>
  </oas-space>
</DemoBlock>

`striped` 叠加斜纹（密度随轨道高度自适应），`striped-flow` 在此之上让条纹流动（`striped-flow` 单独使用时自动含条纹）；仅 line 形态生效。

## 步进分段

<DemoBlock title="steps 步进分段">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="0" steps="3"></oas-progress>
    <oas-progress percent="50" steps="5" show-text="false"></oas-progress>
    <oas-progress percent="80" steps="8"></oas-progress>
    <oas-progress id="step-bar" percent="25" steps="4" status="warning"></oas-progress>
    <oas-space size="medium" wrap>
      <oas-button onclick="stepForward()">下一步</oas-button>
      <span id="step-label">第 1 / 4 步</span>
    </oas-space>
  </oas-space>
</DemoBlock>

`steps` 把 line 切成 N 等分段（gap 可用 `--oas-progress-step-gap` 覆盖），亮段数随 `percent` 四舍五入联动；仅 line 形态生效。

## 缓冲段

<DemoBlock title="buffer 缓冲进度（视频/下载）">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress id="buffer-bar" percent="10" buffer="35" label="视频播放缓冲"></oas-progress>
    <oas-space size="medium" wrap>
      <oas-button type="primary" onclick="startBuffer()">播放（模拟缓冲）</oas-button>
      <span id="buffer-label">已播 10% / 已缓冲 35%</span>
    </oas-space>
  </oas-space>
</DemoBlock>

`buffer`（与 `percent` 同值域）在轨道上渲染浅色缓冲段、主进度覆盖其上；仅 line 形态生效。

## 线形粗细与内嵌文本

<DemoBlock title="size 档位 / stroke-width / text-inside">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="30" size="small" no-text></oas-progress>
    <oas-progress percent="50" no-text></oas-progress>
    <oas-progress percent="70" size="large" no-text></oas-progress>
    <oas-progress percent="60" text-inside></oas-progress>
    <oas-progress percent="85" stroke-width="24" text-inside status="success"></oas-progress>
  </oas-space>
</DemoBlock>

line 形态下 `size` 为高度档位（`small` 4px / `medium` 8px / `large` 12px），`stroke-width` 直接指定轨道高度（px，优先于档位）；`text-inside` 把文本移入条内（未显式指定粗度时轨道自动提升高度）。

## 端帽

<DemoBlock title="stroke-linecap 圆环端帽">
  <oas-space size="large" wrap>
    <oas-progress type="circle" percent="42" stroke-linecap="round"></oas-progress>
    <oas-progress type="circle" percent="42" stroke-linecap="butt"></oas-progress>
    <oas-progress type="dashboard" percent="42" stroke-linecap="butt"></oas-progress>
  </oas-space>
</DemoBlock>

`stroke-linecap` 控制圆环 / 仪表盘进度弧的端帽形状：`round`（默认，圆头）/ `butt`（平头）；line 形态不适用。

## 值域

<DemoBlock title="max 值域">
  <oas-space direction="vertical" size="medium" style="width: 100%">
    <oas-progress percent="120" max="200"><span>120MB / 200MB</span></oas-progress>
    <oas-progress percent="160" max="200" buffer="190"></oas-progress>
    <oas-progress type="dashboard" percent="128" max="256" label="磁盘用量"></oas-progress>
    <oas-progress value="45" max="60"><span>45 / 60 分钟（value 别名写法）</span></oas-progress>
  </oas-space>
</DemoBlock>

`max` 定义满值（默认 100）：`percent` / `buffer` 语义为「当前值」（0–max 夹取），显示宽度与百分比按 `值 / max` 换算，`aria-valuenow` / `aria-valuemax` 同步真实值。

## 无障碍

- `role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax` 全形态同步；`indeterminate` 时按 APG 摘除 `aria-valuenow`。
- `label` 属性写入 `aria-label`，为屏幕阅读器提供可读名称（视觉不可见，见「不确定态」demo）。
- 组件级 CSS 变量开口：`--oas-progress-color` / `--oas-progress-track-color` / `--oas-progress-height` / `--oas-progress-buffer-color` / `--oas-progress-stripe-color` / `--oas-progress-stripe-size` / `--oas-progress-step-gap` / `--oas-progress-inside-color` / `--oas-progress-duration`。

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
  let step = 1
  window.stepForward = () => {
    step = step >= 4 ? 1 : step + 1
    const label = document.getElementById('step-label')
    const bar = document.getElementById('step-bar')
    label.textContent = `第 ${step} / 4 步`
    bar.setAttribute('percent', String((step / 4) * 100))
  }
  window.startBuffer = () => {
    const bar = document.getElementById('buffer-bar')
    const label = document.getElementById('buffer-label')
    let played = 10
    let buffered = 35
    const timer = setInterval(() => {
      played += 4
      buffered = Math.min(100, buffered + 3)
      bar.setAttribute('percent', String(played))
      bar.setAttribute('buffer', String(buffered))
      label.textContent = `已播 ${Math.min(played, 100)}% / 已缓冲 ${buffered}%`
      if (played >= 100) {
        clearInterval(timer)
        message.success('播放完成')
      }
    }, 300)
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `buffer` | 缓冲值（line 限定，0–max 夹取）：主进度之后的静态缓冲段，用于流式加载/视频缓冲场景 | `string` | — |
| `color` | 进度色：预设名（走 --oas-preset-* token）或任意 CSS 色串/渐变串（渐变建议 line）；优先于 status 语义色与满值绿 | `string` | — |
| `indeterminate` | 不确定态（无确定值加载）：忽略 percent/steps/buffer/striped，摘除 aria-valuenow（APG）；line 滑块扫过 / circle·dashboard 分段弧旋转 | `boolean` | — |
| `label` | 无障碍名（写入进度条的 aria-label） | — | — |
| `max` | 值域上限（默认 100）：percent/buffer 语义为当前值，宽度与文本按 value/max 换算，aria 同步真实值 | `string` | `100` |
| `no-text` | 隐藏右侧/圆心百分比文本 | `boolean` | — |
| `percent` | 进度百分比（0–100，自动夹取） | `string` | `0` |
| `show-text` | 是否显示百分比文本 | `string` | `true` |
| `size` | 尺寸：line=高度档 `small`(4px) / `medium`(8px，默认) / `large`(12px)；circle/dashboard=直径 px（默认 48） | `string` | `48` |
| `status` | 状态色；`error` 红色、`success` 绿色，未设置且进度满 100 时显示成功绿 | `string` | — |
| `steps` | 步进分段（line 限定）：整数 ≥2 等分，亮段数 = round(百分比 × 段数) | `string` | — |
| `striped` | 条纹纹理（line 限定） | `boolean` | — |
| `striped-flow` | 流动条纹（line 限定；单用自动含条纹） | `boolean` | — |
| `stroke-linecap` | 圆环端帽 `round`（默认）/ `butt`（circle/dashboard） | `string` | `round` |
| `stroke-width` | 线宽 px：circle/dashboard 圆环粗细（默认 6）；line 轨道高度（优先于 size 档位） | `string` | `6` |
| `text-inside` | 文本内嵌进度条内（line 限定；未显式指定粗细时轨道自动提升到可容纳文本） | `boolean` | — |
| `track-color` | 轨道色：协议同 color | `string` | — |
| `type` | 形态：`line`（默认）/ `circle` / `dashboard`（仪表盘：底部开口 270° 弧） | `string` | `line` |
| `value` | percent 的别名（当前进度值，与 percent 同值域 0–max 夹取）：两者同设时 percent 优先，仅 percent 缺失时读此值 | `string` | `0` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 自定义文本：line 右侧 / text-inside 条内 / 圆心；优先于状态图标与内置百分比 |

`role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`（line 与 circle 均同步）。
