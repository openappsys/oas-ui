# Marquee 跑马灯

循环水平滚动展示长内容的纯展示组件，内容经 slot 无缝循环；支持悬停暂停与 `prefers-reduced-motion` 静态降级。无事件。

## 基础用法

<DemoBlock title="默认循环滚动（20s）">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    OAS-UI 组件库 · Web Components 无框架依赖 · TypeScript 类型完备 · 无障碍可达 ·
  </oas-marquee>
</DemoBlock>

## 速度控制

<DemoBlock title="speed=8 快速 / speed=40 慢速">
  <oas-marquee speed="8" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    快速滚动：8 秒一个循环
  </oas-marquee>
  <oas-marquee speed="40" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    慢速滚动：40 秒一个循环
  </oas-marquee>
</DemoBlock>

## 悬停暂停

<DemoBlock title="pause-on-hover：鼠标悬停/聚焦时暂停">
  <oas-marquee pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    将鼠标移入本行，滚动暂停；移出后继续。
  </oas-marquee>
</DemoBlock>

## 元素内容

<DemoBlock title="slot 支持任意元素组合">
  <oas-marquee speed="12" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <oas-tag>新增</oas-tag>
    <span style="margin: 0 var(--oas-space-3);">v1.6 展示组件已发布</span>
    <oas-tag type="success">推荐</oas-tag>
    <span style="margin-left: var(--oas-space-3);">构建于 Web Components 标准之上</span>
  </oas-marquee>
</DemoBlock>

## API

| 属性             | 说明                                                             | 默认值 |
| ---------------- | ---------------------------------------------------------------- | ------ |
| `speed`          | 单次动画时长（秒），写入 CSS animation-duration；非正数回退默认    | `20`   |
| `pause-on-hover` | 布尔，存在时悬停/聚焦暂停动画（animation-play-state: paused）     | 无     |

- 系统开启「减少动态效果」（`prefers-reduced-motion: reduce`）时动画关闭、静态展示。
- 复制内容组带 `aria-hidden`，屏幕阅读器不重复朗读。
- 无事件，纯展示。
