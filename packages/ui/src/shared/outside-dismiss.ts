/**
 * 外点关闭监听（文档级捕获）的统一挂接：click 通道 + coarse 触屏 pointerup 通道。
 *
 * 为什么需要 pointerup：WebKit 对**非交互目标**（div/文本容器等无 click 语义的节点）上的 tap
 * 只派发 pointer 事件，不合成兼容 mouse/click（真机 WebKit 实测：touchstart → pointerdown →
 * pointerup → touchend，无 mousedown/mouseup/click）。只挂 document 级 click 的外点关闭在
 * 触屏上因此整体失效（浮层只能靠 Esc/再点触发器关闭）。pointer 事件在该路径始终可达——
 * 与 shared/coarse-tap 对 Gecko 触屏丢 click 的同源口径一致。
 *
 * pointerType=mouse 不接管：桌面仍按 click 语义关闭（按下不关、拖动过程不误关）；
 * pointerType=pen 也不接管：触控笔是**指针设备**，浏览器会像鼠标一样合成 click（真机实测），
 * 走 pointerup 只会让同一手势触发两次外点处理（面板已关后二次处理），并让「按下拖动」误关。
 * 触屏抬手才关（滚动/拖拽会以 pointercancel 收尾，不触发关闭）。
 *
 * 两通道可能对同一手势各触发一次（合成 click 存在时）——调用方的外点处理必须幂等
 * （开态判定 / closeWith 去重），既有实现均满足。
 */

/** handler → root → 该 root 上的 pointerup 桥（remove 时取回同一引用，按 handler+root 精确摘除） */
const pointerUpBridges = new WeakMap<(e: MouseEvent) => void, Map<Document, (e: PointerEvent) => void>>()

/** 挂接外点关闭（捕获阶段；面板 portal 到 body 也仍以 composedPath 判定内外） */
export function addOutsideDismiss(handler: (e: MouseEvent) => void, root: Document = document): void {
  let bridges = pointerUpBridges.get(handler)
  if (!bridges) {
    bridges = new Map()
    pointerUpBridges.set(handler, bridges)
  }
  // 幂等键是 handler + root：同一个 handler 可以同时挂主 document 与另一个 document
  // （iframe / 多文档宿主），第二次挂不同 root 时不能被吞掉
  if (bridges.has(root)) return
  const bridge = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') return
    handler(e)
  }
  bridges.set(root, bridge)
  root.addEventListener('click', handler, true)
  root.addEventListener('pointerup', bridge, true)
}

/** 摘除外点关闭（与 addOutsideDismiss 成对，按 handler + root 精确摘除；未挂接时幂等无副作用） */
export function removeOutsideDismiss(handler: (e: MouseEvent) => void, root: Document = document): void {
  const bridges = pointerUpBridges.get(handler)
  const bridge = bridges?.get(root)
  if (bridges && bridge) {
    bridges.delete(root)
    if (bridges.size === 0) pointerUpBridges.delete(handler)
    root.removeEventListener('pointerup', bridge, true)
  }
  root.removeEventListener('click', handler, true)
}
