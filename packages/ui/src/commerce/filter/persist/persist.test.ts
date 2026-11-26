import { describe, expect, it } from 'vitest'
import { decode, encode, fromQuery, load, PERSIST_QUERY_KEY, save, toQuery } from './index.js'
import type { FilterConditions } from '../oas-filter.js'

/** 内存 Storage 实现（persist 层零 DOM 依赖，宿主可换 sessionStorage / 自有实现） */
function memoryStorage(throwOn?: { get?: boolean; set?: boolean; remove?: boolean }): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => {
      if (throwOn?.get) throw new DOMException('denied', 'SecurityError')
      return map.get(key) ?? null
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      if (throwOn?.remove) throw new DOMException('denied', 'SecurityError')
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      if (throwOn?.set) throw new DOMException('quota', 'QuotaExceededError')
      map.set(key, value)
    },
  } as Storage
}

describe('filter persist · encode / decode 往返', () => {
  const CASES: FilterConditions[] = [
    {},
    { sort: 'price' },
    { order: 'desc' },
    { sort: 'price', order: 'asc' },
    { groups: { brand: ['a'] } },
    { groups: { brand: ['a', 'b', 'c'], color: [] } },
    { sort: 'price', order: 'desc', groups: { brand: ['a'], color: ['red', 'blue'] } },
    // 中文与 URL 特殊字符：encodeURIComponent 必须无损往返
    { sort: '综合', groups: { 品牌: ['品牌&A', '品牌=B', '品牌#C', '品牌%D', '品 牌'] } },
  ]

  for (const conditions of CASES) {
    it(`往返无损：${JSON.stringify(conditions)}`, () => {
      const encoded = encode(conditions)
      // encode 产出必须 URL-safe（无裸 & = # % 之外的保留字残留——encodeURIComponent 保证）
      expect(decode(encoded)).toEqual(conditions)
    })
  }

  it('encode 串不含裸保留字符（可安全拼进 hash / query）', () => {
    const encoded = encode({ groups: { brand: ['a&b=c#d'] } })
    expect(encoded).not.toMatch(/[&=#]/)
  })

  it('decode：encode(空条件) → {}（非 null——有有效持久化记录，值为空）', () => {
    expect(decode(encode({}))).toEqual({})
  })

  it('decode：未知键清洗（不回抛污染字段）', () => {
    const decoded = decode(encode({ sort: 'price', extra: 1 } as unknown as FilterConditions))
    expect(decoded).toEqual({ sort: 'price' })
  })

  it('decode：order 非法值清洗掉、sort 保留', () => {
    const decoded = decode('{"sort":"price","order":"up"}')
    expect(decoded).toEqual({ sort: 'price' })
  })

  it('decode：groups 值数组剔除非字符串项', () => {
    const decoded = decode('{"groups":{"brand":["a",1,null,"b"]}}')
    expect(decoded).toEqual({ groups: { brand: ['a', 'b'] } })
  })

  it("decode：垃圾串 / 空串 / '%' / JSON 数组 / null 字面量 → null", () => {
    expect(decode('not-json')).toBeNull()
    expect(decode('')).toBeNull()
    expect(decode('%')).toBeNull()
    expect(decode('[]')).toBeNull()
    expect(decode('null')).toBeNull()
    expect(decode('"str"')).toBeNull()
  })

  it('decode：已解码的裸 JSON 也宽容接受（encode 的逆不强制宿主先 decodeURIComponent）', () => {
    expect(decode(JSON.stringify({ sort: 'price' }))).toEqual({ sort: 'price' })
  })
})

describe('filter persist · toQuery / fromQuery（URL 后端）', () => {
  it('往返无损', () => {
    const conditions: FilterConditions = { sort: 'price', order: 'desc', groups: { brand: ['a', 'b'] } }
    const params = new URLSearchParams('page=2&kw=鞋')
    toQuery(params, conditions)
    expect(params.get('page')).toBe('2') // 既有参数不受影响
    expect(fromQuery(params)).toEqual(conditions)
  })

  it('query 键名 = PERSIST_QUERY_KEY（conditions；值存 JSON 原文，编码统一交给 URLSearchParams）', () => {
    const params = toQuery(new URLSearchParams(), { sort: 'sales' })
    expect(params.get(PERSIST_QUERY_KEY)).toBe(JSON.stringify({ sort: 'sales' }))
    // toString 全程 URL 安全（保留字自动转义）
    expect(params.toString()).not.toMatch(/[{}]/)
    // 与 encode 形态（手工拼 hash）互认：fromQuery 对两种值形态都解析
    const encodedParams = new URLSearchParams(`${PERSIST_QUERY_KEY}=${encode({ sort: 'sales' })}`)
    expect(fromQuery(encodedParams)).toEqual({ sort: 'sales' })
  })

  it('空条件 → 从 params 中移除键（不留空尾巴）', () => {
    const params = new URLSearchParams(`${PERSIST_QUERY_KEY}=${encodeURIComponent('{"sort":"x"}')}`)
    toQuery(params, {})
    expect(params.has(PERSIST_QUERY_KEY)).toBe(false)
  })

  it('fromQuery：接受带 ? / # 前缀的原始串', () => {
    const conditions: FilterConditions = { groups: { kind: ['shoes'] } }
    const encoded = encode(conditions)
    expect(fromQuery(`?${PERSIST_QUERY_KEY}=${encoded}`)).toEqual(conditions)
    expect(fromQuery(`#${PERSIST_QUERY_KEY}=${encoded}`)).toEqual(conditions)
    expect(fromQuery(`${PERSIST_QUERY_KEY}=${encoded}`)).toEqual(conditions)
  })

  it('fromQuery：无该键 / 值不可解析 → null', () => {
    expect(fromQuery(new URLSearchParams('page=1'))).toBeNull()
    expect(fromQuery(new URLSearchParams(`${PERSIST_QUERY_KEY}=not-json`))).toBeNull()
    expect(fromQuery('')).toBeNull()
  })
})

describe('filter persist · save / load（storage 后端）', () => {
  it('往返无损', () => {
    const storage = memoryStorage()
    const conditions: FilterConditions = { sort: 'price', order: 'asc', groups: { brand: ['a'] } }
    expect(save(storage, 'oas:filter', conditions)).toBe(true)
    expect(load(storage, 'oas:filter')).toEqual(conditions)
  })

  it('存储值为 JSON 原文（可调试直读）', () => {
    const storage = memoryStorage()
    save(storage, 'k', { sort: 'price' })
    expect(storage.getItem('k')).toBe('{"sort":"price"}')
  })

  it('空条件 → removeItem（不留空尾巴）', () => {
    const storage = memoryStorage()
    save(storage, 'k', { sort: 'price' })
    save(storage, 'k', {})
    expect(storage.getItem('k')).toBeNull()
    expect(load(storage, 'k')).toBeNull()
  })

  it('save：storage 异常（quota / security）降级返回 false，不抛', () => {
    expect(save(memoryStorage({ set: true }), 'k', { sort: 'price' })).toBe(false)
    expect(save(memoryStorage({ remove: true }), 'k', {})).toBe(false)
  })

  it('load：storage 异常降级返回 null，不抛', () => {
    expect(load(memoryStorage({ get: true }), 'k')).toBeNull()
  })

  it('load：缺失键 → null；脏值（不可解析）→ null 不污染', () => {
    const storage = memoryStorage()
    expect(load(storage, 'missing')).toBeNull()
    storage.setItem('dirty', '{{{')
    expect(load(storage, 'dirty')).toBeNull()
  })

  // —— 复核修复批回归（真实浏览器复核发现项固化）——
  // toQuery 存 JSON 原文后 URLSearchParams.get() 已解一层，fromQuery 不得再无条件
  // decodeURIComponent（对 JSON 内容二次解码）。

  it('fromQuery：值含裸 %（% 后非十六进制）→ 原文解析成功，不整批 null', () => {
    // toQuery 形态：值 = JSON 原文（含用户输入 "50%"），params.toString() 已做一层 URL 编码
    const conditions: FilterConditions = { groups: { kw: ['50%'] } }
    const params = new URLSearchParams()
    params.set(PERSIST_QUERY_KEY, JSON.stringify(conditions))
    expect(fromQuery(params)).toEqual(conditions)
    // 裸串形态（值里 % 后跟 " 非十六进制）：修复前 decodeURIComponent 抛 URIError → null
    expect(fromQuery(`${PERSIST_QUERY_KEY}=${encodeURIComponent(JSON.stringify(conditions))}`)).toEqual(conditions)
    expect(fromQuery(`${PERSIST_QUERY_KEY}=${JSON.stringify(conditions)}`)).toEqual(conditions)
  })

  it('fromQuery：值含十六进制转义形 %41 → 不经 URL 的路径不篡改；URL 层 %XX 属转义语义', () => {
    const conditions: FilterConditions = { groups: { kw: ['%41AB'] } }
    // 不经 URL 的路径（storage）：load 走 parseConditions（不二次解码）——JSON 内容里的
    // %41 是用户数据，不得被静默解成 A。（decode 是 encode 的逆，本职解码，不在断言面）
    const storage = memoryStorage()
    save(storage, 'k', conditions)
    expect(load(storage, 'k')).toEqual(conditions)
    // fromQuery 的 URLSearchParams 路径（toQuery 往返全程无损：% 已被转义成 %25，
    // get 交付原文，fromQuery 直接解析原文不再二次解码）：
    const roundTrip = new URLSearchParams()
    toQuery(roundTrip, conditions)
    expect(fromQuery(roundTrip)).toEqual(conditions)
    // URL 层边界说明：宿主把含裸 %XX 的 JSON 直接拼进 query 串时，合法 %XX 被
    // URLSearchParams 标准解码为转义语义（%41 → A）——宿主必须经 toQuery/encode
    // 产生合法 query；fromQuery 对不可解析结果回落 null 不静默造值
  })

  it('fromQuery：加号与空格（原文形态空格合法；encode 形态 %20 还原）', () => {
    const spaced: FilterConditions = { groups: { kw: ['a b'] } }
    // 原文形态（toQuery 产物经 params.toString()）：空格被 URLSearchParams 解析还原
    const params = new URLSearchParams()
    params.set(PERSIST_QUERY_KEY, JSON.stringify(spaced))
    expect(fromQuery(params)).toEqual(spaced)
    // encode 形态：空格编码 %20 还原
    expect(fromQuery(`${PERSIST_QUERY_KEY}=${encodeURIComponent(JSON.stringify(spaced))}`)).toEqual(spaced)
    // query 字面 + 的 URLSearchParams 标准语义（+ 即空格）：两种后端行为一致
    expect(fromQuery(`${PERSIST_QUERY_KEY}=${JSON.stringify({ groups: { kw: ['a+b'] } })}`)).toEqual({
      groups: { kw: ['a b'] },
    })
  })
})
