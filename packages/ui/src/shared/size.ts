/**
 * size 档位词表统一：全称（xs/small/medium/large/xl）为规范词表，
 * 缩写（xs/sm/md/lg/xl）为全库通用别名——两者在任何组件等价接受。
 *
 * 背景：button/tag/badge/stepper 等以全称为内部规范，pagination/float-button 等
 * 以缩写为内部规范，同名属性两套词表互斥造成心智负担。别名互认后，组件内部
 * 规范化输出不变（DOM/CSS 零变化），仅入参宽度放开。
 */

/** 缩写 → 全称（全称系组件消费） */
const TO_FULL: Record<string, 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
}

/** 全称 → 缩写（缩写系组件消费） */
const TO_SHORT: Record<string, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
}

/**
 * 五档 size 的跨词表别名归一：
 * 返回 null 表示 raw 不在本组件词表内也不是别名（组件按既定逻辑回落默认并 dev warn）。
 */
export function aliasSize(raw: string, toFull: boolean): string | null {
  if (toFull) return TO_FULL[raw] ?? null
  return TO_SHORT[raw] ?? null
}
