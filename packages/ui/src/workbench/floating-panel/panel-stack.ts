/**
 * `oas-floating-panel` 族内叠放协议（零 DOM）。
 *
 * 设计要点：
 * - 维护「最近使用顺序」队列；最前 = 队尾中第一个仍打开的成员。
 * - 只暴露布尔态 `applyFront(true/false)` 给组件——组件把它映射成固定两档 z-index，
 *   **不存在递增层级**，open/close 任意次数都不会让 z 增长。
 * - 只在最前发生变化时调用 `applyFront`；摘除最前时先落回基准档再由下一成员接任。
 * - 共享单例 `floatingPanelStack` 供组件使用；测试/嵌入场景可用 `createPanelStack()` 隔离实例。
 */

export interface PanelStackMember {
  /** 成员是否处于打开态（由组件属性驱动） */
  isOpen(): boolean
  /** 应用层级：true = 族内最前（基准 + 1），false = 族内基准档 */
  applyFront(front: boolean): void
}

export interface PanelStackOptions {
  /** 最前变化通知（含 null = 族内暂无最前） */
  onFrontChange?: (front: PanelStackMember | null, previous: PanelStackMember | null) => void
}

export interface PanelStack {
  /** 已登记成员数 */
  readonly size: number
  /** 登记成员，返回幂等退订函数 */
  register(member: PanelStackMember): () => void
  /** 摘除成员（不存在时无操作）；最前被摘除时由下一打开成员接任 */
  unregister(member: PanelStackMember): void
  /** 移到队尾并成为最前；返回最前是否发生变化 */
  activate(member: PanelStackMember): boolean
  /** 打开态变化后重算最前（关闭最前 → 下一打开成员接任） */
  refresh(): void
  /** 当前最前（无打开成员时 null） */
  front(): PanelStackMember | null
  isFront(member: PanelStackMember): boolean
  /** 快照（按最近使用顺序，旧 → 新） */
  members(): readonly PanelStackMember[]
  /** 清空登记并把已置前成员落回基准档（测试/拆卸用） */
  clear(): void
}

export function createPanelStack(options: PanelStackOptions = {}): PanelStack {
  /** 最近使用顺序：队尾最新 */
  const order: PanelStackMember[] = []
  let currentFront: PanelStackMember | null = null

  const computeFront = (): PanelStackMember | null => {
    for (let i = order.length - 1; i >= 0; i--) {
      const member = order[i]!
      if (member.isOpen()) return member
    }
    return null
  }

  /** 收敛：只在最前翻转时调用 applyFront（同值不重复写） */
  const setFront = (next: PanelStackMember | null): boolean => {
    const previous = currentFront
    if (next === previous) return false
    currentFront = next
    previous?.applyFront(false)
    next?.applyFront(true)
    options.onFrontChange?.(next, previous)
    return true
  }

  /** 重算最前：当前最前仍打开且已登记时保持（登记新成员不抢最前，打开边沿由组件显式 activate） */
  const reconcile = (): void => {
    const next = currentFront && order.includes(currentFront) && currentFront.isOpen() ? currentFront : computeFront()
    setFront(next)
  }

  const removeIndex = (member: PanelStackMember): number => {
    const index = order.indexOf(member)
    if (index >= 0) order.splice(index, 1)
    return index
  }

  return {
    get size() {
      return order.length
    },

    register(member: PanelStackMember): () => void {
      if (order.includes(member)) return () => {}
      order.push(member)
      reconcile()
      let released = false
      return () => {
        if (released) return
        released = true
        this.unregister(member)
      }
    },

    unregister(member: PanelStackMember): void {
      if (removeIndex(member) < 0) return
      // 被摘除的成员若正处于最前，先落回基准档（之后接任者再置前）
      if (currentFront === member) {
        currentFront = null
        member.applyFront(false)
      }
      reconcile()
    },

    activate(member: PanelStackMember): boolean {
      if (!order.includes(member)) return false
      removeIndex(member)
      order.push(member)
      // 打开成员激活即置前；关闭成员只更新最近使用顺序，最前保持不变（若已失效则重算）
      if (member.isOpen()) return setFront(member)
      reconcile()
      return false
    },

    refresh(): void {
      reconcile()
    },

    front(): PanelStackMember | null {
      return currentFront
    },

    isFront(member: PanelStackMember): boolean {
      return currentFront === member
    },

    members(): readonly PanelStackMember[] {
      return [...order]
    },

    clear(): void {
      const previous = currentFront
      order.length = 0
      currentFront = null
      if (previous) {
        previous.applyFront(false)
        options.onFrontChange?.(null, previous)
      }
    },
  }
}

/** 组件共享的族内单例（跨实例叠放） */
export const floatingPanelStack: PanelStack = createPanelStack()
