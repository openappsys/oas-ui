# Collapse 折叠面板

用于将内容收纳在可折叠的面板中，聚焦关键信息。

## 基础用法

<DemoBlock title="可同时展开多个">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="项目信息"><p>包括团队、里程碑与预算等基础信息。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="技术栈"><p>组件库基于 Web Components 标准构建。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="发布计划"><p>按版本迭代，每个版本发布前执行工程纪律清单。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

通过 `active` 控制展开的面板集合（`name` 逗号分隔），默认可同时展开多个。

## 手风琴

<DemoBlock title="手风琴模式">
  <div style="width: 100%">
    <oas-collapse accordion active="a">
      <oas-collapse-item name="a" header="面板一"><p>同一时间仅展开一个面板。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>展开新的面板会自动收起上一个。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="面板三"><p>再次点击已展开面板可全部收起。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 全部收起

<DemoBlock title="默认全部收起">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="面板一"><p>默认状态全部收起。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>点击标题展开。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="展开状态事件">
  <div style="width: 100%">
    <oas-collapse accordion active="a" id="collapse-event">
      <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      当前展开：<span id="collapse-state">a</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import 须在 onMounted 内：顶层 await import 会在 vitepress 构建期 SSR 求值（Node 无 HTMLElement），页面变空壳
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#collapse-event')?.addEventListener('oas-change', (e) => {
    const active = e.detail.active
    document.querySelector('#collapse-state').textContent = active.length ? active.join('、') : '（无）'
  })

  // 切换前拦截：勾选「未保存」后收起会被阻止
  const guard = document.querySelector('#collapse-guard')
  let guardDirty = false
  window.collapseGuardDirty = (v) => {
    guardDirty = v
  }
  guard?.addEventListener('oas-before-collapse', (e) => {
    const willCollapse = !e.detail.next.includes(e.detail.name)
    if (guardDirty && willCollapse) {
      e.preventDefault()
      message.warning('内容未保存，已阻止收起')
    }
  })

  // 命令式方法：property 赋值/方法调用必须等 upgrade 完成，否则 expando 会遮蔽原型方法
  const methods = document.querySelector('#collapse-methods')
  window.collapseExpandAll = () =>
    customElements.whenDefined('oas-collapse').then(() => methods?.expandAll())
  window.collapseCollapseAll = () =>
    customElements.whenDefined('oas-collapse').then(() => methods?.collapseAll())
})
</script>

## 无边框 FAQ

<DemoBlock title="无边框常见问题（手风琴 + 图标左置）">
  <div style="width: 100%">
    <oas-collapse variant="borderless" accordion icon-placement="start" active="q1">
      <oas-collapse-item name="q1" header="如何安装组件库？"><p>通过包管理器安装核心包，并在入口注册组件族。</p></oas-collapse-item>
      <oas-collapse-item name="q2" header="支持暗色主题吗？"><p>所有颜色都走设计 token，暗色变体自动生效。</p></oas-collapse-item>
      <oas-collapse-item name="q3" header="可以用于 SSR 吗？"><p>支持。SSR 快照与客户端渲染共用同一份模板，可无缝水合。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`variant="borderless"` 为无边框幽灵形态：去掉组轮廓、圆角与分隔线，适合嵌入 FAQ、设置页等弱边界场景。

## 图标左置

<DemoBlock title="侧边导航风格（icon-placement=start）">
  <div style="width: 100%">
    <oas-collapse icon-placement="start">
      <oas-collapse-item name="guide" header="指南"><p>安装、快速上手与主题定制。</p></oas-collapse-item>
      <oas-collapse-item name="components" header="组件"><p>按基础、表单、反馈、导航等家族浏览。</p></oas-collapse-item>
      <oas-collapse-item name="resources" header="资源"><p>设计 token、图标与更新日志。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

默认图标在标题右侧（`end`），`icon-placement="start"` 时箭头左置。也可在单个 `oas-collapse-item` 上设置该属性覆盖容器值。

