# Marquee 跑马灯

循环无缝滚动展示长内容的纯展示组件，内容经 slot 无缝循环；支持悬停暂停、`prefers-reduced-motion` 静态降级。滚动速度为像素/秒真实速度（组件测量内容宽推导时长），内容不足一屏时自动填充。无事件。

::: warning 破坏性变更：speed 语义由「秒」改为「像素/秒」
旧版 `speed` 表示单次循环时长（秒）：`speed="8"` 即 8 秒滚完一整轮——内容越宽，视觉速度越快，不同容器下同一取值的实际速度飘忽。
现 `speed` 表示真实滚动速度（像素/秒，默认 48）：组件经 ResizeObserver 测量内容宽度后推导动画时长（时长 = 内容宽 ÷ 速度），内容/容器宽度不同，视觉速度依然恒定。

迁移指引：旧代码里的小数值（如 `speed="8"`）在新语义下是 8px/s（极慢），请按目标速度重设（常用 24–120）。时长语义如需保留，可用 CSS 变量 `--oas-marquee-duration` 直接覆写（测量写入后仍会覆盖，不推荐）。
:::

## 基础用法

<DemoBlock title="默认循环滚动（48px/s）">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    OAS-UI 组件库 · Web Components 无框架依赖 · TypeScript 类型完备 · 无障碍可达 ·
  </oas-marquee>
</DemoBlock>

## 速度控制

<DemoBlock title="speed=96 快速 / speed=24 慢速（像素/秒）">
  <oas-marquee speed="96" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    快速滚动：96 像素/秒
  </oas-marquee>
  <oas-marquee speed="24" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    慢速滚动：24 像素/秒
  </oas-marquee>
</DemoBlock>

同为 `speed="48"`，200px 的短内容与 2000px 的长内容视觉速度完全一致（旧「时长」语义下相差 10 倍）——这就是速度改用语义的原因。

## auto-fill 自动填充

内容比容器短时，仅复制一组会在平移过半后露出右侧留白（断 seam）。组件测量容器与内容宽度后，把克隆组自动填充到足够份数，平移一整组内容的过程中视口始终有内容，无缝不断 seam。

<DemoBlock title="auto-fill：短内容在宽容器中无缝循环">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    ✦ 短公告
  </oas-marquee>
</DemoBlock>

- 克隆份数有上限（50 份）：极短内容 + 极宽容器时宁可留白也不让 DOM 无限膨胀；图片墙等重内容场景建议内容本身至少一屏宽。
- 填充份数随容器尺寸变化自动重算（ResizeObserver）。

## 垂直滚动

`orientation="vertical"` 切换为垂直滚动（公告长文场景）。**容器必须固定高**（overflow 裁切才有意义），高度由宿主样式给出。

<DemoBlock title="orientation=vertical：垂直滚动（容器固定高 96px）">
  <oas-marquee orientation="vertical" style="height: 96px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2);">
    <div>第一条公告：v2.6 展示组件批次发布</div>
    <div>第二条公告：跑马灯支持像素/秒真实速度</div>
    <div>第三条公告：内容不足一屏自动填充</div>
    <div>第四条公告：动态追加内容滚动不跳变</div>
  </oas-marquee>
</DemoBlock>

垂直跑马灯是连续流动语义；需要「逐条滚动停顿」请用 `oas-carousel` 的垂直轮播。

## 反向滚动

<DemoBlock title="reverse：反向滚动（双行对开）">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    正向滚动：自左向右排出 · OAS-UI · Web Components ·
  </oas-marquee>
  <oas-marquee reverse style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    反向滚动：自右向左排出 · OAS-UI · Web Components ·
  </oas-marquee>
</DemoBlock>

## 边缘渐隐

`fade-edges` 开启容器两端渐隐（mask-image 遮罩，默认关——渐隐会软化边缘、改变存量外观，按需开启）。渐隐宽度走 CSS 变量 `--oas-marquee-fade-size`（默认 24px）。

<DemoBlock title="fade-edges：logo 墙边缘渐隐">
  <oas-marquee fade-edges style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3) 0;">
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0b6cff"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">A</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#16a34a"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#d97706"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#dc2626"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">D</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#7c3aed"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">E</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0891b2"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>
  </oas-marquee>
</DemoBlock>

## 悬停暂停

<DemoBlock title="pause-on-hover：鼠标悬停/聚焦时暂停">
  <oas-marquee pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    将鼠标移入本行，滚动暂停；移出后继续。
  </oas-marquee>
</DemoBlock>

## 内容动态更新

宿主向 slot 追加/修改内容时，组件重建克隆组但保持动画相位（记录当前相位、以负 `animation-delay` 续跑），用户看到的滚动位置不跳变。下方实例每 3 秒追加一条实时公告：

<DemoBlock title="动态追加内容：滚动不跳变">
  <oas-marquee id="mq-live" pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    系统运行正常 ·
  </oas-marquee>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined 守卫：元素升级后 slotchange 才会驱动克隆组重建与相位保持
  customElements.whenDefined('oas-marquee').then(() => {
    const mq = document.querySelector('#mq-live')
    if (!mq) return
    let n = 0
    setInterval(() => {
      n += 1
      const span = document.createElement('span')
      span.textContent = ` 实时公告 ${n} 号 ·`
      mq.appendChild(span)
    }, 3000)
  })
})
</script>

## 元素内容

<DemoBlock title="slot 支持任意元素组合">
  <oas-marquee speed="60" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <oas-tag>新增</oas-tag>
    <span style="margin: 0 var(--oas-space-3);">v1.6 展示组件已发布</span>
    <oas-tag type="success">推荐</oas-tag>
    <span style="margin-left: var(--oas-space-3);">构建于 Web Components 标准之上</span>
  </oas-marquee>
</DemoBlock>

## 图片 / logo 墙

内容不局限于文字——slot 放图片或 logo 即成主流的"品牌墙"无缝滚动。

<DemoBlock title="logo 墙（无缝循环 + 边缘渐隐）">
  <oas-marquee fade-edges style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3) 0;">
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0b6cff"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">A</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#16a34a"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#d97706"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#dc2626"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">D</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#7c3aed"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">E</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0891b2"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>
  </oas-marquee>
</DemoBlock>

<DemoBlock title="图片滚动（img）">
  <oas-marquee speed="36" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <img src="https://picsum.photos/seed/isui-mq-1/120/60" alt="图 1" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-2/120/60" alt="图 2" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-3/120/60" alt="图 3" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-4/120/60" alt="图 4" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
  </oas-marquee>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `fade-edges` | 布尔，存在时容器两端 mask-image 渐隐（默认关）；渐隐宽度走 `--oas-marquee-fade-size` | — | — |
| `orientation` | 滚动方向：`horizontal`（默认）/ `vertical`（垂直滚动，容器需固定高） | — | — |
| `pause-on-hover` | 布尔，存在时悬停/聚焦暂停动画（animation-play-state: paused） | — | — |
| `reverse` | 布尔，存在时反向滚动 | — | — |
| `speed` | 滚动速度（像素/秒，默认 48）；经测量内容宽推导动画时长（时长=距离/速度），非法/非正数回退默认 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- 系统开启「减少动态效果」（`prefers-reduced-motion: reduce`）时动画关闭、静态展示。
- 复制内容组带 `aria-hidden`，屏幕阅读器不重复朗读。
- 无事件，纯展示。
