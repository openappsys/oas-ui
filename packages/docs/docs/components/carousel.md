# Carousel 轮播

用于在同一可视区域循环展示多屏内容，支持手动切换与自动播放。

## 基础用法

<DemoBlock title="基础轮播">
  <div style="width: 100%">
    <oas-carousel>
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 200px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 200px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 200px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

点击底部圆点可切换屏幕，默认不自动播放。

## 指定起始索引

<DemoBlock title="受控索引">
  <div style="width: 100%">
    <oas-carousel index="1">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

通过 `index` 指定当前屏（从 0 开始）。

## 自动播放

<DemoBlock title="自动播放">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">自动 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">自动 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">自动 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

设置 `autoplay` 开启自动播放，`interval` 控制间隔（毫秒）。

## 箭头形态

左右箭头支持三种显示形态，通过 `arrows` 属性控制：`always`（始终显示）/ `hover`（悬停显示，默认）/ `never`（不显示）。箭头点击切换上一屏 / 下一屏，首尾循环。

<DemoBlock title="始终显示（always）">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="悬停显示（hover）">
  <div style="width: 100%">
    <oas-carousel arrows="hover">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="不显示（never）">
  <div style="width: 100%">
    <oas-carousel arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

默认（未指定 `arrows`）即悬停显示形态：箭头默认隐藏，鼠标悬停或键盘聚焦轮播区域时平滑淡入。不指定 `arrows` 时等价于 `arrows="hover"`。

## 图片轮播

轮播项不局限于色块——放 `<img>` 或 SVG 即成图片 banner。

<DemoBlock title="图片 banner（SVG）">
  <div style="width: 100%">
    <oas-carousel arrows="always">
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg1)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">夏日活动</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg2)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">秋日上新</text></svg>
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" style="width:100%; height:220px; display:block;"><defs><linearGradient id="cbg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs><rect width="800" height="260" fill="url(#cbg3)"/><text x="400" y="140" font-size="36" text-anchor="middle" fill="#fff" font-family="sans-serif">冬日促销</text></svg>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="图片轮播（img + 自动播放）">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2500">
      <img src="https://picsum.photos/seed/isui-cv-1/800/260" alt="轮播图 1" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-2/800/260" alt="轮播图 2" style="width:100%; height:220px; object-fit: cover; display:block;">
      <img src="https://picsum.photos/seed/isui-cv-3/800/260" alt="轮播图 3" style="width:100%; height:220px; object-fit: cover; display:block;">
    </oas-carousel>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="切换事件">
  <div style="width: 100%">
    <oas-carousel id="carousel-event">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">第三屏</div>
    </oas-carousel>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      当前屏：<span id="carousel-current">1</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#carousel-event')?.addEventListener('oas-change', (e) => {
    document.querySelector('#carousel-current').textContent = String(e.detail.index + 1)
  })
})
</script>

## 指示器

指示器支持隐藏、外挂与线性形态三种定制，通过 `indicators` / `indicator-position` / `indicator-type` 控制。圆点颜色走组件级 CSS 变量 `--oas-carousel-dot-bg` / `--oas-carousel-dot-active-bg`（默认白色系，适配深色轮播项；浅色轮播项可在宿主覆盖）。

<DemoBlock title="隐藏指示器（indicators=false）">
  <div style="width: 100%">
    <oas-carousel indicators="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="外挂指示器（indicator-position=outside）">
  <div style="width: 100%">
    <oas-carousel indicator-position="outside" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

<DemoBlock title="线性指示器（indicator-type=line）">
  <div style="width: 100%">
    <oas-carousel indicator-type="line" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 淡出淡入

设置 `effect="fade"` 切换为全屏叠层淡入淡出（默认 `slide` 位移切换）。`prefers-reduced-motion` 下自动退化为即时切换。

<DemoBlock title="淡出淡入（effect=fade）">
  <div style="width: 100%">
    <oas-carousel effect="fade" arrows="always">
      <div style="background: linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-success)); color: var(--oas-color-text-on-primary); height: 200px">淡入淡出 1</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-warning), var(--oas-color-danger)); color: var(--oas-color-text-on-warning); height: 200px">淡入淡出 2</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-danger), var(--oas-color-primary)); color: var(--oas-color-text-on-danger); height: 200px">淡入淡出 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 切换方法

