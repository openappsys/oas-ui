/**
 * size 档位：全库唯一定义源。
 *
 * 规范词表（全称）：`xs | small | medium | large | xl`
 * 别名：`sm / md / lg` 为对应全称的缩写等价形式，任何组件等价接受。
 *
 * 每个组件声明自己支持的档位子集（如 3 档组件只声明 small/medium/large），
 * normalizeSize 负责别名映射 + 档位校验 + 非法回落，输出恒为全称——
 * data-size / class 名 / CSS 选择器全链路统一，不再有全称/缩写两套内部词表。
 */

export type OasSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'

/** 五档全集 */
export const ALL_SIZES: readonly OasSize[] = ['xs', 'small', 'medium', 'large', 'xl']

/** 三档子集（多数内容型组件）；字面量常量类型供 normalizeSize 泛型收窄到子集 */
export const THREE_SIZES = ['small', 'medium', 'large'] as const satisfies readonly OasSize[]

/** 别名映射：非规范拼写 → 规范全称 */
const ALIASES: Record<string, OasSize> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
  small: 'small',
  medium: 'medium',
  large: 'large',
  xs: 'xs',
  xl: 'xl',
}

/**
 * size 归一化（严格变体）：别名映射 + 档位校验 + 非法回落，并携带合法性标记。
 *
 * 组件用 `isValid` 决定是否告警：`isValid === false` 即 raw 非法（已回落 fallback），
 * 合法别名（sm/md/lg）不会误报。
 *
 * @param raw      用户输入的原始 size 值
 * @param allowed  本组件支持的档位集（OasSize 子集）
 * @param fallback 非法值回落档位
 * @returns `{ value: 规范全称; isValid: raw 是否为合法档位（含别名） }`
 */
export function normalizeSizeStrict<T extends OasSize>(
  raw: string,
  allowed: readonly T[],
  fallback: T,
): { value: T; isValid: boolean } {
  const resolved = ALIASES[raw] as T | undefined
  if (resolved && allowed.includes(resolved)) return { value: resolved, isValid: true }
  return { value: fallback, isValid: false }
}

/**
 * size 归一化：别名映射 + 档位校验 + 非法回落。
 *
 * @param raw      用户输入的原始 size 值
 * @param allowed  本组件支持的档位集（OasSize 子集）
 * @param fallback 非法值回落档位
 * @returns 规范全称（恒为 OasSize 成员，不会返回 allowed 之外的值）
 */
export function normalizeSize<T extends OasSize>(raw: string, allowed: readonly T[], fallback: T): T {
  return normalizeSizeStrict(raw, allowed, fallback).value
}
