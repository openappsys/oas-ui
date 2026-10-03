import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, basename, relative } from 'node:path'

// 撞名守卫（ratchet）：扫描全部组件的 observedAttributes 与 normalizeLegacyAlias 别名名，
// 与真实 DOM 上的「方法 / 只读访问器」求交；凡命中者，**运行时该组件原型上必须存在对应 setter**
// （即已用 Object.defineProperty 遮蔽）。用运行时核验（customElements.get(tag).prototype 的 own
// descriptor）而非源码字符串匹配——避免「渲染循环里恰好也有同名映射」等造成的误绿。
// 背景：属性名撞 DOM 只读 getter（Element.prefix）或方法（HTMLElement.blur）时，React/Vue 会按
// `key in el` 走 property 写入——未遮蔽则抛错崩宿主（历史：715e20b8 删访问器致 React 白屏）。
const SRC = join(import.meta.dirname, 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function collectEntries(): { tag: string; name: string; file: string }[] {
  const out: { tag: string; name: string; file: string }[] = []
  for (const f of walk(SRC)) {
    const src = readFileSync(f, 'utf8')
    const file = relative(SRC, f).replace(/\\/g, '/')
    const tag = basename(f, '.ts')
    if (!tag.startsWith('oas-')) continue
    const push = (name: string): void => {
      if (!out.some((e) => e.tag === tag && e.name === name)) out.push({ tag, name, file })
    }
    // 锚定 observedAttributes getter 的返回数组（避开「注释里先出现 observedAttributes」的误配）
    const m = src.match(/get observedAttributes\(\): string\[\] \{\s*return \[([\s\S]*?)\]/)
    if (m) for (const q of m[1]!.matchAll(/'([a-zA-Z][a-zA-Z0-9-]*)'/g)) push(q[1]!)
    // normalizeLegacyAlias('primary', 'legacy') —— 别名名同样纳入（旧名也是宿主可写的）
    for (const q of src.matchAll(/normalizeLegacyAlias\(\s*'[^']*'\s*,\s*'([a-zA-Z][a-zA-Z0-9-]*)'/g)) push(q[1]!)
  }
  return out
}

test('组件属性名撞 DOM 方法/只读访问器时，其原型必须已遮蔽（运行时核验）', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  const entries = collectEntries()
  const offenders = await page.evaluate((ents) => {
    const probe = document.createElement('x-unknown')
    const kindOf = (name: string): string => {
      let proto: object | null = Object.getPrototypeOf(probe)
      while (proto) {
        const d = Object.getOwnPropertyDescriptor(proto, name)
        if (d) return typeof d.value === 'function' ? 'method' : d.set ? 'writable' : d.get ? 'read-only' : 'data'
        proto = Object.getPrototypeOf(proto)
      }
      return 'absent'
    }
    const out: string[] = []
    for (const { tag, name } of ents) {
      const k = kindOf(name)
      if (k !== 'method' && k !== 'read-only') continue
      const ctor = customElements.get(tag)
      const d = ctor ? Object.getOwnPropertyDescriptor(ctor.prototype, name) : undefined
      if (!(d && d.set)) out.push(`${tag} 的 '${name}'（${k}）`)
    }
    return [...new Set(out)]
  }, entries)

  expect(
    offenders.sort(),
    `以下属性名撞 DOM 方法/只读访问器但组件原型上无 setter（未遮蔽）：\n${offenders.join('\n')}\n需用 Object.defineProperty(this.prototype, '<名>', …) 遮蔽`,
  ).toEqual([])
})
