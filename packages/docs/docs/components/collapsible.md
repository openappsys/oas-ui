# Collapsible 折叠面板

单面板自折叠原语：无容器、自管开合的独立折叠块。与 `oas-collapse` 的关系——collapse 是「容器 + 多面板」的编排件，面板开合由容器驱动；collapsible 是独立单面板，适合文件树节点、表单折叠分区、侧栏分组等「一个区块自己开合」的场景。

## 基础用法

<DemoBlock title="点击触发器开合">
  <div style="width: 100%">
    <oas-collapsible header="高级筛选">
      <p>展开后显示更多筛选条件：日期范围、标签、负责人等。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

默认收起；点击触发器区域切换开合，展开态由组件自管（非受控）。

## 非受控初值

<DemoBlock title="default-open 默认展开">
  <div style="width: 100%">
    <oas-collapsible header="常用联系人" default-open>
      <p>首帧按 default-open 展开，之后状态由组件自管，不写回任何属性。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

`default-open` 只作非受控初值；一旦设置 `open` 属性则进入受控模式，`default-open` 不再生效。

## 受控模式

<DemoBlock title="open 受控 + oas-toggle 事件">
  <div style="width: 100%">
    <oas-space style="margin-bottom: 8px">
      <oas-button size="small" onclick="collapsibleToggle()">外部切换</oas-button>
    </oas-space>
    <oas-collapsible id="collapsible-ctrl" header="部署配置" open>
      <p>受控模式：open 属性在场时显示值跟属性走（值非 false 为展开）；点击后组件写回属性并派发事件。</p>
    </oas-collapsible>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      当前状态：<span id="collapsible-state">展开</span>
    </p>
  </div>
</DemoBlock>

受控契约：`open` 属性在场 = 受控（`open` 或值非 `"false"` 为展开、`open="false"` 为收起）；点击翻转后组件写回 `open` 属性并派发 `oas-toggle`（乐观更新）。宿主移除 `open` 属性即回到非受控，内部状态播种为移除前显示值，不跳变。

> 框架绑定注意：`open` 的值语义在 Vue CSR / React / 手写 HTML 下均可正确表达（框架会把 `:open="false"` 序列化为 `open="false"`）。但 **Vue SSR/SSG（含 Nuxt、Vitepress 构建期）会把布尔 `false` 归一化为「移除属性」**（`open` 是 HTML 布尔属性名）——SSR 直出的受控收起会退化为非受控，字符串 `"false"` 绑定会被归一化为无值 `open`（展开）。SSR 宿主建议用静态属性声明初始态 + 监听 `oas-toggle` 在客户端接管状态，或宿主框架侧改用 JS property（`el.open = false`）绑定。

## 事件

`oas-toggle` 在每次开合后派发，`detail: { open }`；受控与非受控模式均派发。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import 须在 onMounted 内：顶层 await import 会在 vitepress 构建期 SSR 求值（Node 无 HTMLElement），页面变空壳
  const { message } = await import('@oas-ui/ui')
  window.message = message
  // 受控切换：property/方法调用须等 upgrade 完成，否则 expando 会遮蔽原生行为
  const ctrl = document.querySelector('#collapsible-ctrl')
  const setState = (open) => {
    const state = document.querySelector('#collapsible-state')
    if (state) state.textContent = open ? '展开' : '收起'
  }
  window.collapsibleToggle = () =>
    customElements.whenDefined('oas-collapsible').then(() => {
      const open = ctrl?.getAttribute('open') !== 'false'
      ctrl?.setAttribute('open', open ? 'false' : '')
      // 外部写属性不派发 oas-toggle（事件仅用户点击触发），反馈文本在此同步
      setState(!open)
    })
  ctrl?.addEventListener('oas-toggle', (e) => {
    setState(e.detail.open)
  })
})
</script>

## 禁用

<DemoBlock title="disabled 禁用触发器">
  <div style="width: 100%">
    <oas-collapsible header="禁用面板" disabled>
      <p>禁用态：触发器不可聚焦、不可点击，不派发事件。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

`disabled` 置灰展示；config-provider 全局禁用注入同样生效。

## 富触发内容

<DemoBlock title="slot=&quot;header&quot; 自定义触发器">
  <div style="width: 100%">
    <oas-collapsible>
      <span slot="header"><b>发布计划</b>（每两周一个迭代）</span>
      <p>触发内容来自 slot="header"，优先于 header 属性文案；可放图标、标签等任意内容。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

## 自定义展开图标

<DemoBlock title="template[slot=&quot;toggle&quot;] 自定义展开图标">
  <div style="width: 100%">
    <oas-collapsible header="自定义图标">
      <template slot="toggle">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 6l6 6 6-6"/></svg>
      </template>
      <p>展开图标替换为向下的 chevron，收起时随展开态旋转。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

## 表单折叠分区

<DemoBlock title="场景：设置页折叠分区">
  <div style="width: 100%">
    <oas-collapsible header="通知设置" default-open>
      <p>邮件通知、桌面通知与免打扰时段等设置项。</p>
    </oas-collapsible>
    <oas-collapsible header="隐私设置">
      <p>可见范围、数据共享与历史记录清理等设置项。</p>
    </oas-collapsible>
  </div>
</DemoBlock>

多个 collapsible 各自独立开合（无手风琴互斥——互斥编排请用 `oas-collapse accordion`）。

## 无 JS 退化

组件未升级（无 JS 环境）时，light DOM 内容作为普通内容直接可见——折叠能力退化、信息不丢失。

## API

### oas-collapsible

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `default-open` | 非受控初始展开（值语义：非 "false" 为展开，兼容框架布尔绑定序列化出的 "false" 在场写法）：首帧初值，之后组件自管，不写回属性；open 属性在场时失效（进入受控） | — | — |
| `disabled` | 禁用触发器：不可聚焦、不可点击、不派发事件；config-provider 全局禁用注入同样生效 | `boolean` | — |
| `header` | 触发器文案（渲染进触发按钮；富内容用 slot="header"，插槽优先） | `string` | — |
| `open` | 展开态（受控开关）：属性缺席 = 非受控自管（首帧由 default-open 播种）；属性在场 = 受控（值非 "false" 为展开、"false" 为收起），点击翻转后写回属性并派发事件（乐观更新） | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-toggle` | 开合状态变化后派发，detail { open }（受控与非受控模式均派发） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 折叠体内容 |
| `header` | 触发器富内容插槽，覆盖 header 属性文案 |
| `template[slot="toggle"]` | 自定义展开图标模板（缺省为内建箭头） |
