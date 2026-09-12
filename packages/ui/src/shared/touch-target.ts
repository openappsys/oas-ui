/**
 * 触摸目标抬升（iOS HIG ≥44px）：coarse pointer（触屏）下浮层内交互行的最小高度
 * 抬到 --oas-touch-target-min（theme/index.css 默认 44px；宿主可在 :host 上覆盖该变量调整）。
 *
 * 落点取舍：各组件的 option/item 节点渲染在各自 shadow root 内，外部样式无法穿透，
 * 主题层 CSS 够不到——因此这里共享一份 media query 片段，由各浮层组件插值进自己的
 * STYLE（一处定义、多处注入），避免逐组件重复维护同一规则。
 * 桌面 fine pointer 完全不受影响（规则只存在于 coarse 媒体查询内）。
 *
 * 选择器并集覆盖：.option（select/cascader）、.node（tree-select）、.item（menu/
 * toggle-group）、.tab（tabs）。shadow 边界保证各组件只命中自身语义行，无跨组件泄漏；
 * dropdown item / menu-item 由 <oas-menu> 统一渲染 .item，随 menu 一处生效。
 */
export const TOUCH_TARGET_CSS = `
@media (pointer: coarse) {
  .option,
  .node,
  .item,
  .tab {
    min-height: var(--oas-touch-target-min, 44px);
  }
}
`
