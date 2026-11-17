// 代码围栏与真实 Markdown 组合的断言测试。
import {readFileSync} from 'node:fs'
import {strict as assert} from 'node:assert'

const src = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const s = src.indexOf('const TAU = Math.PI * 2')
const e = src.indexOf('/* ───────────────────────── message action row ───────────────────────── */')
assert.ok(s >= 0 && e > s, '找不到源码段')
const m = new Function(src.slice(s, e) + '\nreturn {speakable}')()
const F = '```'
const T = '~~~'

let passed = 0
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); passed++ }
  catch (err) { console.error('  FAIL ' + name + '\n       ' + err.message); process.exitCode = 1 }
}

console.log('dsh-bibibobo 围栏与真实排版\n')

test('行首未闭合围栏：整段都是代码，返回空', () => {
  assert.equal(m.speakable(`${F}js\nconst a = 1`), '')
})

test('未闭合围栏前有文字：只保留前文', () => {
  assert.equal(m.speakable(`前文\n${F}js\ncode`), '前文')
})

test('已闭合围栏：两侧文字都保留', () => {
  assert.equal(m.speakable(`前文\n${F}js\ncode\n${F}\n后文`), '前文 后文')
})

test('波浪号围栏同样处理', () => {
  assert.equal(m.speakable(`前文\n${T}\ncode\n${T}\n后文`), '前文 后文')
})

test('带语言标签的围栏不留标签', () => {
  assert.equal(m.speakable(`${F}python\nprint(1)\n${F}`), '')
})

test('正文里单独的反引号不误伤整段', () => {
  const r = m.speakable('用 a`b 连接')
  assert.ok(r.includes('a'), '正文不应被吞: ' + JSON.stringify(r))
})

console.log('\n真实排版组合\n')

test('代码块夹在文字中间', () => {
  const r = m.speakable(`我先看一下配置。\n\n${F}js\nconst a = 1\n${F}\n\n然后执行。`)
  assert.equal(r, '我先看一下配置。 然后执行。')
})

test('表格拍平成一行且无竖线', () => {
  const r = m.speakable('对比如下：\n\n| 项目 | 值 |\n|---|---|\n| 数量 | 3 |\n\n以上。')
  assert.ok(!r.includes('|'), '残留竖线: ' + JSON.stringify(r))
  assert.ok(r.includes('项目') && r.includes('数量'), '内容丢失')
})

test('链接与粗体混排', () => {
  assert.equal(m.speakable('详见 [官方文档](https://a.b)，注意 **重要** 部分。'), '详见 官方文档，注意 重要 部分。')
})

test('HTML 与行内代码混排，标点前不留空格', () => {
  const r = m.speakable('结果是 <strong>成功</strong>，用 `npm i` 装。')
  assert.ok(!/ [，。]/.test(r), '标点前有空格: ' + JSON.stringify(r))
  assert.ok(r.includes('成功'))
})

console.log('\n' + (process.exitCode ? '存在失败用例' : `全部通过（${passed} 项）`))
