/** range 写回事件（paste / cut / fill）共享契约 */
export type RangeWriteKind = 'paste' | 'cut' | 'fill'

export interface RangeWriteChange {
  key: string
  column: string
  value: unknown
  oldValue?: string
  oldRawValue?: unknown
}

export interface RangeWriteDetail {
  kind: RangeWriteKind
  changes: RangeWriteChange[]
}
