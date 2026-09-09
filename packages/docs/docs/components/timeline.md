# Timeline 时间线

用于按时间顺序展示一系列事件节点。

::: warning 破坏性变更：节点颜色语义升级（v2.4）
`color="green | red | gray"` 已替换为语义色枚举 **`type`**：`green → success`、`red → danger`、`gray → neutral`。旧 `color` 三个值在当版本仍兼容映射（会按计划移除，请尽快迁移），其余取值不再生效。任意自定义颜色不走属性，请用 CSS 变量 **`--oas-timeline-dot-color`** 一行覆盖（如 `style="--oas-timeline-dot-color: var(--oas-color-warning)"`）。
:::

## 基础用法

<DemoBlock title="基础时间线">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-01-01"><p>项目启动，明确目标与边界。</p></oas-timeline-item>
      <oas-timeline-item time="2024-03-01" type="success"><p>核心组件开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item time="2024-05-01" type="danger"><p>修复线上问题并回归。</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15"><p>文档站上线，对外发布。</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 语义色（type）

`type` 提供节点语义色枚举：`primary`（缺省）/ `success` / `warning` / `danger` / `info` / `neutral`（灰=已归档），对齐库内语义色 token（含暗色变体）。任意颜色用 `--oas-timeline-dot-color` CSS 变量开口。

<DemoBlock title="节点语义色与任意色">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-06-01"><p>默认主题色（primary）</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-02" type="success"><p>success：已完成 / 成功</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-03" type="warning"><p>warning：需要注意</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-04" type="danger"><p>danger：失败 / 告警</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-05" type="info"><p>info：一般信息</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-06" type="neutral"><p>neutral：已归档（原 gray）</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-07" style="--oas-timeline-dot-color: var(--oas-color-warning);"><p>任意色：--oas-timeline-dot-color 变量开口</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="旧 color 兼容映射（将移除，请迁移到 type）">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01" color="green"><p>color="green" → success</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-02" color="red"><p>color="red" → danger</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-03" color="gray"><p>color="gray" → neutral</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 节点变体（variant）

`variant="outlined"` 把节点渲染为空心描边（缺省 `filled` 实心），可与 `type` 组合。

<DemoBlock title="outlined 描边节点">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01" type="success"><p>filled 实心（默认）</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-02" type="success" variant="outlined"><p>outlined 描边：待复核</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-03" type="warning" variant="outlined"><p>outlined + warning</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 自定义节点（dot 插槽 / icon 属性）

节点可用 `slot="dot"` 完全自定义（任意内容），或用 `icon` 属性快捷渲染库内图标（颜色跟随 `type`）。

<DemoBlock title="icon 属性节点">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01" icon="upload" type="primary"><p>构建包已上传</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-02" icon="check" type="success"><p>预发布检查通过</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-03" icon="close" type="danger"><p>灰度环境冒烟失败</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-04" icon="refresh" type="warning"><p>修复后重新发布</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="dot 插槽自定义节点">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01">
        <span slot="dot" style="display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); align-items: center; justify-content: center; font-size: 12px;">1</span>
        <p>第一步：提交申请</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-08-02">
        <span slot="dot" style="display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: var(--oas-color-success); color: var(--oas-color-text-on-success); align-items: center; justify-content: center; font-size: 12px;">2</span>
        <p>第二步：审核通过</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="圆点尺寸与颜色定制">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-09-01" style="--oas-timeline-dot-size: 6px"><p>小圆点（--oas-timeline-dot-size: 6px）</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-02" style="--oas-timeline-dot-size: 10px"><p>默认尺寸（10px）</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-03" style="--oas-timeline-dot-size: 16px"><p>大圆点（16px）</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-04" style="--oas-timeline-dot-size: 12px; --oas-timeline-dot-color: #7c3aed"><p>自定义色（--oas-timeline-dot-color: #7c3aed）</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 标题结构（title 插槽）

`slot="title"` 渲染强调标题行，与正文（默认插槽）分区，适合发布记录、版本日志。

<DemoBlock title="标题 + 正文">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01">
        <span slot="title">v1.2.0 发布</span>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">新增数据展示组件，详见版本说明。</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" type="success">
        <span slot="title">v1.3.0 发布</span>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">优化暗色主题与无障碍支持。</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 进行中与加载（pending / loading）

`pending` 标记进行中尾节点：空心圆点 + 虚线连接 + 脉冲动画，无内容时显示「敬请期待」。`loading` 标记单节点加载中（旋转环节点），内容区 `aria-busy` 同步。

<DemoBlock title="进行中尾节点 + 加载中节点">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01"><p>v1.4.0 需求评审完成。</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-10" type="success"><p>核心功能开发完成，单测通过。</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-12" loading><p>回归测试执行中…</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

给 `oas-timeline-item` 设置 `pending` 后，该节点显示为空心圆点 + 虚线连接，表示「进行中 / 敬请期待」；节点无内容时默认展示「敬请期待」文案。

## 倒序（reverse）

`reverse` 视觉倒序渲染（最新在上），DOM 顺序不变、朗读与焦点顺序稳定，常与 `pending` 组合表达「进行中的最新动态」。

<DemoBlock title="reverse 倒序">
  <div style="width: 100%">
    <oas-timeline reverse>
      <oas-timeline-item time="2024-06-01"><p>最早的一次提交</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15" type="success"><p>中间里程碑</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-01" type="success"><p>最近一次发布（视觉在最上）</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 横向时间轴（direction）

`direction="horizontal"` 把轴横置、条目横向排布（适合里程碑、发布管道）。横向时 `mode` 语义映射：`left` 内容在轴下方（默认）、`right` 内容在轴上方、`alternate` 上下交替。

