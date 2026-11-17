// 状态机测试：用假的 Audio/URL 验证暂停、结束、播放结束、连点、重播。
// 断言失败会让进程以非 0 退出，可供 CI 使用。
import {readFileSync} from 'node:fs'
import {strict as assert} from 'node:assert'

const src = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const s = src.indexOf('const TAU = Math.PI * 2')
const e = src.indexOf('/* ───────────────────────── message action row ───────────────────────── */')
assert.ok(s >= 0 && e > s, '在 client.js 中找不到播放器源码段')
const body = src.slice(s, e)

function makeHarness() {
  const urls = []
  let counter = 0
  class FakeAudio {
    constructor() {
      this.paused = true
      this.currentTime = 0
      this.duration = 10
      this.src = null
      this.listeners = new Map()
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type).add(fn)
    }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn) }
    fire(type) { for (const fn of this.listeners.get(type) ?? []) fn() }
    pause() { this.paused = true }
    play() { this.paused = false; return Promise.resolve() }
  }
  const URLfake = {
    createObjectURL() { counter++; const u = 'blob:' + counter; urls.push(u); return u },
    revokeObjectURL(u) { const i = urls.indexOf(u); if (i >= 0) urls.splice(i, 1) },
  }
  const Blobfake = function () {}
  const factory = new Function('Audio', 'URL', 'Blob', `
    ${body}
    return {speak, stop, toggle, onEnded, getState: () => state, getUrl: () => objectUrl}
  `)
  return {api: factory(FakeAudio, URLfake, Blobfake), urls}
}

let passed = 0
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); passed++ }
  catch (err) { console.error('  FAIL ' + name + '\n       ' + err.message); process.exitCode = 1 }
}

console.log('dsh-bibibobo 播放状态机\n')

test('speak 进入 playing 并创建 URL', () => {
  const h = makeHarness()
  h.api.speak('你好世界', 'k1')
  assert.equal(h.api.getState(), 'playing')
  assert.equal(h.urls.length, 1)
})

test('播放结束回到 idle 并释放 URL', () => {
  const h = makeHarness()
  h.api.speak('你好世界', 'k2')
  h.api.onEnded()
  assert.equal(h.api.getState(), 'idle')
  assert.equal(h.api.getUrl(), null, 'URL 应被清空')
  assert.equal(h.urls.length, 0, 'blob 应被释放')
})

test('暂停与继续切换状态，URL 保持不变', () => {
  const h = makeHarness()
  h.api.speak('你好世界', 'k3')
  const url = h.api.getUrl()
  h.api.toggle()
  assert.equal(h.api.getState(), 'paused')
  assert.equal(h.api.getUrl(), url, '暂停不应重建 URL')
  h.api.toggle()
  assert.equal(h.api.getState(), 'playing')
})

test('stop 释放 URL，且允许同一句重播', () => {
  const h = makeHarness()
  h.api.speak('重播测试', 'r')
  h.api.stop()
  assert.equal(h.api.getState(), 'idle')
  assert.equal(h.urls.length, 0)
  h.api.speak('重播测试', 'r')
  assert.equal(h.api.getState(), 'playing', '停止后应能重播')
  assert.equal(h.urls.length, 1)
})

test('连续 speak 只保留一个存活 URL', () => {
  const h = makeHarness()
  h.api.speak('第一段', 'a')
  h.api.speak('第二段', 'b')
  assert.equal(h.urls.length, 1, '旧 URL 应被释放')
  assert.equal(h.api.getState(), 'playing')
})

test('空文本与纯代码不创建 URL', () => {
  const h = makeHarness()
  h.api.speak('   ', 'empty')
  h.api.speak('```js\ncode\n```', 'codeonly')
  assert.equal(h.urls.length, 0, '没有可念内容时不应创建音频')
  assert.equal(h.api.getState(), 'idle')
})

test('idle 时 onEnded 是空操作', () => {
  const h = makeHarness()
  h.api.onEnded()
  assert.equal(h.api.getState(), 'idle')
})

console.log('\n' + (process.exitCode ? '存在失败用例' : `全部通过（${passed} 项）`))
