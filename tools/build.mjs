// 把仓库根的源码同步到 lib/，供 npm 与 GitHub Release 分发。
//
// 规格与 dsh-step-pause 一致：根目录放源码，lib/ 放可直接分发的产物。
// 两条安装路径都要能用——从本地目录安装读根目录，从 .tgz 安装读 lib/。
// 因此这里只做原样复制，不做任何代码变换，保证两边永远一致。
//
// 用法：node tools/build.mjs
import {readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rel = (p) => join(root, p)

const files = ['client.js', 'index.js']

mkdirSync(rel('lib'), {recursive: true})

for (const name of files) {
  copyFileSync(rel(name), rel(join('lib', name)))
  console.log(`  ${name} → lib/${name}`)
}

// 记录构建时间与源码指纹，便于确认 lib/ 与源码同源。
const stamp = new Date().toISOString()
const lines = [`built from repository sources at ${stamp}`, '']
for (const name of files) {
  const text = readFileSync(rel(name), 'utf8')
  lines.push(`${name}: ${text.length} chars`)
}
writeFileSync(rel('lib/BUILD.txt'), lines.join('\n') + '\n', 'utf8')
console.log(`  BUILD.txt (${stamp})`)
console.log('lib/ 已更新')