<DemoBlock title="横向时间轴">
  <div style="width: 100%">
    <oas-timeline direction="horizontal">
      <oas-timeline-item time="Q1" type="success"><p>立项</p></oas-timeline-item>
      <oas-timeline-item time="Q2" type="success"><p>核心开发</p></oas-timeline-item>
      <oas-timeline-item time="Q3" type="warning"><p>联调</p></oas-timeline-item>
      <oas-timeline-item time="Q4"><p>发布</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="横向 + 交替">
  <div style="width: 100%">
    <oas-timeline direction="horizontal" mode="alternate">
      <oas-timeline-item time="Q1" type="success"><p>立项</p></oas-timeline-item>
      <oas-timeline-item time="Q2" type="success"><p>核心开发</p></oas-timeline-item>
      <oas-timeline-item time="Q3" type="warning"><p>联调</p></oas-timeline-item>
      <oas-timeline-item time="Q4"><p>发布</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 交替模式与对侧内容（mode / opposite）

`mode` 控制内容相对轴的位置：`left`（默认，轴在左）/ `right`（轴在右）/ `alternate`（轴居中、内容左右交替，首项在左）。`slot="opposite"` 在 alternate 模式下把内容放到轴对侧（如把时间放外侧、摘要放内侧）。

<DemoBlock title="mode=right">
  <div style="width: 100%">
    <oas-timeline mode="right">
      <oas-timeline-item time="2024-06-01"><p>轴在右，内容在左</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15" type="success"><p>适合 RTL 语境的镜像布局</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="mode=alternate + opposite 对侧">
  <div style="width: 100%">
    <oas-timeline mode="alternate">
      <oas-timeline-item>
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-06-01</span>
        <p>首次内测</p>
      </oas-timeline-item>
      <oas-timeline-item type="success">
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-06-15</span>
        <p>公测上线</p>
      </oas-timeline-item>
      <oas-timeline-item type="warning">
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-07-01</span>
        <p>性能优化</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

对侧内容通道仅在 `alternate` 模式显示；单侧模式（left/right）下 `slot="opposite"` 隐藏。

## 条目点击（oas-click）

时间线条目支持点击事件 `oas-click`（`detail` 带 `{ index }`，bubbles + composed），适合日志流点条目看详情。

<DemoBlock title="点击条目">
  <div style="width: 100%">
    <oas-timeline id="tl-click">
      <oas-timeline-item time="09:12" type="success"><p>订单 #1024 支付成功</p></oas-timeline-item>
      <oas-timeline-item time="09:30"><p>订单 #1024 仓库出库</p></oas-timeline-item>
      <oas-timeline-item time="10:05" type="warning"><p>订单 #1024 物流中转延迟</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 富内容与交互

节点内容保留在宿主 DOM 原位分发，内容里的按钮、链接交互事件完整可用（此前克隆渲染会丢失宿主监听，已修复）。

<DemoBlock title="富内容节点（按钮事件可用）">
  <div style="width: 100%">
    <oas-timeline id="tl-rich">
      <oas-timeline-item time="2024-07-01">
        <p><strong>v1.2.0 发布</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">新增数据展示组件。</p>
        <oas-button size="small" variant="outlined" class="tl-rich-btn">查看版本说明</oas-button>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" type="success">
        <p><strong>v1.3.0 发布</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">优化暗色主题与无障碍支持。</p>
        <oas-button size="small" class="tl-rich-btn">立即更新</oas-button>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-timeline-font` 显式定制（如 `18px`）。节点与连接线尺寸开口：`--oas-timeline-dot-size` / 连接线宽随尺寸联动。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 条目点击反馈
  const clickable = document.querySelector('#tl-click')
  if (clickable) {
    clickable.addEventListener('oas-click', (e) => {
      const item = e.target
      const time = item && item.getAttribute ? item.getAttribute('time') : ''
      message.info(`点击了 ${time} 的条目（index=${e.detail.index}）`)
    })
  }

  // 富内容按钮：验证内容事件监听在渲染后仍然有效
  document.querySelectorAll('.tl-rich-btn').forEach((btn) => {
    btn.addEventListener('click', () => message.success('内容按钮事件已触发'))
  })
})
</script>

## API

### oas-timeline

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `direction` | 轴方向：vertical（默认）/ horizontal（横向排布） | `string` | — |
| `mode` | 内容相对轴的位置：left（默认，轴在左）/ right（轴在右）/ alternate（轴居中、内容左右交替，首项在左）；横向时映射为轴下/轴上/上下交替 | `string` | — |
| `reverse` | 视觉倒序（DOM 顺序不变），常与 pending 组合表达「最新在上」 | `boolean` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-timeline-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 【迁移兼容】旧节点色：green→success、red→danger、gray→neutral，将移除；新代码用 type，任意色走 --oas-timeline-dot-color | `string` | — |
| `icon` | 节点图标（库内 oas-icon 图标名），颜色跟随 type，slot="dot" 优先 | `string` | — |
| `loading` | 单节点加载中：圆点变旋转环，内容区 aria-busy 同步 | `boolean` | — |
| `pending` | 进行中节点：空心圆点 + 虚线连接 + 脉冲，无内容时显示「敬请期待」 | `boolean` | — |
| `time` | 节点时间文本 | `string` | — |
| `type` | 节点语义色：primary（缺省）/ success / warning / danger / info / neutral | `string` | — |
| `variant` | 节点变体：filled（默认实心）/ outlined（空心描边） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 条目点击（内容区），detail 带 { index } |

| 名称 | 说明 |
| --- | --- |
| 默认 | 节点正文 |
| `dot` | 自定义节点（任意内容替换圆点） |
| `opposite` | 对侧内容（仅在 mode=alternate 时显示于轴对侧） |
| `title` | 标题强调行（与正文分区） |
