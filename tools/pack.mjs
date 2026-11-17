// 生成可挂到 GitHub Release 的 .tgz。
//
// 规格与 dsh-step-pause 一致：Release 里同时提供两个名字相同的附件——
// dsh-bibibobo.tgz（固定名，给 market 的 tarball 字段用）和
// dsh-bibibobo-<version>.tgz（带版本号，便于回溯）。
// 内容一致，只是一个用固定名方便「latest」链接永远指向最新。
//
// 依赖 npm pack 生成 tarball，再复制成固定名。不引入任何第三方打包库。
//
// 用法：node tools/pack.mjs
import {execFileSync} from 'node:child_process'
import {readFileSync, copyFileSync, rmSync, existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rel = (p) => join(root, p)

const pkg = JSON.parse(readFileSync(rel('package.json'), 'utf8'))
const versioned = `${pkg.name}-${pkg.version}.tgz`
const fixed = `${pkg.name}.tgz`

// lib/ 必须存在且比源码新，否则打出来的包会是旧的。
if (!existsSync(rel('lib/index.js')) || !existsSync(rel('lib/client.js'))) {
  console.error('lib/ 不完整，先运行 node tools/build.mjs')
  process.exit(1)
}

console.log('npm pack …')
// Windows 上 npm 是 .cmd 包装器，execFile 直接叫 "npm" 会 ENOENT。
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const out = execFileSync(npm, ['pack', '--silent'], {
  cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
}).trim()
const produced = out.split(/\r?\n/).filter(Boolean).pop()
if (!produced || !existsSync(rel(produced))) {
  console.error('npm pack 未产出 tarball：', out)
  process.exit(1)
}

if (produced !== versioned) {
  if (existsSync(rel(versioned))) rmSync(rel(versioned))
  copyFileSync(rel(produced), rel(versioned))
  rmSync(rel(produced))
}
copyFileSync(rel(versioned), rel(fixed))

console.log(`  ${versioned}`)
console.log(`  ${fixed}`)
console.log('可直接上传到 GitHub Release')
