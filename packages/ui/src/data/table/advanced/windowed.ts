export interface WindowedRequest {
  start: number
  end: number
  signal: AbortSignal
}

/** 视觉快照：切片首行的视觉行号 + 全量视觉行数（数据行 + 行内嵌展开内容行） */
export interface WindowedVisualGeometry {
  start: number
  total: number
}

/**
 * 视觉适配器（可选）：宿主持有真实展开布局时，把 windowed 的视觉坐标映射交给宿主单源定义。
 * - `getGeometry(dataStart)`：初始化与每次响应回填时同步调用，返回当前快照的 visual-start /
 *   visual-total（实现必须现算现回，不得缓存请求时的旧值——回填要的是响应时刻的布局）。
 * - `getDataRange(visualStart, visualEnd)`：请求时把 `oas-window-request` 的视觉区间映射为
 *   数据取数区间（如把相交视觉槽位投影回属主数据行）；返回须有限且 end > start，
 *   负 start / 超出数据 total 的越界由 adapter 自行夹取（source 不代夹）。
 */
export interface WindowedVisualAdapter {
  getGeometry(dataStart: number): WindowedVisualGeometry
  getDataRange(visualStart: number, visualEnd: number): { start: number; end: number }
}

export interface WindowedSourceOptions {
  /** 拉取 [start, end) 半开区间；返回行数组或 { rows, total } */
  fetchRows(request: WindowedRequest): Promise<unknown[] | { rows: unknown[]; total?: number }>
  /** 首屏请求前写入 total（可省略；fetch 返回 total 时自动同步） */
  total?: number
  /** 首屏窗口大小（默认 50 行；正整数，应不大于服务端单次返回上限） */
  windowSize?: number
  /** 视觉适配器（可选）：提供后 source 接管 visual-start / visual-total 属性的回写，
      并在请求时优先按视觉区间映射数据取数区间；不提供则不写任何视觉属性（既有行为逐值不变） */
  visual?: WindowedVisualAdapter
}

export interface WindowedSource {
  /** 重新拉取最近一次窗口（无记录时拉首屏） */
  refresh(): void
  destroy(): void
}

/** 截断取整（对齐表格 readVisualProtocol 的截断口径）；非有限返回 NaN */
const truncOrNaN = (value: number): number => (Number.isFinite(value) ? Math.trunc(value) : Number.NaN)

/** 安全校验 geometry 数值：非法（非有限、start<0、total<=0、start>total、total<数据 total）返回 null */
const normalizeGeometry = (
  geometry: WindowedVisualGeometry,
  dataTotal: number | null,
): WindowedVisualGeometry | null => {
  const start = truncOrNaN(geometry.start)
  const total = truncOrNaN(geometry.total)
  if (!Number.isFinite(start) || !Number.isFinite(total)) return null
  if (start < 0 || total <= 0 || start > total) return null
  if (dataTotal != null && Number.isFinite(dataTotal) && total < dataTotal) return null
  return { start, total }
}

/** Error 消息附带的快照摘要（adapter 可能返回循环结构，只取两个字段原文） */
const geometrySummary = (geometry: WindowedVisualGeometry): string => {
  try {
    return `{ start: ${String(geometry.start)}, total: ${String(geometry.total)} }`
  } catch {
    return '[unprintable]'
  }
}

/**
 * windowed 表格数据源胶水：监听 `oas-window-request`，中止过期请求并回填 data / window-start / total。
 * 纯宿主侧 helper，不进入 table 运行时。已装载区间按实际返回行数计覆盖；服务端部分页会自动补齐。
 *
 * 可选 `visual` 适配器（视觉协议）：初始化与每次响应回填时重新求值 geometry 并齐写
 * visual-start / visual-total（回填时最新快照，与本次数据同一快照）；协议生效（source 水位线与
 * 表格视觉属性按表格同口径截断重验一致）时事件带有效视觉字段则按 getDataRange 映射，取数区间为
 * 映射结果与事件数据区间的并集（事件 start/end 永远携带键盘目标行与视口缓冲，不被映射裁剪），
 * 映射非法不拉取并派发一次 `oas-window-error`（detail 含视觉区间与原始数据区间）。geometry 非法 /
 * adapter 抛错 → 视觉属性移除、表格整体回落本地模型，此后事件视觉字段为本地口径、不再映射
 * （按事件 start/end 原样取数）。两种失败恢复语义相同：新窗口事件可重试；同窗口推荐 `refresh()`
 * 强制重拉（winReq 同窗口去重与已装载覆盖判定可能吞掉同窗口重试）。
 */
