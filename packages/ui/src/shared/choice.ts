/**
 * 枚举值清洗归一（表单组件属性通道共用）。
 * 空串回落 fallback；命中合法集原样返回；非法值回落 fallback（告警策略由调用方决定）。
 * 15+ 个表单组件曾各自持有一份逐字相同的私有拷贝（2026-11-04 L1 主链归因审计的双实现扫描
 * 发现 normalizeChoice ×17），收敛为单一实现——行为逐字等价（空串语义与 includes 判定顺序不变）。
 */
export function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return valid.includes(raw) ? raw : fallback
}
