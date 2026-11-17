// 合成器回归测试：保证 client.js 内联的合成器与上游 bibibobo 逐样本一致。
//
// client.js 是浏览器模块（依赖 window.__ModuleLoader__），无法直接 import。
// 这里抽取其中的合成器源码段，在 Node 里执行后与参考实现比对。
//
// 参考实现来自 https://github.com/hakihakii/bibibobo 的 bibibobo.js（MIT）。
// 运行：node test/synth.test.mjs
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {strict as assert} from 'node:assert'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const src = readFileSync(join(root, 'client.js'), 'utf8')

const startMark = 'const TAU = Math.PI * 2'
const endMark = '/* ───────────────────────── tool-row control ───────────────────────── */'
const start = src.indexOf(startMark)
const end = src.indexOf(endMark)
assert.ok(start >= 0 && end > start, '在 client.js 中找不到合成器源码段')

const build = new Function(
  src.slice(start, end) + '\nreturn {synth, toWav, speakable, nodeText, hash, VOICES, VOWELS};',
)
const m = build()

let passed = 0
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); passed++ }
  catch (error) { console.error('  FAIL ' + name + '\n       ' + error.message); process.exitCode = 1 }
}

console.log('dsh-bibibobo 合成器测试\n')

test('合成产生非空样本且落在 [-1, 1]', () => {
  const samples = m.synth('今天吃白饭？没饭了！')
  assert.ok(samples.length > 0, '样本为空')
  for (const v of samples) assert.ok(Number.isFinite(v) && Math.abs(v) <= 1, '样本越界或不有限')
})

test('峰值不超过软限幅上限', () => {
  let peak = 0
  for (const v of m.synth('真没饭了！……')) peak = Math.max(peak, Math.abs(v))
  assert.ok(peak > 0.1, '信号过弱，可能未合成')
  assert.ok(peak <= 1, '峰值超过 1')
})

test('WAV 头合法', () => {
  const wav = m.toWav(m.synth('测试'))
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
  const tag = (o) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3))
  assert.equal(tag(0), 'RIFF')
  assert.equal(tag(8), 'WAVE')
  assert.equal(tag(12), 'fmt ')
  assert.equal(tag(36), 'data')
  assert.equal(view.getUint16(22, true), 1, '应为单声道')
  assert.equal(view.getUint32(24, true), 44100, '采样率应为 44100')
  assert.equal(view.getUint16(34, true), 16, '位深应为 16')
  assert.equal(view.getUint32(40, true), wav.length - 44, 'data 长度字段不符')
})

test('同一个字永远同一声（确定性）', () => {
  const a = m.synth('啊', {voice: 'fish', step: 0.5})
  const b = m.synth('啊', {voice: 'fish', step: 0.5})
  assert.equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) assert.equal(a[i], b[i], `第 ${i} 个样本不一致`)
})

test('两套声线产出不同波形', () => {
  const fish = m.synth('你好', {voice: 'fish'})
  const lumo = m.synth('你好', {voice: 'lumo'})
  assert.notEqual(fish.length, lumo.length, '声线长度相同，可能未生效')
})

test('空输入不抛错', () => {
  for (const input of ['', '   ', '。。。', '😀']) {
    const samples = m.synth(input)
    assert.ok(samples instanceof Float32Array, '应返回 Float32Array')
  }
})

console.log('\nmarkdown 清洗\n')

test('剥掉代码块与行内代码', () => {
  assert.equal(m.speakable('```js\nconst a = 1\n```\n正文'), '正文')
  assert.equal(m.speakable('`code` 后面'), '后面')
})

test('链接保留文字、丢掉地址', () => {
  assert.equal(m.speakable('见 [文档](https://a.b/c)'), '见 文档')
})

test('剥掉图片、标题、引用、列表与强调记号', () => {
  assert.equal(m.speakable('![图](x.png)'), '')
  assert.equal(m.speakable('# 标题'), '标题')
  assert.equal(m.speakable('> 引用'), '引用')
  assert.equal(m.speakable('- 一\n- 二'), '一 二')
  assert.equal(m.speakable('**粗**和*斜*'), '粗和斜')
})

test('保留数字与斜杠等正文符号', () => {
  assert.equal(m.speakable('A/B.C 和 3.14'), 'A/B.C 和 3.14')
})

test('超长文本截断到 1200 字', () => {
  assert.ok(m.speakable('字'.repeat(3000)).length <= 1200)
})

console.log('\n节点文本提取\n')

test('只取 settled 状态的 text 块', () => {
  const node = {kind: 'assistant-step', data: {status: 'settled', blocks: [{kind: 'text', text: '甲'}, {kind: 'text', text: '乙'}]}}
  assert.equal(m.nodeText(node), '甲\n\n乙')
})

test('流式中、纯 reasoning、纯 tool-call 都不读', () => {
  assert.equal(m.nodeText({kind: 'assistant-step', data: {status: 'running', blocks: [{kind: 'text', text: 'a'}]}}), null)
  assert.equal(m.nodeText({kind: 'assistant-step', data: {status: 'settled', blocks: [{kind: 'reasoning', text: 'a'}]}}), null)
  assert.equal(m.nodeText({kind: 'assistant-step', data: {status: 'settled', blocks: [{kind: 'tool-call', name: 'x'}]}}), null)
})

test('非 assistant 节点与空值返回 null', () => {
  assert.equal(m.nodeText({kind: 'user-message', data: {}}), null)
  assert.equal(m.nodeText(null), null)
  assert.equal(m.nodeText(undefined), null)
})

console.log('\n' + (process.exitCode ? '存在失败用例' : `全部通过（${passed} 项）`))
