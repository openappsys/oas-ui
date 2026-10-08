# ActionBar 操作栏

底部命令条 + 读数井（容器 `role="group"` + aria-label）：命令按钮组 + 统计/任务进度读数井，三表体（charcoal/dark/light）。与 `oas-toolbar`（工具调色板）的分工——action-bar 是底部命令 + 读数，读数井是 toolbar 没有的词汇；因 center 槽常规承载读数井（progressbar 等读数区非命令控件），容器不作 `toolbar` 角色承诺（其 roving 方向键导航契约以纯命令集合为前提），降级 `group` 诚实播报，命令按钮各自原生 Tab 可达；媒体 transport/music 井延后 v2。

## 基础用法

`slot="start"` / 默认插槽放命令按钮（`oas-action-bar-button`），`slot="center"` 放读数井（`oas-action-bar-well` 容器 + `oas-statistic-well` / `oas-task-progress-well`），`slot="end"` 放末端内容。

<DemoBlock title="命令按钮 + 统计读数井">
  <div style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="snap" slot="start">Snap</oas-action-bar-button>
      <oas-action-bar-button value="markers">标记点 · 3</oas-action-bar-button>
      <oas-action-bar-button value="stereo">Stereo</oas-action-bar-button>
      <oas-action-bar-well slot="center" max-width="360">
        <oas-statistic-well label="帧率" value="25 fps"></oas-statistic-well>
        <oas-statistic-well label="分辨率" value="3840 × 2160" detail="Rec. 709"></oas-statistic-well>
      </oas-action-bar-well>
      <oas-action-bar-button value="settings" slot="end">48 kHz</oas-action-bar-button>
    </oas-action-bar>
  </div>
</DemoBlock>

## 命令按钮（oas-action / active / plain）

点击派发 `oas-action`（detail `{ value, active }`——active 为点击时刻状态）；`active` 布尔属性是选中态（受控显示，宿主监听事件回写）；`active-tint` 自定义高亮色（11 预设名或任意色值，如录音红）；`plain` 组内无填充。

<DemoBlock title="录制按钮（active-tint 录音红）与切换反馈">
  <div style="width: 100%">
    <oas-action-bar id="ab-btn">
      <oas-action-bar-button id="ab-record" value="record" active-tint="#e11d48" plain>● 录制</oas-action-bar-button>
      <oas-action-bar-button value="solo">Solo</oas-action-bar-button>
      <oas-action-bar-button value="mute">Mute</oas-action-bar-button>
    </oas-action-bar>
  </div>
  <p id="ab-btn-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点「录制」观察 oas-action 反馈与 active 态切换（宿主回写演示）。</p>
</DemoBlock>

## 表体（theme）

`theme="charcoal"`（默认，恒深表面）/ `"dark"`（恒深·深档）/ `"light"`（主题本色）三表体；恒深表面走 `--oas-color-ink*` 语义 token，不随宿主主题翻转（transport 条视觉锚点）。

<DemoBlock title="三表体对照">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-action-bar theme="charcoal">
      <oas-action-bar-button value="play">播放</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
    <oas-action-bar theme="dark">
      <oas-action-bar-button value="play">播放</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
    <oas-action-bar theme="light">
      <oas-action-bar-button value="play">播放</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="Timecode" value="00:00:43:05"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
  </div>
</DemoBlock>

## 任务进度井（oas-task-progress-well）

`label` / `progress`（0-100，受控显示——宿主驱动）/ `detail`；取消钮派发 `oas-cancel`（detail `{ label }`，组件只发事件不移除自身，宿主决定后续）；进度到 100 保留完成态。

<DemoBlock title="导出任务进度 + 取消">
  <div style="width: 100%">
    <oas-action-bar id="ab-task">
      <oas-action-bar-button value="export">导出</oas-action-bar-button>
      <oas-action-bar-well slot="center">
        <oas-task-progress-well id="ab-task-well" label="正在导出「宣传成片」" progress="62" detail="剩余约 40 秒"></oas-task-progress-well>
      </oas-action-bar-well>
    </oas-action-bar>
  </div>
  <p id="ab-task-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点井内 × 观察 oas-cancel 反馈；「导出」按钮驱动进度增长。</p>
</DemoBlock>

## RTL

容器 `dir="rtl"` 下组件自动镜像：`data-rtl` 钩子 + 全逻辑属性布局（井区 auto margin 推远端随书写方向镜像）。

<DemoBlock title="RTL 镜像">
  <div dir="rtl" style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="play">تشغيل</oas-action-bar-button>
      <oas-action-bar-well><oas-statistic-well label="الدقة" value="3840 × 2160"></oas-statistic-well></oas-action-bar-well>
    </oas-action-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const record = document.getElementById('ab-record')
  const btnOut = document.getElementById('ab-btn-out')
  record?.addEventListener('oas-action', (e) => {
    // 宿主回写演示：点击翻转 active（受控显示由宿主驱动）
    if (record.hasAttribute('active')) record.removeAttribute('active')
    else record.setAttribute('active', '')
    btnOut.textContent = `oas-action 已派发：value=${e.detail.value}，active（点击时刻）=${e.detail.active}，回写后 active=${record.hasAttribute('active')}`
  })
  const taskBar = document.getElementById('ab-task')
  const taskWell = document.getElementById('ab-task-well')
  const taskOut = document.getElementById('ab-task-out')
  let progress = 62
  let timer = null
  const exportBtn = taskBar?.querySelector('oas-action-bar-button[value="export"]')
  exportBtn?.addEventListener('oas-action', () => {
    if (timer) return
    timer = setInterval(() => {
      progress = Math.min(100, progress + 2)
      taskWell.setAttribute('progress', String(progress))
      if (progress >= 100) {
        clearInterval(timer)
        timer = null
        taskOut.textContent = '导出完成（进度 100% 保留完成态，宿主决定何时隐藏）'
      }
    }, 300)
  })
  taskWell?.addEventListener('oas-cancel', (e) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    taskOut.textContent = `oas-cancel 已派发：label=${e.detail.label}（组件不自行移除，宿主接取消逻辑）`
  })
})
</script>

## API

### oas-action-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `theme` | 表体：charcoal（默认，恒深表面）/ dark（恒深·深档）/ light（主题本色）；恒深表面走 --oas-color-ink* 语义 token，不随宿主主题翻转；非法值回落 charcoal 并告警一次（同值去重） | `string` | `charcoal` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 命令区（oas-action-bar-button 或任意命令控件） |
| `center` | 读数井区（oas-action-bar-well + 井子件；自动推到书写方向远端） |
| `end` | 末端区 |
| `start` | 前部命令区 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-action-bar-bg` | `var(--oas-color-ink)` |
| `--oas-action-bar-fg` | `var(--oas-color-on-ink)` |
| `--oas-action-bar-height` | `44px` |
