# Marquee

A purely presentational component that scrolls long content horizontally in a loop; content cycles seamlessly via a slot. Supports pause on hover and static fallback under `prefers-reduced-motion`. No events.

## Basic Usage

<DemoBlock title="Default looping scroll (20s)">
  <oas-marquee style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    OAS-UI 组件库 · Web Components 无框架依赖 · TypeScript 类型完备 · 无障碍可达 ·
  </oas-marquee>
</DemoBlock>

## Speed Control

<DemoBlock title="speed=8 fast / speed=40 slow">
  <oas-marquee speed="8" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    快速滚动：8 秒一个循环
  </oas-marquee>
  <oas-marquee speed="40" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0; margin-top: var(--oas-space-3);">
    慢速滚动：40 秒一个循环
  </oas-marquee>
</DemoBlock>

## Pause on Hover

<DemoBlock title="pause-on-hover: pauses on mouse hover / focus">
  <oas-marquee pause-on-hover style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    将鼠标移入本行，滚动暂停；移出后继续。
  </oas-marquee>
</DemoBlock>

## Element Content

<DemoBlock title="slot supports arbitrary element combinations">
  <oas-marquee speed="12" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <oas-tag>新增</oas-tag>
    <span style="margin: 0 var(--oas-space-3);">v1.6 展示组件已发布</span>
    <oas-tag type="success">推荐</oas-tag>
    <span style="margin-left: var(--oas-space-3);">构建于 Web Components 标准之上</span>
  </oas-marquee>
</DemoBlock>

## Image / Logo Wall

Content is not limited to text — putting images or logos in the slot produces the classic seamless "brand wall" scrolling.

<DemoBlock title="Logo wall (seamless loop)">
  <oas-marquee speed="24" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3) 0;">
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0b6cff"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">A</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#16a34a"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">B</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#d97706"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#dc2626"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">D</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#7c3aed"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">E</text></svg>
    <svg viewBox="0 0 40 40" width="36" height="36" style="margin: 0 var(--oas-space-4); vertical-align: middle;"><rect width="40" height="40" rx="10" fill="#0891b2"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>
  </oas-marquee>
</DemoBlock>

<DemoBlock title="Image scrolling (img)">
  <oas-marquee speed="30" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2) 0;">
    <img src="https://picsum.photos/seed/isui-mq-1/120/60" alt="图 1" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-2/120/60" alt="图 2" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-3/120/60" alt="图 3" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
    <img src="https://picsum.photos/seed/isui-mq-4/120/60" alt="图 4" style="height: 44px; border-radius: var(--oas-radius-sm); margin: 0 var(--oas-space-3); vertical-align: middle;">
  </oas-marquee>
</DemoBlock>

## API

| Attribute        | Description                                                             | Default |
| ---------------- | ----------------------------------------------------------------------- | ------- |
| `speed`          | Duration of a single animation cycle (seconds), written to CSS `animation-duration`; non-positive values fall back to the default | `20`    |
| `pause-on-hover` | Boolean; when present, pauses the animation on hover/focus (`animation-play-state: paused`) | none    |

- When the system enables "reduce motion" (`prefers-reduced-motion: reduce`), the animation is disabled and content is shown statically.
- The duplicated content group carries `aria-hidden`, so screen readers do not read it twice.
- No events; purely presentational.
