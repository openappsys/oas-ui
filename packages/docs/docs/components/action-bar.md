# ActionBar 操作栏

底部命令条 + 读数井（容器 `role="group"` + aria-label）：命令按钮组 + 统计/任务进度/媒体运输/音乐节奏读数井，三表体（charcoal/dark/light）。与 `oas-toolbar`（工具调色板）的分工——action-bar 是底部命令 + 读数，读数井是 toolbar 没有的词汇；因 center 槽常规承载读数井（progressbar 等读数区非命令控件），容器不作 `toolbar` 角色承诺（其 roving 方向键导航契约以纯命令集合为前提），降级 `group` 诚实播报，命令按钮各自原生 Tab 可达。

## 基础用法

`slot="start"` / 默认插槽放命令按钮（`oas-action-bar-button`），`slot="center"` 放读数井（`oas-action-bar-well` 容器 + `oas-statistic-well` / `oas-task-progress-well` / `oas-transport-well` / `oas-music-well`），`slot="end"` 放末端内容。

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

全空态（`label`/`detail` 全缺且未设 `progress`）整体退场（宿主 `data-empty` 反射、无布局足迹，同 `oas-statistic-well`）——无任务时不占胶囊。

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

## 媒体运输井（oas-transport-well）

`frames`（当前帧，受控显示——键盘 seek 只发事件，宿主回写）/ `frame-rate`（fps，时间码换算基准）/ `duration`（总帧数，可选——决定「/总时长」段与 seek 上界）/ `label` / `detail`。时间码显示 `HH:MM:SS:FF`（纯展示换算，不做 drop-frame/播放时钟）；时间码即 scrub 滑轨（`role="slider"`，可访问名 `label` > 内置文案）：聚焦后 ←/→ ±1 帧、↑/↓ ±1 秒、Home/End 首/尾帧，每次派发 `oas-seek`（detail `{ frames }`，提议值已 clamp [0, duration]）。

全空态（`label`/`frames`/`frame-rate`/`duration`/`detail` 全缺）整体退场（宿主 `data-empty` 反射、无布局足迹，同 `oas-statistic-well`）。

<DemoBlock title="时间码 scrub（键盘 seek，宿主回写）">
  <div style="width: 100%">
    <oas-action-bar id="ab-tc">
      <oas-action-bar-button value="play">播放</oas-action-bar-button>
      <oas-action-bar-button value="snap" slot="start">Snap</oas-action-bar-button>
      <oas-action-bar-well slot="center">
        <oas-transport-well id="ab-tc-well" label="Timecode" frames="1079" frame-rate="25" duration="2500" detail="3840 × 2160"></oas-transport-well>
      </oas-action-bar-well>
    </oas-action-bar>
  </div>
  <p id="ab-tc-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Tab 聚焦时间码后按 ←/→（±1 帧）、↑/↓（±1 秒）、Home/End（首/尾帧），观察 oas-seek 与时间码推进（宿主回写演示）。</p>
</DemoBlock>

## 音乐节奏井（oas-music-well）

`bars` / `beats`（当前小节 / 节拍，1 起，共同决定「小节.节拍」位置段）/ `tempo`（BPM）/ `meter`（拍号，原样显示）/ `label` / `detail`；纯读数（无交互、无事件——节奏位置由宿主驱动显示，井不做节拍时钟）；detail 段自动拼接 `{tempo} BPM · {meter} · {detail}`。

全空态（六属性全缺）整体退场（零布局足迹，同 `oas-statistic-well`）。

<DemoBlock title="节奏位置读数">
  <div style="width: 100%">
    <oas-action-bar>
      <oas-action-bar-button value="metronome">节拍器</oas-action-bar-button>
      <oas-action-bar-well>
        <oas-music-well label="Position" bars="5" beats="3" tempo="120" meter="4/4"></oas-music-well>
      </oas-action-bar-well>
      <oas-action-bar-button value="rate" slot="end">48 kHz</oas-action-bar-button>
    </oas-action-bar>
  </div>
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
  const tcWell = document.getElementById('ab-tc-well')
  const tcOut = document.getElementById('ab-tc-out')
  tcWell?.addEventListener('oas-seek', (e) => {
    // 受控回写：宿主把提议帧号写回 frames，时间码读数随之推进
    tcWell.setAttribute('frames', String(e.detail.frames))
    tcOut.textContent = `oas-seek 已派发：frames=${e.detail.frames}（已回写，时间码同步推进）`
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

### oas-transport-well

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `detail` | 补充信息（分辨率/色彩空间等，与自动帧率文本拼段；空时隐藏） | `string` | — |
| `duration` | 总帧数（可选——决定「/总时长」段、seek 上界与 aria-valuemax） | `string` | — |
| `frame-rate` | 帧率 fps（时间码换算基准；缺省/非法时时间码退化为原始帧数显示） | `string` | — |
| `frames` | 当前帧（受控显示——键盘 seek 只发事件，宿主回写驱动读数推进；非法回落 0、负值 clamp 0、超 duration 压到尾帧） | `string` | — |
| `label` | 读数标签（空时隐藏） | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-seek` | 键盘 seek（←/→ ±1 帧、↑/↓ ±1 秒、Home/End 首/尾帧，RTL 镜像水平方向）时派发；detail { frames }（提议值已 clamp）；受控显示——组件不自改 frames，宿主回写 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-action-bar-well-bg` | `color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent)` |
| `--oas-action-bar-well-height` | `32px` |

### oas-music-well

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bars` | 当前小节（1 起；与 beats 共同决定「小节.节拍」位置段，双缺整段隐藏） | `string` | `1` |
| `beats` | 当前节拍（1 起；与 bars 共同决定「小节.节拍」位置段，双缺整段隐藏） | `string` | `1` |
| `detail` | 补充信息（与自动 BPM/拍号文本拼段；空时隐藏） | `string` | — |
| `label` | 读数标签（空时隐藏） | `string` | — |
| `meter` | 拍号（如 4/4，原样显示；空时隐藏） | `string` | — |
| `tempo` | 速度 BPM（非法值忽略该段） | `string` | — |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-action-bar-well-bg` | `color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent)` |
| `--oas-action-bar-well-height` | `32px` |
