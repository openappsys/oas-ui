import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// 撞名守卫（ratchet）：扫描全部组件的 observedAttributes 与 normalizedLegacyAlias 别名名，
// 与真实 DOM 上的「方法 / 只读访问器」求交——结果必须 ⊆ 已知已用属性访问器遮蔽的白名单。
// 背景：属性名撞 DOM 只读 getter（Element.prefix）或方法（HTMLElement.blur）时，React/Vue 会按
// `key in el` 走 property 写入——未遮蔽则抛错崩宿主（历史：715e20b8 删访问器致 React 白屏）。
// 本守卫防「再新增撞名属性却忘了遮蔽」复发；新增遮蔽后须同步登记白名单。
const SRC = join(import.meta.dirname, 'src')
// 已用 Object.defineProperty 在原型遮蔽的撞名（kind 见下方分类）
const SHADOWED = new Set(['prefix', 'blur'])

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function collectNames(): { name: string; file: string }[] {
  const out: { name: string; file: string }[] = []
  for (const f of walk(SRC)) {
    const s = readFileSync(f, 'utf8')
    const rel = relative(SRC, f).replace(/\\/g, '/')
    // observedAttributes 数组里的字符串字面量
    const m = s.match(/observedAttributes[^{]*\{([\s\S]*?)\n\s*\}/)
    if (m) for (const q of m[1]!.matchAll(/'([a-zA-Z][a-zA-Z0-9-]*)'/g)) out.push({ name: q[1]!, file: rel })
    // normalizeLegacyAlias('primary', 'legacy') —— 别名名也纳入（旧名同样是宿主可写的）
    for (const q of s.matchAll(/normalizeLegacyAlias\(\s*'[^']*'\s*,\s*'([a-zA-Z][a-zA-Z0-9-]*)'/g)) {
      out.push({ name: q[1]!, file: rel })
    }
  }
  return out
}

test('组件属性名不得撞 DOM 方法 / 只读访问器（未遮蔽者）', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  const names = [...new Set(collectNames().map((x) => x.name))]
  const kind = await page.evaluate((ns) => {
    const el = document.createElement('x-unknown')
    const out: Record<string, string> = {}
    for (const n of ns) {
      let proto: object | null = Object.getPrototypeOf(el)
      out[n] = 'absent'
      while (proto) {
        const d = Object.getOwnPropertyDescriptor(proto, n)
        if (d) {
          out[n] = typeof d.value === 'function' ? 'method' : d.set ? 'writable' : d.get ? 'read-only' : 'data'
          break
        }
        proto = Object.getPrototypeOf(proto)
      }
    }
    return out
  }, names)

  const offenders = names.filter((n) => (kind[n] === 'method' || kind[n] === 'read-only') && !SHADOWED.has(n))
  expect(
    offenders.sort(),
    `以下属性名撞 DOM 方法/只读访问器但未遮蔽：${offenders.join(', ')}\n需用 Object.defineProperty 在原型遮蔽并登记 SHADOWED 白名单`,
  ).toEqual([])
})
