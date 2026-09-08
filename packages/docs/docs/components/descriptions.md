# Descriptions 描述列表

用于成组展示只读信息，适合详情页场景。默认 `horizontal` 布局（标签与内容同一行，标签在左为灰色弱化的文字）；`layout="vertical"` 时为标签在上、内容在下的纵向堆叠。

## 基础用法

<DemoBlock title="基础描述列表（vertical 布局）">
  <div style="width: 100%">
    <oas-descriptions title="用户信息" column="3" layout="vertical">
      <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
      <oas-descriptions-item label="城市"><span>北京</span></oas-descriptions-item>
      <oas-descriptions-item label="手机号"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="邮箱"><span>zhangsan@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="职位"><span>前端工程师</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 横向布局（默认）

不传 `layout` 即为 horizontal：标签在左（灰色弱化）、内容在右，同一行内横排：

<DemoBlock title="横向布局（默认）">
  <div style="width: 100%">
    <oas-descriptions title="应用信息">
      <oas-descriptions-item label="应用名称"><span>运维平台</span></oas-descriptions-item>
      <oas-descriptions-item label="所属集群"><span>prod-east-1</span></oas-descriptions-item>
      <oas-descriptions-item label="当前版本"><span>v2.4.0</span></oas-descriptions-item>
      <oas-descriptions-item label="负责人"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="更新时间"><span>2024-08-01 10:30</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 列数

<DemoBlock title="两列布局">
  <div style="width: 100%">
    <oas-descriptions title="订单信息" column="2" layout="vertical">
      <oas-descriptions-item label="订单号"><span>SO-20240801-001</span></oas-descriptions-item>
      <oas-descriptions-item label="下单时间"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="支付金额"><span>¥ 1,280.00</span></oas-descriptions-item>
      <oas-descriptions-item label="配送方式"><span>标准配送</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 无标题

<DemoBlock title="无标题">
  <div style="width: 100%">
    <oas-descriptions column="3" layout="vertical">
      <oas-descriptions-item label="环境"><span>生产</span></oas-descriptions-item>
      <oas-descriptions-item label="版本"><span>v1.0.0</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>运行中</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 带边框详情表

`bordered` 让网格线成表：标签格带淡底色（语义 token，暗色自动适配），适合用户信息等详情页场景：

<DemoBlock title="带边框详情表">
  <div style="width: 100%">
    <oas-descriptions title="用户信息" bordered column="3">
      <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="手机号"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="邮箱"><span>zhangsan@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="角色"><span>管理员</span></oas-descriptions-item>
      <oas-descriptions-item label="部门"><span>平台技术部</span></oas-descriptions-item>
      <oas-descriptions-item label="入职时间"><span>2021-07-12</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 跨列（span）

item 的 `span="N"` 跨 N 列，常用于长地址、备注等字段。span 超过当前行剩余列数时网格自动换行起占；不提供「自动占满剩余列」语义，需显式给定列数：

<DemoBlock title="跨列展示长地址">
  <div style="width: 100%">
    <oas-descriptions title="收货信息" bordered column="3">
      <oas-descriptions-item label="收货人"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="联系电话"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="邮编"><span>100000</span></oas-descriptions-item>
      <oas-descriptions-item label="收货地址" span="3"><span>北京市朝阳区某某路 100 号某某大厦 A 座 18 层 1801 室</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 冒号（colon）

`colon` 在标签后显示冒号（默认不显示）：

<DemoBlock title="标签冒号">
  <div style="width: 100%">
    <oas-descriptions title="任务信息" colon column="3">
      <oas-descriptions-item label="任务名称"><span>组件走查</span></oas-descriptions-item>
      <oas-descriptions-item label="优先级"><span>高</span></oas-descriptions-item>
      <oas-descriptions-item label="截止日期"><span>2024-08-10</span></oas-descriptions-item>
      <oas-descriptions-item label="负责人"><span>张三</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 尺寸（size）

`size="small|medium|large"` 三档密度，控制字号与 bordered 单元格内边距（medium 为默认，字号跟随外层）：

<DemoBlock title="尺寸三档">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-descriptions bordered size="small" column="3">
      <oas-descriptions-item label="名称"><span>小型密度</span></oas-descriptions-item>
      <oas-descriptions-item label="编号"><span>D-001</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>启用</span></oas-descriptions-item>
    </oas-descriptions>
    <oas-descriptions bordered size="medium" column="3">
      <oas-descriptions-item label="名称"><span>中等密度</span></oas-descriptions-item>
      <oas-descriptions-item label="编号"><span>D-002</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>启用</span></oas-descriptions-item>
    </oas-descriptions>
    <oas-descriptions bordered size="large" column="3">
      <oas-descriptions-item label="名称"><span>大型密度</span></oas-descriptions-item>
      <oas-descriptions-item label="编号"><span>D-003</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>启用</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 标题操作区（slot="extra"）

标题同排右侧的操作区，放编辑等入口：

<DemoBlock title="标题操作区">
  <div style="width: 100%">
    <oas-descriptions title="个人资料" bordered column="3">
      <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="手机号"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="邮箱"><span>zhangsan@example.com</span></oas-descriptions-item>
      <oas-button slot="extra" size="small" variant="outlined" onoas-click="message.info('进入编辑页（示例）')">编辑</oas-button>
    </oas-descriptions>
  </div>
</DemoBlock>

## 标签富内容（slot="label"）

item 的 `slot="label"` 可放图标加文字等富内容，与 `label` 属性互斥（插槽优先）：

