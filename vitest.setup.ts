// 测试环境兜底：Node ≥23.4 的 globalThis.localStorage 是残废 accessor
//（未提供 --localstorage-file 时访问返回 undefined 并告警），在 vitest happy-dom 环境里
// 会把 happy-dom 自己的 window.localStorage 一并顶成 undefined，依赖 localStorage 的
// 组件测试（拖拽持久化/进度记忆等）集体失败。这里补回 happy-dom 的 Storage 实例——
// 测试语义对齐浏览器（内存存储、每测试文件隔离），与 Node 版本解耦。
import { Storage } from 'happy-dom'

// 测试环境禁止真实网络导航：happy-dom 下点击带真实 href 的 <a>（如 breadcrumb/anchor
// 的「不阻止默认行为」用例）会走浏览器级导航，由 happy-dom 内部 Fetch 发起真实请求
// （http://localhost:3000/ → ECONNREFUSED）。该请求不经 globalThis.fetch，故 stub
// globalThis.fetch 拦不住；关掉浏览器级导航即可（不改变 click 事件的 defaultPrevented
// 语义——组件「不阻止默认行为」的断言在 target 阶段读取，不受影响）。
if (typeof window !== 'undefined') {
  const happyDOMSettings = (
    window as unknown as {
      happyDOM?: { settings?: { navigation?: Record<string, unknown> } }
    }
  ).happyDOM?.settings
  if (happyDOMSettings?.navigation) {
    happyDOMSettings.navigation.disableMainFrameNavigation = true
    happyDOMSettings.navigation.disableChildPageNavigation = true
  }
}

if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const storage = new Storage()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
}
