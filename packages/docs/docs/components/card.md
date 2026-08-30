# Card 卡片

用于承载一组相关内容的信息容器。

## 基础用法

<DemoBlock title="基础卡片">
  <div style="width: 100%">
    <oas-card title="项目概览">
      <p>这是一张基础卡片，展示一组摘要信息。</p>
      <p>内容区支持任意自定义结构。</p>
    </oas-card>
  </div>
</DemoBlock>

## 无标题

<DemoBlock title="无标题卡片">
  <div style="width: 100%">
    <oas-card>
      <p>省略 <code>title</code> 属性时，仅保留内容区。</p>
    </oas-card>
  </div>
</DemoBlock>

## 可悬浮

<DemoBlock title="悬浮阴影">
  <div style="width: 100%">
    <oas-card title="悬浮卡片" hoverable>
      <p>将鼠标移入卡片，可看到阴影过渡效果。</p>
    </oas-card>
  </div>
</DemoBlock>

## 扩展区

<DemoBlock title="带操作扩展区">
  <div style="width: 100%">
    <oas-card title="权限管理">
      <p>通过 <code>extra</code> 插槽在标题右侧放置操作。</p>
      <oas-button slot="extra" size="small">新建</oas-button>
    </oas-card>
  </div>
</DemoBlock>

## 封面图

`cover-src` 属性或 `cover` 插槽可在卡片顶部放一张全宽封面图（object-fit: cover 自适应裁切）。

<DemoBlock title="cover-src 封面图">
  <div style="width: 320px">
    <oas-card title="城市骑行" cover-src="https://picsum.photos/seed/isui-card-cover/640/360" cover-alt="沿江骑行照片">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">沿江 15 公里休闲骑行线路，周末出发正合适。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="cover 插槽自定义封面">
  <div style="width: 320px">
    <oas-card title="山景徒步">
      <svg slot="cover" viewBox="0 0 400 180" preserveAspectRatio="none" style="width:100%; height:150px; display:block;"><defs><linearGradient id="ccg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="400" height="180" fill="url(#ccg1)"/><text x="200" y="100" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">封面图</text></svg>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">周末两日轻装徒步路线推荐，无需露营装备。</p>
    </oas-card>
  </div>
</DemoBlock>

## 封面 + 操作区（商品卡）

底部 `actions` 插槽放按钮组，上方自动带分隔线。

<DemoBlock title="商品卡">
  <div style="width: 320px">
    <oas-card title="无线降噪耳机" hoverable cover-src="https://picsum.photos/seed/isui-card-product/640/360" cover-alt="耳机产品图">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">主动降噪 · 30 小时续航 · 蓝牙 5.3</p>
      <p style="color: var(--oas-color-primary); font-weight: 600; margin: var(--oas-space-2) 0 0;">¥ 899</p>
      <div slot="actions">
        <oas-button size="small">查看详情</oas-button>
        <oas-button size="small" type="primary">加入购物车</oas-button>
      </div>
    </oas-card>
  </div>
</DemoBlock>

## 可点击（clickable）

`clickable` 整卡可点：可聚焦、Enter/Space 触发 `oas-click`，焦点环随键盘聚焦出现。点击操作区内的按钮不会触发整卡点击。

<DemoBlock title="可点击卡片">
  <div style="width: 320px">
    <oas-card clickable title="项目概览" hoverable>
      <p style="color: var(--oas-color-text-secondary); margin: 0;">点击整卡或按 Enter/Space 触发 oas-click。</p>
    </oas-card>
  </div>
</DemoBlock>

<DemoBlock title="可点击 + 操作区互不干扰">
  <div style="width: 320px">
    <oas-card clickable title="协作项目" cover-src="https://picsum.photos/seed/isui-card-team/640/360" cover-alt="团队协作插画">
      <p style="color: var(--oas-color-text-secondary); margin: 0;">点卡片主体触发整卡点击；点右下按钮走各自操作。</p>
      <div slot="actions">
        <oas-button size="small">邀请成员</oas-button>
        <oas-button size="small" type="danger">归档</oas-button>
      </div>
    </oas-card>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-click', (e) => {
    // 排除按钮自身的 oas-click，只响应卡片整卡点击
    if (!(e.target instanceof HTMLElement)) return
    if (e.target.tagName !== 'OAS-CARD') return
    const title = e.target.getAttribute('title') || '卡片'
    window.message?.info(`点击了卡片「${title}」`)
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clickable` | 整卡可点（focusable，点击/Enter/Space 派发 `oas-click`） | `boolean` | — |
| `cover-alt` | 封面图 alt 文本（无障碍） | `string` | — |
| `cover-src` | 封面图 URL，置于卡片顶部（object-fit: cover 自适应裁切） | `string` | — |
| `hoverable` | 是否开启悬浮阴影（阴影 + 上浮提升 + 指针） | `boolean` | — |
| `title` | 卡片标题（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 整卡点击（`clickable` 时），detail 含 originalEvent |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 卡片内容 |
| `actions` | 底部操作区（查看/编辑/删除等按钮组），上方带分隔线 |
| `cover` | 自定义封面内容（与 `cover-src` 二选一，`cover-src` 优先） |
| `extra` | 标题右侧扩展区 |
