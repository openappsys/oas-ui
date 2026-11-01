// 文档站 demo 共享升级守卫：等自定义元素定义（升级）后再执行 property 写入/方法调用。
//
// 为什么必须守卫：demo 页脚本的 onMounted 同步体可能早于 @oas-ui/ui 的动态 import 完成
// （theme onMounted 才发起 import('@oas-ui/ui')，页面级 onMounted 先于它执行）。在未升级
// 元素上写 property 会产生自有属性、遮蔽升级后的 setter/accessor——数据静默丢失
// （card.md 曾在 preview 构建实抓；transfer/virtual-list/calendar/message-scroller
// 曾批量存在同类裸写，统一收敛到本 helper，避免每页复制 whenDefined().then 样板）。
//
// 语义：tag 已定义（customElements.get 非 null）时，已连接元素升级必然已完成 → 同步执行；
// 未定义时挂 whenDefined，定义后在 microtask 执行。tag 拼写错误永不定义时回调不执行，
// demo 呈空态——可被视觉核对/e2e 捕获，不在此处猜测性报错。
//
// 静态防回流扫描：packages/docs/prop-write-timing.test.ts（裸写 oas-* property 会被判红）。
export function whenTagDefined(tag: string, run: () => void): void {
  if (customElements.get(tag)) {
    run()
    return
  }
  customElements.whenDefined(tag).then(() => run())
}

// 元素句柄版守卫：页面里已有 getElementById/querySelector 拿到的元素时，免去手写 tag 字符串
// （tag 从 el.localName 取，不存在「helper 的 tag 与元素实际标签拼写不一致」这一失效面）。
// el 为 null（id 不存在/时序取空）直接跳过——与 whenTagDefined 的永不定义语义一致：宁空不猜。
export function onUpgraded(el: Element | null, fn: () => void): void {
  if (!el) return
  if (customElements.get(el.localName)) {
    fn()
    return
  }
  customElements.whenDefined(el.localName).then(() => fn())
}
