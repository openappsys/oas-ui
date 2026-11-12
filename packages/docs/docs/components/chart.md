# Chart 图表

自研 SVG 图表组件（零第三方图表引擎），支持折线 / 柱状 / 横向条形 / 饼图 / 面积 / 环形 / 堆叠柱状 / 雷达 / 极坐标面积九型，外加系列级组合图与双轴。数据更新自动重绘，`prefers-reduced-motion` 时关闭动画；`options.tooltip` 可选开启内置悬停浮层（默认只用原生 `<title>`）。

## 折线图

<DemoBlock title="折线图（默认）">
  <div style="width: 100%">
    <oas-chart type="line" data='[{"label":"一月","value":10},{"label":"二月","value":20},{"label":"三月","value":15},{"label":"四月","value":28},{"label":"五月","value":22}]'></oas-chart>
  </div>
</DemoBlock>

默认 `type="line"`。数组数据 `[{label, value}]` 为单系列；悬停数据点可查看数值（原生 `<title>`）。

## 柱状图

<DemoBlock title="柱状图">
  <div style="width: 100%">
    <oas-chart type="bar" data='[{"label":"北京","value":86},{"label":"上海","value":92},{"label":"广州","value":65},{"label":"深圳","value":78}]'></oas-chart>
  </div>
</DemoBlock>

`type="bar"` 渲染分组柱状。

## 横向条形图

<DemoBlock title="横向条形图（数值轴在底部，分类贴左缘）">
  <div style="width: 100%">
    <oas-chart type="horizontal-bar" data='[{"label":"北京","value":86},{"label":"上海","value":92},{"label":"广州","value":65},{"label":"深圳","value":78}]'></oas-chart>
  </div>
</DemoBlock>

`type="horizontal-bar"` 把数值轴放到**底部**（刻度文字居中于竖网格线下方）、分类标签贴**左缘**、条从绘图区左缘向右增长，适合类目较多或类目名较长的排行场景。数据口径与 `type="bar"` 完全一致（数组单系列 / 对象多系列），多系列在同一分类行内自上而下分组，图例 / 配色 / `<title>` 悬停同竖向柱状；分类行数放不下标签时按行高垂直抽稀（只抽标签、不抽数据）。

与书写方向正交：**RTL 下不镜像**（`svg { direction: ltr }` 钉死），条永远在视觉上从左向右增长。横向条不参与组合图与双轴（单一数值轴语义），系列级 `type` / `yAxisIndex` 一律忽略。

## 饼图

<DemoBlock title="饼图">
  <div style="width: 100%">
    <oas-chart type="pie" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="pie"` 渲染扇区，tooltip 显示占比。

## 环形图

<DemoBlock title="环形图">
  <div style="width: 100%">
    <oas-chart type="donut" data='[{"label":"市场","value":40},{"label":"研发","value":35},{"label":"运营","value":25}]'></oas-chart>
  </div>
</DemoBlock>

`type="donut"` 与饼图同数据格式，中间镂空成环带，tooltip 同样显示占比。

## 面积图

<DemoBlock title="面积图（smooth + 图例）">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="area"` 在折线基础上向基线填充半透明区域（多系列叠加时仍可读），支持 `options.smooth` 平滑曲线。

<DemoBlock title="面积图（渐变填充）">
  <div style="width: 100%">
    <oas-chart type="area" options='{"smooth":true,"gradient":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

`options.gradient`（默认 false）开启后，面积填充从曲线处的系列色向基线垂直渐淡（顶部 35% 不透明度、底部透明），视觉重心聚焦数据线。

## 堆叠柱状图

