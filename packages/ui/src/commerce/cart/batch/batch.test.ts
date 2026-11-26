import { describe, expect, it } from 'vitest'
import { OASCart, type CartItem } from '../index.js'
import { applyBatch, executeBatch, type CartBatchItem, type CartBatchOp } from './index.js'

const ITEM = (overrides: Partial<CartItem> & { id: string }): CartItem => ({
  title: `商品 ${overrides.id}`,
  price: 10,
  quantity: 1,
  ...overrides,
})

describe('cart batch · applyBatch（纯函数编排）', () => {
  it('remove：勾选条目剔除，succeeded / changed 清单齐备', () => {
    const items = [ITEM({ id: 'a', selected: true }), ITEM({ id: 'b', selected: true, quantity: 3 }), ITEM({ id: 'c' })]
    const outcome = applyBatch(items, { type: 'remove' })
    expect(outcome.items.map((i) => i.id)).toEqual(['c'])
    expect(outcome.succeeded).toEqual(['a', 'b'])
    expect(outcome.skipped).toEqual([])
    // changed = 被删条目快照（保留宿主字段）
    expect(outcome.changed.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('remove：禁用卡跳过（reason disabled），即使被勾选也不删', () => {
    const items = [ITEM({ id: 'a', selected: true }), ITEM({ id: 'd', selected: true, disabled: true })]
    const outcome = applyBatch(items, { type: 'remove' })
    // a 正常删除（剔除）、d 禁用跳过（保留）
    expect(outcome.items.map((i) => i.id)).toEqual(['d'])
    expect(outcome.succeeded).toEqual(['a'])
    expect(outcome.skipped).toEqual([{ id: 'd', reason: 'disabled' }])
    expect(outcome.changed.map((i) => i.id)).toEqual(['a'])
  })

  it('ids 显式覆盖：勾选面之外的目标清单（disabled / 不存在同样跳过）', () => {
    const items = [ITEM({ id: 'a', selected: true }), ITEM({ id: 'x', disabled: true })]
    const outcome = applyBatch(items, { type: 'remove' }, ['a', 'x', 'ghost'])
    expect(outcome.items.map((i) => i.id)).toEqual(['x'])
    expect(outcome.succeeded).toEqual(['a'])
    expect(outcome.skipped).toEqual([
      { id: 'x', reason: 'disabled' },
      { id: 'ghost', reason: 'not-found' },
    ])
  })

  it('无勾选条目 → 全空编排（零操作，无异常）', () => {
    const items = [ITEM({ id: 'a' })]
    const outcome = applyBatch(items, { type: 'remove' })
    expect(outcome.items).toHaveLength(1)
    expect(outcome.succeeded).toEqual([])
    expect(outcome.skipped).toEqual([])
    expect(outcome.changed).toEqual([])
  })

  it('favorite：勾选条目写 favorite 字段（缺省 true），宿主其余字段保留', () => {
    // 宿主业务字段（sku 等）自由携带——CartItem 开放对象，favorite 写入不丢字段
    const withSku = { ...ITEM({ id: 'a', selected: true }), sku: 'SKU-1' }
    const items = [withSku as CartBatchItem]
    const outcome = applyBatch(items, { type: 'favorite' })
    expect(outcome.items[0]).toMatchObject({ id: 'a', sku: 'SKU-1', favorite: true })
    expect(outcome.succeeded).toEqual(['a'])
    // changed = 改后条目快照（宿主据此调收藏 API）
    expect(outcome.changed[0]).toMatchObject({ id: 'a', favorite: true })
  })

  it('favorite：value: false 取消收藏', () => {
    const items = [ITEM({ id: 'a', selected: true }), ITEM({ id: 'b', selected: true })]
    const withFav = applyBatch(items, { type: 'favorite', value: true })
    const outcome = applyBatch(withFav.items, { type: 'favorite', value: false }, ['a'])
    expect(outcome.items[0]).toMatchObject({ id: 'a', favorite: false })
    expect(outcome.items[1]).toMatchObject({ id: 'b', favorite: true })
  })

  it('favorite：disabled / not-found 跳过口径与 remove 一致', () => {
    const items = [ITEM({ id: 'd', selected: true, disabled: true })]
    const outcome = applyBatch(items, { type: 'favorite' }, ['d', 'ghost'])
    expect(outcome.items[0]?.favorite).toBeUndefined()
    expect(outcome.skipped).toEqual([
      { id: 'd', reason: 'disabled' },
      { id: 'ghost', reason: 'not-found' },
    ])
  })

  it('不 mutate 输入数组与条目（纯函数）', () => {
    const items = [ITEM({ id: 'a', selected: true, quantity: 2 })]
    const frozen = JSON.parse(JSON.stringify(items))
    applyBatch(items, { type: 'remove' })
    applyBatch(items, { type: 'favorite' })
    expect(items).toEqual(frozen)
  })
})

describe('cart batch · executeBatch（实例编排 + oas-batch 事件回写）', () => {
  function makeCart(items: CartItem[]): OASCart {
    const cart = new OASCart()
    cart.items = items
    return cart
  }

  function collectBatch(cart: OASCart): { detail: Record<string, unknown>; bubbles: boolean; composed: boolean }[] {
    const received: { detail: Record<string, unknown>; bubbles: boolean; composed: boolean }[] = []
    cart.addEventListener('oas-batch', (e) => {
      const ce = e as CustomEvent
      received.push({ detail: ce.detail, bubbles: ce.bubbles, composed: ce.composed })
    })
    return received
  }

  it('remove：items attribute 回写 + oas-batch 派发（bubbles + composed）', () => {
    const cart = makeCart([ITEM({ id: 'a', selected: true }), ITEM({ id: 'b' })])
    const received = collectBatch(cart)
    const outcome = executeBatch(cart, { type: 'remove' })
    expect(JSON.parse(cart.getAttribute('items') ?? '[]').map((i: CartItem) => i.id)).toEqual(['b'])
    expect(received).toHaveLength(1)
    expect(received[0]!.bubbles).toBe(true)
    expect(received[0]!.composed).toBe(true)
    expect(received[0]!.detail).toMatchObject({ op: { type: 'remove' }, succeeded: ['a'] })
    expect(outcome.succeeded).toEqual(['a'])
  })

  it('favorite：favorite 字段回写进 items attribute', () => {
    const cart = makeCart([ITEM({ id: 'a', selected: true })])
    executeBatch(cart, { type: 'favorite' })
    expect(JSON.parse(cart.getAttribute('items') ?? '[]')[0]).toMatchObject({ favorite: true })
  })

  it('整体 disabled：全部跳过（reason disabled）、不回写、仍派 oas-batch 供宿主反馈', () => {
    const cart = makeCart([ITEM({ id: 'a', selected: true }), ITEM({ id: 'b', selected: true })])
    cart.setAttribute('disabled', '')
    const received = collectBatch(cart)
    const before = cart.getAttribute('items')
    const outcome = executeBatch(cart, { type: 'remove' })
    expect(cart.getAttribute('items')).toBe(before)
    expect(outcome.succeeded).toEqual([])
    expect(outcome.skipped).toEqual([
      { id: 'a', reason: 'disabled' },
      { id: 'b', reason: 'disabled' },
    ])
    expect(received).toHaveLength(1)
    expect(received[0]!.detail).toMatchObject({ op: { type: 'remove' }, succeeded: [] })
  })

  it('op 缺 type / 非法 type：devWarn（测试环境 console.error）并零操作返回', () => {
    const cart = makeCart([ITEM({ id: 'a', selected: true })])
    const received = collectBatch(cart)
    const before = cart.getAttribute('items')
    const outcome = executeBatch(cart, { type: 'nope' as unknown as CartBatchOp['type'] })
    expect(cart.getAttribute('items')).toBe(before)
    expect(received).toHaveLength(0)
    expect(outcome.succeeded).toEqual([])
    expect(outcome.skipped).toEqual([])
  })

  // —— 复核修复批回归（真实浏览器复核发现项固化）——

  it('config-provider 注入禁用：executeBatch 全部跳过、不回写（与本体 isDisabled 同语义）', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('disabled', '')
    const cart = makeCart([ITEM({ id: 'a', selected: true }), ITEM({ id: 'b', selected: true })])
    provider.appendChild(cart)
    document.body.appendChild(provider)
    const received = collectBatch(cart)
    const before = cart.getAttribute('items')
    const outcome = executeBatch(cart, { type: 'remove' })
    // items 零变化（修复前：只判 attribute，注入禁用下照删——items 2→0）
    expect(cart.getAttribute('items')).toBe(before)
    expect(outcome.succeeded).toEqual([])
    expect(outcome.skipped).toEqual([
      { id: 'a', reason: 'disabled' },
      { id: 'b', reason: 'disabled' },
    ])
    expect(received).toHaveLength(1)
    expect(received[0]!.detail).toMatchObject({ op: { type: 'remove' }, succeeded: [] })
    // disabled-skip 豁免：注入禁用下单件保持可用（injectDisabled 同语义）
    cart.setAttribute('disabled-skip', '')
    const outcomeSkip = executeBatch(cart, { type: 'remove' })
    expect(outcomeSkip.succeeded).toEqual(['a', 'b'])
    cart.removeAttribute('disabled-skip')
    provider.remove()
  })

  it('零操作不回写 items：空勾选时 attribute 原文不变', () => {
    const cart = makeCart([ITEM({ id: 'a' }), ITEM({ id: 'b', quantity: 3 })])
    const received = collectBatch(cart)
    const before = cart.getAttribute('items')
    const outcome = executeBatch(cart, { type: 'remove' })
    // 修复前：归一后 items 整体回写——attribute changed（quantity 3 保留但 selected:false 被补写）
    expect(cart.getAttribute('items')).toBe(before)
    expect(outcome.succeeded).toEqual([])
    expect(received).toHaveLength(1)
  })

  it('仅禁用被勾选不回写：宿主手工 selected:true 的禁用条目不被归一抹掉', () => {
    const cart = new OASCart()
    const raw = JSON.stringify([
      { id: 'd', title: '失效商品', price: 9, quantity: 2, selected: true, disabled: true, sku: 'X' },
    ])
    cart.setAttribute('items', raw)
    const received = collectBatch(cart)
    const outcome = executeBatch(cart, { type: 'favorite' })
    // 修复前：归一化回写 selected:false + sku 仍在但 selected 被抹——attribute changed
    expect(cart.getAttribute('items')).toBe(raw)
    expect(outcome.succeeded).toEqual([])
    expect(outcome.skipped).toEqual([{ id: 'd', reason: 'disabled' }])
    expect(received).toHaveLength(1)
  })

  it('部分成功：成功项应用操作、未成功条目保留宿主原文（selected:true 禁用卡不被抹）', () => {
    const cart = new OASCart()
    const raw = JSON.stringify([
      { id: 'a', title: '普通商品', price: 10, selected: true, tag: 'keep-me' },
      { id: 'd', title: '失效商品', price: 9, selected: true, disabled: true },
    ])
    cart.setAttribute('items', raw)
    const outcome = executeBatch(cart, { type: 'favorite' })
    const written = JSON.parse(cart.getAttribute('items') ?? '[]') as Array<Record<string, unknown>>
    // a 成功：favorite 写入、宿主自定义字段保留
    expect(written).toHaveLength(2)
    expect(written[0]).toMatchObject({ id: 'a', favorite: true, tag: 'keep-me' })
    // d 跳过：原文保留（selected:true 不被归一抹掉）
    expect(written[1]).toMatchObject({ id: 'd', selected: true, disabled: true })
    expect(written[1]).not.toHaveProperty('favorite')
    expect(outcome.succeeded).toEqual(['a'])
  })
})