## 富标题与操作区

<DemoBlock title="自定义标题与额外操作区">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a">
        <span slot="header"><b>发布计划</b>（每两周一个迭代）</span>
        <oas-button slot="extra" size="small" variant="outlined" onclick="message.info('已打开设置')">设置</oas-button>
        <p>标题来自 <code>slot="header"</code>，优先于 <code>header</code> 属性。</p>
      </oas-collapse-item>
      <oas-collapse-item name="b" header="普通属性标题">
        <oas-button slot="extra" size="small" variant="outlined" onclick="message.info('已导出')">导出</oas-button>
        <p><code>slot="extra"</code> 位于头部右侧，其中的点击不会触发展开/收起。</p>
      </oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

- `slot="header"`：富文本标题，与 `header` 属性互斥（slot 优先）。若标题内放置交互元素，请在宿主侧对 `click` 自行 `stopPropagation`，避免触发展开。
- `slot="extra"`：头部右侧操作区，组件内部已阻止其点击冒泡到折叠交互，可直接放按钮等控件。

## 非受控初值

<DemoBlock title="default-active 非受控">
  <div style="width: 100%">
    <oas-collapse default-active="a">
      <oas-collapse-item name="a" header="面板一"><p>首帧按 default-active 展开，之后状态由组件自管，不写回 active 属性。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>点击任意面板自由切换。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`default-active` 只作非受控初值；一旦设置了 `active` 属性则进入受控模式，`default-active` 不再生效。

## 禁用面板

<DemoBlock title="禁用的面板不可展开">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="可用面板"><p>正常展开。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="禁用面板" disabled><p>禁用态：不可聚焦、不可点击。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`disabled` 面板置灰展示，不参与键盘 roving 与 `expandAll()`。

## 锁定展开

<DemoBlock title="no-collapse 锁定当前展开项">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="锁定面板" no-collapse><p>展开后点击自身不会收起（可用键盘 Space/Enter 以外的面板切换）。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="普通面板"><p>普通面板不受影响。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`no-collapse` 只约束头部点击；`collapseAll()` 方法仍可强制收起。

## 切换前拦截

<DemoBlock title="oas-before-collapse 可取消事件">
  <div style="width: 100%">
    <oas-collapse id="collapse-guard" active="draft">
      <oas-collapse-item name="draft" header="草稿（勾选未保存后不许收起）">
        <label style="display: flex; align-items: center; gap: 8px">
          <input type="checkbox" onchange="collapseGuardDirty(this.checked)" /> 标记为「未保存」
        </label>
        <p>勾选后尝试点击本面板标题，收起会被拦截并提示。</p>
      </oas-collapse-item>
      <oas-collapse-item name="done" header="已完成面板"><p>不受拦截影响。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`oas-before-collapse` 为可取消事件，`detail: { name, next }`；宿主 `preventDefault()` 即阻止本次切换（展开与收起都会先派发）。

## 嵌套面板

<DemoBlock title="嵌套折叠面板">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="outer" header="外层面板">
        <oas-collapse>
          <oas-collapse-item name="in-a" header="内层面板 A"><p>内层事件不会干扰外层。</p></oas-collapse-item>
          <oas-collapse-item name="in-b" header="内层面板 B"><p>各自独立维护展开集合。</p></oas-collapse-item>
        </oas-collapse>
      </oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 自定义展开图标

<DemoBlock title="template[slot=&quot;toggle&quot;] 自定义展开图标">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="自定义图标">
        <template slot="toggle">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 6l6 6 6-6"/></svg>
        </template>
        <p>展开图标替换为向下的 chevron，收起时随展开态旋转。</p>
      </oas-collapse-item>
      <oas-collapse-item name="b" header="默认箭头"><p>未提供 toggle 模板时渲染默认箭头。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## 展开全部 / 收起全部

