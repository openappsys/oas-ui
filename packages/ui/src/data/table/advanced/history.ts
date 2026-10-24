export interface HistoryEntry {
  label?: string
  undo(): void
  redo(): void
}

export interface HistoryStack {
  push(entry: HistoryEntry): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
  subscribe(listener: (state: { canUndo: boolean; canRedo: boolean }) => void): () => void
  /** 可撤销条目数（不含 redo 栈；redo 栈单独由 canRedo 暴露） */
  readonly size: number
}

/** 通用撤销/重做栈（纯内存，无 DOM 依赖；宿主可接任意命令） */
export function createHistory(limit = 100): HistoryStack {
  const undoStack: HistoryEntry[] = []
  const redoStack: HistoryEntry[] = []
  const listeners = new Set<(state: { canUndo: boolean; canRedo: boolean }) => void>()
  const notify = (): void => {
    const state = { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
    for (const listener of listeners) listener(state)
  }
  return {
    push(entry) {
      undoStack.push(entry)
      if (undoStack.length > limit) undoStack.shift()
      redoStack.length = 0
      notify()
    },
    undo() {
      const entry = undoStack.pop()
      if (!entry) return false
      entry.undo()
      redoStack.push(entry)
      notify()
      return true
    },
    redo() {
      const entry = redoStack.pop()
      if (!entry) return false
      entry.redo()
      undoStack.push(entry)
      notify()
      return true
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack.length = 0
      redoStack.length = 0
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    get size() {
      return undoStack.length
    },
  }
}