<DemoBlock title="堆叠柱状图">
  <div style="width: 100%">
    <oas-chart type="stacked-bar" data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"线上","data":[120,132,101,134]},{"name":"门店","data":[90,95,110,102]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="stacked-bar"` 多系列自底向上堆叠为单柱，柱高 = 分类合计，y 轴刻度按合计值计算。

## 雷达图

<DemoBlock title="雷达图（radarShape + max 量程）">
  <div style="width: 100%">
    <oas-chart type="radar" options='{"max":100}' data='{"labels":["速度","稳定","续航","智能","安全"],"series":[{"name":"车型 A","data":[80,92,75,88,95]},{"name":"车型 B","data":[90,70,82,79,85]}]}'></oas-chart>
  </div>
</DemoBlock>

`type="radar"` 的维度名复用 `labels`（与折线/柱状同一数据心智，零迁移成本）。`options.max` 设全局统一量程（缺省取全系列 max 走 nice 刻度）；`options.radarShape`（默认 `polygon` 同心多边形）设为 `circle` 换同心圆网格。悬停顶点显示「维度： 值」，图例/配色与其他图型一致。

## 极坐标面积图

<DemoBlock title="极坐标面积图（玫瑰图）">
  <div style="width: 100%">
    <oas-chart type="polar-area" data='[{"label":"东","value":11},{"label":"南","value":16},{"label":"西","value":7},{"label":"北","value":14}]'></oas-chart>
  </div>
</DemoBlock>

`type="polar-area"` 每分类等角扇区、半径编码数值（最大值满半径），同心参考圈提供径向量级读数。与饼图的「份额」心智不同，tooltip 显示原始数值而非占比。单系列取 `series[0]`（与饼图/环图同一数据格式）。

## 组合图

<DemoBlock title="组合图（柱 + 线系列级混排）">
  <div style="width: 100%">
    <oas-chart type="bar" data='{"labels":["一月","二月","三月","四月"],"series":[{"name":"销量","data":[120,132,101,134]},{"name":"增速","data":[5,12,8,15],"type":"line"}]}'></oas-chart>
  </div>
</DemoBlock>

组合图**不设独立 type 值**：顶层 `type` 作为缺省系列型，`series[].type`（`bar` / `line` / `area`）逐系列覆盖，缺省/非法值回退顶层型。共享同一分类轴，线/面积点对齐柱组中心（与纯折线的端点对齐不同）；绘制层序固定 bar → area → line；配色与图例按系列声明顺序。

## 双轴图

<DemoBlock title="双轴组合图（右轴 + alignTicks 刻度对齐）">
  <div style="width: 100%">
    <oas-chart type="bar" options='{"yAxis":[{"name":"销量"},{"name":"增速"}]}' data='{"labels":["一月","二月","三月","四月"],"series":[{"name":"销量","data":[120,132,101,134]},{"name":"增速","data":[5,12,8,15],"type":"line","yAxisIndex":1}]}'></oas-chart>
  </div>
</DemoBlock>

双轴是坐标系配置不是图型：`options.yAxis` 数组第 2 项存在**且左右两侧均有 `series[].yAxisIndex` 绑定系列**时启用右轴（`name` 为轴名，渲染在轴顶；缺任一侧按单轴渲染，不渲染空轴），`series[].yAxisIndex`（`0` 左默认 / `1` 右）绑定归属；可与 line / bar / 组合图任意叠加。双轴时刻度强制对齐（alignTicks）：副轴以主轴档数为锚重算 nice 刻度，左右刻度线一一水平对齐，消除刻度错位误读——但两轴单位不同，同一条线上的左右读数**不可横比**。堆叠柱状/饼系/雷达类忽略 `yAxis`（单轴语义）。

## 多系列 + 图例

<DemoBlock title="多系列折线（smooth + 图例）">
  <div style="width: 100%">
    <oas-chart type="line" options='{"smooth":true}' data='{"labels":["周一","周二","周三","周四","周五"],"series":[{"name":"访问量","data":[320,302,341,374,390]},{"name":"下载量","data":[120,132,101,134,90]}]}'></oas-chart>
  </div>
</DemoBlock>

对象格式 `{labels, series:[{name, data}]}` 支持多系列；多系列时默认显示图例，`options.smooth` 开启平滑曲线。

## 密集分类（标签自动抽稀 / 旋转）

<DemoBlock title="36 天日请求量（缺省：水平抽稀）">
  <div style="width: 100%">
    <oas-chart type="area" data='{"labels":["09-01","09-02","09-03","09-04","09-05","09-06","09-07","09-08","09-09","09-10","09-11","09-12","09-13","09-14","09-15","09-16","09-17","09-18","09-19","09-20","09-21","09-22","09-23","09-24","09-25","09-26","09-27","09-28","09-29","09-30","10-01","10-02","10-03","10-04","10-05","10-06"],"series":[{"name":"请求量","data":[1120,1046,1012,1058,1024,998,962,1040,1082,1106,1118,1032,1044,1010,996,902,1010,1036,1092,1150,1206,1052,1030,1024,892,1124,1108,1054,946,1140,1188,1096,1114,1090,1022,1058]}]}'></oas-chart>
  </div>
</DemoBlock>

<DemoBlock title="同一份数据 · xLabelRotate: 90（竖排，可显示的标签更多）">
  <div style="width: 100%">
    <oas-chart type="area" options='{"xLabelRotate":90}' data='{"labels":["09-01","09-02","09-03","09-04","09-05","09-06","09-07","09-08","09-09","09-10","09-11","09-12","09-13","09-14","09-15","09-16","09-17","09-18","09-19","09-20","09-21","09-22","09-23","09-24","09-25","09-26","09-27","09-28","09-29","09-30","10-01","10-02","10-03","10-04","10-05","10-06"],"series":[{"name":"请求量","data":[1120,1046,1012,1058,1024,998,962,1040,1082,1106,1118,1032,1044,1010,996,902,1010,1036,1092,1150,1206,1052,1030,1024,892,1124,1108,1054,946,1140,1188,1096,1114,1090,1022,1058]}]}'></oas-chart>
  </div>
</DemoBlock>

同一份 36 天数据两种排法的取舍：

- **缺省（水平 + 抽稀）**：间距不足以容下最宽标签时，按「标签宽 + 间隙」与分类间距求出步长 k，每 k 个渲染一个（`autoSkip` 口径），端点在有富余时保留。水平读最快，但会跳号（上面 36 天显示 12 个）。
- **`xLabelRotate`（斜排/竖排）**：0–90 度，缺省 0；>0 时标签绕刻度锚点顺时针旋转——列首贴刻度、向右下倾斜（90° 即竖排）。旋转后横向投影变小（角度 θ 时 ≈ 标签宽×cosθ + 行高×sinθ；90° 仅剩一个行高），能容纳的标签更多：上面 36 天在 90° 下显示 18 个（约缺省的 1.5 倍），标签更长时收益更大。
- **两者可组合**：`xLabelRotate` 只给角度，抽稀负责保底——旋转后仍按投影宽度求步长，间距不够就继续跳号，永不叠字。短标签（如 `09-01`）斜排 45° 的横向投影仍有约 0.7 倍宽，收益有限；45° 主要利好长标签（如 `2026-09-01`）。
- **代价**：旋转抬高绘图区——底留白 = `10 + 最宽标签×sinθ + 行高`（90° 按标签宽算），右留白至少容下最右标签的横向投影；绘图区变矮、纵轴可读档数变少。非数字角度按 0，超范围夹到 0–90。

## 自定义悬停浮层（opt-in）

<DemoBlock title="options.tooltip + tooltipFormatter（JS property 通道）">
  <div style="width: 100%">
    <oas-chart id="chart-tip-format" type="bar" options='{"tooltip":true}' data='{"labels":["一季度","二季度","三季度"],"series":[{"name":"线上","data":[120,132,101]},{"name":"门店","data":[90,95,110]}]}'></oas-chart>
  </div>
  <p id="chart-tip-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">把鼠标移到柱体上：浮层显示自定义文案（「系列｜分类：数值 万元」）</p>
</DemoBlock>

<DemoBlock title="接管浮层（oas-chart-tooltip + preventDefault）">
  <div style="width: 100%">
    <oas-chart id="chart-tip-takeover" type="bar" options='{"tooltip":true}' data='[{"label":"一月","value":120},{"label":"二月","value":132},{"label":"三月","value":101}]'></oas-chart>
  </div>
  <p id="chart-tip-log" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">鼠标移入柱体：宿主 preventDefault() 接管，内置浮层不再出现，读数写在这里</p>
</DemoBlock>

```js
const chart = document.querySelector('oas-chart')
chart.setAttribute('options', '{"tooltip":true}') // attribute 通道
chart.tooltipFormatter = (ctx) => `${ctx.seriesName}｜${ctx.label}：${ctx.value} 万元`
chart.addEventListener('oas-chart-tooltip', (e) => {
  e.preventDefault() // 接管：组件不显示内置浮层
  console.log(e.detail) // { label, value, seriesName, seriesIndex, percent? }
})
```

- **默认零浮层**：`options.tooltip` 缺省 `false`，只有原生 `<title>` 悬停提示，shadow 内**不创建任何浮层节点**。开启后组件建**单例浮层**（`part="tooltip"`，反色 token `--oas-tooltip-bg` / `--oas-tooltip-color`，暗色自动可读）；数据重绘与页面滚动立即隐藏，断开连接销毁。
- **文案**：缺省为 `系列名 · 分类: 值`，饼图/环形图追加占比（如 `份额 · 研发: 35 (35%)`）；`tooltipFormatter` 覆盖，返回串按**纯文本**写入浮层（不解析 HTML）。函数无法用 attribute 表达——`tooltipFormatter` **只有 property 通道**。
- **接管**：显示内置浮层前先派发 `oas-chart-tooltip`（`detail` 即上下文 `{ label, value, seriesName?, seriesIndex, percent? }`，`percent` 仅饼系提供）；宿主 `preventDefault()` 后组件不渲染默认浮层，由宿主自行呈现。
- **覆盖范围**：折线/面积数据点、柱、横向条、堆叠段、饼/环扇区、雷达顶点、极区扇区。浮层是 pointer 视觉增强，读屏可达名仍是容器 `aria-label`，数值仍在原生 `<title>` 中。

## 空数据

<DemoBlock title="空数据占位">
  <div style="width: 100%">
    <oas-chart data='[]'></oas-chart>
  </div>
</DemoBlock>

无数据 / 非法 JSON 显示空态占位，不报错。

## 数据通道契约

`data` / `options` 双通道传值：

- **attribute 通道**：HTML 上写 JSON 字符串（如 `data='[{...}]'`），组件内部 `JSON.parse` 解析。
- **property 通道**：JS 直接赋对象/数组（`el.data = [{...}]`），免序列化；属性通道的解析在 setter 内完成，优先级高于 attribute。

**反射行为差异（读取数据的方式两组件不统一，请按下面约定）**：

- `oas-table` 的 `columns` / `data` setter 会把值**反射回 attribute**——property 赋值后 `getAttribute('columns')` / `getAttribute('data')` 可读回对应的 JSON 字符串（attribute 与 property 保持单一数据源同步）。
- `oas-chart` 的 `data`（及 `options`）setter **只写内部状态、不反射**——property 赋值后 attribute 仍是旧值/空值，**读取走 `el.data` property**（getter 返回最近一次赋值的解析结果），不要用 `getAttribute('data')` 回读。

> 例外：`oas-table` 的 `columns` 若含函数字段（`render` 等，JSON 序列化会丢），setter 走纯内存路径不反射——此类列的读取请走 `el.columns` property。

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../.vitepress/theme/when-defined'
onMounted(() => {
  // property 通道：函数无法用 attribute 表达（JSON 过不了函数）。
  // 升级守卫：升级前写 tooltipFormatter 会成为自有属性遮蔽 setter（文案静默失效）
  const chart = document.getElementById('chart-tip-format')
  onUpgraded(chart, () => {
    if (chart) chart.tooltipFormatter = (ctx) => `${ctx.seriesName ?? ''}｜${ctx.label}：${ctx.value} 万元`
  })
  // 接管演示：preventDefault 后组件不显示内置浮层，读数回写宿主文案
  const takeover = document.getElementById('chart-tip-takeover')
  const log = document.getElementById('chart-tip-log')
  takeover?.addEventListener('oas-chart-tooltip', (e) => {
    e.preventDefault()
    const d = e.detail
    if (log) log.textContent = `oas-chart-tooltip 已接管：${d.label} = ${d.value}（seriesIndex ${d.seriesIndex}，内置浮层已抑制）`
  })
})
</script>

## API

### oas-chart

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 图表描述（缺省按类型走 locale） | — | — |
| `data` | 数据。数组单系列 `[{label, value}]` 或对象多系列 `{labels, series:[{name, data, type?, yAxisIndex?}]}`（系列级 `type` / `yAxisIndex` 用于组合图与双轴） | `unknown` | — |
| `options` | 配置：`smooth`（平滑）、`colors`（系列配色）、`showLegend`、`gradient`（面积图垂直渐变填充，默认 false）、`max`（radar 全局量程）、`radarShape`（radar 网格 `polygon`/`circle`，默认 polygon）、`xLabelRotate`（x 轴分类标签旋转角度 0–90，默认 0 = 水平 + 按宽度自动抽稀；>0 斜排/竖排，仍按旋转后投影抽稀兜底）、`yAxis`（双轴数组，第 2 项存在且两侧均有 yAxisIndex 绑定系列才启用双轴，缺侧按单轴）、`tooltip`（opt-in 内置悬停浮层，默认 false = 只用原生 `<title>`、shadow 内零浮层节点） | `unknown` | — |
| `type` | 图表类型：`line` / `bar` / `horizontal-bar` / `pie` / `area` / `donut` / `stacked-bar` / `radar` / `polar-area`（组合图不设 type 值，用系列级 `series.type` 覆盖；横向条数值轴在底部、分类标签贴左缘，不参与组合图与双轴） | `ChartType` | `line` |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `tooltipFormatter` | 自定义悬停文案：`(ctx: { label, value, seriesName?, seriesIndex, percent? }) => string`，返回串按纯文本写入浮层；置 null 恢复默认文案。函数无法用 attribute 表达，只有 property 通道 | `((ctx: ChartTooltipContext) => string) \| null` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-chart-tooltip` | 显示内置浮层前派发（仅 `options.tooltip` 开启时），`detail: { label, value, seriesName?, seriesIndex, percent? }`；`preventDefault()` 接管后不显示默认浮层 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-tooltip-bg` | `var(--oas-color-text-primary)` |
| `--oas-tooltip-color` | `var(--oas-color-bg)` |

`data` / `options` 也支持 property 通道（JS 对象，优先级高于 attribute）。

### 边界

- 数据更新重绘 SVG（同 qrcode 模式），节点不重建
- 空/非法数据 → 空态占位
- 每个数据点带原生 `<title>` 悬停提示；`options.tooltip` 缺省 `false` 时 shadow 内零浮层节点（孤儿浮层为 0）。开启后为单例浮层（`part="tooltip"`），数据重绘/页面滚动隐藏、断开连接销毁——仍无孤儿节点
- 横向条（`type="horizontal-bar"`）数据口径与 `bar` 相同，数值轴在底部、分类标签贴左缘；RTL 下不镜像（几何与书写方向正交）；不参与组合图与双轴，系列级 `type` / `yAxisIndex` 忽略；分类数过多（>~50）时条互叠成实色带（与竖 bar 同口径），数据侧应聚合/抽稀
- `tooltipFormatter` 只有 property 通道（函数无法用 attribute 表达），返回串按纯文本写入浮层、不解析 HTML；宿主 formatter 抛错或返回非字符串时回退默认文案，不中断 hover
- x 轴分类标签密集（间距不足以容下最宽标签）时按可用宽度自动抽稀（折线/面积端点优先保留；柱状按宽度抽稀，端点越界时才保留）；抽稀只作用于标签（数据点不抽稀），不旋转/不加省略号——需要斜排/竖排时用 `options.xLabelRotate`（0–90），旋转后仍按投影宽度抽稀兜底；水平标签仅在越过 viewBox 左右界时向内对齐（首 `start` / 末 `end`），并按各标签自身宽度剔除会与端点相撞的相邻标签（柱状/组合/堆叠同样适用，未越界时仍与柱组中心对齐），不被裁切
- 动画为纯 CSS（`@media (prefers-reduced-motion: no-preference)` 包裹），reduced-motion 下自动关闭，无 JS 计时器
- radar 维度量程为全局统一（`options.max` 或 nice 刻度），暂不支持逐维独立量程——需要时宿主可先自行归一化（如 0-100 分制）
- polar-area 值全为 0 时不渲染扇区（与饼图同口径）；半径量程为最大值满半径
- 组合图只允许 `bar` / `line` / `area` 三型互混（同一直角坐标系），其他类型值静默回退顶层型
- 系列级 `type` / `yAxisIndex` 只被直角坐标系图型（line / bar / area / 组合图）消费；`stacked-bar` / `pie` / `donut` / `radar` / `polar-area` 忽略系列级覆盖，一律按顶层 `type` 渲染
- 仅声明 `options.yAxis` 第 2 项而绑定未覆盖两侧（无右绑、或全部系列绑右致左轴空置）时按单轴渲染——不渲染 0 刻度假轴（未用轴名同免）
- y 轴刻度走 `1 / 2 / 2.5 / 5 / 10 × 10^n` nice 步长序列（单轴 / 双轴 / 雷达 / 堆叠柱共用），标签精度随步长动态化（如 0.0025 保留四位小数），小数量程不再退化为整步、也不会丢刻度；量程顶向上取 nice 档——raw max 90 顶格为 100，双轴右轴 raw max 10 顶格为 10（可见行为变化，旧 ceil 口径分别为 92 / 12）。**任意量程的顶格都可能上取到接近 2 倍**（如 133→200、1206→2000），这是固定 4 段 + 有限 nice 序列的取舍；非整齐量程如需更紧的顶格，宿主可先把数据归一到 nice 边界。刻度列宽按实际格式化文本按需留白（左轴与双轴右轴对称推导），小数标签不越出 viewBox；步长 ≥1e6 或 <1e-4 时标签用科学计数（如 `2.5E8`、`1E-5`）避免长数字撑爆轴列
- 刻度标签走 `Intl.NumberFormat`（locale 感知小数分隔符）；非法 locale（如 `zh_CN` 下划线、任意自定义名、非 ASCII 名称、空串）固定回退 `en-US`（保证 SSR 与客户端快照一致），不中断图表渲染。科学计数文字形（阿拉伯数字 / 指数符号等）随 ICU 与 locale 版本可能不同，只保证可渲染/可读、不锁定具体字形，也不提供公共格式 API
- 配色映射语义：饼系（pie / donut / polar-area）按**分类**上色，直角系（line / bar / area / stacked-bar / radar / 组合图）按**系列**上色；`options.colors` 按同序覆盖；缺省 8 色循环（primary / success / warning / danger / purple / cyan / magenta / geekblue），超过 8 个才回绕
- 图表 svg 内文字方向钉死 `direction: ltr`（坐标语义与书写方向正交）：宿主 `dir=rtl` 不翻转文字锚点、不镜像几何