<DemoBlock title="标签带图标">
  <div style="width: 100%">
    <oas-descriptions bordered column="2">
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="user" size="14"></oas-icon> 账号</span>
        <span>zhangsan</span>
      </oas-descriptions-item>
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="mail" size="14"></oas-icon> 邮箱</span>
        <span>zhangsan@example.com</span>
      </oas-descriptions-item>
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="organization" size="14"></oas-icon> 部门</span>
        <span>平台技术部</span>
      </oas-descriptions-item>
      <oas-descriptions-item label="状态"><oas-tag type="success">在职</oas-tag></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 内容自定义

<DemoBlock title="富内容">
  <div style="width: 100%">
    <oas-descriptions title="成员信息" column="2" layout="vertical">
      <oas-descriptions-item label="负责人"><span>张三</span></oas-descriptions-item>
      <oas-descriptions-item label="角色"><span>管理员</span></oas-descriptions-item>
      <oas-descriptions-item label="简介"><span>负责组件库设计系统与工程规范建设。</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><span>在职</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## 窄屏降列（宿主媒体查询）

未设置 `column` 属性时，列数取自 CSS 变量 `--oas-desc-columns`（默认 3），宿主可用媒体查询响应式降列（设置 `column` 属性则为固定列数，不受变量影响）：

<DemoBlock title="窄屏降列">
  <div style="width: 100%">
    <oas-descriptions class="demo-desc-responsive" title="设备信息" bordered>
      <oas-descriptions-item label="设备名称"><span>edge-gateway-01</span></oas-descriptions-item>
      <oas-descriptions-item label="型号"><span>GW-2000</span></oas-descriptions-item>
      <oas-descriptions-item label="位置"><span>华东 1 区</span></oas-descriptions-item>
      <oas-descriptions-item label="固件版本"><span>v3.2.1</span></oas-descriptions-item>
      <oas-descriptions-item label="最近心跳"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="状态"><oas-tag type="success">在线</oas-tag></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

<style>
/* 列数变量覆写：默认 3 列，视口 ≤640px 降为 1 列（token 化响应式的宿主侧落地方式） */
.demo-desc-responsive {
  --oas-desc-columns: 3;
}
@media (max-width: 640px) {
  .demo-desc-responsive {
    --oas-desc-columns: 1;
  }
}
</style>

## 加载中（骨架屏组合）

与 `oas-skeleton` 组合出「加载中详情」：加载时展示骨架屏，就绪后切换为描述列表（加载区域挂 `aria-busy` 供读屏器感知）：

<DemoBlock title="加载中详情">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-button id="desc-loading-btn" size="small">重新加载</oas-button>
    <div id="desc-loading-area" aria-busy="false">
      <oas-descriptions id="desc-loaded" title="账户信息" bordered column="3">
        <oas-descriptions-item label="账户名"><span>zhangsan</span></oas-descriptions-item>
        <oas-descriptions-item label="余额"><span>¥ 12,800.00</span></oas-descriptions-item>
        <oas-descriptions-item label="状态"><oas-tag type="success">正常</oas-tag></oas-descriptions-item>
      </oas-descriptions>
      <oas-skeleton id="desc-skeleton" title rows="3" active style="display: none"></oas-skeleton>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

// import 须在 onMounted 内：顶层 await import 会在构建期 SSR 求值（Node 无 HTMLElement），页面变空壳；
// let 绑定保留给模板内联事件（onoas-click="message.info(...)"）的 setup 作用域解析
let message
onMounted(async () => {
  ;({ message } = await import('@oas-ui/ui'))
  window.message = message
  // whenDefined 防升级前 expando 遮蔽 setter（DOM property 赋值必须晚于组件定义）
  customElements.whenDefined('oas-skeleton').then(() => {
    const btn = document.getElementById('desc-loading-btn')
    const area = document.getElementById('desc-loading-area')
    const loaded = document.getElementById('desc-loaded')
    const skeleton = document.getElementById('desc-skeleton')
    if (!btn || !area || !loaded || !skeleton) return
    btn.addEventListener('click', () => {
      area.setAttribute('aria-busy', 'true')
      loaded.style.display = 'none'
      skeleton.style.display = ''
      window.setTimeout(() => {
        skeleton.style.display = 'none'
        loaded.style.display = ''
        area.setAttribute('aria-busy', 'false')
        message.success('详情加载完成')
      }, 1200)
    })
  })
})
</script>

## 字号定制

`oas-descriptions-item` 字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-descriptions-item-font` 显式定制（如 `18px`）；容器 `size` 档位经 `--oas-desc-font-size` 下发（item 级开口优先）。

其他样式开口（CSS 变量穿透，暗色自动适配）：

| 变量 | 作用 | 默认值 |
| --- | --- | --- |
| `--oas-desc-label-color` | 字段标签颜色 | `--oas-color-text-secondary` |
| `--oas-desc-columns` | 列数（未设 `column` 属性时生效，可配媒体查询响应式降列） | `3` |

## API

### oas-descriptions

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bordered` | 边框表格形态：网格线成表 + label 格淡底色 | `boolean` | — |
| `colon` | label 后显示冒号（默认 false） | `boolean` | — |
| `column` | 每行列数 | `string` | `3` |
| `layout` | 布局方向：`horizontal`（默认，label 与内容同行）/ `vertical`（label 在上内容在下） | `string` | `horizontal` |
| `size` | 尺寸档位：`small` / `medium`（默认）/ `large`（padding 与字号联动） | `string` | `medium` |
| `title` | 标题（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `extra` | 标题同排右侧操作区 |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

### oas-descriptions-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `label` | 字段标签 | `string` | — |
| `span` | 跨列数（正整数，默认 1；超出剩余列数时网格自动换行起占） | `string` | `1` |

| 名称 | 说明 |
| --- | --- |
| 默认 | 字段内容 |
| `label` | label 富内容（图标+文字等；与 label 属性互斥，slot 优先） |
