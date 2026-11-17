# 哔哔啵啵朗读（dsh-bibibobo）

用 [bibibobo](https://github.com/hakihakii/bibibobo) 的锯齿波小人声，把 DeepSeek Harness 的回复念出来。可以随时暂停、继续、结束。

不是录音，不是 TTS 模型，是浏览器里实时算出来的波形——一条锯齿波加两个带通滤波器。

> **这个插件站在别人的肩膀上。** 全部声音都来自 [@hakihakii](https://github.com/hakihakii) 的 [bibibobo](https://github.com/hakihakii/bibibobo)，那是 B 站 [哈基科技](https://space.bilibili.com/3707062397700195)《路墨小剧场》里大肥鱼和路墨的说话声。详见下面[致谢](#致谢)一节。

## 装

```bash
# 从本仓库目录安装
dsh plugin --profile desktop install https://github.com/cxv117793-blip/dsh-bibibobo
```

也可以在 **Plugins → Add plugin** 里粘贴仓库地址。

装完开个新会话，输入框工具栏会多出一个 🔊 图标。

## 用

| 图标 | 作用 |
|---|---|
| 🔊 | 把最近一条已完成的回复念出来 |
| ⏸ | 暂停，位置保留 |
| ▶ | 从暂停处接着播 |
| ⏹ | 立即停止并释放音频 |

朗读的永远是**最近一条已经完成的**回复。流式输出中的内容不会被读——边生成边读会让同一句话反复中断重来。模型正在输出时，控件会向前找上一条已完成的回复。

## 合成器来源（详细）

本插件的 `client.js` 中，从 `const TAU = Math.PI * 2` 到 `tool-row control` 注释之间的整段代码，是 [bibibobo](https://github.com/hakihakii/bibibobo) 的 `bibibobo.js` 的**逐行内联副本**，仅去掉了 `export` 关键字以便打进浏览器模块。音频合成逻辑未作任何改动。

**上游项目**

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

两套声线都是上游自带的：大肥鱼（E5 G5 A5 B5 C6，共振峰 ×1.25，字头有小滑音）和路墨（D4 E4 G4 A4，共振峰 ×0.9，句尾轻轻下落）。

**本插件额外做了什么**

上游只提供"文字 → 波形"这一个函数。本插件负责的是它周围的一切：从 DSH 的 Chat 节点里取出已完成的回复、剥离 Markdown、把 WAV 灌进 `<audio>`、以及播放状态机。合成器本身一行没改。

**验证一致性**

`test/synth.test.mjs` 会从 `client.js` 抽出这段源码，与上游 `bibibobo.js` 逐样本比对。当前状态：fish 和 lumo 两套声线各测一段，样本数 98343 和 62622，`===` 全等。上游若更新，跑这个测试就能发现漂移。

## 致谢

**[@hakihakii](https://github.com/hakihakii)** — 这个插件的全部声音都来自他写的 bibibobo。在一个 98 行的文件里，他用一条锯齿波和两个滤波器做出了有性格的小人声，没有采样、没有模型、零依赖。`hash(字)` 决定音高与口型这个设计尤其好：它让同一个字永远发出同一个声，于是这门"语言"是可辨认的，而不是随机噪音。抗混叠用了 polyBLEP、软限幅用 `tanh` 而不是硬削，这两处也显示出作者对声音本身的理解。

**KanbaraDYD** — 上游 `3ac39a2` 那次提交把播放方式从 `AudioContext` 改成 `<audio>` + WAV，解决了 iPhone 静音模式下无声的问题。本插件沿用了这个方案（包括用 `playToken` 丢弃过期 `AbortError` 的处理），等于免费继承了他们踩过的坑。

**哈基科技 / 路墨小剧场** — 这套声音最初是为这部作品做的，插件只是把它换了个场合使用。

如果你喜欢这个声音，请去 [bibibobo 仓库](https://github.com/hakihakii/bibibobo) 点个 star，或者去 [B 站](https://space.bilibili.com/3707062397700195) 看原作。这个插件的价值几乎全部来自上游。

## 朗读前会清掉的 Markdown

代码块、行内代码、图片、链接地址、标题井号、引用符号、列表符号、强调记号都会被去掉，只留能念的文字。链接保留文字、丢掉地址。

回复超过 1200 字会截断，避免一次点击产生几分钟音频。

## 已知边界

- 只读**纯文本**部分。带工具调用和思维链的回复，只念最终文字。
- 同一时间只能有一段朗读。点「朗读」会打断上一段，不会叠加。
- 暂停位置基于单个音频元素；切换会话会重新开始。
- 中文以外按「一串英文算一声」处理，长单词整串读成一个音节。
- 不做自动朗读，需要手动点。

## 开发

```bash
node test/synth.test.mjs   # 合成器、WAV 头、Markdown 清洗、节点提取，共 14 项
```

插件用 `link:` 方式安装时，改源文件刷新页面即生效，不需要重装。

## 协议

MIT。合成器来自 bibibobo（作者 hakihakii，MIT），本插件同样 MIT。原始版权声明见 [LICENSE](LICENSE)。