export function createWindowedSource(table: HTMLElement, options: WindowedSourceOptions): WindowedSource {
  if (!(table as HTMLElement).shadowRoot) {
    throw new Error('[oas-table] createWindowedSource 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  let controller: AbortController | null = null
  let lastRequest: { start: number; end: number } | null = null
  let filling: { start: number; end: number } | null = null
  let destroyed = false
  /** 回写属性期间忽略表格反射回来的请求（防止自触发循环） */
  let writing = false
  const visual = options.visual ?? null

  const windowSize =
    options.windowSize != null && Number.isFinite(options.windowSize) ? Math.max(1, Math.trunc(options.windowSize)) : 50

  /** 当前数据 total（全量行数）：优先取传入值，否则读表格 total 属性；都缺失返回 null（跳过 total 对比校验）。
   *  与表格 readWindowedMode 同口径截断（有限值一律 Math.max(0, trunc)）——total=100.7 时表格按 100 生效，
   *  geometry total=100 不应被「total<数据 total」误判降级。 */
  const dataTotalOf = (fallback: number | null): number | null => {
    if (fallback != null && Number.isFinite(fallback)) return Math.max(0, Math.trunc(fallback))
    const raw = Number(table.getAttribute('total') ?? Number.NaN)
    return Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : null
  }

  /** 派发统一失败事件（bubbles + composed），之后同窗口可重试 */
  const dispatchError = (detail: Record<string, unknown>): void => {
    table.dispatchEvent(new CustomEvent('oas-window-error', { detail, bubbles: true, composed: true }))
  }

  /**
   * 最近一次成功写入表格的视觉快照（协议生效水位线）：
   * - 初始化合法 geometry 写入后赋值；每次合法 geometry 回填写入时更新；
   * - geometry 非法 / adapter 抛错回填（视觉属性被移除、表格整体回落本地模型）时置 null。
   * onRequest 消费事件视觉字段前必须核对它与表格当前 visual-total 一致——表格回落后事件的
   * visualStart/visualEnd 是本地口径（数据 total + 本地展开）而非宿主全局布局，继续映射会拉错行。
   */
  let lastWritten: WindowedVisualGeometry | null = null

  const write = (start: number, rows: unknown[], total?: number): void => {
    // 回填时重新求值 geometry：请求与响应之间宿主可能改变展开布局，必须用响应时刻的最新快照
    //（两个视觉属性写同一份快照，保证与本次回填数据一致）；adapter throw 与非法值走同一失败路径
    let geometry: WindowedVisualGeometry | null = null
    let geometryError: Error | null = null
    if (visual) {
      try {
        geometry = normalizeGeometry(visual.getGeometry(start), dataTotalOf(total ?? null))
      } catch (error) {
        geometryError = error instanceof Error ? error : new Error(String(error))
      }
      if (!geometry && !geometryError) {
        geometryError = new Error(
          `[oas-table] createWindowedSource visual.getGeometry(${start}) 返回非法快照（须有限、start≥0、total>0、start≤total、total≥数据 total）`,
        )
      }
    }
    writing = true
    try {
      if (table.getAttribute('window-start') !== String(start)) {
        table.setAttribute('window-start', String(start))
      }
      if (!table.hasAttribute('windowed')) table.setAttribute('windowed', '')
      if (geometry) {
        // 视觉属性与数据同一快照：visual-start 随切片坐标写（writing 内），visual-total 在数据就绪后写；
        // 水位线先记账——visual-total 落位触发的同步请求已可正确消费视觉字段
        lastWritten = geometry
        if (table.getAttribute('visual-start') !== String(geometry.start)) {
          table.setAttribute('visual-start', String(geometry.start))
        }
      } else if (visual) {
        // geometry 非法：不写错误视觉属性，移除陈旧属性让表格整体回落当前模型（table 会 devWarn 一次，属预期）；
        // 协议水位线同时清空——回落后事件视觉字段是本地口径，不得再映射
        lastWritten = null
        table.removeAttribute('visual-start')
        table.removeAttribute('visual-total')
      }
      table.setAttribute('data', JSON.stringify(rows))
    } finally {
      writing = false
    }
    // total / visual-total 在 writing 外写：让表格在数据就绪后再启用 windowed 并派发真实视口请求（不被回声抑制吞掉）
    if (total != null && table.getAttribute('total') !== String(total)) {
      table.setAttribute('total', String(total))
    }
    if (geometry && table.getAttribute('visual-total') !== String(geometry.total)) {
      table.setAttribute('visual-total', String(geometry.total))
    }
    if (geometryError) {
      dispatchError({ start, end: start + rows.length, error: geometryError })
    }
  }

  /**
   * 覆盖判定只读表格当前真实切片（window-start + data 长度）：
   * 宿主可在外部清空/替换 data，source 自存的装载区间会变陈旧并吞掉新请求。
   */
  const currentLoaded = (): { start: number; end: number } => {
    const rawStart = Number(table.getAttribute('window-start') ?? 0)
    const start = Number.isFinite(rawStart) ? Math.max(0, Math.trunc(rawStart)) : 0
    const data = (table as unknown as { data?: unknown }).data
    const length = Array.isArray(data) ? data.length : 0
    return { start, end: start + length }
  }

  const load = (start: number, end: number): void => {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    lastRequest = { start, end }
    filling = { start, end }
    const fail = (error: unknown): void => {
      // 过期请求失败不得清空新请求的 filling（否则会再次拉取/中止新请求）
      if (signal.aborted) return
      filling = null
      dispatchError({ start, end, error })
    }
    // 服务端单次返回不足时继续向后补齐同一窗口，并累积成连续切片（window-start 始终为窗口起点）
    const collected: unknown[] = []
    const step = (cursor: number, total?: number): void => {
      let request: Promise<unknown[] | { rows: unknown[]; total?: number }>
      try {
        request = options.fetchRows({ start: cursor, end, signal })
      } catch (error) {
        // 同步 throw 与 Promise rejection 走同一失败路径：清 filling + 派发一次 error，之后可重试
        fail(error)
        return
      }
      void request
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
        .catch(fail)
    }
    step(start)
  }

  const onRequest = (event: Event): void => {
    if (destroyed || writing) return
    const detail = (event as CustomEvent).detail as
      | { start?: number; end?: number; visualStart?: number; visualEnd?: number }
      | undefined
    if (!detail || typeof detail.start !== 'number' || typeof detail.end !== 'number') return
    const { start, end, visualStart, visualEnd } = detail
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return
    let fetchStart = start
    let fetchEnd = end
    // 视觉协议生效才消费视觉字段：表格已回落本地模型（geometry 失败移除属性 / 宿主移除属性 /
    // 视觉属性与 source 水位线不一致 / 宿主手改属性非法）时，事件的 visualStart/visualEnd 是
    // 本地口径而非宿主全局布局——继续映射会按错误坐标拉行。按表格当前属性重验：
    // visual-start 截断后有限、≥0、≤visual-total；visual-total>0、与水位线一致且 ≥ 截断后数据 total。
    // 不把 visual-start 与水位线比对——外部合法换切片 / 改 visual-start（同一协议内的快照演进）仍照常映射。
    // 无/缺视觉字段同样回落。
    const visualStartAttr = truncOrNaN(Number(table.getAttribute('visual-start') ?? Number.NaN))
    const visualTotalAttr = truncOrNaN(Number(table.getAttribute('visual-total') ?? Number.NaN))
    const dataTotal = dataTotalOf(null)
    const visualActive =
      lastWritten !== null &&
      table.hasAttribute('visual-start') &&
      table.hasAttribute('visual-total') &&
      visualTotalAttr === lastWritten.total &&
      visualTotalAttr > 0 &&
      (dataTotal == null || visualTotalAttr >= dataTotal) &&
      Number.isFinite(visualStartAttr) &&
      visualStartAttr >= 0 &&
      visualStartAttr <= visualTotalAttr
    if (
      visual &&
      visualActive &&
      typeof visualStart === 'number' &&
      Number.isFinite(visualStart) &&
      typeof visualEnd === 'number' &&
      Number.isFinite(visualEnd)
    ) {
      let mapped: { start: number; end: number } | null = null
      try {
        mapped = visual.getDataRange(visualStart, visualEnd)
      } catch (error) {
        dispatchError({
          start,
          end,
          visualStart,
          visualEnd,
          error: error instanceof Error ? error : new Error(String(error)),
        })
        return
      }
      const mappedStart = mapped ? truncOrNaN(mapped.start) : Number.NaN
      const mappedEnd = mapped ? truncOrNaN(mapped.end) : Number.NaN
      if (!Number.isFinite(mappedStart) || !Number.isFinite(mappedEnd) || mappedEnd <= mappedStart) {
        // 映射非法：不 fetch、不残留 filling，派发一次错误（含视觉区间与原始数据区间），修正后可重试
        dispatchError({
          start,
          end,
          visualStart,
          visualEnd,
          error: new Error(
            `[oas-table] createWindowedSource visual.getDataRange(${visualStart}, ${visualEnd}) 返回非法区间（须有限且 end > start）`,
          ),
        })
        return
      }
      // 并集契约：fetch = 事件数据区间 ∪ 映射区间。事件 start/end 由组件计算，永远携带
      // 键盘目标行（requestWindowForRow 的 need 由目标 abs 决定）与视口缓冲 margin——
      // 用映射「替换」会在严格 adapter（只映射可视行/已装载区间）下丢失键盘目标，
      // 且映射结果被 currentLoaded 覆盖时静默吞掉整个请求；并集让两者都保留，
      // adapter 不再被迫自带 margin。
      fetchStart = Math.min(start, mappedStart)
      fetchEnd = Math.max(end, mappedEnd)
    }
    if (filling && fetchStart >= filling.start && fetchEnd <= filling.end) return
    const loaded = currentLoaded()
    if (fetchStart >= loaded.start && fetchEnd <= loaded.end) return
    load(fetchStart, fetchEnd)
  }

  // 初始 geometry 先校验：同步配置错误（非法快照 / adapter throw）直接抛给调用方，
  // 不写任何属性、不挂监听——不留半初始化视觉状态
  const initialStart = Number(table.getAttribute('window-start') ?? 0) || 0
  let initialGeometry: WindowedVisualGeometry | null = null
  if (visual) {
    const raw = visual.getGeometry(initialStart)
    const normalized = normalizeGeometry(raw, dataTotalOf(options.total ?? null))
    if (!normalized) {
      throw new Error(
        `[oas-table] createWindowedSource visual.getGeometry(${initialStart}) 初始快照非法：${geometrySummary(raw)}（须有限、start≥0、total>0、start≤total、total≥数据 total）`,
      )
    }
    initialGeometry = normalized
  }

  table.addEventListener('oas-window-request', onRequest)
  // 视觉属性写在 windowed/total 之前：表格尚未进入 windowed 模式时逐个写入不会触发
  // 「只有其一」的回落告警（readVisualProtocol 在非 windowed 下静默），total 最后落位即一次激活
  if (initialGeometry) {
    lastWritten = initialGeometry
    table.setAttribute('visual-start', String(initialGeometry.start))
    table.setAttribute('visual-total', String(initialGeometry.total))
  }
  table.setAttribute('windowed', '')
  if (options.total != null) table.setAttribute('total', String(options.total))
  // 首屏：监听先挂再写属性，表格同步派发的 init 请求能被接住（协议生效时事件带视觉字段 → 走映射）；
  // 未连接/未提供 total 时主动拉窗口
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
