// 测试环境兜底：Node ≥23.4 的 globalThis.localStorage 是残废 accessor
//（未提供 --localstorage-file 时访问返回 undefined 并告警），在 vitest happy-dom 环境里
// 会把 happy-dom 自己的 window.localStorage 一并顶成 undefined，依赖 localStorage 的
// 组件测试（拖拽持久化/进度记忆等）集体失败。这里补回 happy-dom 的 Storage 实例——
// 测试语义对齐浏览器（内存存储、每测试文件隔离），与 Node 版本解耦。
import { Storage } from 'happy-dom'

if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const storage = new Storage()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
}
