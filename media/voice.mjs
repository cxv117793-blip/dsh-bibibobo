// 用 bibibobo 合成器生成宣传片旁白，并对齐幕长。
// 幕长 = 旁白长度 + 留白，这样节奏不会被拖慢。
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs'
import {SCENES} from './scenes.mjs'

const src = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const s = src.indexOf('const TAU = Math.PI * 2')
const e = src.indexOf('/* ───────────────────────── message action row ───────────────────────── */')
if (s < 0 || e < 0) throw new Error('找不到合成器源码段')
const {synth, toWav} = new Function(src.slice(s, e) + '\nreturn {synth, toWav}')()

const SR = 44100
const LEAD = 0.55   // 每幕开头留白，让画面先立住
const TAIL = 0.85   // 幕尾留白，给转场
mkdirSync(new URL('./out', import.meta.url), {recursive: true})

const plan = []
for (const scene of SCENES) {
  const speech = synth(scene.nar, {voice: 'fish', step: 0.125, gap: 0.2})
  const speechSec = speech.length / SR
  const dur = LEAD + speechSec + TAIL
  const frames = Math.round(dur * 30) / 30          // 对齐到 30fps 帧边界
  const total = Math.round(frames * SR)
  const buf = new Float32Array(total)
  buf.set(speech.subarray(0, Math.min(speech.length, total - Math.round(LEAD * SR))), Math.round(LEAD * SR))
  writeFileSync(new URL(`./out/${scene.id}.wav`, import.meta.url), toWav(buf))
  plan.push({...scene, dur: frames, speechSec})
  console.log(`${scene.id.padEnd(9)} 旁白 ${speechSec.toFixed(2)}s → 幕长 ${frames.toFixed(2)}s`)
}

const total = plan.reduce((n, p) => n + p.dur, 0)
writeFileSync(new URL('./out/plan.json', import.meta.url), JSON.stringify({lead: LEAD, tail: TAIL, fps: 30, total, scenes: plan}, null, 2))
console.log('\n总时长:', total.toFixed(2), 's')