组件暴露 `next()` / `prev()` / `goTo(index)` 命令式方法，配合 `oas-change` 事件（`detail` 含 `index` 与 `prevIndex`）可实现缩略图控制主轮播等自定义交互。

<DemoBlock title="命令式切换（next / prev / goTo）">
  <div style="width: 100%">
    <oas-carousel id="carousel-methods" arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三屏</div>
    </oas-carousel>
    <oas-button size="small" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').prev()">上一屏</oas-button>
    <oas-button size="small" type="primary" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').next()">下一屏</oas-button>
    <oas-button size="small" style="margin-top: var(--oas-space-3)" onclick="document.getElementById('carousel-methods').goTo(2)">跳到第 3 屏</oas-button>
  </div>
</DemoBlock>

## 循环开关

默认首尾循环；设置 `loop="false"` 后到头即停（首屏禁用上一箭头、末屏禁用下一箭头），适用于分步引导、末尾带操作区的场景。

<DemoBlock title="不循环（loop=false）">
  <div style="width: 100%">
    <oas-carousel loop="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">第一步</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">第二步</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">第三步（最后）</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 自动播放暂停

自动播放时，悬停或键盘聚焦轮播区域即暂停，移开恢复；页面切到后台自动停播，回到前台继续（满足 WCAG 2.2.2 暂停要求）。可用 `pause-on-hover="false"` 关闭悬停暂停。

<DemoBlock title="悬停暂停（默认开启）">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">悬停我试试 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">悬停我试试 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">悬停我试试 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

鼠标悬停（或 Tab 聚焦）上方轮播区域，自动播放会暂停在当前屏；移开后从下一拍继续。

<DemoBlock title="关闭悬停暂停（pause-on-hover=false）">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" pause-on-hover="false" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">悬停也不停 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">悬停也不停 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">悬停也不停 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 垂直轮播

设置 `direction="vertical"` 沿纵向切换。垂直模式视口默认高度 200px，可用 CSS 变量 `--oas-carousel-height` 覆盖；指示器自动移到右侧，箭头旋转 90°。

<DemoBlock title="垂直轮播（direction=vertical）">
  <div style="width: 100%">
    <oas-carousel direction="vertical" arrows="always" style="--oas-carousel-height: 160px">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 100%">第一屏</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 100%">第二屏</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 100%">第三屏</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 一屏多项

`slides-per-view` 设置每屏展示的轮播项数，`gap` 设置项间距（px）；指示器与步进按「页」语义（一组一项）。最后一页不足一组时对齐轨道末尾，不露出空白。

<DemoBlock title="一屏两项（slides-per-view=2 + gap）">
  <div style="width: 100%">
    <oas-carousel slides-per-view="2" gap="16" arrows="always">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">图 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">图 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">图 3</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 160px">图 4</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 拖拽切换

在轮播区域按下并左右（垂直模式下上下）拖动超过阈值即切换，未达阈值回弹。触摸与鼠标统一走 Pointer Events；水平拖拽放行页面纵向滚动（`touch-action: pan-y`），不与页面滚动手势冲突。拖拽结束后自动播放计时会重置。

<DemoBlock title="拖拽切换（按住拖动）">
  <div style="width: 100%">
    <oas-carousel id="carousel-drag" arrows="never">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">拖我到左边 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">拖我到左边 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">拖我到左边 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 卡片模式

设置 `type="card"` 切换为卡片式轮播：当前卡居中为主体（默认占宽 60%），左右邻卡两侧部分露出并缩小降透明；点击任一邻卡直接切到该卡，焦点在轮播项内时也可用方向键切换。非循环模式（`loop="false"`）下首尾屏贴边展示——首屏贴左露出右邻卡、末屏贴右露出左邻卡，边界不悬空。卡宽、卡间距、邻卡缩放分别走 CSS 变量 `--oas-carousel-card-width` / `--oas-carousel-card-gap` / `--oas-carousel-card-scale`。卡片模式仅水平方向生效，与 `slides-per-view` / `effect` / `direction` 互斥（同时设置时卡片模式优先），arrows / indicators / autoplay / 拖拽 / loop 均可组合使用。

