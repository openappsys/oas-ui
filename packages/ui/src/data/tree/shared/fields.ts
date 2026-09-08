/**
 * 树内核 —— 字段别名归一（tree × tree-select 共享）。
 *
 * 两组件数据通道入口不一致（oas-tree 用 `data` + `key` 字段，
 * oas-tree-select 用 `options` + `value` 字段），归一化后统一为
 * `ResolvedFields`（id 字段名可配），组件侧据此构造 TreeAccessors。
 */

export interface ResolvedFields {
  /** 节点标识（key/value）在原始数据中的字段名 */
  idField: string
  labelField: string
  childrenField: string
  disabledField: string
  isLeafField: string
  loadedField: string
}

export function defaultFields(idField: string): ResolvedFields {
  return {
    idField,
    labelField: 'label',
    childrenField: 'children',
    disabledField: 'disabled',
    isLeafField: 'isLeaf',
    loadedField: 'loaded',
  }
}

function pickStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v !== '' ? v : fallback
}

/**
 * 解析宿主 field-names 属性（JSON 对象）为字段名配置。
 *
 * @param raw        属性原文（'' / 非法 JSON 回落默认）
 * @param jsonIdKey  JSON 里的标识别名键名（oas-tree 用 'key'，oas-tree-select 用 'value'）
 * @param idDefault  id 字段缺省名（对齐各自数据形态：'key' / 'value'）
 * @param leafRemap  isLeaf/loaded 是否允许被别名覆盖（tree-select 既有契约不覆盖，
 *                   保持 isLeaf/loaded 恒读原始键名）
 */
export function resolveFieldNames(
  raw: string,
  jsonIdKey: 'key' | 'value',
  idDefault: string,
  leafRemap: boolean,
): ResolvedFields {
  const def = defaultFields(idDefault)
  if (!raw) return def
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return def
    return {
      idField: pickStr(parsed[jsonIdKey], def.idField),
      labelField: pickStr(parsed.label, def.labelField),
      childrenField: pickStr(parsed.children, def.childrenField),
      disabledField: pickStr(parsed.disabled, def.disabledField),
      isLeafField: leafRemap ? pickStr(parsed.isLeaf, def.isLeafField) : def.isLeafField,
      loadedField: leafRemap ? pickStr(parsed.loaded, def.loadedField) : def.loadedField,
    }
  } catch {
    return def
  }
}
