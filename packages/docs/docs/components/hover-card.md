# HoverCard 悬停卡片

hover / 聚焦触发，浮层可悬停不闪关的富内容预览卡片。支持 12 向放置、显隐延迟分离、箭头（含贴角融合）、双轴偏移、碰撞细调、挂载容器定制、延迟组与受控显示。

## 基础用法

悬停或聚焦触发器显示预览卡片。

<DemoBlock title="悬停触发">
  <oas-hover-card title="用户信息" content="悬停查看用户详情。" placement="bottom">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-hover-card>
</DemoBlock>

## 富内容插槽

`slot="content"` 插槽承载任意 HTML 预览（链接 / 按钮 / 图片等）。**浮层可悬停**：指针从触发器移到卡片内不关闭，卡片内的链接与按钮可交互（悬停区域 = 触发器 + 浮层面板）。

<DemoBlock title="富内容预览（浮层可悬停）">
  <oas-hover-card placement="bottom">
    <oas-button>悬停查看用户</oas-button>
    <div slot="content" style="width: 260px">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
        <oas-avatar size="small">O</oas-avatar>
        <div>
          <div style="font-weight: 600">欧阳小雨</div>
          <div style="color: var(--oas-color-text-secondary)">前端工程师 · 杭州</div>
        </div>
      </div>
      <div style="margin-bottom: 12px; color: var(--oas-color-text-secondary)">关注开源与 Web Components，写代码与写文章两不误。</div>
      <oas-space size="small">
        <oas-button size="small" type="primary">发消息</oas-button>
        <oas-link href="https://example.com" target="_blank">个人主页</oas-link>
      </oas-space>
    </div>
  </oas-hover-card>
</DemoBlock>

## 放置方向

12 向放置：top / bottom / left / right × start / 中心 / end。

<DemoBlock title="12 向放置">
  <oas-space direction="vertical" size="small">
    <oas-space size="small">
      <oas-hover-card title="标题" content="内容" placement="top-start"><oas-button>上-左</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="top"><oas-button>上</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="top-end"><oas-button>上-右</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="标题" content="内容" placement="bottom-start"><oas-button>下-左</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="bottom"><oas-button>下</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="bottom-end"><oas-button>下-右</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="标题" content="内容" placement="left-start"><oas-button>左-上</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="left"><oas-button>左</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="left-end"><oas-button>左-下</oas-button></oas-hover-card>
    </oas-space>
    <oas-space size="small">
      <oas-hover-card title="标题" content="内容" placement="right-start"><oas-button>右-上</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="right"><oas-button>右</oas-button></oas-hover-card>
      <oas-hover-card title="标题" content="内容" placement="right-end"><oas-button>右-下</oas-button></oas-hover-card>
    </oas-space>
  </oas-space>
</DemoBlock>

## 显隐延迟

`open-delay` / `close-delay` 分离配置：悬停约 800ms 后出现，移出后 300ms 关闭。`delay` 为兼容别名（未分别设置时同时作用于显隐）。

<DemoBlock title="延迟分离（open-delay / close-delay）">
  <oas-space size="small">
    <oas-hover-card title="延迟卡片" content="悬停约 800ms 后出现，移出后 300ms 关闭。" open-delay="800" close-delay="300" placement="bottom">
      <oas-button>分离延迟</oas-button>
    </oas-hover-card>
    <oas-hover-card title="延迟卡片" content="delay 别名：显隐同为 400ms。" delay="400" placement="bottom">
      <oas-button>delay 别名</oas-button>
    </oas-hover-card>
  </oas-space>
</DemoBlock>

## 箭头

箭头默认显示；`arrow="false"` 隐藏；`arrow-point-at-center` 让箭头始终指向触发器中心。

<DemoBlock title="箭头（默认 / 隐藏 / 指向中心）">
  <oas-hover-card title="标题" content="带箭头" placement="top"><oas-button>默认箭头</oas-button></oas-hover-card>
  <oas-hover-card title="标题" content="无箭头" placement="top" arrow="false"><oas-button>隐藏箭头</oas-button></oas-hover-card>
  <oas-hover-card title="标题" content="箭头指向触发器中心" placement="top" arrow-point-at-center><oas-button>指向中心</oas-button></oas-hover-card>