<DemoBlock title="expandAll() / collapseAll() 方法">
  <div style="width: 100%">
    <oas-space style="margin-bottom: 8px">
      <oas-button size="small" onclick="collapseExpandAll()">全部展开</oas-button>
      <oas-button size="small" onclick="collapseCollapseAll()">全部收起</oas-button>
    </oas-space>
    <oas-collapse id="collapse-methods" default-active="a">
      <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
      <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
      <oas-collapse-item name="c" header="禁用面板" disabled><p>方法会跳过禁用项。</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

容器提供 `expandAll()` / `collapseAll()` 命令式方法。手风琴模式下 `expandAll()` 语义为只展开第一项；两方法均跳过 `disabled` 项派发 `oas-change`。

## 渲染策略与标题层级

<DemoBlock title="destroy-on-collapse / force-render / heading-level">
  <div style="width: 100%">
    <oas-collapse heading-level="3">
      <oas-collapse-item name="a" header="默认渲染（收起保留内容）"><p>内容常驻 DOM，收起仅隐藏。</p></oas-collapse-item>
      <oas-collapse-item name="b" header="destroy-on-collapse（收起销毁内容）" destroy-on-collapse><p>收起时内容从 DOM 移除，再次展开重新挂载（收起动画随之跳过）。</p></oas-collapse-item>
      <oas-collapse-item name="c" header="force-render（初始即渲染）" force-render><p>即使从未展开过，内容也已在 DOM 中（供检索/抓取其文本的场景）。</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
      容器 <code>heading-level="3"</code>：面板标题挂 heading 角色（aria-level=3），屏幕阅读器可按标题导航；item 可用同名属性单独覆盖。
    </p>
  </div>
</DemoBlock>

## API

### oas-collapse

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accordion` | 手风琴模式，同时仅展开一项 | `boolean` | — |
| `active` | 展开项 `name` 集合（逗号分隔） | — | — |
| `default-active` | 非受控初始展开集合（`name` 逗号分隔）：首帧初值，之后组件自管；`active` 属性在场时为受控 | — | — |
| `heading-level` | 面板标题语义层级 `1`-`6` / `none`（默认）：1-6 时标题区挂 heading 角色与 aria-level（无障碍） | `string` | — |
| `icon-placement` | 展开图标位置：`start`（标题左侧）/ `end`（默认，右侧）；item 可单独覆盖 | `string` | `end` |
| `variant` | 形态：`outlined`（默认，带边框圆角容器）/ `borderless`（无边框幽灵形态） | — | — |

| 事件 | 说明 |
| --- | --- |
| `oas-before-collapse` | 展开/收起前派发（cancelable），`detail: { name, next }`；`preventDefault()` 阻止本次切换（expandAll/collapseAll 不触发） |
| `oas-change` | 展开状态变化，`detail: { active: string[] }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-collapse-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `destroy-on-collapse` | 收起时销毁面板内容（再次展开重新挂载；收起动画随之跳过） | `boolean` | — |
| `disabled` | 禁用面板：不可聚焦、不可点击（方法 expandAll 跳过） | `boolean` | — |
| `force-render` | 初始即渲染面板内容（默认收起态不渲染） | `boolean` | — |
| `header` | 面板标题 | `string` | — |
| `heading-level` | 覆盖容器设置的标题语义层级（`1`-`6` / `none`） | `string` | — |
| `icon-placement` | 覆盖容器设置的展开图标位置（`start` / `end`） | — | — |
| `name` | 面板唯一标识 | — | — |
| `no-collapse` | 强锁展开态：展开后点击自身不收起（不影响其他面板开合） | — | — |
| `open` | 是否展开（由容器托管） | `boolean` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `extra` | 面板头右侧操作区（内部点击不触发展开收起） |
| `header` | 面板头富内容（与 header 属性互斥，slot 优先；标题内交互元素请自行 stopPropagation） |
| `template[slot="toggle"]` | 自定义展开图标模板（缺省为内建箭头） |
