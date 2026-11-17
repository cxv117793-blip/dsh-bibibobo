# dsh-bibibobo

> **用 bibibobo 的锯齿波小人声把回复念出来。**
> 不是录音，不是 TTS 模型 —— 一条锯齿波加两个带通滤波器，实时算出来的波形。

[![v0.1.0](https://img.shields.io/badge/release-v0.1.0-2ea44f)](https://github.com/cxv117793-blip/dsh-bibibobo/releases/latest)
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-4d6bfe)](https://github.com/cxv117793-blip/dsh-bibibobo#兼容性)
[![node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933)](https://github.com/cxv117793-blip/dsh-bibibobo#兼容性)
[![tests](https://img.shields.io/badge/tests-14%20groups%20green-brightgreen)](https://github.com/cxv117793-blip/dsh-bibibobo#开发)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**中文** ｜ [English summary](#english-summary)

长回复你不一定想逐字读。这个插件把 DSH 已完成的回复用「哔哔啵啵」的小人声念出来，
输入框工具栏里一个图标控制朗读、暂停、继续、结束。

四项核心行为由使用者在 Windows 桌面版逐项点验：点 🔊 有声、播放时图标变 ⏸、
点 ⏸ 能暂停、点 ⏹ 能停。规模数据我现在给不出准确数字，就不写。

![输入框工具栏里的朗读控件](docs/control.png)

---

## 30 秒看懂

| 你可能在想 | 实际情况 |
|---|---|
| 会不会调一次模型？ | **不会**。纯本地 DSP，零网络请求、零 API 调用、零 token |
| 会不会念到一半重来？ | **不会**。只读 `status === 'settled'` 的节点，流式内容不碰 |
| 模型正在输出时按钮会消失吗？ | **不会**。会从后往前找最近一条已完成的回复（最多看 8 条） |
| 会不会几段声音叠在一起？ | **不会**。单例 `<audio>`，新的一句先 `pause()` 旧的 |
| 播完了会不会一直停在 ⏸？ | **不会**。监听 `ended` 事件回到 idle |
| 会不会念 Markdown 符号？ | **不会**。代码块、链接地址、井号、列表符、强调记号先剥掉 |
| 很长的回复要念几分钟？ | **不会**。超过 1200 字截断 |
| 会不会念思维链？ | **不会**。只取 `kind === 'text'` 的块，reasoning 和 tool-call 跳过 |

## 安装

桌面版**不要**用 `dsh plugin --profile desktop` 直接改 profile —— 它由应用内的插件管理器独占。三选一：

1. **应用内安装**：`设置 → 插件 → 添加插件 → 从本地目录`，选这个仓库的根目录；
2. **命令行**（只对非 desktop 的 profile）：
   ```bash
   dsh plugin --profile <你的profile> add file:<这个仓库的绝对路径>
   ```
3. 直接用 [Releases](https://github.com/cxv117793-blip/dsh-bibibobo/releases/latest) 里的 `.tgz`。

装完开个新会话，输入框工具栏会出现 🔊 图标。

## 用

| 图标 | 作用 |
|---|---|
| 🔊 | 朗读最近一条已完成的回复 |
| ⏸ | 暂停，位置保留 |
| ▶ | 从暂停处接着播 |
| ⏹ | 立即停止并释放音频 |

朗读的永远是**最近一条已经完成的**回复。模型正在输出时，控件会向前找上一条已完成的回复，
所以按钮不会在回答过程中消失。

## 合成器来源（详细）

本插件的 `client.js` 中，从 `const TAU = Math.PI * 2` 到 `tool-row control` 注释之间的整段代码，
是 [bibibobo](https://github.com/hakihakii/bibibobo) 的 `bibibobo.js` 的**逐行内联副本**，
仅去掉 `export` 关键字以便打进浏览器模块。音频合成逻辑未作任何改动。

| 项 | 内容 |
|---|---|
| 仓库 | https://github.com/hakihakii/bibibobo |
| 作者 | [@hakihakii](https://github.com/hakihakii)（GitHub Organization） |
| 出处 | B 站 [哈基科技](https://space.bilibili.com/3707062397700195)《路墨小剧场》每期配乐脚本里的同一段代码 |
| 在线试玩 | https://hakihakii.github.io/bibibobo/ |
| 协议 | MIT |
| 引入时版本 | commit `3ac39a2`（2026-11-17，修复 iPhone 静音模式无声、连续点击从头播放） |

**声音是怎么来的**

1. 一条抗混叠锯齿波（polyBLEP）当声带；
2. 两个状态变量带通滤波器捏出口型，五种口型就是五对共振峰频率；
3. 一个汉字一声，一串英文或数字一声；每个字用哈希算出固定的音高和口型，所以**同一个字永远是同一声**；
4. 标点管语气：问号尾音上扬，感叹号整句升高，省略号整句压低。

两套声线都是上游自带的：大肥鱼（E5 G5 A5 B5 C6，共振峰 ×1.25，字头有小滑音）
和路墨（D4 E4 G4 A4，共振峰 ×0.9，句尾轻轻下落）。

**本插件额外做了什么**

上游只提供"文字 → 波形"这一个函数。本插件负责它周围的一切：从 DSH 的 Chat 节点取出已完成的回复、
剥离 Markdown、把 WAV 灌进 `<audio>`、以及播放状态机。合成器本身一行没改。

**一致性验证**

`test/synth.test.mjs` 会从 `client.js` 抽出这段源码，与上游 `bibibobo.js` 逐样本比对。
当前状态：fish 和 lumo 两套声线各测一段，样本数 98343 和 62622，`===` 全等。
上游若更新，跑这个测试就能发现漂移。

## 致谢

**[@hakihakii](https://github.com/hakihakii)** — 这个插件的全部声音都来自他写的 bibibobo。
在一个 98 行的文件里，他用一条锯齿波和两个滤波器做出了有性格的小人声，没有采样、没有模型、零依赖。
`hash(字)` 决定音高与口型这个设计尤其好：它让同一个字永远发出同一个声，
于是这门"语言"是可辨认的，而不是随机噪音。抗混叠用了 polyBLEP、软限幅用 `tanh` 而不是硬削，
这两处也显示出作者对声音本身的理解。

**KanbaraDYD** — 上游 `3ac39a2` 那次提交把播放方式从 `AudioContext` 改成 `<audio>` + WAV，
解决了 iPhone 静音模式下无声的问题。本插件沿用了这个方案（包括用 `playToken` 丢弃过期 `AbortError`
的处理），等于免费继承了他们踩过的坑。

**哈基科技 / 路墨小剧场** — 这套声音最初是为这部作品做的，插件只是把它换了个场合使用。

如果你喜欢这个声音，请去 [bibibobo 仓库](https://github.com/hakihakii/bibibobo) 点个 star，
或者去 [B 站](https://space.bilibili.com/3707062397700195) 看原作。这个插件的价值几乎全部来自上游。

## 已知边界

- 只读**纯文本**部分。带工具调用和思维链的回复，只念最终文字。
- 同一时间只能有一段朗读。点「朗读」会打断上一段，不会叠加。
- 暂停位置基于单个音频元素；切换会话会重新开始。
- 中文以外按「一串英文算一声」处理，长单词整串读成一个音节。
- 不做自动朗读，需要手动点。

## 开发

```bash
node test/synth.test.mjs    # 合成器、WAV 头、Markdown 清洗、节点提取，共 14 项
node tools/build.mjs        # 把源码同步到 lib/（发布用）
node tools/pack.mjs         # 生成 dsh-bibibobo.tgz（GitHub Release 用）
npm test                    # 等价于跑测试
```

插件用 `link:` 方式安装时，改源文件刷新页面即生效，不需要重装。

## 兼容性

| 项 | 要求 |
|---|---|
| DeepSeek Harness | ≥ 0.2.0-rc.2（实测 0.2.1-rc.2） |
| Node | `^22.19.0` 或 `>=24.0.0` |
| 平台 | 桌面版 Web UI；浏览器需支持 `Audio` 与 `URL.createObjectURL` |

## 实测数据

朗读路径的四项行为由使用者在 Windows 桌面版逐项点验：

| 项目 | 结果 |
|---|---|
| 点 🔊 出声 | ✅ |
| 播放时图标变 ⏸ | ✅ |
| 点 ⏸ 能暂停 | ✅ |
| 点 ⏹ 能停止 | ✅ |

合成器正确性由 14 项自动化测试覆盖，其中包含与上游逐样本比对。

## 协议

MIT。合成器来自 bibibobo（作者 hakihakii，MIT），本插件同样 MIT。
原始版权声明与第三方署名见 [LICENSE](LICENSE)。

---

## English summary

Speaks settled DSH replies aloud with the [bibibobo](https://github.com/hakihakii/bibibobo)
synthesizer — one sawtooth wave and two band-pass filters, no samples and no TTS model.
A compact control in the composer toolbar provides speak, pause, resume and stop.
Only completed replies are read, so streaming text never restarts mid-sentence; while a
reply is still streaming the control falls back to the previous finished one.

The synthesizer is an unmodified inline copy of bibibobo by
[@hakihakii](https://github.com/hakihakii) (MIT), verified sample-for-sample against
upstream by `test/synth.test.mjs`. Everything else here — reading the Chat node,
stripping Markdown, driving the `<audio>` element and the playback state machine — is
this plugin. All credit for the voice belongs upstream; please star
[bibibobo](https://github.com/hakihakii/bibibobo) if you like it.