</DemoBlock>

## 箭头贴角融合

`arrow-merge`：*-start / *-end 位置下箭头与面板圆角融合成直角三角。

<DemoBlock title="箭头贴角（arrow-merge）">
  <oas-hover-card title="标题" content="箭头贴角融合" placement="bottom-start" arrow-merge><oas-button>下-左</oas-button></oas-hover-card>
  <oas-hover-card title="标题" content="箭头贴角融合" placement="bottom-end" arrow-merge><oas-button>下-右</oas-button></oas-hover-card>
</DemoBlock>

## 双轴偏移

`offset` 主轴距离（面板与触发器间距），`skidding` 交叉轴偏移。

<DemoBlock title="双轴偏移（offset / skidding）">
  <oas-hover-card title="标题" content="主轴距离 20px" placement="bottom" offset="20"><oas-button>offset=20</oas-button></oas-hover-card>
  <oas-hover-card title="标题" content="交叉轴右移 24px" placement="bottom" skidding="24"><oas-button>skidding=24</oas-button></oas-hover-card>
</DemoBlock>

## 宽度定制

`width` 数值（px）或 `trigger` / `target`（与触发器同宽）。

<DemoBlock title="宽度定制（width）">
  <oas-hover-card title="标题" content="固定宽度 320px" width="320" placement="bottom"><oas-button>width=320</oas-button></oas-hover-card>
  <oas-hover-card title="标题" content="与触发器同宽" width="trigger" placement="bottom"><oas-button>width=trigger</oas-button></oas-hover-card>
</DemoBlock>

## 挂载容器

`append-to`：卡片改为绝对定位在指定容器内（容器提升为定位上下文），适合嵌入自定义面板 / 弹层区域。

<DemoBlock title="append-to 定位容器">
  <oas-space size="small">
    <oas-hover-card title="标题" content="卡片渲染在下方容器内" placement="bottom" append-to="#hc-panel">
      <oas-button>悬停查看</oas-button>
    </oas-hover-card>
  </oas-space>
  <div id="hc-panel" style="position: static; min-height: 120px; margin-top: 16px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3)"></div>
</DemoBlock>

## 碰撞细调

`collision-padding` 视口夹取边距；`fallback-placements` 自定义回退序列；`hide-when-detached` 锚点滚出视口时隐藏卡片；`auto-adjust-overflow="false"` 关闭自动调整。

<DemoBlock title="碰撞细调">
  <oas-space size="small">
    <oas-hover-card title="标题" content="视口夹取边距 24px" placement="right" collision-padding="24"><oas-button>碰撞边距</oas-button></oas-hover-card>
    <oas-hover-card title="标题" content="空间不足时依次回退 left / top" placement="bottom" fallback-placements="left,top"><oas-button>回退序列</oas-button></oas-hover-card>
    <oas-hover-card title="标题" content="锚点滚出视口时隐藏" placement="bottom" hide-when-detached><oas-button>脱离隐藏</oas-button></oas-hover-card>
    <oas-hover-card title="标题" content="不自动调整，严格按声明放置" placement="bottom" auto-adjust-overflow="false"><oas-button>关自动调整</oas-button></oas-hover-card>
  </oas-space>
</DemoBlock>

## 禁用

`disabled`：hover / focus 不再触发显示（受控 `open` 仍可显隐）。

<DemoBlock title="禁用（disabled）">
  <oas-hover-card title="标题" content="禁用后不显示" placement="bottom" disabled>
    <oas-button disabled>悬停无效</oas-button>
  </oas-hover-card>
</DemoBlock>

## 延迟组

相同 `group` 值的多个触发器共享延迟：指针在组内成员间连续移动时，后一个跳过 open-delay 立即打开、前一个立即关闭。

<DemoBlock title="延迟组（group）">
  <oas-space size="small">
    <oas-hover-card title="用户 A" content="连续悬停时立即切换" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>用户 A</oas-button>
    </oas-hover-card>
    <oas-hover-card title="用户 B" content="连续悬停时立即切换" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>用户 B</oas-button>
    </oas-hover-card>
    <oas-hover-card title="用户 C" content="连续悬停时立即切换" placement="bottom" group="hc-demo-group" open-delay="600">
      <oas-button>用户 C</oas-button>
    </oas-hover-card>
  </oas-space>
