import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, basename, relative } from 'node:path'

// 撞名守卫（ratchet）：收集各组件的属性名（取自权威生成物 api-manifest 的**全量 attrs**——含非 observed 的
// property 通道属性；另有遗留别名取 normalizeLegacyAlias 第二参），与真实 DOM 上的「方法 / 只读访问器」求交；凡命中者，**运行时该组件原型上必须存在对应 setter**
// （即已用 Object.defineProperty 遮蔽）。用运行时核验（customElements.get(tag).prototype 的 own descriptor）而非
// 源码字符串匹配——避免「渲染循环里恰好也有同名映射」「注释致正则漏采」等造成的误绿。
// 背景：属性名撞 DOM 只读 getter（Element.prefix）或方法（HTMLElement.blur）时，React/Vue 会按 `key in el`
// 走 property 写入——未遮蔽则抛错崩宿主（历史：715e20b8 删访问器致 React 白屏）。
const MANIFEST = join(import.meta.dirname, '../../docs/api-manifest')
const SRC = join(import.meta.dirname, 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function collect(): { tag: string; name: string; file: string }[] {
  const map = new Map<string, { tag: string; name: string; file: string }>()
  const add = (tag: string, name: string, file: string): void => {
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) return
    const k = tag + '\u0000' + name
    if (!map.has(k)) map.set(k, { tag, name, file })
  }
  // observed 属性：api-manifest（权威生成物，doc api 章节同源）
  for (const f of readdirSync(MANIFEST)) {
    if (!/^oas-.+\.json$/.test(f)) continue
    let m: { attrs?: { name?: string }[] }
    try {
      m = JSON.parse(readFileSync(join(MANIFEST, f), 'utf8'))
    } catch {
      continue
    }
    const tag = basename(f, '.json')
    for (const a of m.attrs ?? []) if (a?.name) add(tag, a.name, f)
  }
  // 遗留别名：normalizeLegacyAlias('primary', 'legacy')
  for (const f of walk(SRC)) {
    const tag = basename(f, '.ts')
    if (!tag.startsWith('oas-')) continue
    const src = readFileSync(f, 'utf8')
    for (const q of src.matchAll(/normalizeLegacyAlias\(\s*'[^']*'\s*,\s*'([a-zA-Z][a-zA-Z0-9-]*)'/g)) {
      add(tag, q[1]!, relative(SRC, f).replace(/\\/g, '/'))
    }
  }
  return [...map.values()]
}

test('组件属性名撞 DOM 方法/只读访问器时，其原型必须已遮蔽（运行时核验）', async ({ page }) => {
  const entries = collect()
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })

  // 1) 先在探针上分类（不需要组件已注册）
  const kind = await page.evaluate(
    (ns) => {
      const probe = document.createElement('x-unknown')
      const out: Record<string, string> = {}
      for (const n of ns) {
        let proto: object | null = Object.getPrototypeOf(probe)
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
    },
    [...new Set(entries.map((e) => e.name))],
  )

  // 2) 只等「可能撞名」的组件注册完成，避免与 docs 主题动态注册竞态
  const relevant = entries.filter((e) => kind[e.name] === 'method' || kind[e.name] === 'read-only')
  const tags = [...new Set(relevant.map((e) => e.tag))]
  await page.waitForFunction((ts) => ts.every((t) => customElements.get(t) != null), tags, { timeout: 30000 })

  // 3) 运行时核验遮蔽：组件原型 own descriptor 必须有 setter
  const offenders = await page.evaluate(
    (rel) => {
      const out: string[] = []
      for (const { tag, name, kind: k } of rel) {
        const ctor = customElements.get(tag)
        const d = ctor ? Object.getOwnPropertyDescriptor(ctor.prototype, name) : undefined
        if (!(d && d.set)) out.push(`${tag} 的 '${name}'（${k}）`)
      }
      return [...new Set(out)]
    },
    relevant.map((e) => ({ tag: e.tag, name: e.name, kind: kind[e.name] })),
  )

  expect(
    offenders.sort(),
    `以下属性名撞 DOM 方法/只读访问器但组件原型上无 setter（未遮蔽）：\n${offenders.join('\n')}\n需用 Object.defineProperty(this.prototype, '<名>', …) 遮蔽`,
  ).toEqual([])
})
