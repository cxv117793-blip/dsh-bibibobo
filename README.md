# dsh-bibibobo

> **用 bibibobo 的锯齿波小人声把回复念出来。**
> 不是录音，不是 TTS 模型 —— 一条锯齿波加两个带通滤波器，实时算出来的波形。

[![v0.1.0](https://img.shields.io/badge/release-v0.1.0-2ea44f)](https://github.com/cxv117793-blip/dsh-bibibobo/releases/latest)
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-4d6bfe)](https://github.com/cxv117793-blip/dsh-bibibobo#兼容性)
[![node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933)](https://github.com/cxv117793-blip/dsh-bibibobo#兼容性)
[![tests](https://img.shields.io/badge/tests-58%20checks%20green-brightgreen)](https://github.com/cxv117793-blip/dsh-bibibobo#开发)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**中文** ｜ [English summary](#english-summary)

长回复你不一定想逐字读。这个插件把 DSH 的回复用「哔哔啵啵」的小人声念出来，
控件就长在**回答自己下面那排按钮里**——和「复制 / 好的回复 / 有问题的回复 /
在上下文视图中查看此轮 / 在新对话中分支」并排。

播放时有**字幕**跟着滚、**进度条**显示念到哪；可暂停、继续、结束。

四项核心行为由使用者在 Windows 桌面版逐项点验：点 🔊 有声、播放时图标变 ⏸、
点 ⏸ 能暂停、点 ⏹ 能停。

---

## 30 秒看懂

| 你可能在想 | 实际情况 |
|---|---|
| 控件在哪？ | 每条回答下方那排按钮里，与「复制」「好的回复」同排 |
| 念哪一段？ | **该轮的收尾回复**。多步回答（工具调用后继续说话）只念最后那段 |
| 历史回答能念吗？ | **能**。每一轮都有自己的朗读按钮，点哪轮念哪轮 |
| 会不会调一次模型？ | **不会**。纯本地 DSP，零网络请求、零 API 调用、零 token |
| 会不会念到一半重来？ | **不会**。只读 `status === 'settled'` 的节点，流式内容不碰 |
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

装完开个新会话，每条回答下面会多出 🔊。

## 用

| 图标 | 作用 |
|---|---|
| 🔊 | 朗读这一轮的收尾回复 |
| ⏸ | 暂停，位置保留 |
| ▶ | 从暂停处接着播 |
| ⏹ | 立即停止并释放音频 |

播放时右侧会多出两样东西：

- **进度条**：6em 宽、0.25em 高的细条，随播放推进，带 `role="progressbar"`
- **字幕**：60 字窗口，随进度滚动，两端按需加 `…`

两者只在播放/暂停时出现，idle 时不占位。尺寸是按「不把这排宿主按钮挤走」定的：
进度条约 3 个汉字宽，字幕最大宽 24em。

## 念的是哪一段

不是简单地念「最新一条回复」，而是沿用宿主自己的判定：

```js
// dsh-client-ui-chat 的 turn-tail 定义
const closing = finalized.findLast(hasText) ?? null
```

即**该轮最后一个真正有文字的 assistant 节点**。DSH 自己也用这个 `closing`
决定「在新对话中分支」是否可用。

所以：

- 一轮里只有一条回复 → 念它
- 一轮里工具调用后又继续说话 → 只念最后那段收尾文字，中间步骤不念
- 中间步骤的 `messageId` 不等于任何 `closing`，它们的按钮不渲染

每个 `closed` 轮次都会保留自己的按钮，历史回答照样能点。

## 合成器来源（详细）

本插件的 `client.js` 中，从 `const TAU = Math.PI * 2` 到
`message action row` 注释之间的整段代码，
是 [bibibobo](https://github.com/hakihakii/bibibobo) 的 `bibibobo.js` 的**逐行内联副本**，
仅去掉 `export` 关键字以便打进浏览器模块。音频合成逻辑未作任何改动。

| 项 | 内容 |
|---|---|
| 仓库 | https://github.com/hakihakii/bibibobo |
| 声音的最初出处 | B 站 [哈基科技](https://space.bilibili.com/3707062397700195)《路墨小剧场》每期配乐脚本里的那段声音 |
| 写成代码 | `soraincloud`（首次提交 `af11592`，2026-11-15） |
| 播放方式修复 | `KanbaraDYD`（提交 `3ac39a2`，把 `AudioContext` 换成 `<audio>` + WAV） |
| 仓库托管 | [@hakihakii](https://github.com/hakihakii)（GitHub Organization，不是个人账号） |
| 在线试玩 | https://hakihakii.github.io/bibibobo/ |
| 协议 | MIT |
| 引入时版本 | commit `3ac39a2`（2026-11-17，修复 iPhone 静音模式无声、连续点击从头播放） |

> 说明：`hakihakii` 是组织账号，代码的实际作者是 `soraincloud`；
> 声音本身来自哈基科技的《路墨小剧场》。这三者是不同的角色，本表按可查证的提交记录分列，
> 不推断账号背后的真实身份。

**声音是怎么来的**

1. 一条抗混叠锯齿波（polyBLEP）当声带；
2. 两个状态变量带通滤波器捏出口型，五种口型就是五对共振峰频率；
3. 一个汉字一声，一串英文或数字一声；每个字用哈希算出固定的音高和口型，所以**同一个字永远是同一声**；
4. 标点管语气：问号尾音上扬，感叹号整句升高，省略号整句压低。

两套声线都是上游自带的：大肥鱼（E5 G5 A5 B5 C6，共振峰 ×1.25，字头有小滑音）
和路墨（D4 E4 G4 A4，共振峰 ×0.9，句尾轻轻下落）。

**本插件额外做了什么**

上游只提供「文字 → 波形」这一个函数。本插件负责它周围的一切：在回答操作行里
定位到该轮的收尾回复、剥离 Markdown、把 WAV 灌进 `<audio>`、字幕与进度条的
进度映射、以及播放状态机。合成器本身一行没改。

**一致性验证**

`test/synth.test.mjs` 会从 `client.js` 抽出这段源码，与上游 `bibibobo.js` 逐样本比对。
当前状态：fish 和 lumo 两套声线各测一段，样本数 98343 和 62622，`===` 全等。
上游若更新，跑这个测试就能发现漂移。

## 致谢

**哈基科技 / 路墨小剧场** — 这套声音最初是为这部作品做的。合成器里那些参数
（五对共振峰、两组音阶、按标点改语气）都可以追溯到这部作品的配乐脚本。
插件只是把这个声音换了个场合使用。

**soraincloud** — 把那段配乐里的声音写成了可以调用的库 `bibibobo.js`。
在一个不到一百行的文件里，用一条锯齿波和两个滤波器做出了有性格的小人声，
没有采样、没有模型、零依赖。`hash(字)` 决定音高与口型这个设计尤其好：
它让同一个字永远发出同一个声，于是这门「语言」是可辨认的，而不是随机噪音。
抗混叠用了 polyBLEP、软限幅用 `tanh` 而不是硬削，这两处也显示出作者对声音本身的理解。

**KanbaraDYD** — 上游 `3ac39a2` 那次提交把播放方式从 `AudioContext` 改成 `<audio>` + WAV，
解决了 iPhone 静音模式下无声的问题。本插件沿用了这个方案（包括用 `playToken` 丢弃过期 `AbortError`
的处理），等于免费继承了他们踩过的坑。

**hakihakii** — 托管这个项目的 GitHub 组织。请注意它是组织账号，不是某一位作者的个人账号。

如果你喜欢这个声音，请去 [bibibobo 仓库](https://github.com/hakihakii/bibibobo) 点个 star，
或者去 [B 站](https://space.bilibili.com/3707062397700195) 看原作。这个插件的价值几乎全部来自上游。

## 已知边界

- 只读**纯文本**部分。带工具调用和思维链的回复，只念最终文字。
- 同一时间只能有一段朗读。点任何一处的 🔊 都会打断上一段，不会叠加。
- 暂停位置绑定在单个音频元素上；切换到另一轮的朗读会重新开始。
- 中文以外按「一串英文算一声」处理，长单词整串读成一个音节。
- 不做自动朗读，需要手动点。

## 开发

```bash
npm test                    # 58 项：合成器、Markdown、围栏、字幕、播放状态机、组件契约
node tools/build.mjs        # 把源码同步到 lib/（发布用）
node tools/pack.mjs         # 生成 dsh-bibibobo.tgz（GitHub Release 用）
npm test                    # 等价于跑测试
```

插件用 `link:` 方式安装时，改源文件刷新页面即生效，不需要重装。

⚠️ 改了 `package.json` 的 `name` 之后，**必须同步改 `client.js` 里
`window.__ModuleLoader__.load({ id })`**。两者不一致时加载器会拒绝注册，
现象是控制台报 `does not register <name>`、插件在界面里完全不出现。

## 兼容性

| 项 | 要求 |
|---|---|
| DeepSeek Harness | ≥ 0.2.0-rc.2（实测 0.2.1-rc.2） |
| Node | `^22.19.0` 或 `>=24.0.0` |
| 平台 | 桌面版 Web UI；浏览器需支持 `Audio` 与 `URL.createObjectURL` |

## 协议

MIT。合成器来自 bibibobo（代码由 soraincloud 写成，声音出自哈基科技《路墨小剧场》，项目由 hakihakii 组织托管，均为 MIT），本插件同样 MIT。
原始版权声明与第三方署名见 [LICENSE](LICENSE)。

---

## English summary

Speaks DSH replies aloud with the [bibibobo](https://github.com/hakihakii/bibibobo)
synthesizer — one sawtooth wave and two band-pass filters, no samples and no TTS model.

The control lives in the answer's own action row, beside Copy / Good / Bad / Open this
turn in context / Branch into a new conversation. While playing it also shows a
progress bar and a scrolling subtitle. Speak, pause, resume and stop are all available.

Each turn gets its own control, including past turns, but a control only reads that
turn's **closing reply** — the last assistant node with text, which is the same
`closing` fact the host uses to gate «branch in a new conversation». Intermediate
steps of a multi-step answer render no control.

The synthesizer is an unmodified inline copy of bibibobo (MIT): the code was
written by `soraincloud`, the sound itself originates from the Bilibili series
《路墨小剧场》 by channel 哈基科技, and the project is hosted by the
[hakihakii](https://github.com/hakihakii) organization. Verified sample-for-sample against
upstream by `test/synth.test.mjs`. Everything else here — locating the closing reply,
stripping Markdown, driving the `<audio>` element, the subtitle and progress mapping,
and the playback state machine — is this plugin. All credit for the voice belongs
upstream; please star [bibibobo](https://github.com/hakihakii/bibibobo) if you like it.
