import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// 撞名守卫（ratchet）：扫描全部组件的 observedAttributes 与 normalizeLegacyAlias 别名名，
// 与真实 DOM 上的「方法 / 只读访问器」求交——凡命中者，**该组件文件本身**必须用
// `Object.defineProperty(this.prototype, '<名>'` 遮蔽。按文件校验（而非全局按名白名单），
// 避免新组件用同一个名字却忘了遮蔽也被放过。
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

function collectEntries(): { name: string; file: string; src: string }[] {
  const out: { name: string; file: string; src: string }[] = []
  for (const f of walk(SRC)) {
    const src = readFileSync(f, 'utf8')
    const file = relative(SRC, f).replace(/\\/g, '/')
    const push = (name: string): void => {
      if (!out.some((e) => e.name === name && e.file === file)) out.push({ name, file, src })
    }
    // observedAttributes 数组里的字符串字面量
    const m = src.match(/observedAttributes[^{]*\{([\s\S]*?)\n\s*\}/)
    if (m) for (const q of m[1]!.matchAll(/'([a-zA-Z][a-zA-Z0-9-]*)'/g)) push(q[1]!)
    // normalizeLegacyAlias('primary', 'legacy') —— 别名名同样纳入（旧名也是宿主可写的）
    for (const q of src.matchAll(/normalizeLegacyAlias\(\s*'[^']*'\s*,\s*'([a-zA-Z][a-zA-Z0-9-]*)'/g)) push(q[1]!)
  }
  return out
}

test('组件属性名撞 DOM 方法/只读访问器时，该组件文件必须自行遮蔽', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  const entries = collectEntries()
  const names = [...new Set(entries.map((e) => e.name))]
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

  const isShadowed = (src: string, name: string): boolean =>
    src.includes(`defineProperty(this.prototype, '${name}'`) || // 单例：defineProperty(this.prototype, 'blur', …)
    src.includes(`[['${name}',`) || // 循环映射表：[['prefix', 'prefix-text'], …] + defineProperty(this.prototype, name, …)
    src.includes(`['${name}', '`) // 同上（换行/其它格式）
  const offenders = entries
    .filter((e) => (kind[e.name] === 'method' || kind[e.name] === 'read-only') && !isShadowed(e.src, e.name))
    .map((e) => `${e.file} 的 '${e.name}'（${kind[e.name]}）`)

  expect(
    [...new Set(offenders)].sort(),
    `以下属性名撞 DOM 方法/只读访问器但未在该组件文件里遮蔽：\n${offenders.join('\n')}\n需用 Object.defineProperty(this.prototype, '<名>', …) 遮蔽`,
  ).toEqual([])
})