</DemoBlock>

## 受控显示与事件

`open` 属性受控显隐；显隐变化派发 `oas-open-change`（`detail: { open }`）。hover / focus 触发仍叠加生效。

<DemoBlock title="受控显示（open + oas-open-change）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="hcCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="hcCtrl(false)">隐藏</oas-button>
    <oas-tag id="hc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-hover-card id="hc-ctrl" title="受控卡片" content="由 open 属性控制显隐。" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-hover-card>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const hc = document.getElementById('hc-ctrl')
  const status = document.getElementById('hc-status')
  if (!hc || !status) return
  const sync = () => {
    status.textContent = `open: ${hc.hasAttribute('open')}`
  }
  window.hcCtrl = (open) => {
    if (open) hc.setAttribute('open', '')
    else hc.removeAttribute('open')
  }
  window.addEventListener('oas-open-change', (e) => {
    const el = e.target
    if (el instanceof HTMLElement && el.id === 'hc-ctrl') {
      status.textContent = `open: ${e.detail.open}`
    }
  })
  sync()
  // hover / focus 触发与外部控制都会改 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(hc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | 定位容器选择器（如 `#panel`）：设置后卡片改为绝对定位在该容器内（容器提升为相对定位上下文），坐标随容器换算；未设置时走 `position: fixed` 视口坐标 | — | — |
| `arrow` | 是否显示箭头，默认 true；`arrow="false"` 隐藏，箭头元素与 `::part(arrow)` 保留 | `string` | `true` |
| `arrow-merge` | 箭头贴角融合模式：*-start/*-end 位置下直角三角与面板角共边融合——直角贴角点、直角边与面板两边共线（描边与面板描边共带续接），尖端正交指向锚点，对应角圆角归零；居中位置不生效 | `boolean` | — |
| `arrow-point-at-center` | 箭头指向触发器中心（面板被视口避让偏移后仍指向锚点）；默认箭头保持面板中心 | `boolean` | — |
| `auto-adjust-overflow` | 视口边缘自动调整（翻转/夹取），默认 true；`"false"` 关闭，按声明 placement 严格定位（浮层可越出视口） | `string` | `true` |
| `close-delay` | 关闭延迟（毫秒），与 open-delay 分离；未设置时回退 `delay` 别名，再回退默认 150 | — | — |
| `collision-padding` | 视口夹取边距（px），默认 4 | — | — |
| `content` | 内容文本 | `string` | — |
| `delay` | 显隐延迟（毫秒），兼容别名：`open-delay`/`close-delay` 未设置时同时作用于打开与关闭；分别设置时以各自为准 | — | — |
| `disabled` | 禁用浮层显示：hover/focus 触发不再打开；受控 `open` 属性仍可显隐 | `boolean` | — |
| `fallback-placements` | 自定义回退序列（逗号分隔基向，如 `left,top`）：请求 placement 空间不足时按序列依次尝试；缺省默认翻转到对向 | — | — |
| `group` | 延迟组名：同 `group` 值的组件共享延迟，指针在组内成员间连续移动时后一个跳过 open-delay 立即打开、前一个立即关闭 | — | — |
| `hide-when-detached` | 锚点滚出视口（完全脱离）时隐藏卡片，保留 open 语义，滚动回来自动恢复 | `boolean` | — |
| `offset` | 主轴距离（px，面板与触发器的间距），默认 8 | — | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `open-delay` | 打开延迟（毫秒），与 close-delay 分离；未设置时回退 `delay` 别名，再回退默认 300 | — | — |
| `placement` | 浮层位置，12 向：top/bottom/left/right × start/中心/end（如 `bottom-start`） | `string` | `top` |
| `skidding` | 交叉轴偏移（px），沿垂直于主轴的轴平移 | — | — |
| `title` | 标题文本 | `string` | — |
| `width` | 宽度定制：数值（px）或 `trigger`/`target`（与触发器同宽）；未设置走 CSS min-width | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | open 状态变化（显示/关闭）时派发，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 触发器（首个非 `slot="content"` 子元素），hover/focus 触发 |
| `content` | 富内容插槽：卡片内的自由 HTML 预览（链接/按钮等，可交互） |
