export interface WindowedRequest {
  start: number
  end: number
  signal: AbortSignal
}

export interface WindowedSourceOptions {
  /** 拉取 [start, end) 半开区间；返回行数组或 { rows, total } */
  fetchRows(request: WindowedRequest): Promise<unknown[] | { rows: unknown[]; total?: number }>
  /** 首屏请求前写入 total（可省略；fetch 返回 total 时自动同步） */
  total?: number
  /** 首屏窗口大小（默认 50 行；正整数，应不大于服务端单次返回上限） */
  windowSize?: number
}

export interface WindowedSource {
  /** 重新拉取最近一次窗口（无记录时拉首屏） */
  refresh(): void
  destroy(): void
}

/**
 * windowed 表格数据源胶水：监听 `oas-window-request`，中止过期请求并回填 data / window-start / total。
 * 纯宿主侧 helper，不进入 table 运行时。已装载区间按实际返回行数计覆盖；服务端部分页会自动补齐。
 */
export function createWindowedSource(table: HTMLElement, options: WindowedSourceOptions): WindowedSource {
  if (!(table as HTMLElement).shadowRoot) {
    throw new Error('[oas-table] createWindowedSource 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  let controller: AbortController | null = null
  let loaded: { start: number; end: number } | null = null
  let lastRequest: { start: number; end: number } | null = null
  let filling: { start: number; end: number } | null = null
  let destroyed = false
  /** 回写属性期间忽略表格反射回来的请求（防止自触发循环） */
  let writing = false

  const windowSize =
    options.windowSize != null && Number.isFinite(options.windowSize) ? Math.max(1, Math.trunc(options.windowSize)) : 50

  const write = (start: number, rows: unknown[], total?: number): void => {
    writing = true
    try {
      if (table.getAttribute('window-start') !== String(start)) {
        table.setAttribute('window-start', String(start))
      }
      if (!table.hasAttribute('windowed')) table.setAttribute('windowed', '')
      table.setAttribute('data', JSON.stringify(rows))
    } finally {
      writing = false
    }
    // 与表格 loadedRange 同口径：按实际装载行数计覆盖，避免部分页把缺口误判为已装载
    loaded = { start, end: start + rows.length }
    // total 在 writing 外写：让表格在数据就绪后再启用 windowed 并派发真实视口请求（不被回声抑制吞掉）
    if (total != null && table.getAttribute('total') !== String(total)) {
      table.setAttribute('total', String(total))
    }
  }

  const load = (start: number, end: number): void => {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    lastRequest = { start, end }
    filling = { start, end }
    // 服务端单次返回不足时继续向后补齐同一窗口，并累积成连续切片（window-start 始终为窗口起点）
    const collected: unknown[] = []
    const step = (cursor: number, total?: number): void => {
      void options
        .fetchRows({ start: cursor, end, signal })
        .then((result) => {
          if (signal.aborted) return
          const rows = Array.isArray(result) ? result : result.rows
          const nextTotal = Array.isArray(result) ? (total ?? options.total) : (result.total ?? total)
          collected.push(...rows)
          write(start, collected, nextTotal)
          const next = cursor + rows.length
          if (rows.length > 0 && next < end && (nextTotal == null || next < nextTotal)) {
            step(next, nextTotal)
          } else {
            filling = null
          }
        })
        .catch((error: unknown) => {
          filling = null
          if (signal.aborted) return
          table.dispatchEvent(new CustomEvent('oas-window-error', { detail: { start, end, error } }))
        })
    }
    step(start)
  }

  const onRequest = (event: Event): void => {
    if (destroyed || writing) return
    const detail = (event as CustomEvent).detail as { start?: number; end?: number } | undefined
    if (!detail || typeof detail.start !== 'number' || typeof detail.end !== 'number') return
    const { start, end } = detail
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return
    if (filling && start >= filling.start && end <= filling.end) return
    if (loaded && start >= loaded.start && end <= loaded.end) return
    load(start, end)
  }

  table.addEventListener('oas-window-request', onRequest)
  table.setAttribute('windowed', '')
  if (options.total != null) table.setAttribute('total', String(options.total))
  // 首屏：监听先挂再写 total，表格同步派发的 init 请求能被接住；未连接/未提供 total 时主动拉窗口
  const initialStart = Number(table.getAttribute('window-start') ?? 0) || 0
  if (!lastRequest) load(initialStart, initialStart + windowSize)

  return {
    refresh() {
      if (destroyed) return
      // 构造期必有一次 load()，lastRequest 恒存在
      if (lastRequest) load(lastRequest.start, lastRequest.end)
    },
    destroy() {
      destroyed = true
      filling = null
      controller?.abort()
      controller = null
      table.removeEventListener('oas-window-request', onRequest)
    },
  }
}
