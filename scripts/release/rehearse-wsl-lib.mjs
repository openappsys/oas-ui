/**
 * rehearse-wsl 的纯函数层（无副作用，可被 node --test 直接导入）。
 *
 * 主脚本 scripts/release/rehearse-wsl.mjs 是 CLI：顶层即探测 WSL / 守卫工作树 / 执行门禁，
 * 被测试导入会真的跑流程（甚至 process.exit）。把解析逻辑拆到这里，测试只覆盖「输入 → 输出」
 * 的确定性部分（wsl.exe 列表编码差异、路径换算、key=value 解析）。
 */

/**
 * 解码 wsl.exe 的列表输出。Windows 下 `wsl -l -q` 重定向时通常是 UTF-16LE（且版本间有差异：
 * 可能带 BOM、夹杂 NUL、个别版本吐 UTF-8），这里全部兼容：
 * 有 BOM 按 BOM；无 BOM 用「零字节密度」判定（ASCII 走 UTF-16LE 时每隔一字节就是 0x00）。
 *
 * @param {Buffer|Uint8Array|null} buf
 * @returns {string}
 */
export function decodeWslList(buf) {
  if (!buf || buf.length === 0) return ''
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le')
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes.subarray(2))
    // swap16 需要偶数长度；BE 文本落单字节时补一个 0 再交换（尾部多余 NUL 由 sanitizeDistros 清掉）
    if (swapped.length % 2 === 1)
      return Buffer.concat([swapped, Buffer.from([0])])
        .swap16()
        .toString('utf16le')
    return swapped.swap16().toString('utf16le')
  }
  let nul = 0
  for (const byte of bytes) if (byte === 0) nul++
  // UTF-16LE 下 ASCII 文本约一半字节为 0；UTF-8 文本几乎没有 0
  return nul > bytes.length / 4 ? bytes.toString('utf16le') : bytes.toString('utf8')
}

/**
 * 列表输出 → 发行版名数组：去 BOM / NUL / CR / 空行 / `-l -v` 的默认标记 `*` / 装饰行。
 *
 * @param {string} text
 * @returns {string[]}
 */
export function sanitizeDistros(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*+\s*/, ''))
    .filter((line) => line !== '' && line !== 'NAME' && line !== '(Default)')
}

/**
 * Windows 路径 → WSL 路径（D:\dev\oas-ui → /mnt/d/dev/oas-ui）；网络盘/UNC 不支持。
 *
 * @param {string} winPath
 * @returns {string|null}
 */
export function winToWslPath(winPath) {
  const p = winPath
    .replace(/\\/g, '/')
    .replace(/^\/\/\?\//, '')
    .replace(/\/+$/, '')
  const m = /^([A-Za-z]):(?:\/(.*))?$/.exec(p)
  if (!m) return null
  return m[2] ? `/mnt/${m[1].toLowerCase()}/${m[2]}` : `/mnt/${m[1].toLowerCase()}`
}

/**
 * 解析探测脚本的 `key=value` 行输出（忽略空行 / 非 key=value 行 / 首尾空白）。
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseKv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}