<DemoBlock title="卡片模式（type=card，点击邻卡切换）">
  <div style="width: 100%">
    <oas-carousel type="card" autoplay interval="3000">
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 200px; border-radius: var(--oas-radius-lg)">卡片 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 200px; border-radius: var(--oas-radius-lg)">卡片 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 200px; border-radius: var(--oas-radius-lg)">卡片 3</div>
      <div style="background: var(--oas-color-danger); color: var(--oas-color-text-on-danger); height: 200px; border-radius: var(--oas-radius-lg)">卡片 4</div>
      <div style="background: linear-gradient(135deg, var(--oas-color-primary), var(--oas-color-success)); color: var(--oas-color-text-on-primary); height: 200px; border-radius: var(--oas-radius-lg)">卡片 5</div>
    </oas-carousel>
  </div>
</DemoBlock>

## 显式暂停按钮

自动播放除悬停/聚焦自动暂停外，还可通过 `pause-button` 显示一个显式暂停/播放按钮（固定在右上角）。显式暂停优先级最高——暂停后即使移开鼠标也不会自动继续；未开启 `autoplay` 时点击「播放」会自动开启自动播放。按钮的 `aria-pressed` 与文案随暂停态同步。

<DemoBlock title="显式暂停按钮（pause-button）">
  <div style="width: 100%">
    <oas-carousel autoplay interval="2000" pause-button>
      <div style="background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); height: 160px">点右上角按钮暂停 1</div>
      <div style="background: var(--oas-color-success); color: var(--oas-color-text-on-success); height: 160px">点右上角按钮暂停 2</div>
      <div style="background: var(--oas-color-warning); color: var(--oas-color-text-on-warning); height: 160px">点右上角按钮暂停 3</div>
    </oas-carousel>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrows` | 箭头显示形态：`always`（始终显示）/ `hover`（悬停显示）/ `never`（不显示） | `string` | `hover` |
| `autoplay` | 是否自动播放 | `boolean` | — |
| `direction` | 轮播方向：`horizontal`（默认）/ `vertical`（垂直模式视口定高，走 `--oas-carousel-height`） | `string` | `horizontal` |
| `effect` | 切换效果：`slide`（默认滑动）/ `fade`（叠层淡入淡出，reduced-motion 退化为直切） | `string` | `slide` |
| `gap` | 多图一屏时屏间间距（px，配合 `slides-per-view`） | `string` | `0` |
| `index` | 当前屏索引（从 0 起） | `string` | `0` |
| `indicator-position` | 指示器位置：`inside`（默认，叠在内容上）/ `outside`（流内占位撑高容器） | `string` | `inside` |
| `indicator-type` | 指示器形态：`dot`（默认圆点）/ `line`（线条，激活加宽） | `string` | `dot` |
| `indicators` | 指示器开关（默认 true；`"false"` 隐藏） | `string` | `true` |
| `interval` | 自动播放间隔（ms） | `string` | `3000` |
| `loop` | 循环切换（默认开；`"false"` 时到边界停驻并禁用对应箭头） | `string` | — |
| `pause-button` | 显示显式暂停/播放按钮（默认关；点击切换自动播放暂停/继续，优先级高于悬停暂停；未开启 autoplay 时点击播放即开启） | `boolean` | — |
| `pause-on-hover` | 自动播放时悬停/聚焦暂停（默认 true；`"false"` 关闭；页面切后台恒停播） | `string` | `true` |
| `slides-per-view` | 每屏展示屏数（默认 1；索引语义为页，末页对齐轨道末尾不露空白） | `string` | `1` |
| `type` | 轮播形态：`"card"` 为卡片模式——当前卡居中为主体、左右邻卡露出缩小降透明，点击邻卡直接切换；与 `slides-per-view`/`effect`/`direction` 互斥（卡片模式优先），卡宽/卡间距/邻卡缩放走 `--oas-carousel-card-width` / `--oas-carousel-card-gap` / `--oas-carousel-card-scale` | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 当前屏切换，`detail: { index }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### 部件（::part()）

| 部件                        | 说明                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `viewport` / `track`        | 视口与滑动轨道                                               |
| `dots` / `dot`              | 底部指示器容器与单个圆点                                     |
| `arrow-prev` / `arrow-next` | 左右切换箭头按钮，绝对定位于轮播两侧垂直居中，可单独定制样式 |
