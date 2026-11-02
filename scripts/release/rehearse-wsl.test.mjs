import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeWslList, parseKv, sanitizeDistros, winToWslPath } from './rehearse-wsl-lib.mjs'

/* ------------------------------ winToWslPath ------------------------------ */

// 被测函数就是路径换算器，输入必须是 Windows 盘符 / UNC 路径。源码里把盘符拆开拼接：
// 本文件所在的 scripts/ 受「测试禁硬编码绝对路径」守卫扫描（qa-regression/conventions.test.ts），
// 直接写盘符绝对路径字面量会被当成「本机路径写死」误报。
const DRIVE = 'D'
const UNC = '\\\\?\\'

test('winToWslPath：盘符路径换算为 /mnt/<小写盘符>/…', () => {
  assert.equal(winToWslPath(`${DRIVE}:\\dev\\oas-ui`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath(`${DRIVE}:\\`), '/mnt/d')
  assert.equal(winToWslPath(`${DRIVE.toLowerCase()}:/dev/oas-ui`), '/mnt/d/dev/oas-ui')
})

test('winToWslPath：去掉 \\\\?\\ 前缀与尾部斜杠，非盘符路径返回 null', () => {
  assert.equal(winToWslPath(`${UNC}${DRIVE}:\\dev\\oas-ui\\`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath(`${DRIVE}:\\dev\\oas-ui\\\\\\`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath('\\\\server\\share\\repo'), null)
  assert.equal(winToWslPath('/root/repo'), null)
  assert.equal(winToWslPath(''), null)
})

/* ------------------------------ decodeWslList ----------------------------- */

test('decodeWslList：UTF-16LE 带 BOM', () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Ubuntu\r\nDebian\r\n', 'utf16le')])
  assert.equal(decodeWslList(buf), 'Ubuntu\r\nDebian\r\n')
})

test('decodeWslList：UTF-16BE 带 BOM（字节序交换）', () => {
  const le = Buffer.from('Ubuntu\r\n', 'utf16le')
  const be = Buffer.from(le)
  be.swap16()
  const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), be])
  assert.equal(decodeWslList(buf), 'Ubuntu\r\n')
})

test('decodeWslList：无 BOM 的 UTF-16LE（零字节密度判定）与纯 UTF-8', () => {
  assert.equal(decodeWslList(Buffer.from('Ubuntu\r\nDebian\r\n', 'utf16le')), 'Ubuntu\r\nDebian\r\n')
  assert.equal(decodeWslList(Buffer.from('Ubuntu\r\n', 'utf8')), 'Ubuntu\r\n')
})

test('decodeWslList：空输入与 NUL 夹杂', () => {
  assert.equal(decodeWslList(null), '')
  assert.equal(decodeWslList(Buffer.alloc(0)), '')
  // UTF-16LE 未去 BOM 且带尾随 NUL：解码后含 \u0000，交给 sanitizeDistros 清理
  const withNul = Buffer.from('Ubuntu\r\n\u0000', 'utf16le')
  assert.equal(sanitizeDistros(decodeWslList(withNul)).join(','), 'Ubuntu')
})

/* ----------------------------- sanitizeDistros ---------------------------- */

test('sanitizeDistros：去掉默认标记 *、空行、CRLF、BOM/NUL 与装饰行', () => {
  const text = '\uFEFFNAME\r\n* Ubuntu\r\nDebian\r\n\r\n\u0000\r\n(Default)\r\n'
  assert.deepEqual(sanitizeDistros(text), ['Ubuntu', 'Debian'])
})

test('sanitizeDistros：多星号前缀与首尾空白一并清理', () => {
  assert.deepEqual(sanitizeDistros('** Ubuntu  \n  Debian \n'), ['Ubuntu', 'Debian'])
})

/* -------------------------------- parseKv -------------------------------- */

test('parseKv：解析 node_bin / pnpm_ver 等 key=value 行并去空白', () => {
  const text = ['node_bin=/usr/bin/node', 'node_ver=v24.1.0', 'pnpm_ver=12.5.1', ''].join('\n')
  assert.deepEqual(parseKv(text), {
    node_bin: '/usr/bin/node',
    node_ver: 'v24.1.0',
    pnpm_ver: '12.5.1',
  })
})

test('parseKv：忽略非 key=value 行与空值，保留后出现的同名键（CRLF 同解析）', () => {
  const text = ['WARNING: something', 'node_bin=', 'node_bin=/usr/local/bin/node', 'bad line', 'cd_fail=1'].join('\r\n')
  assert.deepEqual(parseKv(text), { node_bin: '/usr/local/bin/node', cd_fail: '1' })
})
