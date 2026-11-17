// 组件层推理审计：不改代码，检查多实例共享 player 时的行为正确性。
// 重点：每个回答下方都有自己的控件，但 player 是全局单例。
import {readFileSync} from 'node:fs'

const src = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

const checks = []
const check = (name, ok, detail) => checks.push({name, ok, detail})

// 1. listeners 是 Set，多实例订阅彼此独立
check('listeners 用 Set 且每实例自加自删',
  /const listeners = new Set\(\)/.test(src)
  && /listeners\.add\(fn\)/.test(src)
  && /listeners\.delete\(fn\)/.test(src),
  '多控件不会互相覆盖 setLive')

// 2. ended 监听在每实例挂载/卸载
check('ended 监听有 add + remove',
  /addEventListener\('ended', onEnded\)/.test(src)
  && /removeEventListener\('ended', onEnded\)/.test(src),
  '卸载后不残留')

// 3. timeupdate 监听有清理
check('timeupdate/loadedmetadata 有配对清理',
  /addEventListener\('timeupdate', sync\)/.test(src)
  && /removeEventListener\('timeupdate', sync\)/.test(src),
  '避免每次 state 变化堆积监听')

// 4. 字幕只在播放态显示
check('idle 时不渲染字幕与进度条',
  /live === 'idle' \? null : h\('div'/.test(src),
  '不占位')

// 5. 点击用的是本条 text，而非全局缓存
check('点击时传入本条 text',
  /speak\(text, props\.messageId\)/.test(src),
  '不会念错到别的回答')

// 6. 定位用 messageId 而非最新节点
check('按 messageId 定位而非取最新',
  /props\.messageId/.test(src) && !/useNewestReply/.test(src),
  '历史轮次也能正确对上')

// 7. 选择器返回原始值（只检查 useChat 回调内的 return 语句本身）
const selectorBody = src.slice(
  src.indexOf('return useChat((chat) => {'),
  src.indexOf('function SpeakControl'),
)
const objectReturns = [...selectorBody.matchAll(/return\s*\{/g)].length
check('useChat 选择器返回原始值而非新对象',
  objectReturns === 0,
  objectReturns === 0 ? '只 return string/null' : `${objectReturns} 处返回新对象`)

// 8. 模块 id 与包名一致
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const idMatch = src.match(/__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)
check('__ModuleLoader__ id === package.name',
  idMatch && idMatch[1] === pkg.name,
  `id=${idMatch?.[1]} name=${pkg.name}`)

// 9. 注册的 slot 与声明的 name 一致
const injectSlot = src.match(/slots\.inject\('([^']+)'/)
const registerName = src.match(/name:\s*'([^']+)',\s*\n\s*id:/)
check('slots.inject 与 register.name 一致',
  injectSlot && registerName && injectSlot[1] === registerName[1],
  `${injectSlot?.[1]} vs ${registerName?.[1]}`)

// 10. 无 console.log 残留
check('无调试输出残留',
  !/console\.log/.test(src),
  '')

const out = []
for (const c of checks) {
  out.push(`${c.ok ? '  ok  ' : '  FAIL'} ${c.name}${c.detail ? '  — ' + c.detail : ''}`)
}
const failed = checks.filter(c => !c.ok).length
out.push('')
out.push(failed === 0 ? `全部通过（${checks.length} 项）` : `${failed} 项失败，共 ${checks.length} 项`)
console.log(out.join('\n'))
